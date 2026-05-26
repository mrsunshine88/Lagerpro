import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, EntityManager } from '@mikro-orm/postgresql';
import { Variant } from '../entities/variant.entity.js';
import { Transaction } from '../entities/transaction.entity.js';
import { Setting } from '../entities/setting.entity.js';
import { Product } from '../entities/product.entity.js';

@Injectable()
export class PaypalService {
  private readonly logger = new Logger(PaypalService.name);

  constructor(
    @InjectRepository(Variant)
    private readonly variantRepository: EntityRepository<Variant>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: EntityRepository<Transaction>,
    private readonly em: EntityManager,
  ) {}

  /**
   * Reads stored PayPal credentials from the database.
   */
  private async getCredentials(): Promise<{ client_id: string; client_secret: string; webhook_id: string; mode: string; category_filter: string }> {
    const clientIdSetting = await this.em.findOne(Setting, { key: 'paypal_client_id' });
    const secretSetting = await this.em.findOne(Setting, { key: 'paypal_client_secret' });
    const webhookIdSetting = await this.em.findOne(Setting, { key: 'paypal_webhook_id' });
    const modeSetting = await this.em.findOne(Setting, { key: 'paypal_mode' });
    const categoryFilterSetting = await this.em.findOne(Setting, { key: 'paypal_category_filter' });

    return {
      client_id: clientIdSetting?.value || '',
      client_secret: secretSetting?.value || '',
      webhook_id: webhookIdSetting?.value || '',
      mode: modeSetting?.value || 'sandbox',
      category_filter: categoryFilterSetting?.value || '',
    };
  }

  /**
   * Public retrieval of configuration for the Admin UI (omits secret for security).
   */
  async getPaypalConfig(): Promise<{ client_id: string; webhook_id: string; mode: string; category_filter: string; has_secret: boolean }> {
    const creds = await this.getCredentials();
    return {
      client_id: creds.client_id,
      webhook_id: creds.webhook_id,
      mode: creds.mode,
      category_filter: creds.category_filter,
      has_secret: !!creds.client_secret.trim(),
    };
  }

  /**
   * Saves PayPal configuration to the settings table in the database.
   */
  async setPaypalConfig(config: { client_id: string; client_secret: string; webhook_id: string; mode: string; category_filter?: string }): Promise<void> {
    await this.em.transactional(async (em) => {
      // client_id
      let clientIdSetting = await em.findOne(Setting, { key: 'paypal_client_id' });
      if (!clientIdSetting) {
        clientIdSetting = new Setting();
        clientIdSetting.key = 'paypal_client_id';
        em.persist(clientIdSetting);
      }
      clientIdSetting.value = config.client_id.trim();

      // client_secret (only update if a new one is provided)
      if (config.client_secret && config.client_secret.trim()) {
        let secretSetting = await em.findOne(Setting, { key: 'paypal_client_secret' });
        if (!secretSetting) {
          secretSetting = new Setting();
          secretSetting.key = 'paypal_client_secret';
          em.persist(secretSetting);
        }
        secretSetting.value = config.client_secret.trim();
      }

      // webhook_id
      let webhookIdSetting = await em.findOne(Setting, { key: 'paypal_webhook_id' });
      if (!webhookIdSetting) {
        webhookIdSetting = new Setting();
        webhookIdSetting.key = 'paypal_webhook_id';
        em.persist(webhookIdSetting);
      }
      webhookIdSetting.value = config.webhook_id.trim();

      // mode
      let modeSetting = await em.findOne(Setting, { key: 'paypal_mode' });
      if (!modeSetting) {
        modeSetting = new Setting();
        modeSetting.key = 'paypal_mode';
        em.persist(modeSetting);
      }
      modeSetting.value = config.mode || 'sandbox';

      // category_filter
      if (config.category_filter !== undefined) {
        let categoryFilterSetting = await em.findOne(Setting, { key: 'paypal_category_filter' });
        if (!categoryFilterSetting) {
          categoryFilterSetting = new Setting();
          categoryFilterSetting.key = 'paypal_category_filter';
          em.persist(categoryFilterSetting);
        }
        categoryFilterSetting.value = config.category_filter.trim();
      }
    });
  }

