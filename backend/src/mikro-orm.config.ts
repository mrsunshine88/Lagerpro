import { defineConfig } from '@mikro-orm/postgresql';
import { ReflectMetadataProvider } from '@mikro-orm/core';

import { Booking } from './entities/booking.entity.js';
import { DiscountCode } from './entities/discount-code.entity.js';
import { Product } from './entities/product.entity.js';
import { Setting } from './entities/setting.entity.js';
import { Transaction } from './entities/transaction.entity.js';
import { User } from './entities/user.entity.js';
import { Variant } from './entities/variant.entity.js';

export default defineConfig({
  entities: [Booking, DiscountCode, Product, Setting, Transaction, User, Variant],
  dbName: 'lager',
  clientUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/lager',
  metadataProvider: ReflectMetadataProvider,
  debug: true,
  driverOptions: {
    connection: process.env.DATABASE_URL?.includes('supabase.co') ? {
      ssl: { rejectUnauthorized: false },
    } : undefined,
  },
});
