import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, EntityManager } from '@mikro-orm/postgresql';
import * as XLSX from 'xlsx';
import * as QRCode from 'qrcode';
import { Product } from '../entities/product.entity.js';
import { Variant } from '../entities/variant.entity.js';
import { Transaction } from '../entities/transaction.entity.js';

@Injectable()
export class UtilitiesService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: EntityRepository<Product>,
    @InjectRepository(Variant)
    private readonly variantRepository: EntityRepository<Variant>,
    private readonly em: EntityManager,
  ) {}

  async generateQrCode(variantId: number): Promise<{ buffer: Buffer; sku: string }> {
    const variant = await this.variantRepository.findOne(variantId, { populate: ['product'] });
    if (!variant) {
      throw new BadRequestException('Skovariant hittades inte');
    }

    const qrBuffer = await QRCode.toBuffer(variant.sku, {
      type: 'png',
      margin: 2,
      width: 300,
    });

    return { buffer: qrBuffer, sku: variant.sku };
  }

  async parseExcelFile(fileBuffer: Buffer): Promise<any[]> {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    if (workbook.SheetNames.length === 0) {
      throw new BadRequestException('Excel-filen är tom eller ogiltig.');
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    // Read raw rows
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    if (rows.length < 2) {
      throw new BadRequestException('Excel-filen saknar rader.');
    }

    // Identify header row (typically row 0)
    const headers = rows[0].map((h) => String(h || '').toLowerCase().trim());

    // Fallbacks
    let catColIdx = headers.findIndex((h) => h.includes('skoart') || h.includes('kategori') || h.includes('typ'));
    let modelColIdx = headers.findIndex((h) => h.includes('modell') || h.includes('namn'));
    let sizeColIdx = headers.findIndex((h) => h.includes('storlek') || h.includes('storlekar'));
    let colorColIdx = headers.findIndex((h) => h.includes('färg') || h.includes('färger'));
    let stockColIdx = headers.findIndex((h) => h.includes('antal') || h.includes('lager'));

    if (catColIdx === -1) catColIdx = 0;
    if (modelColIdx === -1) modelColIdx = 1;
    if (sizeColIdx === -1) sizeColIdx = 2;
    if (colorColIdx === -1) colorColIdx = 3;
    if (stockColIdx === -1) stockColIdx = 4;

    const proposals: any[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const modelVal = row[modelColIdx];
      if (modelVal === undefined || modelVal === null || String(modelVal).trim() === '') {
        continue;
      }

      const modelStr = String(modelVal).trim();
      // Skip summary rows or headers repeated
      if (modelStr.includes('240') || modelStr.toLowerCase().includes('summa')) {
        continue;
      }

      const category = String(row[catColIdx] || '').trim() || 'Skor';
      const sizeStr = String(row[sizeColIdx] || '').trim();
      const colorStr = String(row[colorColIdx] || '').trim() || 'Svart';
      const totalStock = parseInt(String(row[stockColIdx] || '0')) || 0;

      const sizesParsed: { size: string; qty: number }[] = [];

      // 1. Explicit matches for e.g. "38-2st, 39-3st"
      // Regex in JS: /(\d+)\s*-\s*(\d+)\s*(?:st)?/g
      const explicitRegex = /(\d+)\s*-\s*(\d+)\s*(?:st)?/gi;
      let match;
      let matchedSum = 0;
      let cleanedSizeStr = sizeStr;

      const matches: { size: string; qty: number }[] = [];
      while ((match = explicitRegex.exec(sizeStr)) !== null) {
        const size = match[1];
        const qty = parseInt(match[2]);
        matches.push({ size, qty });
        matchedSum += qty;
      }

      if (matches.length > 0) {
        sizesParsed.push(...matches);
        // Remove the matched parts to find remaining sizes
        cleanedSizeStr = sizeStr.replace(/(\d+)\s*-\s*(\d+)\s*(?:st)?\.?/gi, '');
        
        // Find left-over single size numbers
        const remainingRegex = /\b(\d+)\b/g;
        const remainingSizes: string[] = [];
        let remMatch;
        while ((remMatch = remainingRegex.exec(cleanedSizeStr)) !== null) {
          remainingSizes.push(remMatch[1]);
        }

        if (remainingSizes.length > 0) {
          const leftoverQty = Math.max(0, totalStock - matchedSum);
          const qtyPerLeftover = Math.floor(leftoverQty / remainingSizes.length);
          for (const rSz of remainingSizes) {
            sizesParsed.push({ size: rSz, qty: qtyPerLeftover });
          }
        }
      } else {
        // 2. Simple split e.g. "37, 38, 39" or "37 38 39"
        const sizes = sizeStr.split(/[,/\s]+/).map((s) => s.trim()).filter(Boolean);
        if (sizes.length === 0) {
          sizes.push('Universal');
        }

        const qtyPerSize = Math.floor(totalStock / sizes.length);
        const remainder = totalStock % sizes.length;

        for (let idx = 0; idx < sizes.length; idx++) {
          const q = qtyPerSize + (idx < remainder ? 1 : 0);
          sizesParsed.push({ size: sizes[idx], qty: q });
        }
      }

      // Split colors
      const colors = colorStr.split(/[,/]+/).map((c) => c.trim()).filter(Boolean);
      if (colors.length === 0) {
        colors.push('Svart');
      }

      const rowVariants: any[] = [];

      if (sizesParsed.length === 1 && colors.length === 1) {
        rowVariants.push({
          size: sizesParsed[0].size,
          color: colors[0],
          stock: totalStock,
          confidence: 'high',
        });
      } else {
        for (let idx = 0; idx < sizesParsed.length; idx++) {
          const szInfo = sizesParsed[idx];
          const col = idx < colors.length ? colors[idx] : colors[0];
          rowVariants.push({
            size: szInfo.size,
            color: col,
            stock: szInfo.qty,
            confidence: colors.length === 1 ? 'medium' : 'needs_verification',
          });
        }
      }

      proposals.push({
        row_index: i + 1,
        category,
        model: modelStr,
        original_sizes: sizeStr,
        original_colors: colorStr,
        total_stock: totalStock,
        variants: rowVariants,
        available_colors: colors,
        needs_verification: rowVariants.some((v) => v.confidence === 'needs_verification'),
      });
    }

    return proposals;
  }

  async confirmImport(items: any[]): Promise<void> {
    if (!items || items.length === 0) {
      throw new BadRequestException('Ingen data att spara');
    }

    await this.em.transactional(async (em) => {
      for (const item of items) {
        const category = item.category || 'Skor';
        const model = item.model;
        const variants = item.variants || [];

        if (!model) continue;

        let product = await em.findOne(Product, { name: model, category });
        if (!product) {
          product = new Product();
          product.name = model;
          product.category = category;
          product.description = '';
          em.persist(product);
        }

        for (const v of variants) {
          const size = String(v.size || '').trim();
          const color = String(v.color || '').trim();
          const stock = parseInt(v.stock) || 0;
          const pPrice = parseFloat(v.purchase_price) || 0.0;
          const sPrice = parseFloat(v.selling_price) || 0.0;

          // Check if exact variant exists
          let variant = await em.findOne(Variant, { product, size, color });

          if (variant) {
            // Update stock and pricing
            variant.stock += stock;
            variant.purchasePrice = pPrice;
            variant.sellingPrice = sPrice;
          } else {
            // Generate SKU
            const cleanName = model.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
            const cleanColor = color.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'UNI';
            const cleanSize = size.replace(/[^a-zA-Z0-9]/g, '') || 'U';
            // Random timestamp suffix matching python %f suffix last 3 chars
            const timestamp = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            const sku = `LGR-${cleanName}-${cleanSize}-${cleanColor}-${timestamp}`;

            variant = new Variant();
            variant.product = product;
            variant.sku = sku;
            variant.stock = stock;
            variant.size = size;
            variant.color = color;
            variant.purchasePrice = pPrice;
            variant.sellingPrice = sPrice;
            variant.originalPrice = sPrice;

            em.persist(variant);
          }

          // Log Transaction
          if (stock > 0) {
            const transaction = new Transaction();
            transaction.variant = variant;
            transaction.type = 'purchase';
            transaction.quantity = stock;
            transaction.purchasePrice = pPrice;
            transaction.sellingPrice = sPrice;
            em.persist(transaction);
          }
        }
      }
    });
  }
}
