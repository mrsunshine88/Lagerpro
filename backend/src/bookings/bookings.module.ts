import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Booking } from '../entities/booking.entity.js';
import { Variant } from '../entities/variant.entity.js';
import { BookingsService } from './bookings.service.js';
import { BookingsController } from './bookings.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    MikroOrmModule.forFeature([Booking, Variant]),
    AuthModule,
  ],
  providers: [BookingsService],
  controllers: [BookingsController],
  exports: [BookingsService],
})
export class BookingsModule {}
