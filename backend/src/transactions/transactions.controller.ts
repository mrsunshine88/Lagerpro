import { Controller, Get, Post, Body, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { TransactionsService } from './transactions.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

@Controller('api')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('inventory/sold')
  async getTotalSold() {
    const total = await this.transactionsService.getTotalSold();
    return { total_sold: total };
  }

  @UseGuards(JwtAuthGuard)
  @Post('pos/checkout')
  @HttpCode(HttpStatus.OK)
  async checkout(
    @Body()
    body: {
      items: { variantId: number; quantity: number; selling_price?: number }[];
    },
  ) {
    await this.transactionsService.posCheckout(body.items || []);
    return { success: true, message: 'Köp registrerat framgångsrikt!' };
  }
}
