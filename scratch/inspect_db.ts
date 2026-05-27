import { MikroORM } from '@mikro-orm/core';
import { tsMorphMetadataProvider } from '@mikro-orm/reflection';
import { Transaction } from '../backend/src/entities/transaction.entity.js';
import { Variant } from '../backend/src/entities/variant.entity.js';
import { Product } from '../backend/src/entities/product.entity.js';
import { Setting } from '../backend/src/entities/setting.entity.js';

async function main() {
  const orm = await MikroORM.init({
    entities: [Transaction, Variant, Product, Setting],
    dbName: 'lager',
    type: 'postgresql',
    clientUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/lager',
    metadataProvider: tsMorphMetadataProvider,
    debug: false,
  });
  const em = orm.em.fork();

  console.log('============= PRODUCTS & VARIANTS =============');
  const products = await em.find(Product, {}, { populate: ['variants'] });
  for (const p of products) {
    console.log(`Product: "${p.name}" (ID: ${p.id}) | Cat: "${p.category}" | Disc: ${p.discountPercent}`);
    for (const v of p.variants) {
      console.log(`  -> Variant SKU: "${v.sku}" | Stock: ${v.stock} | Selling: ${v.sellingPrice} | Original: ${v.originalPrice}`);
    }
  }

  console.log('\n============= SETTINGS =============');
  const settings = await em.find(Setting, {});
  for (const s of settings) {
    console.log(`Setting: Key: "${s.key}" | Value: "${s.value}"`);
  }

  console.log('\n============= TRANSACTIONS =============');
  const transactions = await em.find(Transaction, {}, { populate: ['variant', 'variant.product'] });
  console.log(`Total transactions count: ${transactions.length}`);
  for (const t of transactions) {
    console.log(`Transaction ID: ${t.id} | Type: "${t.type}" | Qty: ${t.quantity} | Price: ${t.sellingPrice} | Sku: "${t.variant?.sku}" | Product: "${t.variant?.product?.name}" | Cat: "${t.variant?.product?.category}"`);
  }

  await orm.close();
}
main().catch(console.error);
