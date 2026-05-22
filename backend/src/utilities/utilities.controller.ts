import { Controller, Post, Get, Res, Param, Body, UploadedFile, UseInterceptors, UseGuards, ParseIntPipe, BadRequestException, HttpCode, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { UtilitiesService } from './utilities.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

@Controller('api')
export class UtilitiesController {
  constructor(private readonly utilitiesService: UtilitiesService) {}

  @Get('generate-qr/:variantId')
  async generateQr(@Param('variantId', ParseIntPipe) variantId: number, @Res() res: any) {
    const { buffer } = await this.utilitiesService.generateQrCode(variantId);
    res.setHeader('Content-Type', 'image/png');
    res.send(buffer);
  }

  @UseGuards(JwtAuthGuard)
  @Post('import-excel')
  @UseInterceptors(FileInterceptor('file'))
  async importExcel(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('Ingen fil uppladdad');
    }
    try {
      const proposals = await this.utilitiesService.parseExcelFile(file.buffer);
      return { success: true, proposals };
    } catch (e: any) {
      return { success: false, error: e.message || 'Det gick inte att läsa Excel-filen' };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('confirm-import')
  @HttpCode(HttpStatus.OK)
  async confirmImport(@Body() body: { items: any[] }) {
    await this.utilitiesService.confirmImport(body.items || []);
    return { success: true };
  }
}
