import { PaypalService } from './paypal/paypal.service.js';
import { Variant } from './entities/variant.entity.js';
import { Transaction } from './entities/transaction.entity.js';
import { Setting } from './entities/setting.entity.js';
import { Product } from './entities/product.entity.js';

// Standalone verification script using mocked repositories
async function runMockedFlowTest() {
  console.log("=========================================================");
  console.log("    STARTAR SYSTEMTEST: MOCKAD END-TO-END-INTEGRATION");
  console.log("=========================================================");

  // 1. Setup mock database storage
  const mockDatabase: { settings: Record<string, Setting>; variants: Record<string, any>; transactions: any[] } = {
    settings: {},
    variants: {},
    transactions: []
  };

  // 2. Mock MikroORM EntityRepository & EntityManager
  const mockVariantRepo: any = {
    findOne: jestFn(async (cond: any) => mockDatabase.variants[cond.sku] || null),
    persist: jestFn((entity: any) => {}),
    flush: jestFn(async () => {})
  };

  const mockTransactionRepo: any = {
    persist: jestFn((entity: any) => {}),
    flush: jestFn(async () => {})
  };

  const mockEM: any = {
    findOne: jestFn(async (entityClass: any, cond: any) => {
      if (entityClass === Setting) {
        return mockDatabase.settings[cond.key] || null;
      }
      if (entityClass === Variant) {
        return mockDatabase.variants[cond.sku] || null;
      }
      return null;
    }),
    persist: jestFn((entity: any) => {
      if (entity instanceof Setting) {
        mockDatabase.settings[entity.key as string] = entity;
      }
      if (entity instanceof Transaction) {
        mockDatabase.transactions.push(entity);
      }
    }),
    flush: jestFn(async () => {}),
    transactional: jestFn(async (cb: any) => {
      return cb(mockEM);
    })
  };

  // 3. Instantiate PaypalService with mocked dependencies
  const paypalService = new (PaypalService as any)(mockVariantRepo, mockTransactionRepo, mockEM);

  try {
    // ==================== FLOW 1: ADMIN CONFIG SAVE & LOAD ====================
    console.log("\n[1/4] Testar admin-flöde: Spara & Hämta PayPal-nycklar...");
    const testConfig = {
      client_id: "PAYPAL_MOCK_CLIENT_ID_999",
      client_secret: "PAYPAL_MOCK_SECRET_888",
      webhook_id: "PAYPAL_MOCK_WEBHOOK_777",
      mode: "live"
    };

    // Save
    await paypalService.setPaypalConfig(testConfig);
    console.log("     ✓ Anropade setPaypalConfig(). Inställningar sparade i mockad databas:");
    console.log(`       - paypal_client_id: '${mockDatabase.settings['paypal_client_id']?.value}'`);
    console.log(`       - paypal_webhook_id: '${mockDatabase.settings['paypal_webhook_id']?.value}'`);
    console.log(`       - paypal_mode: '${mockDatabase.settings['paypal_mode']?.value}'`);

    // Fetch
    const fetchedConfig = await paypalService.getPaypalConfig();
    console.log("     ✓ Anropade getPaypalConfig(). Resultat:");
    console.log(`       - client_id: '${fetchedConfig.client_id}'`);
    console.log(`       - webhook_id: '${fetchedConfig.webhook_id}'`);
    console.log(`       - mode: '${fetchedConfig.mode}'`);
    console.log(`       - has_secret: ${fetchedConfig.has_secret} (Secret dolt av säkerhetsskäl)`);

    if (fetchedConfig.client_id !== testConfig.client_id || 
        fetchedConfig.webhook_id !== testConfig.webhook_id || 
        fetchedConfig.mode !== testConfig.mode || 
        fetchedConfig.has_secret !== true) {
      throw new Error("Admin-flödet misslyckades! Sparade nycklar matchar inte hämtade värden.");
    }
    console.log("     ✓ Admin-flödet sparar och hämtar uppgifter helt korrekt!");

    // ==================== FLOW 2: INTELLIGENT NAME PARSING ====================
    console.log("\n[2/4] Testar PayPal sko-namn parsning vid import...");
    const testShoeName = "Hanna svart 42";
    const parsed = (paypalService as any).parseShoeName(testShoeName);
    console.log(`     ✓ Inmatning: '${testShoeName}'`);
    console.log(`     ✓ Resultat:  Modell: '${parsed.model}' | Färg: '${parsed.color}' | Storlek: '${parsed.size}'`);
    
    if (parsed.model !== "Hanna" || parsed.color !== "svart" || parsed.size !== "42") {
      throw new Error("Sko-namn parsningen misslyckades!");
    }
    console.log("     ✓ Sko-namn parsningen fungerar helt felfritt!");

    // ==================== FLOW 3: WEBHOOK & STOCK BALANCE DEDUCTION ====================
    console.log("\n[3/4] Testar PayPal Webhook-flöde & lagersaldos-minskning...");
    const testSku = "MOCK-SKU-HANNA-42";
    
    // Seed test variant into mock database
    const mockProduct = new Product();
    mockProduct.name = "Hanna";
    mockProduct.category = "Skor";

    const mockVariant = new Variant();
    mockVariant.product = mockProduct;
    mockVariant.sku = testSku;
    mockVariant.size = "42";
    mockVariant.color = "svart";
    mockVariant.stock = 10; // Initial stock is 10
    mockVariant.purchasePrice = 200.0;
    mockVariant.sellingPrice = 1200.0;

    mockDatabase.variants[testSku] = mockVariant;
    console.log(`     ✓ Lagt till testsko i mockad databas. SKU: '${testSku}' | Saldo: ${mockVariant.stock} st.`);

    // Send Webhook payload
    const webhookPayload = {
      event_type: "PAYMENT.CAPTURE.COMPLETED",
      is_simulation: true,
      simulated_items: [
        {
          sku: testSku,
          quantity: 3, // Buy 3 shoes
          price: 1200.0
        }
      ]
    };

    console.log(`     ✓ Skickar simulerad webhook för köp av 3 st av SKU '${testSku}'...`);
    const webhookResult = await paypalService.handleWebhook(webhookPayload, {});
    console.log(`     ✓ Webhook resultat: ${JSON.stringify(webhookResult)}`);

    if (!webhookResult.success) {
      throw new Error(`Webhook bearbetning misslyckades: ${webhookResult.message}`);
    }

    // Verify stock decrease
    console.log(`     ✓ Verifierar lagersaldo efter köp...`);
    console.log(`       - Nytt lagersaldo i databas: ${mockVariant.stock} st (Förväntat: 7 st)`);
    if (mockVariant.stock !== 7) {
      throw new Error(`Felaktigt lagersaldo! Fick ${mockVariant.stock}, förväntade sig 7.`);
    }

    // ==================== FLOW 4: TRANSACTION LOGGING ====================
    console.log("\n[4/4] Testar transaktionsloggning vid försäljning...");
    console.log(`     ✓ Verifierar sparad transaktionshistorik...`);
    
    const loggedTx = mockDatabase.transactions[0];
    if (!loggedTx) {
      throw new Error("Ingen transaktion loggades i databasen!");
    }

    console.log(`       - Registrerad transaktionstyp: '${loggedTx.type}'`);
    console.log(`       - Kvantitet: ${loggedTx.quantity} st`);
    console.log(`       - Försäljningspris: ${loggedTx.sellingPrice} kr`);
    
    if (loggedTx.type !== 'sale' || loggedTx.quantity !== 3 || loggedTx.sellingPrice !== 1200.0) {
      throw new Error("Transaktionsdata som loggades är felaktig!");
    }
    console.log("     ✓ Försäljningstransaktionen registrerades helt korrekt!");

    console.log("\n=========================================================");
    console.log("      INTEGRATIONSTEST LYCKADES - ALLA FLÖDEN OK!");
    console.log("=========================================================");

  } catch (error: any) {
    console.error("\n[FEL] Integrationstestet misslyckades!");
    console.error(error.stack || error.message);
  }
}

// Simple helper to mock Jest-like fn behavior
function jestFn(implementation: Function) {
  const fn: any = function (...args: any[]) {
    fn.mock.calls.push(args);
    return implementation(...args);
  };
  fn.mock = { calls: [] };
  return fn;
}

runMockedFlowTest();
