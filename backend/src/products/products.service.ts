import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, EntityManager } from '@mikro-orm/postgresql';
import { Product } from '../entities/product.entity.js';
import { Variant } from '../entities/variant.entity.js';
import { Transaction } from '../entities/transaction.entity.js';
import { Setting } from '../entities/setting.entity.js';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: EntityRepository<Product>,
    @InjectRepository(Variant)
    private readonly variantRepository: EntityRepository<Variant>,
    private readonly em: EntityManager,
  ) { }

  async findAll(userRole: string, allowedProjects: string): Promise<Product[]> {
    // If admin or 'all' projects allowed, fetch everything
    if (userRole === 'admin' || allowedProjects === 'all') {
      return this.productRepository.find({}, {
        populate: ['variants'],
        orderBy: { id: 'DESC', variants: { size: 'ASC', color: 'ASC' } },
      });
    }

    // Restricted standard user project list
    const projectsList = allowedProjects.split(',').map((p) => p.trim()).filter(Boolean);
    if (projectsList.length === 0) {
      return [];
    }

    return this.productRepository.find(
      { category: { $in: projectsList } },
      {
        populate: ['variants'],
        orderBy: { id: 'DESC', variants: { size: 'ASC', color: 'ASC' } },
      },
    );
  }

  async findPublicBookable(): Promise<Product[]> {
    // Fetch products with variants having stock > 0
    const products = await this.productRepository.find({}, {
      populate: ['variants'],
      orderBy: { id: 'DESC', variants: { size: 'ASC', color: 'ASC' } },
    });

    // Only return products that have at least one bookable variant
    return products.filter((product) => {
      const activeVariants = product.variants.getItems().filter((v) => v.stock > 0);
      if (activeVariants.length > 0) {
        // Filter in-memory to only include the active ones
        product.variants.set(activeVariants);
        return true;
      }
      return false;
    });
  }

  async addProduct(data: {
    name: string;
    category?: string;
    description?: string;
    discountPercent?: number | null;
    variantLabel1?: string;
    variantLabel2?: string;
    variants?: any[];
  }): Promise<Product> {
    if (!data.name) {
      throw new BadRequestException('Produktnamn saknas');
    }

    return this.em.transactional(async (em) => {
      const product = new Product();
      product.name = data.name;
      product.category = data.category || 'Skor';
      product.description = data.description || '';
      product.variantLabel1 = data.variantLabel1 || 'Storlek';
      product.variantLabel2 = data.variantLabel2 || 'Färg';
      product.discountPercent = data.discountPercent !== undefined && data.discountPercent !== null && (data.discountPercent as any) !== ''
        ? parseFloat(data.discountPercent as any)
        : null;

      em.persist(product);

      const key = `discount_${product.category}`;
      const setting = await em.findOne(Setting, { key });
      const categoryDiscount = setting && setting.value ? parseFloat(setting.value) : 0.0;

      const discount = (product.discountPercent !== null && product.discountPercent !== undefined && product.discountPercent > 0)
        ? product.discountPercent
        : categoryDiscount;

      const variantsData = data.variants || [];
      for (const v of variantsData) {
        const variant = new Variant();
        variant.product = product;
        variant.size = v.size || '';
        variant.color = v.color || '';
        variant.stock = parseInt(v.stock) || 0;
        variant.purchasePrice = parseFloat(v.purchasePrice ?? v.purchase_price) || 0.0;
        variant.originalPrice = parseFloat(v.originalPrice ?? v.original_price) || parseFloat(v.sellingPrice ?? v.selling_price) || 0.0;

        if (discount > 0 && variant.originalPrice > 0) {
          variant.sellingPrice = Math.round(variant.originalPrice * (1.0 - discount / 100.0));
        } else {
          variant.sellingPrice = parseFloat(v.sellingPrice ?? v.selling_price) || 0.0;
        }

        // Generate SKU if not provided
        if (v.sku) {
          variant.sku = v.sku;
        } else {
          const cleanName = product.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
          const cleanColor = (variant.color || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'UNI';
          const cleanSize = (variant.size || '').replace(/[^a-zA-Z0-9]/g, '') || 'U';
          const timestamp = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
          variant.sku = `LGR-${cleanName}-${cleanSize}-${cleanColor}-${timestamp}`;
        }

        em.persist(variant);

        // Log transaction if stock > 0
        if (variant.stock > 0) {
          const transaction = new Transaction();
          transaction.variant = variant;
          transaction.type = 'purchase';
          transaction.quantity = variant.stock;
          transaction.purchasePrice = variant.purchasePrice;
          transaction.sellingPrice = variant.sellingPrice;
          em.persist(transaction);
        }
      }

      await em.flush();
      return product;
    });
  }

  async editProduct(
    id: number,
    data: {
      name: string;
      category?: string;
      description?: string;
      discountPercent?: number | null;
      variantLabel1?: string;
      variantLabel2?: string;
      variants?: any[];
    },
  ): Promise<void> {
    if (!data.name) {
      throw new BadRequestException('Produktnamn saknas');
    }

    await this.em.transactional(async (em) => {
      const product = await em.findOne(Product, id, { populate: ['variants'] });
      if (!product) {
        throw new NotFoundException('Produkten hittades inte');
      }

      product.name = data.name;
      product.category = data.category || 'Skor';
      product.description = data.description || '';
      if (data.variantLabel1 !== undefined) product.variantLabel1 = data.variantLabel1;
      if (data.variantLabel2 !== undefined) product.variantLabel2 = data.variantLabel2;
      product.discountPercent = data.discountPercent !== undefined && data.discountPercent !== null && (data.discountPercent as any) !== ''
        ? parseFloat(data.discountPercent as any)
        : null;

      const key = `discount_${product.category}`;
      const setting = await em.findOne(Setting, { key });
      const categoryDiscount = setting && setting.value ? parseFloat(setting.value) : 0.0;

      const discount = (product.discountPercent !== null && product.discountPercent !== undefined && product.discountPercent > 0)
        ? product.discountPercent
        : categoryDiscount;

      const existingVariants = product.variants.getItems();
      const existingIds = existingVariants.map((ev) => ev.id);
      const processedIds = new Set<number>();

      const variantsData = data.variants || [];
      for (const v of variantsData) {
        const vId = parseInt(v.id);
        const purchasePrice = parseFloat(v.purchasePrice ?? v.purchase_price) || 0.0;
        const originalPrice = parseFloat(v.originalPrice ?? v.original_price) || parseFloat(v.sellingPrice ?? v.selling_price) || 0.0;
        const stock = parseInt(v.stock) || 0;

        let sellingPrice = parseFloat(v.sellingPrice ?? v.selling_price) || 0.0;
        if (discount > 0 && originalPrice > 0) {
          sellingPrice = Math.round(originalPrice * (1.0 - discount / 100.0));
        }

        if (vId && existingIds.includes(vId)) {
          // Update existing variant
          processedIds.add(vId);
          const variant = existingVariants.find((ev) => ev.id === vId)!;

          // Log adjustment if stock changed
          if (stock !== variant.stock) {
            const diff = stock - variant.stock;
            const transaction = new Transaction();
            transaction.variant = variant;
            transaction.type = 'adjustment';
            transaction.quantity = diff;
            transaction.purchasePrice = purchasePrice;
            transaction.sellingPrice = sellingPrice;
            em.persist(transaction);
          }

          variant.stock = stock;
          variant.purchasePrice = purchasePrice;
          variant.sellingPrice = sellingPrice;
          variant.originalPrice = originalPrice;
          variant.size = v.size || '';
          variant.color = v.color || '';
          if (v.sku) variant.sku = v.sku;
        } else {
          // Insert new variant
          const variant = new Variant();
          variant.product = product;
          variant.size = v.size || '';
          variant.color = v.color || '';
          variant.stock = stock;
          variant.purchasePrice = purchasePrice;
          variant.sellingPrice = sellingPrice;
          variant.originalPrice = originalPrice;

          if (v.sku) {
            variant.sku = v.sku;
          } else {
            const cleanName = product.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
            const cleanColor = (variant.color || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'UNI';
            const cleanSize = (variant.size || '').replace(/[^a-zA-Z0-9]/g, '') || 'U';
            const timestamp = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            variant.sku = `LGR-${cleanName}-${cleanSize}-${cleanColor}-${timestamp}`;
          }

          em.persist(variant);

          if (variant.stock > 0) {
            const transaction = new Transaction();
            transaction.variant = variant;
            transaction.type = 'purchase';
            transaction.quantity = variant.stock;
            transaction.purchasePrice = variant.purchasePrice;
            transaction.sellingPrice = variant.sellingPrice;
            em.persist(transaction);
          }
        }
      }

      // Delete variants removed in UI
      const removedVariants = existingVariants.filter((ev) => !processedIds.has(ev.id));
      for (const rv of removedVariants) {
        em.remove(rv);
      }
    });
  }

  async deleteProduct(id: number): Promise<void> {
    const product = await this.productRepository.findOne(id);
    if (!product) {
      throw new NotFoundException('Produkten hittades inte');
    }
    this.em.remove(product);
    await this.em.flush();
  }

  async updateStock(
    variantId: number,
    change: number,
    absolute?: number,
  ): Promise<number> {
    return this.em.transactional(async (em) => {
      const variant = await em.findOne(Variant, variantId);
      if (!variant) {
        throw new NotFoundException('Varianten hittades inte');
      }

      const oldStock = variant.stock;
      let newStock = oldStock;

      if (absolute !== undefined && absolute !== null) {
        newStock = Math.max(0, absolute);
        change = newStock - oldStock;
      } else {
        newStock = Math.max(0, oldStock + change);
      }

      variant.stock = newStock;

      if (change !== 0) {
        const transaction = new Transaction();
        transaction.variant = variant;
        transaction.type = 'adjustment';
        transaction.quantity = change;
        transaction.purchasePrice = variant.purchasePrice;
        transaction.sellingPrice = variant.sellingPrice;
        em.persist(transaction);
      }

      return newStock;
    });
  }

  async editVariantDetails(
    id: number,
    data: {
      purchasePrice: number;
      sellingPrice: number;
      originalPrice?: number;
      size: string;
      color: string;
    },
  ): Promise<void> {
    const variant = await this.variantRepository.findOne(id, { populate: ['product'] });
    if (!variant) {
      throw new NotFoundException('Varianten hittades inte');
    }

    const category = variant.product.category;
    const setting = await this.variantRepository.getEntityManager().findOne(Setting, { key: `discount_${category}` });
    const categoryDiscount = setting && setting.value ? parseFloat(setting.value) : 0.0;

    const discount = (variant.product.discountPercent !== null && variant.product.discountPercent !== undefined && variant.product.discountPercent > 0)
      ? variant.product.discountPercent
      : categoryDiscount;

    variant.purchasePrice = data.purchasePrice;
    variant.originalPrice = data.originalPrice || data.sellingPrice || 0.0;

    if (discount > 0 && variant.originalPrice > 0) {
      variant.sellingPrice = Math.round(variant.originalPrice * (1.0 - discount / 100.0));
    } else {
      variant.sellingPrice = data.sellingPrice;
    }

    variant.size = data.size.trim();
    variant.color = data.color.trim();

    await this.variantRepository.getEntityManager().flush();
  }

  async deleteVariant(id: number): Promise<void> {
    const variant = await this.variantRepository.findOne(id);
    if (!variant) {
      throw new NotFoundException('Varianten hittades inte');
    }
    this.variantRepository.getEntityManager().remove(variant);
    await this.variantRepository.getEntityManager().flush();
  }

  async findBySku(sku: string): Promise<Variant | null> {
    return this.variantRepository.findOne({ sku }, { populate: ['product'] });
  }
}
