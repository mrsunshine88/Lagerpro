import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { MikroORM } from '@mikro-orm/core';
import { User } from './entities/user.entity.js';
import * as bcrypt from 'bcrypt';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  // Automatiskt skapa/uppdatera databasschema på startup (enormt smidigt vid driftsättning!)
  const orm = app.get(MikroORM);
  const generator = orm.schema;
  
  try {
    console.log('[DATABASE] Kontrollerar databas och schema...');
    await generator.ensureDatabase();
    await generator.update();
    
    // Garantera att settings-tabellen existerar i Postgres (mikro-orm cache-gard)
    const connection = orm.em.getConnection();
    await connection.execute('CREATE TABLE IF NOT EXISTS settings (key VARCHAR(255) PRIMARY KEY, value TEXT NULL);');

    console.log('[DATABASE] Databasschema är uppdaterat!');

    // Seeda standard admin-användare om tabellen är tom eller användaren saknas
    const em = orm.em.fork();
    const adminUser = await em.findOne(User, { email: 'apersson508@gmail.com' });
    if (!adminUser) {
      console.log('[DATABASE] Seedare: Hittade inte standard-admin. Skapar apersson508@gmail.com...');
      const user = new User();
      user.email = 'apersson508@gmail.com';
      // Lösenord: 020406
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

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`[SYSTEM] NestJS Backend server is running on http://localhost:${port}`);
}
bootstrap();
