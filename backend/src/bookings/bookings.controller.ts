import { Controller, Get, Post, Body, Param, Req, UseGuards, ParseIntPipe, HttpCode, HttpStatus, Query } from '@nestjs/common';
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

  @Post('public/bookings/batch')
  @HttpCode(HttpStatus.OK)
  async createPublicBatchBookings(
    @Body()
    body: {
      items: { variant_id: number }[];
      first_name: string;
      last_name: string;
      phone: string;
      discount_code?: string;
      message?: string;
      delivery_method: string;
      shipping_address?: string;
      shipping_cost: number;
      payment_status?: string;
    },
  ) {
    const bookings = await this.bookingsService.createBatchBookings({
      items: body.items.map(item => ({ variantId: item.variant_id })),
      firstName: body.first_name,
      lastName: body.last_name,
      phone: body.phone,
      discountCode: body.discount_code,
      message: body.message,
      deliveryMethod: body.delivery_method,
      shippingAddress: body.shipping_address,
      shippingCost: body.shipping_cost,
      paymentStatus: body.payment_status,
    });
    return {
      success: true,
      booking_ids: bookings.map(b => b.id),
    };
  }

  @Get('public/bookings/payment-status')
  async checkPaymentStatus(@Query('ids') ids: string) {
    if (!ids) {
      return { paid: false };
    }
    const idArray = ids.split(',').map(id => parseInt(id)).filter(Boolean);
    const bookings = await this.bookingsService.findAllBookings();
    const match = bookings.filter(b => idArray.includes(b.id));
    const allPaid = match.length > 0 && match.every(b => b.paymentStatus === 'paid');
    return { paid: allPaid };
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
      payment_status: b.paymentStatus,
      delivery_method: b.deliveryMethod,
      shipping_address: b.shippingAddress,
      shipping_cost: b.shippingCost,
      purchase_price: b.variant.purchasePrice,
      product_name: b.variant.product.name,
      product_category: b.variant.product.category,
      tracking_number: b.trackingNumber,
      shipping_label_url: b.shippingLabelUrl,
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
