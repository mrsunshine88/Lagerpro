import { Entity, PrimaryKey, Property, ManyToOne, OneToMany } from '@mikro-orm/decorators/legacy';
import { Collection, Cascade } from '@mikro-orm/core';
import { Product } from './product.entity.js';
import { Transaction } from './transaction.entity.js';
import { Booking } from './booking.entity.js';

type Rel<T> = T;

@Entity({ tableName: 'variants' })
export class Variant {
  @PrimaryKey()
  id!: number;

  @ManyToOne(() => Product, { deleteRule: 'cascade' })
  product!: Rel<Product>;

  @Property({ unique: true })
  sku!: string;

  @Property({ default: 0 })
  stock!: number;

  @Property({ nullable: true })
  size?: string;

  @Property({ nullable: true })
  color?: string;

  @Property({ nullable: true })
  imageUrl?: string;

  @Property({ type: 'float', default: 0.0 })
  purchasePrice = 0.0;

  @Property({ type: 'float', default: 0.0 })
  sellingPrice = 0.0;

  @Property({ type: 'float', default: 0.0 })
  originalPrice = 0.0;

  @OneToMany(() => Transaction, (transaction: Transaction) => transaction.variant, {
    cascade: [Cascade.ALL],
    orphanRemoval: true,
  })
  transactions = new Collection<Transaction>(this);

  @OneToMany(() => Booking, (booking: Booking) => booking.variant, {
    cascade: [Cascade.ALL],
    orphanRemoval: true,
  })
  bookings = new Collection<Booking>(this);
}