  /**
   * Main entry point for PayPal Webhooks.
   */
  async handleWebhook(body: any, headers: any): Promise<{ success: boolean; message: string }> {
    const eventType = body.event_type;
    this.logger.log(`Tog emot PayPal Webhook händelse: ${eventType}`);

    const creds = await this.getCredentials();

    // Check for Simulation Mode
    const isSimulation = body.is_simulation === true || !creds.client_id || !creds.client_secret;
    
    if (isSimulation) {
      this.logger.warn('Körs i SIMULERINGSLÄGE. Skippar PayPal API-validering.');
      return this.processWebhookEvent(body, true);
    }

    // Cryptographic signature verification
    const verified = await this.verifySignature(body, headers);
    if (!verified) {
      this.logger.error('PayPal Webhook signatur-validering misslyckades.');
      return { success: false, message: 'Invalid signature' };
    }

    // Process verified event
    return this.processWebhookEvent(body, false);
  }

  /**
   * Processes a verified or simulated PayPal Webhook event.
   */
  private async processWebhookEvent(body: any, isSimulated: boolean): Promise<{ success: boolean; message: string }> {
    const eventType = body.event_type;

    if (eventType !== 'PAYMENT.CAPTURE.COMPLETED' && eventType !== 'CHECKOUT.ORDER.APPROVED') {
      return { success: true, message: `Ignorerar händelse: ${eventType}` };
    }

    let itemsToProcess: { sku: string; quantity: number; price: number }[] = [];

    if (isSimulated && body.simulated_items) {
      itemsToProcess = body.simulated_items;
    } else {
      const orderId = body.resource?.supplementary_data?.related_ids?.order_id || 
                      body.resource?.custom_id || 
                      body.resource?.invoice_id ||
                      body.resource?.id;

      if (!orderId) {
        this.logger.error('Kunde inte hitta Order ID eller referens i Webhook payload.');
        return { success: false, message: 'Order reference not found' };
      }

      this.logger.log(`Hämtar orderdetaljer från PayPal för Order ID: ${orderId}`);
      itemsToProcess = await this.fetchOrderDetailsFromPaypal(orderId);
    }

    if (itemsToProcess.length === 0) {
      this.logger.warn('Inga produkter att uppdatera i detta köp.');
      return { success: true, message: 'No items to process' };
    }

    return this.em.transactional(async (em) => {
      let updatedCount = 0;

      for (const item of itemsToProcess) {
        if (!item.sku) continue;

        const variant = await em.findOne(Variant, { sku: item.sku });
        if (!variant) {
          this.logger.warn(`Sko med SKU '${item.sku}' hittades inte i databasen.`);
          continue;
        }

        const oldStock = variant.stock;
        const purchaseQty = item.quantity || 1;
        const newStock = Math.max(0, oldStock - purchaseQty);

        variant.stock = newStock;

        const transaction = new Transaction();
        transaction.variant = variant;
        transaction.type = 'sale';
        transaction.quantity = purchaseQty;
        transaction.purchasePrice = variant.purchasePrice;
        transaction.sellingPrice = item.price || variant.sellingPrice;
        transaction.isSimulation = isSimulated;
        
        em.persist(transaction);
        updatedCount++;
        
        this.logger.log(
          `[LAGERUPPDATERING] SKU: ${variant.sku} | Saldo: ${oldStock} -> ${newStock} | Registrerat köp till pris: ${transaction.sellingPrice} kr`,
        );
      }

      await em.flush();
      return { 
        success: true, 
        message: `Lager synkat! Uppdaterade ${updatedCount} av ${itemsToProcess.length} skovarianter.` 
      };
    });
  }

  /**
   * Retrieves OAuth2 Access Token from PayPal API.
   */
  private async getPaypalAccessToken(clientId: string, clientSecret: string, mode: string): Promise<string> {
    const baseUrl = mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const errText = await response.text();
      this.logger.error(`Misslyckades att hämta Access Token från PayPal: ${errText}`);
      throw new Error('PayPal Authentication failed');
    }

