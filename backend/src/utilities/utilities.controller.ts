import { Controller, Post, Get, Res, Param, Body, UploadedFile, UseInterceptors, UseGuards, ParseIntPipe, BadRequestException, HttpCode, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';

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

  @UseGuards(JwtAuthGuard)
  @Post('upload/image')
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('Ingen fil uppladdad');
    }

    try {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_KEY;

      // Om vi inte har Supabase konfigurerat (t.ex. lokal dev utan env), använd lokal filsystem
      if (!supabaseUrl || !supabaseKey) {
        const uploadsDir = path.join(__dirname, '..', '..', '..', 'uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
        const filepath = path.join(uploadsDir, filename);

        await sharp(file.buffer)
          .resize({ width: 1200, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toFile(filepath);

        return {
          success: true,
          url: `/uploads/${filename}`
        };
      }

      // Supabase Uppladdning (Vercel)
      const supabase = createClient(supabaseUrl, supabaseKey);

      const optimizedBuffer = await sharp(file.buffer)
        .resize({ width: 1200, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

      const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;

      const { data, error } = await supabase.storage
        .from('lagerpro-images')
        .upload(filename, optimizedBuffer, {
          contentType: 'image/webp',
          upsert: false
        });

      if (error) {
        throw new Error(`Supabase Storage Error: ${error.message}`);
      }

      const { data: publicUrlData } = supabase.storage
        .from('lagerpro-images')
        .getPublicUrl(filename);

      return {
        success: true,
        url: publicUrlData.publicUrl
      };
    } catch (e: any) {
      return { success: false, error: e.message || 'Det gick inte att optimera och spara bilden' };
    }
  }
}
