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
        for (const v of p.variants) {
          if (v.originalPrice > 0) {
            v.sellingPrice = Math.round(v.originalPrice * (1.0 - discount / 100.0));
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
        variant.sku = 'PLACEHOLDER';
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

  async createDiscountCode(data: { code: string; project: string; discountPercent: number }): Promise<DiscountCode> {
    const code = data.code.trim().toUpperCase();
    const project = data.project.trim();
    const percent = data.discountPercent;

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

    this.em.persist(dc);
    await this.em.flush();
    return dc;
  }

  async updateDiscountCode(id: number, data: { code: string; project: string; discountPercent: number }): Promise<DiscountCode> {
    const code = data.code.trim().toUpperCase();
    const project = data.project.trim();
    const percent = data.discountPercent;

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

  async validateDiscountCode(code: string, productCategory?: string): Promise<{ valid: boolean; discountPercent: number; project: string }> {
    const cleanCode = code.trim().toUpperCase();
    const dc = await this.discountCodeRepository.findOne({ code: cleanCode });
    if (!dc) {
      return { valid: false, discountPercent: 0, project: '' };
    }

    if (productCategory) {
      const matchProject = dc.project.toLowerCase();
      const cat = productCategory.toLowerCase();
      if (matchProject !== 'alla' && matchProject !== 'allmänt' && matchProject !== 'all' && matchProject !== cat) {
        return { valid: false, discountPercent: 0, project: dc.project };
      }
    }

    return { valid: true, discountPercent: dc.discountPercent, project: dc.project };
  }
}
