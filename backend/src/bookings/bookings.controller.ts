import { Controller, Get, Post, Body, Param, Req, UseGuards, ParseIntPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { BookingsService } from './bookings.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

@Controller('api')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post('public/bookings')
  @HttpCode(HttpStatus.OK)
  async createPublicBooking(
    @Body()
    body: {
      variant_id: number;
      first_name: string;
      last_name: string;
      phone: string;
      discount_code?: string;
      message?: string;
    },
  ) {
    await this.bookingsService.createBooking({
      variantId: body.variant_id,
      firstName: body.first_name,
      lastName: body.last_name,
      phone: body.phone,
      discountCode: body.discount_code,
      message: body.message,
    });
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('bookings')
  async getBookings() {
    const bookings = await this.bookingsService.findAllBookings();
    return bookings.map((b) => ({
      id: b.id,
      customer_first_name: b.customerFirstName,
      customer_last_name: b.customerLastName,
      customer_phone: b.customerPhone,
      status: b.status,
      created_at: b.createdAt,
      size: b.variant.size,
      color: b.variant.color,
      sku: b.variant.sku,
      selling_price: Math.round(b.variant.sellingPrice * (1.0 - b.discountPercent / 100.0)),
      original_selling_price: b.variant.sellingPrice,
      discount_code: b.discountCode,
      discount_percent: b.discountPercent,
      message: b.message,
      purchase_price: b.variant.purchasePrice,
      product_name: b.variant.product.name,
      product_category: b.variant.product.category,
    }));
  }

  @UseGuards(JwtAuthGuard)
  @Post('bookings/:id/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmBooking(@Param('id', ParseIntPipe) id: number) {
    await this.bookingsService.confirmBooking(id);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('bookings/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelBooking(@Param('id', ParseIntPipe) id: number) {
    await this.bookingsService.cancelBooking(id);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('bookings/:id/reserve')
  @HttpCode(HttpStatus.OK)
  async reserveBooking(@Param('id', ParseIntPipe) id: number) {
    await this.bookingsService.reserveBooking(id);
    return { success: true };
  }
}
