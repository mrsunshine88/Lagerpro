import { defineConfig } from '@mikro-orm/postgresql';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';

export default defineConfig({
  entities: ['dist/**/*.entity.js'],
  entitiesTs: ['src/**/*.entity.ts'],
  dbName: 'lager',
  clientUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/lager',
  metadataProvider: TsMorphMetadataProvider,
  debug: true,
});
