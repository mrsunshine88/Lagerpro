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

  @Property({ defaultRaw: 'CURRENT_TIMESTAMP' })
  createdAt = new Date();

  @OneToMany(() => Variant, (variant: Variant) => variant.product, {
    cascade: [Cascade.ALL],
    orphanRemoval: true,
  })
  variants = new Collection<Variant>(this);
}
