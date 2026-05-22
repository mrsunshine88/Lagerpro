import { Entity, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';

@Entity({ tableName: 'settings' })
export class Setting {
  @PrimaryKey()
  key!: string;

  @Property({ nullable: true })
  value?: string;
}
