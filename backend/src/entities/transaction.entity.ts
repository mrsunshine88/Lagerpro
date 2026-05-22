import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/decorators/legacy';
import { Variant } from './variant.entity.js';

@Entity({ tableName: 'transactions' })
export class Transaction {
  @PrimaryKey()
  id!: number;

  @ManyToOne(() => Variant, { deleteRule: 'cascade' })
  variant!: Variant;

  @Property()
  type!: string; // 'sale', 'purchase', 'adjustment'

  @Property()
  quantity!: number;

  @Property({ type: 'float', default: 0.0 })
  purchasePrice = 0.0;

  @Property({ type: 'float', default: 0.0 })
  sellingPrice = 0.0;

  @Property({ defaultRaw: 'CURRENT_TIMESTAMP' })
  createdAt = new Date();
}
