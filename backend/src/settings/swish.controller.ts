import { Controller, Post, Body, HttpCode, HttpStatus, Get, Query } from '@nestjs/common';
import { SwishService } from './swish.service.js';

@Controller('api')
export class SwishController {
  constructor(private readonly swishService: SwishService) {}

  @Post('public/payments/swish/initiate')
  @HttpCode(HttpStatus.OK)
  async initiatePayment(
    @Body() body: { booking_ids: number[]; phone_number: string },
  ) {
    return this.swishService.initiatePayment({
      bookingIds: body.booking_ids,
      phoneNumber: body.phone_number,
    });
  }

  @Post('public/payments/swish/simulate-mock')
  @HttpCode(HttpStatus.OK)
  async simulateMock(@Body() body: { payment_id: string }) {
    return this.swishService.simulateMockPayment(body.payment_id);
  }

  @Post('public/payments/swish/callback')
  @HttpCode(HttpStatus.OK)
  async handleCallback(
    @Body()
    body: {
      id: string;
      status: string;
      amount: number;
      payeePaymentReference: string;
    },
  ) {
    await this.swishService.handleSwishCallback(body);
    return { success: true };
  }
}
