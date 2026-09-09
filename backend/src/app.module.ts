import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import config from './mikro-orm.config.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { ProductsModule } from './products/products.module.js';
import { BookingsModule } from './bookings/bookings.module.js';
import { TransactionsModule } from './transactions/transactions.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { AnalyticsModule } from './analytics/analytics.module.js';
import { UtilitiesModule } from './utilities/utilities.module.js';
import { PaypalModule } from './paypal/paypal.module.js';
import { ShippingModule } from './shipping/shipping.module.js';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), '..', 'static'),
      serveRoot: '/static',
    }),
    MikroOrmModule.forRoot(config),
    AuthModule,
    ProductsModule,
    BookingsModule,
    TransactionsModule,
    SettingsModule,
    AnalyticsModule,
    UtilitiesModule,
    PaypalModule,
    ShippingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
