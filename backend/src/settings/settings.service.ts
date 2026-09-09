import { Injectable, BadRequestException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, EntityManager } from '@mikro-orm/postgresql';
import { Setting } from '../entities/setting.entity.js';
import { Product } from '../entities/product.entity.js';
import { Variant } from '../entities/variant.entity.js';
import { Transaction } from '../entities/transaction.entity.js';
import { Booking } from '../entities/booking.entity.js';
import { DiscountCode } from '../entities/discount-code.entity.js';
import { AuthService } from '../auth/auth.service.js';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Setting)
    private readonly settingRepository: EntityRepository<Setting>,
    @InjectRepository(Product)
    private readonly productRepository: EntityRepository<Product>,
    @InjectRepository(Variant)
    private readonly variantRepository: EntityRepository<Variant>,
    @InjectRepository(DiscountCode)
    private readonly discountCodeRepository: EntityRepository<DiscountCode>,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
    private readonly em: EntityManager,
  ) {}

  async getDiscount(project: string): Promise<number> {
    const key = `discount_${project}`;
    const setting = await this.settingRepository.findOne({ key });
    return setting && setting.value ? parseFloat(setting.value) : 0.0;
  }

  async setDiscount(project: string, discount: number): Promise<void> {
    await this.em.transactional(async (em) => {
      const key = `discount_${project}`;
      let setting = await em.findOne(Setting, { key });
      if (!setting) {
        setting = new Setting();
        setting.key = key;
        em.persist(setting);
      }
      setting.value = discount.toString();

      // Find all products in this project
      const products = await em.find(Product, { category: project }, { populate: ['variants'] });
      for (const p of products) {
        // Use product's override if defined, otherwise the new category discount
        const activeDiscount = (p.discountPercent !== null && p.discountPercent !== undefined)
          ? p.discountPercent
          : discount;

        for (const v of p.variants) {
          if (v.originalPrice > 0) {
            v.sellingPrice = Math.round(v.originalPrice * (1.0 - activeDiscount / 100.0));
          }
        }
      }
    });
  }

  async getInvestment(project: string): Promise<number> {
    const key = `investment_${project}`;
    const setting = await this.settingRepository.findOne({ key });
    return setting && setting.value ? parseFloat(setting.value) : 0.0;
  }

  async setInvestment(project: string, investment: number): Promise<void> {
    const key = `investment_${project}`;
    let setting = await this.settingRepository.findOne({ key });
    if (!setting) {
      setting = new Setting();
      setting.key = key;
      this.em.persist(setting);
    }
    setting.value = investment.toString();
    await this.em.flush();
  }

  async getProjectConfig(project: string): Promise<{ checkout_mode: string; delivery_method: string; shipping_cost: number; public_visible: boolean }> {
    const modeKey = `checkout_mode_${project}`;
    const devKey = `delivery_method_${project}`;
    const shipKey = `shipping_cost_${project}`;
    const visibleKey = `public_visible_${project}`;

    const modeSetting = await this.settingRepository.findOne({ key: modeKey });
    const devSetting = await this.settingRepository.findOne({ key: devKey });
    const shipSetting = await this.settingRepository.findOne({ key: shipKey });
    const visibleSetting = await this.settingRepository.findOne({ key: visibleKey });

    if (!modeSetting && !devSetting && !shipSetting && !visibleSetting && project !== 'Alla') {
      return this.getProjectConfig('Alla');
    }

    return {
      checkout_mode: modeSetting?.value || 'booking',
      delivery_method: devSetting?.value || 'pickup',
      shipping_cost: shipSetting?.value ? parseFloat(shipSetting.value) : 0.0,
      public_visible: visibleSetting?.value ? visibleSetting.value === 'true' : true, // default to true
    };
  }

  async setProjectConfig(
    project: string,
    config: { checkout_mode: string; delivery_method: string; shipping_cost: number; public_visible?: boolean },
  ): Promise<void> {
    await this.em.transactional(async (em) => {
      const modeKey = `checkout_mode_${project}`;
      const devKey = `delivery_method_${project}`;
      const shipKey = `shipping_cost_${project}`;

      // Save checkout mode
      let modeSetting = await em.findOne(Setting, { key: modeKey });
      if (!modeSetting) {
        modeSetting = new Setting();
        modeSetting.key = modeKey;
        em.persist(modeSetting);
      }
      modeSetting.value = config.checkout_mode;

      // Save delivery method
      let devSetting = await em.findOne(Setting, { key: devKey });
      if (!devSetting) {
        devSetting = new Setting();
        devSetting.key = devKey;
        em.persist(devSetting);
      }
      devSetting.value = config.delivery_method;

      // Save shipping cost
      let shipSetting = await em.findOne(Setting, { key: shipKey });
      if (!shipSetting) {
        shipSetting = new Setting();
        shipSetting.key = shipKey;
        em.persist(shipSetting);
      }
      shipSetting.value = config.shipping_cost.toString();

      // Save public visibility
      const visibleKey = `public_visible_${project}`;
      let visibleSetting = await em.findOne(Setting, { key: visibleKey });
      if (!visibleSetting) {
        visibleSetting = new Setting();
        visibleSetting.key = visibleKey;
        em.persist(visibleSetting);
      }
      visibleSetting.value = config.public_visible !== false ? 'true' : 'false';
    });
  }

  async getSwishConfig(): Promise<{ merchant_id: string; has_cert: boolean; has_key: boolean }> {
    const merchantId = await this.settingRepository.findOne({ key: 'swish_merchant_id' });
    const cert = await this.settingRepository.findOne({ key: 'swish_tls_certificate' });
    const key = await this.settingRepository.findOne({ key: 'swish_tls_key' });

    return {
      merchant_id: merchantId?.value || '',
      has_cert: !!cert?.value?.trim(),
      has_key: !!key?.value?.trim(),
    };
  }

  async setSwishConfig(config: { merchant_id: string; cert: string; key: string }): Promise<void> {
    await this.em.transactional(async (em) => {
      // Save merchant ID
      let merchantSetting = await em.findOne(Setting, { key: 'swish_merchant_id' });
      if (!merchantSetting) {
        merchantSetting = new Setting();
        merchantSetting.key = 'swish_merchant_id';
        em.persist(merchantSetting);
      }
      merchantSetting.value = config.merchant_id.trim();

      // Save TLS Certificate
      let certSetting = await em.findOne(Setting, { key: 'swish_tls_certificate' });
      if (!certSetting) {
        certSetting = new Setting();
        certSetting.key = 'swish_tls_certificate';
        em.persist(certSetting);
      }
      certSetting.value = config.cert.trim();

      // Save TLS Key
      let keySetting = await em.findOne(Setting, { key: 'swish_tls_key' });
      if (!keySetting) {
        keySetting = new Setting();
        keySetting.key = 'swish_tls_key';
        em.persist(keySetting);
      }
      keySetting.value = config.key.trim();
    });
  }

  async setPassword(password: string): Promise<void> {
    if (password.length < 4) {
      throw new BadRequestException('Lösenordet måste vara minst 4 tecken långt.');
    }
    const key = 'password';
    let setting = await this.settingRepository.findOne({ key });
    if (!setting) {
      setting = new Setting();
      setting.key = key;
      this.em.persist(setting);
    }
    setting.value = password;
    await this.em.flush();
  }

  async getProjectsList(): Promise<string[]> {
    const result = (await this.em.getConnection().execute(
      'SELECT DISTINCT category FROM products WHERE category IS NOT NULL',
    )) as any[];
    return result.map((r: any) => r.category.trim()).filter(Boolean);
  }

  async createProject(projectName: string): Promise<void> {
    const name = projectName.trim();
    if (!name) {
      throw new BadRequestException('Projektnamn kan inte vara tomt.');
    }

    await this.em.transactional(async (em) => {
      const exists = await em.findOne(Product, { category: name });
      if (!exists) {
        const product = new Product();
        product.name = `Startprodukt (${name})`;
        product.category = name;
        product.description = 'Placeholder för nyskapat projekt.';
        em.persist(product);

        const variant = new Variant();
        variant.product = product;
        
        const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 5);
        variant.sku = `PLACEHOLDER-${cleanName}-${Date.now()}`;
        
        variant.size = 'Standard';
        variant.color = 'Universal';
        variant.stock = 0;
        variant.purchasePrice = 0.0;
        variant.sellingPrice = 0.0;
        variant.originalPrice = 0.0;
        em.persist(variant);
      }
    });
  }

  async deleteProject(projectName: string): Promise<void> {
    const name = projectName.trim();
    if (!name) {
      throw new BadRequestException('Projektnamn kan inte vara tomt.');
    }

    await this.em.transactional(async (em) => {
      // Find all products in this category
      const products = await em.find(Product, { category: name });
      if (products.length > 0) {
        // Cascade delete will delete Variants, Transactions, and Bookings because we configured it in ORM
        // Let's explicitly remove products to trigger cascading
        for (const p of products) {
          em.remove(p);
        }
      }

      // Delete project-specific settings
      const discountSetting = await em.findOne(Setting, { key: `discount_${name}` });
      if (discountSetting) em.remove(discountSetting);

      const investmentSetting = await em.findOne(Setting, { key: `investment_${name}` });
      if (investmentSetting) em.remove(investmentSetting);
    });

    // Remove this project from user allowed lists
    await this.authService.removeAllowedProjectFromAll(name);
  }

  async getDiscountCodes(): Promise<DiscountCode[]> {
    return this.discountCodeRepository.find({}, { orderBy: { code: 'ASC' } });
  }

  async createDiscountCode(data: { code: string; project: string; discountPercent: number; freeShipping?: boolean; validUntil?: string | Date }): Promise<DiscountCode> {
    const code = data.code.trim().toUpperCase();
    const project = data.project.trim();
    const percent = data.discountPercent;
    const freeShipping = !!data.freeShipping;
    const validUntil = data.validUntil ? new Date(data.validUntil) : undefined;

    if (!code) {
      throw new BadRequestException('Rabattkod kan inte vara tom.');
    }
    if (percent < 0 || percent > 100) {
      throw new BadRequestException('Rabatt i procent måste vara mellan 0 och 100.');
    }

    const exists = await this.discountCodeRepository.findOne({ code });
    if (exists) {
      throw new BadRequestException(`Rabattkoden ${code} finns redan.`);
    }

    const dc = new DiscountCode();
    dc.code = code;
    dc.project = project;
    dc.discountPercent = percent;
    dc.freeShipping = freeShipping;
    dc.validUntil = validUntil;

    this.em.persist(dc);
    await this.em.flush();
    return dc;
  }

  async updateDiscountCode(id: number, data: { code: string; project: string; discountPercent: number; freeShipping?: boolean; validUntil?: string | Date }): Promise<DiscountCode> {
    const code = data.code.trim().toUpperCase();
    const project = data.project.trim();
    const percent = data.discountPercent;
    const freeShipping = !!data.freeShipping;
    const validUntil = data.validUntil ? new Date(data.validUntil) : undefined;

    if (!code) {
      throw new BadRequestException('Rabattkod kan inte vara tom.');
    }
    if (percent < 0 || percent > 100) {
      throw new BadRequestException('Rabatt i procent måste vara mellan 0 och 100.');
    }

    const dc = await this.discountCodeRepository.findOne(id);
    if (!dc) {
      throw new NotFoundException('Rabattkoden hittades inte.');
    }

    const exists = await this.discountCodeRepository.findOne({ code });
    if (exists && exists.id !== id) {
      throw new BadRequestException(`Rabattkoden ${code} används redan på en annan kod.`);
    }

    dc.code = code;
    dc.project = project;
    dc.discountPercent = percent;
    dc.freeShipping = freeShipping;
    dc.validUntil = validUntil;

    await this.em.flush();
    return dc;
  }

  async deleteDiscountCode(id: number): Promise<void> {
    const dc = await this.discountCodeRepository.findOne(id);
    if (!dc) {
      throw new NotFoundException('Rabattkoden hittades inte.');
    }
    this.em.remove(dc);
    await this.em.flush();
  }

  async validateDiscountCode(code: string, productCategory?: string): Promise<{ valid: boolean; discountPercent: number; project: string; freeShipping: boolean; isExpired?: boolean }> {
    const cleanCode = code.trim().toUpperCase();
    const dc = await this.discountCodeRepository.findOne({ code: cleanCode });
    if (!dc) {
      return { valid: false, discountPercent: 0, project: '', freeShipping: false };
    }

    // Check if expired
    if (dc.validUntil) {
      const expirationDate = new Date(dc.validUntil);
      expirationDate.setHours(23, 59, 59, 999);
      if (new Date() > expirationDate) {
        return { valid: false, discountPercent: 0, project: dc.project, freeShipping: false, isExpired: true };
      }
    }

    if (productCategory) {
      const matchProject = dc.project.toLowerCase();
      const cat = productCategory.toLowerCase();
      if (matchProject !== 'alla' && matchProject !== 'allmänt' && matchProject !== 'all' && matchProject !== cat) {
        return { valid: false, discountPercent: 0, project: dc.project, freeShipping: false };
      }
    }

    return { valid: true, discountPercent: dc.discountPercent, project: dc.project, freeShipping: dc.freeShipping };
  }

  async getShippingConfig(): Promise<{ provider: string; postnord_key: string; dhl_key: string; dhl_account: string }> {
    const provider = await this.settingRepository.findOne({ key: 'shipping_provider' });
    const postnord = await this.settingRepository.findOne({ key: 'postnord_api_key' });
    const dhlKey = await this.settingRepository.findOne({ key: 'dhl_api_key' });
    const dhlAcc = await this.settingRepository.findOne({ key: 'dhl_account_number' });

    return {
      provider: provider?.value || 'postnord',
      postnord_key: postnord?.value || '',
      dhl_key: dhlKey?.value || '',
      dhl_account: dhlAcc?.value || '',
    };
  }

  async setShippingConfig(config: { provider: string; postnord_key: string; dhl_key: string; dhl_account: string }): Promise<void> {
    await this.em.transactional(async (em) => {
      let provSetting = await em.findOne(Setting, { key: 'shipping_provider' });
      if (!provSetting) { provSetting = new Setting(); provSetting.key = 'shipping_provider'; em.persist(provSetting); }
      provSetting.value = config.provider.trim();

      let pnSetting = await em.findOne(Setting, { key: 'postnord_api_key' });
      if (!pnSetting) { pnSetting = new Setting(); pnSetting.key = 'postnord_api_key'; em.persist(pnSetting); }
      pnSetting.value = config.postnord_key.trim();

      let dhlKSetting = await em.findOne(Setting, { key: 'dhl_api_key' });
      if (!dhlKSetting) { dhlKSetting = new Setting(); dhlKSetting.key = 'dhl_api_key'; em.persist(dhlKSetting); }
      dhlKSetting.value = config.dhl_key.trim();

      let dhlASetting = await em.findOne(Setting, { key: 'dhl_account_number' });
      if (!dhlASetting) { dhlASetting = new Setting(); dhlASetting.key = 'dhl_account_number'; em.persist(dhlASetting); }
      dhlASetting.value = config.dhl_account.trim();
    });
  }

  async getStorefrontConfig(): Promise<{ company_name: string; banner_url: string }> {
    const comp = await this.settingRepository.findOne({ key: 'storefront_company_name' });
    const banner = await this.settingRepository.findOne({ key: 'storefront_banner_url' });

    return {
      company_name: comp?.value || 'Företaget AB',
      banner_url: banner?.value || '',
    };
  }

  async setStorefrontConfig(config: { company_name: string; banner_url: string }): Promise<void> {
    await this.em.transactional(async (em) => {
      let compSetting = await em.findOne(Setting, { key: 'storefront_company_name' });
      if (!compSetting) { compSetting = new Setting(); compSetting.key = 'storefront_company_name'; em.persist(compSetting); }
      compSetting.value = config.company_name.trim();

      let bannerSetting = await em.findOne(Setting, { key: 'storefront_banner_url' });
      if (!bannerSetting) { bannerSetting = new Setting(); bannerSetting.key = 'storefront_banner_url'; em.persist(bannerSetting); }
      bannerSetting.value = config.banner_url.trim();
    });
  }
}


