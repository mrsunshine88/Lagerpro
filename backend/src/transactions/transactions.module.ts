import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Transaction } from '../entities/transaction.entity.js';
import { Variant } from '../entities/variant.entity.js';
import { TransactionsService } from './transactions.service.js';
import { TransactionsController } from './transactions.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    MikroOrmModule.forFeature([Transaction, Variant]),
    AuthModule,
  ],
  providers: [TransactionsService],
  controllers: [TransactionsController],
  exports: [TransactionsService],
})
export class TransactionsModule {}
