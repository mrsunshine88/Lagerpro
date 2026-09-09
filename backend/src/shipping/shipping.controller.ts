import { Controller, Post, Param, UseGuards, HttpCode, HttpStatus, ParseIntPipe } from '@nestjs/common';
import { ShippingService } from './shipping.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';

@Controller('admin/shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post(':bookingId/label')
  @HttpCode(HttpStatus.OK)
  async generateLabel(@Param('bookingId', ParseIntPipe) bookingId: number) {
    return this.shippingService.generateShippingLabel(bookingId);
  }
}
