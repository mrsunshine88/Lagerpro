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

  @Property({ nullable: true })
  discountCode?: string;

  @Property({ type: 'float', default: 0.0 })
  discountPercent = 0.0;

  @Property({ type: 'text', nullable: true })
  message?: string;

  @Property({ default: 'pending' })
  paymentStatus = 'pending'; // 'pending', 'paid'

  @Property({ default: 'pickup' })
  deliveryMethod = 'pickup'; // 'pickup', 'shipping'

  @Property({ type: 'text', nullable: true })
  shippingAddress?: string;

  @Property({ type: 'float', default: 0.0 })
  shippingCost = 0.0;

  @Property({ nullable: true })
  trackingNumber?: string;

  @Property({ type: 'text', nullable: true })
  shippingLabelUrl?: string;

  @Property({ defaultRaw: 'CURRENT_TIMESTAMP' })
  createdAt = new Date();
}
