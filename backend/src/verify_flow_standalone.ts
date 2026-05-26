import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { PaypalService } from './paypal/paypal.service.js';
import { EntityManager } from '@mikro-orm/postgresql';
import { Product } from './entities/product.entity.js';
import { Variant } from './entities/variant.entity.js';
import { Transaction } from './entities/transaction.entity.js';
import { Setting } from './entities/setting.entity.js';

async function runCompleteIntegrationTest() {
  console.log("=========================================================");
  console.log("    STARTAR SYSTEMTEST: KOMPLETT END-TO-END-INTEGRATION");
  console.log("=========================================================");

  // 1. Bootstrap the NestJS application context
  console.log("\n[1/5] Bootstrappar NestJS-applikationskontext...");
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const paypalService = app.get(PaypalService);
  const em = app.get(EntityManager);

  try {
    // 2. Test saving and loading PayPal configs (Admin flow)
    console.log("\n[2/5] Testar admin-flöde: Spara & Hämta PayPal-nycklar...");
    const testConfig = {
      client_id: "TEST_CLIENT_ID_12345",
      client_secret: "TEST_CLIENT_SECRET_abcde",
      webhook_id: "TEST_WEBHOOK_ID_67890",
      mode: "sandbox"
    };

    await paypalService.setPaypalConfig(testConfig);
    console.log("     ✓ Inställningar sparade.");

    const loadedConfig = await paypalService.getPaypalConfig();
    if (loadedConfig.client_id !== testConfig.client_id || 
        loadedConfig.webhook_id !== testConfig.webhook_id ||
        loadedConfig.mode !== testConfig.mode ||
        loadedConfig.has_secret !== true) {
      throw new Error("Hämtade inställningar matchar inte de sparade!");
    }
    console.log("     ✓ Inställningar laddades och verifierades framgångsrikt.");

    // 3. Setup test data (Product & Variant)
    console.log("\n[3/5] Skapar temporär testprodukt och variant i databasen...");
    const testSku = "Hanna-Svart-42";
    let productId: number;
    let variantId: number;

    await em.transactional(async (tx) => {
      // Create product
      const product = new Product();
      product.name = "Hanna";
      product.category = "Skor";
      product.description = "Temporär sko för integrationstest.";
      tx.persist(product);
      await tx.flush();
      productId = product.id;

      // Create variant
      const variant = new Variant();
      variant.product = product;
      variant.sku = testSku;
      variant.size = "42";
      variant.color = "svart";
      variant.stock = 10; // Starting stock
      variant.purchasePrice = 200.0;
      variant.sellingPrice = 1200.0;
      variant.originalPrice = 1200.0;
      tx.persist(variant);
      await tx.flush();
      variantId = variant.id;
    });

    console.log(`     ✓ Skapade sko 'Hanna svart 42' med SKU '${testSku}'. Utgångssaldo: 10 st.`);

    // 4. Simulate a PayPal webhook capture completion (Webhook flow)
    console.log("\n[4/5] Simulerar inkommande PayPal Webhook (PAYMENT.CAPTURE.COMPLETED)...");
    const webhookPayload = {
      event_type: "PAYMENT.CAPTURE.COMPLETED",
      is_simulation: true,
      simulated_items: [
        {
          sku: testSku,
          quantity: 2,
          price: 1200.0
        }
      ]
    };

    const webhookResult = await paypalService.handleWebhook(webhookPayload, {});
    console.log(`     ✓ Webhook svar: ${JSON.stringify(webhookResult)}`);
    if (!webhookResult.success) {
      throw new Error(`Webhook-bearbetning misslyckades: ${webhookResult.message}`);
    }

    // 5. Verify the updates (Database assertion)
    console.log("\n[5/5] Verifierar databastillstånd och lagersaldon...");
    const updatedVariant = await em.findOne(Variant, { sku: testSku });
    if (!updatedVariant) {
      throw new Error("Kunde inte hitta testvarianten efter webhook-körning!");
    }

    console.log(`     ✓ Aktuellt lagersaldo efter köp: ${updatedVariant.stock} st (Förväntat: 8 st).`);
    if (updatedVariant.stock !== 8) {
      throw new Error(`Felaktigt lagersaldo! Fick ${updatedVariant.stock}, förväntade sig 8.`);
    }
    console.log("     ✓ Lagersaldot har minskats helt korrekt!");

    // Check transaction log
    const transaction = await em.findOne(Transaction, { variant: updatedVariant, type: 'sale' });
    if (!transaction) {
      throw new Error("Ingen försäljningstransaktion loggades i databasen!");
    }
    console.log(`     ✓ Loggad transaktion: Typ: '${transaction.type}' | Antal: ${transaction.quantity} st | Pris: ${transaction.sellingPrice} kr.`);
    if (transaction.quantity !== 2 || transaction.sellingPrice !== 1200.0) {
      throw new Error("Loggad transaktionsdata är felaktig!");
    }
    console.log("     ✓ Försäljningstransaktionen registrerades helt korrekt!");

    // Clean up database to keep it pristine
    console.log("\n[STÄDNING] Raderar temporära testrader och återställer databasen...");
    await em.transactional(async (tx) => {
      // Delete transactions
      const txs = await tx.find(Transaction, { variant: { sku: testSku } });
      for (const t of txs) tx.remove(t);

      // Delete variant
      const v = await tx.findOne(Variant, { sku: testSku });
      if (v) tx.remove(v);

      // Delete product
      const p = await tx.findOne(Product, { id: productId });
      if (p) tx.remove(p);

      // Reset settings to empty for fresh state
      const settingsKeys = ['paypal_client_id', 'paypal_client_secret', 'paypal_webhook_id', 'paypal_mode'];
      for (const key of settingsKeys) {
        const s = await tx.findOne(Setting, { key });
        if (s) tx.remove(s);
      }
    });
    console.log("     ✓ Databasen städad och återställd till tomt, orört läge.");

    console.log("\n=========================================================");
    console.log("      INTEGRATIONSTEST LYCKADES - ALLA FLÖDEN OK!");
    console.log("=========================================================");

  } catch (error) {
    console.error("\n[FEL] Integrationstestet misslyckades!");
    console.error(error);
  } finally {
    await app.close();
  }
}

runCompleteIntegrationTest();
