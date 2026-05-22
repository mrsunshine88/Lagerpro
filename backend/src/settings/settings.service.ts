import { Injectable, BadRequestException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, EntityManager } from '@mikro-orm/postgresql';
import { Setting } from '../entities/setting.entity.js';
import { Product } from '../entities/product.entity.js';
import { Variant } from '../entities/variant.entity.js';
import { Transaction } from '../entities/transaction.entity.js';
import { Booking } from '../entities/booking.entity.js';
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
}
