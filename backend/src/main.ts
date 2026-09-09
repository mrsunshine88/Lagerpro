import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { MikroORM } from '@mikro-orm/core';
import { User } from './entities/user.entity.js';
import * as bcrypt from 'bcrypt';
import { join } from 'path';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

const server = express();
let cachedApp: any;

async function bootstrap() {
  if (!cachedApp) {
    const app = await NestFactory.create<NestExpressApplication>(
      AppModule,
      new ExpressAdapter(server)
    );
    app.useStaticAssets(join(__dirname, '..', '..', 'uploads'), { prefix: '/uploads/' });
    app.enableCors();

    // Automatiskt skapa/uppdatera databasschema på startup
    const orm = app.get(MikroORM);
    const generator = orm.schema;
    
    try {
      console.log('[DATABASE] Kontrollerar databas och schema...');
      await generator.ensureDatabase();
      await generator.update();
      
      const connection = orm.em.getConnection();
      await connection.execute('CREATE TABLE IF NOT EXISTS settings (key VARCHAR(255) PRIMARY KEY, value TEXT NULL);');

      console.log('[DATABASE] Databasschema är uppdaterat!');

      const em = orm.em.fork();
      const adminUser = await em.findOne(User, { email: 'apersson508@gmail.com' });
      if (!adminUser) {
        console.log('[DATABASE] Seedare: Hittade inte standard-admin. Skapar apersson508@gmail.com...');
        const user = new User();
        user.email = 'apersson508@gmail.com';
        user.password = await bcrypt.hash('020406', 10);
        user.role = 'admin';
        user.allowedProjects = 'all';
        
        em.persist(user);
        await em.flush();
        console.log('[DATABASE] Seedare: Standard-admin skapad framgångsrikt!');
      }
    } catch (err) {
      console.error('[DATABASE] Misslyckades med att initiera databasen:', err);
    }

    await app.init();
    cachedApp = app;
  }
  return cachedApp;
}

// Om vi kör lokalt (inte Vercel), starta servern direkt
if (!process.env.VERCEL) {
  bootstrap().then(app => {
    const port = process.env.PORT ?? 3000;
    app.listen(port, () => {
      console.log(`[SYSTEM] NestJS Backend server is running on http://localhost:${port}`);
    });
  });
}

// Vercel Serverless Handler
export default async function handler(req: any, res: any) {
  await bootstrap();
  server(req, res);
}
