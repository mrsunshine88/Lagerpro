import { Controller, Get, Post, Delete, Body, Req, Param, ParseIntPipe, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
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

  @UseGuards(JwtAuthGuard)
  @Delete('transactions/:id')
  async deleteTransaction(@Param('id', ParseIntPipe) id: number) {
    await this.transactionsService.deleteTransaction(id);
    return { success: true, message: 'Transaktionen har tagits bort och lagersaldot justerats.' };
  }
}
