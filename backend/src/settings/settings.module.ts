import { Module, forwardRef } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Setting } from '../entities/setting.entity.js';
import { Product } from '../entities/product.entity.js';
import { Variant } from '../entities/variant.entity.js';
import { DiscountCode } from '../entities/discount-code.entity.js';
import { SettingsService } from './settings.service.js';
import { SettingsController } from './settings.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    MikroOrmModule.forFeature([Setting, Product, Variant, DiscountCode]),
    forwardRef(() => AuthModule),
  ],
  providers: [SettingsService],
  controllers: [SettingsController],
  exports: [SettingsService],
})
export class SettingsModule {}
