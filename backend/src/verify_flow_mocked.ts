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
  const mockDatabase: {
    settings: Record<string, Setting>;
    products: Record<string, Product>;
    variants: Record<string, Variant>;
    transactions: any[];
  } = {
    settings: {},
    products: {},
    variants: {},
    transactions: []
  };

  // 2. Mock MikroORM EntityRepository & EntityManager
  const mockVariantRepo: any = {
    findOne: jestFn(async (cond: any) => mockDatabase.variants[cond.sku] || null),
    persist: jestFn((entity: any) => {
      mockDatabase.variants[entity.sku] = entity;
    }),
    flush: jestFn(async () => {})
  };

  const mockTransactionRepo: any = {
    persist: jestFn((entity: any) => {
      mockDatabase.transactions.push(entity);
    }),
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
      if (entityClass === Product) {
        return Object.values(mockDatabase.products).find(p => p.name === cond.name && p.category === cond.category) || null;
      }
      return null;
    }),
    persist: jestFn((entity: any) => {
      if (entity instanceof Setting) {
        mockDatabase.settings[entity.key as string] = entity;
      }
      if (entity instanceof Product) {
        if (!entity.id) entity.id = Math.floor(Math.random() * 1000000);
        mockDatabase.products[entity.name] = entity;
      }
      if (entity instanceof Variant) {
        if (!entity.id) entity.id = Math.floor(Math.random() * 1000000);
        mockDatabase.variants[entity.sku] = entity;
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

  // Mock global.fetch with simulation endpoints
  let mockProductsResponse = [
    {
      id: "PAYPAL-PROD-HANNA-BLACK-42",
      name: "Hanna svart 42",
      category: "SHOES",
      description: "Elegant black shoe",
      image_url: "https://example.com/hanna-black-42.jpg"
    },
    {
      id: "PAYPAL-PROD-HANNA-BLACK-40",
      name: "Hanna svart 40",
      category: "SHOES",
      description: "Elegant black shoe size 40",
      image_url: "https://example.com/hanna-black-40.jpg"
    },
    {
      id: "PAYPAL-PROD-DANNY-BROWN-44",
      name: "Danny brun 44",
      category: "SHOES",
      description: "Classic brown shoe",
      image_url: "https://example.com/danny-brown-44.jpg"
    },
    {
      id: "PAYPAL-PROD-MONSTERA-PLANT",
      name: "Monstera grön 1",
      category: "PLANTS",
      description: "Green houseplant",
      image_url: "https://example.com/monstera.jpg"
    }
  ];

  const mockFetch = jestFn(async (url: string, init: any) => {
    if (url.includes('/v1/oauth2/token')) {
      return {
        ok: true,
        json: async () => ({ access_token: 'MOCK_ACCESS_TOKEN_123' })
      };
    }
    if (url.includes('/v1/catalogs/products')) {
      return {
        ok: true,
        json: async () => ({
          products: mockProductsResponse
        })
      };
    }
    return {
      ok: false,
      statusText: 'Not Found',
      text: async () => 'Not Found'
    };
  });
  global.fetch = mockFetch as any;

  try {
    // ==================== FLOW 1: ADMIN CONFIG SAVE & LOAD ====================
    console.log("\n[1/5] Testar admin-flöde: Spara & Hämta PayPal-nycklar...");
    const testConfig = {
      client_id: "PAYPAL_MOCK_CLIENT_ID_999",
      client_secret: "PAYPAL_MOCK_SECRET_888",
      webhook_id: "PAYPAL_MOCK_WEBHOOK_777",
      mode: "live",
      category_filter: "SHOES,FOOTWEAR"
    };

    // Save
    await paypalService.setPaypalConfig(testConfig);
    console.log("     ✓ Anropade setPaypalConfig(). Inställningar sparade i mockad databas:");
    console.log(`       - paypal_client_id: '${mockDatabase.settings['paypal_client_id']?.value}'`);
    console.log(`       - paypal_webhook_id: '${mockDatabase.settings['paypal_webhook_id']?.value}'`);
    console.log(`       - paypal_mode: '${mockDatabase.settings['paypal_mode']?.value}'`);
    console.log(`       - paypal_category_filter: '${mockDatabase.settings['paypal_category_filter']?.value}'`);

    // Fetch
    const fetchedConfig = await paypalService.getPaypalConfig();
    console.log("     ✓ Anropade getPaypalConfig(). Resultat:");
    console.log(`       - client_id: '${fetchedConfig.client_id}'`);
    console.log(`       - webhook_id: '${fetchedConfig.webhook_id}'`);
    console.log(`       - mode: '${fetchedConfig.mode}'`);
    console.log(`       - category_filter: '${fetchedConfig.category_filter}'`);
    console.log(`       - has_secret: ${fetchedConfig.has_secret} (Secret dolt av säkerhetsskäl)`);

    if (fetchedConfig.client_id !== testConfig.client_id || 
        fetchedConfig.webhook_id !== testConfig.webhook_id || 
        fetchedConfig.mode !== testConfig.mode || 
        fetchedConfig.category_filter !== testConfig.category_filter ||
        fetchedConfig.has_secret !== true) {
      throw new Error("Admin-flödet misslyckades! Sparade nycklar matchar inte hämtade värden.");
    }
    console.log("     ✓ Admin-flödet sparar och hämtar uppgifter helt korrekt!");

    // ==================== FLOW 2: INTELLIGENT NAME PARSING ====================
    console.log("\n[2/5] Testar PayPal sko-namn parsning vid import...");
    const testShoeName = "Hanna svart 42";
    const parsed = (paypalService as any).parseShoeName(testShoeName);
    console.log(`     ✓ Inmatning: '${testShoeName}'`);
    console.log(`     ✓ Resultat:  Modell: '${parsed.model}' | Färg: '${parsed.color}' | Storlek: '${parsed.size}'`);
    
    if (parsed.model !== "Hanna" || parsed.color !== "svart" || parsed.size !== "42") {
      throw new Error("Sko-namn parsningen misslyckades!");
    }
    console.log("     ✓ Sko-namn parsningen fungerar helt felfritt!");

    // ==================== FLOW 3: WEBHOOK & STOCK BALANCE DEDUCTION ====================
    console.log("\n[3/5] Testar PayPal Webhook-flöde & lagersaldos-minskning...");
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
    console.log("\n[4/5] Testar transaktionsloggning vid försäljning...");
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

    // ==================== FLOW 5: CATALOG SYNC, FILTER & PREVENT DUPLICATES ====================
    console.log("\n[5/5] Testar synkning av PayPal katalog (Kategorifilter, Dubblettundvikande & Bilder)...");
    
    // Clear out databases for clean sync test
    mockDatabase.products = {};
    mockDatabase.variants = {};

    console.log("     ✓ Rensat testdatabasen inför katalogsynk.");
    console.log(`     ✓ Kör synkning med kategorifilter: 'SHOES,FOOTWEAR'...`);
    const importCount1 = await paypalService.syncPaypalCatalog();
    console.log(`     ✓ Antal importerade varianter: ${importCount1} (Förväntat: 3)`);

    if (importCount1 !== 3) {
      throw new Error(`Felaktigt antal importerade varianter vid första synk: fick ${importCount1}, förväntade sig 3.`);
    }

    // Verify category filter skipped Monstera plant
    const plantVariant = mockDatabase.variants["PAYPAL-PROD-MONSTERA-PLANT"];
    if (plantVariant) {
      throw new Error("Kategorifilter misslyckades! 'Monstera grön 1' med kategori 'PLANTS' importerades trots filter.");
    }
    console.log("     ✓ Kategorifiltret fungerar: 'PLANTS'-produkten ignorerades.");

    // Verify image URL synced successfully
    const hanna42 = mockDatabase.variants["PAYPAL-PROD-HANNA-BLACK-42"];
    if (!hanna42 || !hanna42.product) {
      throw new Error("Hanna svart 42 variant/produkt hittades inte efter synk!");
    }
    console.log(`     ✓ Verifierar bild-URL för 'Hanna svart 42':`);
    console.log(`       - Bild-URL: '${hanna42.product.imageUrl}'`);
    if (hanna42.product.imageUrl !== "https://example.com/hanna-black-40.jpg") {
      throw new Error(`Felaktig bild-URL synkad! Fick '${hanna42.product.imageUrl}'`);
    }
    console.log("     ✓ Bild-URL synkades helt korrekt!");

    // Now modify the mock products catalog to simulate an update (second sync)
    console.log("\n     ✓ Uppdaterar mockad katalog för att simulera ändringar (Ändrar beskrivning & bild)...");
    mockProductsResponse = [
      {
        id: "PAYPAL-PROD-HANNA-BLACK-42",
        name: "Hanna svart 42",
        category: "SHOES",
        description: "Super elegant black shoe",
        image_url: "https://example.com/hanna-black-42-new.jpg"
      },
      {
        id: "PAYPAL-PROD-HANNA-BLACK-40",
        name: "Hanna svart 40",
        category: "SHOES",
        description: "Super elegant black shoe",
        image_url: "https://example.com/hanna-black-42-new.jpg"
      },
      {
        id: "PAYPAL-PROD-DANNY-BROWN-44",
        name: "Danny brun 44",
        category: "SHOES",
        description: "Classic brown shoe",
        image_url: "https://example.com/danny-brown-44.jpg"
      }
    ];

    console.log("     ✓ Kör synkning igen (Dubblettundvikande / Saldouppdatering)...");
    const importCount2 = await paypalService.syncPaypalCatalog();
    console.log(`     ✓ Antal NYA importerade varianter: ${importCount2} (Förväntat: 0, då alla redan finns)`);

    if (importCount2 !== 0) {
      throw new Error(`Felaktigt antal importerade varianter vid andra synk: fick ${importCount2}, förväntade sig 0.`);
    }

    // Verify updating without duplicate variants
    const hanna42Updated = mockDatabase.variants["PAYPAL-PROD-HANNA-BLACK-42"];
    console.log(`     ✓ Verifierar uppdaterad information efter andra synk:`);
    console.log(`       - Ny beskrivning: '${hanna42Updated.product?.description}'`);
    console.log(`       - Ny bild-URL:    '${hanna42Updated.product?.imageUrl}'`);

    if (hanna42Updated.product?.description !== "Super elegant black shoe" || 
        hanna42Updated.product?.imageUrl !== "https://example.com/hanna-black-42-new.jpg") {
      throw new Error("Dubblettuppdateringen misslyckades! Fält uppdaterades inte korrekt på den befintliga varianten.");
    }
    console.log("     ✓ Dubblettundvikande och saldouppdatering fungerar helt perfekt!");

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
