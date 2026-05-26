import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PaypalController } from './paypal.controller.js';
import { PaypalService } from './paypal.service.js';
import { Variant } from '../entities/variant.entity.js';
import { Transaction } from '../entities/transaction.entity.js';
import { Product } from '../entities/product.entity.js';
import { Setting } from '../entities/setting.entity.js';

@Module({
  imports: [
    MikroOrmModule.forFeature([Variant, Transaction, Product, Setting]),
  ],
  controllers: [PaypalController],
  providers: [PaypalService],
  exports: [PaypalService],
})
export class PaypalModule {}
