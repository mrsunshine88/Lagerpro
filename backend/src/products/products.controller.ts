import { Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards, ParseIntPipe, HttpCode, HttpStatus, NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';

@Controller('api')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('products')
  async getProducts(@Req() req: any) {
    return this.productsService.findAll(req.user.role, req.user.allowedProjects);
  }

  @Get('public/products')
  async getPublicProducts() {
    const products = await this.productsService.findPublicBookable();
    // Return with simple variants representation matching python API output
    return products.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      description: p.description,
      createdAt: p.createdAt,
      variants: p.variants.getItems().map((v) => ({
        id: v.id,
        size: v.size,
        color: v.color,
        stock: v.stock,
        selling_price: v.sellingPrice,
        original_price: v.originalPrice,
        sku: v.sku,
      })),
    }));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('products')
  async addProduct(@Body() body: any) {
    return this.productsService.addProduct(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put('products/:id')
  async editProduct(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    await this.productsService.editProduct(id, body);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete('products/:id')
  async deleteProduct(@Param('id', ParseIntPipe) id: number) {
    await this.productsService.deleteProduct(id);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('variants/:id/stock')
  @HttpCode(HttpStatus.OK)
  async updateStock(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { change: number; absolute?: number },
  ) {
    const newStock = await this.productsService.updateStock(id, body.change, body.absolute);
    return { success: true, new_stock: newStock };
  }

  @UseGuards(JwtAuthGuard)
  @Put('variants/:id')
  async editVariant(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { purchase_price: number; selling_price: number; original_price?: number; size: string; color: string },
  ) {
    await this.productsService.editVariantDetails(id, {
      purchasePrice: body.purchase_price,
      sellingPrice: body.selling_price,
      originalPrice: body.original_price,
      size: body.size,
      color: body.color,
    });
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('variants/:id')
  async deleteVariant(@Param('id', ParseIntPipe) id: number) {
    await this.productsService.deleteVariant(id);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('scan')
  @HttpCode(HttpStatus.OK)
  async scanBarcode(@Body() body: { sku?: string }) {
    const sku = (body.sku || '').trim();
    if (!sku) {
      return { success: false, error: 'Ingen kod skannad' };
    }

    const variant = await this.productsService.findBySku(sku);
    if (variant) {
      return {
        success: true,
        found: true,
        variant: {
          id: variant.id,
          sku: variant.sku,
          stock: variant.stock,
          size: variant.size,
          color: variant.color,
          purchase_price: variant.purchasePrice,
          selling_price: variant.sellingPrice,
          original_price: variant.originalPrice,
          product_id: variant.product.id,
          product_name: variant.product.name,
          product_category: variant.product.category,
        },
      };
    }

    return {
      success: true,
      found: false,
      message: `Koden '${sku}' hittades inte i lagret.`,
    };
  }
}
