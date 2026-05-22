import { Entity, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';

@Entity({ tableName: 'users' })
export class User {
  @PrimaryKey()
  id!: number;

  @Property({ unique: true })
  email!: string;

  @Property()
  password!: string;

  @Property({ default: 'user' })
  role = 'user'; // 'admin', 'user'

  @Property({ default: 'all' })
  allowedProjects = 'all'; // comma-separated project names, or 'all'
}
