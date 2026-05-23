import { Entity, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';

@Entity({ tableName: 'discount_codes' })
export class DiscountCode {
  @PrimaryKey()
  id!: number;

  @Property({ unique: true })
  code!: string;

  @Property()
  project!: string; // T.ex. "Skor", "Krukor", "Allmänt" eller "Alla"

  @Property({ type: 'float', default: 0.0 })
  discountPercent = 0.0;

  @Property({ defaultRaw: 'CURRENT_TIMESTAMP' })
  createdAt = new Date();
}
