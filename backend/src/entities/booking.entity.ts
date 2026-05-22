import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/decorators/legacy';
import { Variant } from './variant.entity.js';

@Entity({ tableName: 'bookings' })
export class Booking {
  @PrimaryKey()
  id!: number;

  @ManyToOne(() => Variant, { deleteRule: 'cascade' })
  variant!: Variant;

  @Property()
  customerFirstName!: string;

  @Property()
  customerLastName!: string;

  @Property()
  customerPhone!: string;

  @Property({ default: 'pending' })
  status = 'pending'; // 'pending', 'reserved', 'confirmed', 'cancelled'

  @Property({ defaultRaw: 'CURRENT_TIMESTAMP' })
  createdAt = new Date();
}
