import { Entity, PrimaryKey, Property, OneToMany } from '@mikro-orm/decorators/legacy';
import { Collection, Cascade } from '@mikro-orm/core';
import { Variant } from './variant.entity.js';

@Entity({ tableName: 'products' })
export class Product {
  @PrimaryKey()
  id!: number;

  @Property()
  name!: string;

  @Property()
  category!: string;

  @Property({ nullable: true })
  description?: string;

  @Property({ nullable: true })
  brand?: string;

  @Property({ default: false })
  isSponsored: boolean = false;

  @Property({ nullable: true })
  imageUrl?: string;

  @Property({ defaultRaw: 'CURRENT_TIMESTAMP' })
  createdAt = new Date();

  @Property({ type: 'float', nullable: true })
  discountPercent?: number | null;

  @Property({ nullable: true, default: 'Storlek' })
  variantLabel1?: string;

  @Property({ nullable: true, default: 'Färg' })
  variantLabel2?: string;

  @OneToMany(() => Variant, (variant: Variant) => variant.product, {
    cascade: [Cascade.ALL],
    orphanRemoval: true,
  })
  variants = new Collection<Variant>(this);
}
