import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ShippingService } from './shipping.service.js';
import { ShippingController } from './shipping.controller.js';
import { Booking } from '../entities/booking.entity.js';
import { SettingsModule } from '../settings/settings.module.js';

@Module({
  imports: [
    MikroOrmModule.forFeature([Booking]),
    SettingsModule,
  ],
  controllers: [ShippingController],
  providers: [ShippingService],
  exports: [ShippingService],
})
export class ShippingModule {}
