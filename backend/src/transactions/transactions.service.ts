import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, EntityManager } from '@mikro-orm/postgresql';
import { Transaction } from '../entities/transaction.entity.js';
import { Variant } from '../entities/variant.entity.js';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: EntityRepository<Transaction>,
    @InjectRepository(Variant)
    private readonly variantRepository: EntityRepository<Variant>,
    private readonly em: EntityManager,
  ) {}

  async getTotalSold(): Promise<number> {
    const result = (await this.em.getConnection().execute(
      "SELECT SUM(quantity) as total FROM transactions WHERE type = 'sale'",
    )) as any[];
    return result && result[0] && result[0].total ? parseInt(result[0].total) : 0;
  }

  async posCheckout(
    items: { variantId: number; quantity: number; selling_price?: number }[],
  ): Promise<void> {
    if (!items || items.length === 0) {
      throw new BadRequestException('Varukorgen är tom');
    }

    await this.em.transactional(async (em) => {
      // 1. Verify stock levels for all items first
      for (const item of items) {
        const varId = item.variantId;
        const qty = item.quantity;

        const variant = await em.findOne(Variant, { id: varId }, { populate: ['product'] });
        if (!variant) {
          throw new NotFoundException('Sko hittades inte');
        }

        if (variant.stock < qty) {
          throw new BadRequestException(`Lagersaldo otillräckligt för ${variant.product.name}.`);
        }
      }

      // 2. Perform updates
      for (const item of items) {
        const varId = item.variantId;
        const qty = item.quantity;

        const variant = (await em.findOne(Variant, { id: varId }))!;
        variant.stock = Math.max(0, variant.stock - qty);

        const actualSellingPrice =
          item.selling_price !== undefined && item.selling_price !== null
            ? parseFloat(item.selling_price as any)
            : variant.sellingPrice;

        const transaction = new Transaction();
        transaction.variant = variant;
        transaction.type = 'sale';
        transaction.quantity = qty;
        transaction.purchasePrice = variant.purchasePrice;
        transaction.sellingPrice = actualSellingPrice;

        em.persist(transaction);
      }
    });
  }
}
