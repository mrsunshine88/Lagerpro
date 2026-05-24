import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service.js';
import { MikroORM } from '@mikro-orm/core';
import { User } from './entities/user.entity.js';
import { Product } from './entities/product.entity.js';
import { Variant } from './entities/variant.entity.js';
import { Booking } from './entities/booking.entity.js';
import { Transaction } from './entities/transaction.entity.js';
import { Setting } from './entities/setting.entity.js';
import { DiscountCode } from './entities/discount-code.entity.js';
import * as bcrypt from 'bcrypt';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly orm: MikroORM
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('api/test/reset')
  async resetDatabase() {
    const em = this.orm.em.fork();
    
    // 1. Delete all records from child tables to parent tables
    await em.nativeDelete(Booking, {});
    await em.nativeDelete(Transaction, {});
    await em.nativeDelete(Variant, {});
    await em.nativeDelete(Product, {});
    await em.nativeDelete(DiscountCode, {});
    await em.nativeDelete(Setting, {});
    await em.nativeDelete(User, {});

    // 2. Seed Users
    const user = new User();
    user.email = 'apersson508@gmail.com';
    user.password = await bcrypt.hash('020406', 10);
    user.role = 'admin';
    user.allowedProjects = 'all';
    em.persist(user);

    const cashier = new User();
    cashier.email = 'staff@test.com';
    cashier.password = await bcrypt.hash('staff123', 10);
    cashier.role = 'user';
    cashier.allowedProjects = 'all';
    em.persist(cashier);

    // 3. Seed test product "Nike Air"
    const p = new Product();
    p.name = 'Nike Air';
    p.category = 'Skor';
    p.description = 'Klassisk sneaker';
    em.persist(p);

    const v1 = new Variant();
    v1.product = p;
    v1.sku = 'NIKE-AIR-42-RED';
    v1.stock = 10;
    v1.size = '42';
    v1.color = 'Röd';
    v1.purchasePrice = 500.0;
    v1.sellingPrice = 1200.0;
    v1.originalPrice = 1200.0;
    em.persist(v1);

    const v2 = new Variant();
    v2.product = p;
    v2.sku = 'NIKE-AIR-40-BLUE';
    v2.stock = 5;
    v2.size = '40';
    v2.color = 'Blå';
    v2.purchasePrice = 450.0;
    v2.sellingPrice = 1100.0;
    v2.originalPrice = 1100.0;
    em.persist(v2);

    // 4. Seed test discount code "PROMO10"
    const dc = new DiscountCode();
    dc.code = 'PROMO10';
    dc.project = 'Skor';
    dc.discountPercent = 10.0;
    dc.freeShipping = false;
    em.persist(dc);

    // 5. Seed test discount code "FREESHIP"
    const dc2 = new DiscountCode();
    dc2.code = 'FREESHIP';
    dc2.project = 'Skor';
    dc2.discountPercent = 0.0;
    dc2.freeShipping = true;
    em.persist(dc2);

    // 6. Flush changes
    await em.flush();

    return { success: true, message: 'Database has been reset and seeded for E2E tests!' };
  }
}

