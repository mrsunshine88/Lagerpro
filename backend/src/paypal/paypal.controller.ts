import { Controller, Get, Post, Body, Headers, HttpCode, HttpStatus, Logger, UseGuards } from '@nestjs/common';
import { PaypalService } from './paypal.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';

@Controller('api')
export class PaypalController {
  private readonly logger = new Logger(PaypalController.name);

  constructor(private readonly paypalService: PaypalService) {}

  /**
   * Public endpoint for receiving PayPal Webhook payment notifications.
   */
  @Post('webhooks/paypal')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() body: any,
    @Headers() headers: any,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.paypalService.handleWebhook(body, headers);
      if (!result.success) {
        this.logger.warn(`Webhook misslyckades: ${result.message}`);
      } else {
        this.logger.log(`Webhook slutfördes framgångsrikt: ${result.message}`);
      }
      return result;
    } catch (error) {
      this.logger.error(`Kritiskt fel vid hantering av PayPal Webhook: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  /**
   * Admin-only endpoint to get current PayPal credentials.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('paypal/config')
  async getConfig() {
    return this.paypalService.getPaypalConfig();
  }

  /**
   * Admin-only endpoint to save new PayPal credentials.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('paypal/config')
  @HttpCode(HttpStatus.OK)
  async setConfig(
    @Body() body: { client_id: string; client_secret: string; webhook_id: string; mode: string }
  ) {
    await this.paypalService.setPaypalConfig(body);
    return { success: true, message: 'PayPal-inställningarna har sparats.' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('paypal/sync')
  @HttpCode(HttpStatus.OK)
  async syncCatalog(@Body() body: { targetProject?: string }) {
    try {
      const count = await this.paypalService.syncPaypalCatalog(body?.targetProject);
      return { success: true, count, message: `Synkning klar! Importerade ${count} nya sko-varianter.` };
    } catch (error) {
      this.logger.error(`Misslyckades vid synkning av PayPal-katalog: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  /**
   * Admin-only endpoint to reset simulated test transactions and restore stock levels.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('paypal/simulate/reset')
  @HttpCode(HttpStatus.OK)
  async resetSimulations() {
    try {
      const result = await this.paypalService.resetSimulatedTransactions();
      return { success: true, count: result.revertedCount, message: `Återställning klar! Återställde saldon för ${result.revertedCount} transaktioner.` };
    } catch (error) {
      this.logger.error(`Misslyckades vid nollställning av simuleringar: ${error.message}`);
      return { success: false, message: error.message };
    }
  }
}
