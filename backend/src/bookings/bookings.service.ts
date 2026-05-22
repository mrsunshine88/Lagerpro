import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, EntityManager } from '@mikro-orm/postgresql';
import { Booking } from '../entities/booking.entity.js';
import { Variant } from '../entities/variant.entity.js';
import { Transaction } from '../entities/transaction.entity.js';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: EntityRepository<Booking>,
    @InjectRepository(Variant)
    private readonly variantRepository: EntityRepository<Variant>,
    private readonly em: EntityManager,
  ) {}

  async createBooking(data: {
    variantId: number;
    firstName: string;
    lastName: string;
    phone: string;
  }): Promise<Booking> {
    const { variantId, firstName, lastName, phone } = data;
    if (!variantId || !firstName || !lastName || !phone) {
      throw new BadRequestException('Alla fält (variant, namn, efternamn, telefon) måste fyllas i');
    }

    return this.em.transactional(async (em) => {
      const variant = await em.findOne(Variant, variantId);
      if (!variant) {
        throw new NotFoundException('Den valda storleken/skon hittades inte');
      }

      if (variant.stock <= 0) {
        throw new BadRequestException('Den valda storleken är tyvärr slut i lager för tillfället');
      }

      const booking = new Booking();
      booking.variant = variant;
      booking.customerFirstName = firstName.trim();
      booking.customerLastName = lastName.trim();
      booking.customerPhone = phone.trim();
      booking.status = 'pending';

      em.persist(booking);

      // Decrement stock by 1
      variant.stock -= 1;

      await em.flush();
      return booking;
    });
  }

  async findAllBookings(): Promise<Booking[]> {
    return this.bookingRepository.find(
      {},
      {
        populate: ['variant', 'variant.product'],
        orderBy: { id: 'DESC' },
      },
    );
  }

  async confirmBooking(bookingId: number): Promise<void> {
    await this.em.transactional(async (em) => {
      const booking = await em.findOne(Booking, bookingId, { populate: ['variant'] });
      if (!booking) {
        throw new NotFoundException('Bokningen hittades inte');
      }

      if (booking.status !== 'pending' && booking.status !== 'reserved') {
        throw new BadRequestException(`Bokningen kan inte godkännas eftersom den har status: ${booking.status}`);
      }

      booking.status = 'confirmed';

      // Register sale transaction
      const transaction = new Transaction();
      transaction.variant = booking.variant;
      transaction.type = 'sale';
      transaction.quantity = 1;
      transaction.purchasePrice = booking.variant.purchasePrice;
      transaction.sellingPrice = booking.variant.sellingPrice;

      em.persist(transaction);
    });
  }

  async cancelBooking(bookingId: number): Promise<void> {
    await this.em.transactional(async (em) => {
      const booking = await em.findOne(Booking, bookingId, { populate: ['variant'] });
      if (!booking) {
        throw new NotFoundException('Bokningen hittades inte');
      }

      if (booking.status !== 'pending' && booking.status !== 'reserved') {
        throw new BadRequestException(`Bokningen kan inte avbrytas eftersom den har status: ${booking.status}`);
      }

      booking.status = 'cancelled';

      // Increment variant stock back by 1
      booking.variant.stock += 1;
    });
  }

  async reserveBooking(bookingId: number): Promise<void> {
    await this.em.transactional(async (em) => {
      const booking = await em.findOne(Booking, bookingId);
      if (!booking) {
        throw new NotFoundException('Bokningen hittades inte');
      }

      if (booking.status !== 'pending') {
        throw new BadRequestException(`Bokningen kan inte markeras som reserverad eftersom den har status: ${booking.status}`);
      }

      booking.status = 'reserved';
    });
  }
}