    const data: any = await response.json();
    return data.access_token;
  }

  /**
   * Fetches the full order details from PayPal.
   */
  private async fetchOrderDetailsFromPaypal(orderId: string): Promise<{ sku: string; quantity: number; price: number }[]> {
    try {
      const creds = await this.getCredentials();
      const accessToken = await this.getPaypalAccessToken(creds.client_id, creds.client_secret, creds.mode);
      const baseUrl = creds.mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

      const response = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errText = await response.text();
        this.logger.error(`Misslyckades att hämta orderdetaljer för ${orderId}: ${errText}`);
        return [];
      }

      const orderData: any = await response.json();
      const items: { sku: string; quantity: number; price: number }[] = [];

      const purchaseUnits = orderData.purchase_units || [];
      for (const unit of purchaseUnits) {
        const paypalItems = unit.items || [];
        for (const item of paypalItems) {
          items.push({
            sku: item.sku,
            quantity: parseInt(item.quantity) || 1,
            price: parseFloat(item.unit_amount?.value) || 0.0,
          });
        }
      }

      return items;
    } catch (error) {
      this.logger.error(`Ett fel uppstod vid hämtning av PayPal-order: ${error.message}`);
      return [];
    }
  }

  /**
   * Cryptographically verifies the webhook signature with PayPal API.
   */
  private async verifySignature(body: any, headers: any): Promise<boolean> {
    try {
      const creds = await this.getCredentials();
      const accessToken = await this.getPaypalAccessToken(creds.client_id, creds.client_secret, creds.mode);
      const baseUrl = creds.mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

      if (!creds.webhook_id) {
        this.logger.error('PAYPAL_WEBHOOK_ID saknas i databasinställningarna.');
        return false;
      }

      const payload = {
        auth_algo: headers['paypal-auth-algo'],
        cert_url: headers['paypal-cert-url'],
        transmission_id: headers['paypal-transmission-id'],
        transmission_sig: headers['paypal-transmission-sig'],
        transmission_time: headers['paypal-transmission-time'],
        webhook_id: creds.webhook_id,
        webhook_event: body,
      };

      const response = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        return false;
      }

      const data: any = await response.json();
      return data.verification_status === 'SUCCESS';
    } catch (error) {
      this.logger.error(`Fel vid verifiering av PayPal-signatur: ${error.message}`);
      return false;
    }
  }

  async syncPaypalCatalog(targetProject?: string): Promise<number> {
    const creds = await this.getCredentials();
    if (!creds.client_id || !creds.client_secret) {
      throw new Error('PayPal Client ID och Secret saknas. Spara dina nycklar först.');
    }

    const finalCategory = targetProject?.trim() || 'Skor';

    this.logger.log(`Startar synkning av produktkatalogen från PayPal till projekt '${finalCategory}'...`);
    const accessToken = await this.getPaypalAccessToken(creds.client_id, creds.client_secret, creds.mode);
    const baseUrl = creds.mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

    const response = await fetch(`${baseUrl}/v1/catalogs/products?page_size=100`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      this.logger.error(`Misslyckades att hämta produkter från PayPal: ${errText}`);
      throw new Error(`PayPal API fel: ${response.statusText}`);
    }

    const data: any = await response.json();
    const paypalProducts = data.products || [];
    this.logger.log(`Hittade ${paypalProducts.length} produkter i PayPal-katalogen.`);

    return this.em.transactional(async (em) => {
      let importedCount = 0;

      // Prepare category filtering tokens
      const categoryFilter = creds.category_filter || '';
      const allowedCategories = categoryFilter.trim()
        ? categoryFilter.toLowerCase().split(',').map(s => s.trim())
        : [];

      for (const p of paypalProducts) {
        const name = p.name;
        if (!name) continue;

        // Apply Category Filtering
        if (allowedCategories.length > 0) {
          const prodCategory = (p.category || '').toLowerCase();
          const matches = allowedCategories.some(cat => prodCategory.includes(cat) || cat.includes(prodCategory));
          if (!matches) {
            this.logger.log(`[SYNKERING] Ignorerar '${name}' p.g.a. kategori '${p.category}' (filtrerad).`);
            continue;
          }
        }

        // Parse name: t.ex. "Danny brun 42" -> Model: Danny, Color: brun, Size: 42
        const parsed = this.parseShoeName(name);

        // Find or create product
        let product = await em.findOne(Product, { name: parsed.model, category: finalCategory });
        if (!product) {
          product = new Product();
          product.name = parsed.model;
          product.category = finalCategory;
          product.description = p.description || 'Importerad från PayPal-katalog.';
          product.imageUrl = p.image_url || undefined;
          em.persist(product);
        } else {
          // Update details & imageUrl if changed
          product.description = p.description || product.description;
          if (p.image_url) {
            product.imageUrl = p.image_url;
          }
        }

        // We use PayPal's Product ID as the unique SKU!
        const sku = p.id;
        let variant = await em.findOne(Variant, { sku }, { populate: ['product'] });
        if (!variant) {
          variant = new Variant();
          variant.product = product;
          variant.sku = sku;
          variant.size = parsed.size;
          variant.color = parsed.color;
          variant.stock = 1; // Default starting stock
          variant.purchasePrice = 0.0;
          variant.sellingPrice = 1000.0; // Default placeholder price
          variant.originalPrice = 1000.0;
          em.persist(variant);

          // Create purchase transaction to balance statistics
          const transaction = new Transaction();
          transaction.variant = variant;
          transaction.type = 'purchase';
          transaction.quantity = 1;
          transaction.purchasePrice = 0.0;
          transaction.sellingPrice = 1000.0;
          em.persist(transaction);

          importedCount++;
        } else {
          // Variant already exists! Just update its details to keep them fully synked
          variant.size = parsed.size;
          variant.color = parsed.color;
          
          if (variant.product) {
            variant.product.name = parsed.model;
            variant.product.description = p.description || variant.product.description;
            variant.product.category = finalCategory;
            if (p.image_url) {
              variant.product.imageUrl = p.image_url;
            }
          }
        }
      }

      await em.flush();
      return importedCount;
    });
  }

  /**
   * Intelligently parses a concatenated product name into Model, Color, and Size.
   */
  private parseShoeName(name: string): { model: string; color: string; size: string } {
    name = name.trim();
    
    // Extract size at the end (e.g. 42 or 39.5)
    const sizeRegex = /\s+(\d+(?:[\.,]\d+)?)\s*$/;
    const match = name.match(sizeRegex);
    
    let size = 'Universal';
    let rest = name;
    
    if (match) {
      size = match[1];
      rest = name.substring(0, match.index).trim();
    }
    
    const parts = rest.split(/\s+/);
    let model = rest;
    let color = 'Universal';
    
    if (parts.length > 1) {
      model = parts[0];
      color = parts.slice(1).join(' ');
    }
    
    return { model, color, size };
  }

  async resetSimulatedTransactions(): Promise<{ success: boolean; revertedCount: number }> {
    this.logger.log('Startar återställning av alla simulerade köp...');
    return this.em.transactional(async (em) => {
      // Find all transaction records marked as simulation
      const simulatedTxList = await em.find(Transaction, { isSimulation: true }, { populate: ['variant'] });
      
      let revertedCount = 0;
      for (const tx of simulatedTxList) {
        const variant = tx.variant;
        if (variant) {
          if (tx.type === 'sale') {
            variant.stock += tx.quantity; // Add back sold items
          } else if (tx.type === 'purchase') {
            variant.stock = Math.max(0, variant.stock - tx.quantity); // Subtract purchased items
          }
          this.logger.log(`[ÅTERSTÄLLNING] SKU: ${variant.sku} | Återställde ${tx.quantity} st p.g.a. raderat testköp.`);
        }
        em.remove(tx);
        revertedCount++;
      }
      
      await em.flush();
      return { success: true, revertedCount };
    });
  }
}
