import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, EntityManager } from '@mikro-orm/postgresql';
import { Booking } from '../entities/booking.entity.js';
import { Variant } from '../entities/variant.entity.js';
import { Transaction } from '../entities/transaction.entity.js';
import { DiscountCode } from '../entities/discount-code.entity.js';

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
    discountCode?: string;
    message?: string;
  }): Promise<Booking> {
    const { variantId, firstName, lastName, phone, discountCode, message } = data;
    if (!variantId || !firstName || !lastName || !phone) {
      throw new BadRequestException('Alla fält (variant, namn, efternamn, telefon) måste fyllas i');
    }

    return this.em.transactional(async (em) => {
      const variant = await em.findOne(Variant, variantId, { populate: ['product'] });
      if (!variant) {
        throw new NotFoundException('Den valda storleken/skon hittades inte');
      }

      if (variant.stock <= 0) {
        throw new BadRequestException('Den valda storleken är tyvärr slut i lager för tillfället');
      }

      let discountPercent = 0.0;
      let appliedCode: string | undefined = undefined;

      if (discountCode && discountCode.trim()) {
        const cleanCode = discountCode.trim().toUpperCase();
        const dc = await em.findOne(DiscountCode, { code: cleanCode });
        if (dc) {
          const matchProject = dc.project.toLowerCase();
          const category = variant.product.category.toLowerCase();
          if (matchProject === 'alla' || matchProject === 'allmänt' || matchProject === 'all' || matchProject === category) {
            discountPercent = dc.discountPercent;
            appliedCode = dc.code;
          } else {
            throw new BadRequestException(`Rabattkoden ${cleanCode} gäller inte för denna kategori (${variant.product.category}).`);
          }
        } else {
          throw new BadRequestException(`Rabattkoden ${cleanCode} är ogiltig.`);
        }
      }

      const booking = new Booking();
      booking.variant = variant;
      booking.customerFirstName = firstName.trim();
      booking.customerLastName = lastName.trim();
      booking.customerPhone = phone.trim();
      booking.status = 'pending';
      booking.discountCode = appliedCode;
      booking.discountPercent = discountPercent;
      booking.message = message ? message.trim() : undefined;

      em.persist(booking);

      // Decrement stock by 1
      variant.stock -= 1;

      await em.flush();
      return booking;
    });
  }

  async findAllBookings(): Promise<Booking[]> {
    await this.releaseExpiredBookings(this.em);
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

      if (booking.paymentStatus === 'paid') {
        return; // Already paid online and transaction is already created!
      }

      let sellingPrice = booking.variant.sellingPrice;
      if (booking.discountPercent > 0) {
        sellingPrice = Math.round(booking.variant.sellingPrice * (1.0 - booking.discountPercent / 100.0));
      }

      // Register sale transaction
      const transaction = new Transaction();
      transaction.variant = booking.variant;
      transaction.type = 'sale';
      transaction.quantity = 1;
      transaction.purchasePrice = booking.variant.purchasePrice;
      transaction.sellingPrice = sellingPrice;

      em.persist(transaction);
    });
  }

  async cancelBooking(bookingId: number): Promise<void> {
    await this.em.transactional(async (em) => {
      const booking = await em.findOne(Booking, bookingId, { populate: ['variant'] });
      if (!booking) {
        throw new NotFoundException('Bokningen hittades inte');
      }

      if (booking.status === 'cancelled') {
        throw new BadRequestException('Bokningen är redan avbruten/återbetald');
      }

      const wasConfirmed = booking.status === 'confirmed';
      const wasPaid = booking.paymentStatus === 'paid';

      booking.status = 'cancelled';
      if (wasPaid) {
        booking.paymentStatus = 'refunded';
      }

      // Increment variant stock back by 1
      booking.variant.stock += 1;

      // If it was paid (either confirmed or reserved but paid), we write a negative transaction to reverse the economy page!
      if (wasPaid) {
        let sellingPrice = booking.variant.sellingPrice;
        if (booking.discountPercent > 0) {
          sellingPrice = Math.round(booking.variant.sellingPrice * (1.0 - booking.discountPercent / 100.0));
        }

        const refundTransaction = new Transaction();
        refundTransaction.variant = booking.variant;
        refundTransaction.type = 'sale';
        refundTransaction.quantity = -1; // Negative to subtract from sales metrics
        refundTransaction.purchasePrice = booking.variant.purchasePrice;
        refundTransaction.sellingPrice = sellingPrice;
        refundTransaction.createdAt = new Date();

        em.persist(refundTransaction);
      }
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

  async releaseExpiredBookings(em: EntityManager): Promise<void> {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const expiredBookings = await em.find(Booking, {
      paymentStatus: 'swish_pending',
      status: 'pending',
      createdAt: { $lt: fifteenMinutesAgo }
    }, { populate: ['variant'] });

    if (expiredBookings.length > 0) {
      console.log(`[RESERVATION] Hittade ${expiredBookings.length} utgångna Swish-reservationer. Frisläpper saldo...`);
      for (const booking of expiredBookings) {
        booking.status = 'cancelled';
        booking.paymentStatus = 'expired';
        booking.variant.stock += 1;
        console.log(`  - Frisläppte 1 par av ${booking.variant.sku} (Bokning #${booking.id})`);
      }
      await em.flush();
    }
  }

  async createBatchBookings(data: {
    items: { variantId: number }[];
    firstName: string;
    lastName: string;
    phone: string;
    discountCode?: string;
    message?: string;
    deliveryMethod: string;
    shippingAddress?: string;
    shippingCost: number;
    paymentStatus?: string;
  }): Promise<Booking[]> {
    const { items, firstName, lastName, phone, discountCode, message, deliveryMethod, shippingAddress, shippingCost, paymentStatus } = data;
    if (!items || items.length === 0 || !firstName || !lastName || !phone) {
      throw new BadRequestException('Alla obligatoriska fält måste fyllas i.');
    }

    return this.em.transactional(async (em) => {
      await this.releaseExpiredBookings(em);
      const createdBookings: Booking[] = [];

      for (const item of items) {
        const variant = await em.findOne(Variant, item.variantId, { populate: ['product'] });
        if (!variant) {
          throw new NotFoundException(`Storleken/skon med ID ${item.variantId} hittades inte.`);
        }

        if (variant.stock <= 0) {
          throw new BadRequestException(`Den valda varianten ${variant.sku} är tyvärr slut i lager.`);
        }

        let discountPercent = 0.0;
        let appliedCode: string | undefined = undefined;
        let freeShippingApplied = false;

        if (discountCode && discountCode.trim()) {
          const cleanCode = discountCode.trim().toUpperCase();
          const dc = await em.findOne(DiscountCode, { code: cleanCode });
          if (dc) {
            const matchProject = dc.project.toLowerCase();
            const category = variant.product.category.toLowerCase();
            if (matchProject === 'alla' || matchProject === 'allmänt' || matchProject === 'all' || matchProject === category) {
              discountPercent = dc.discountPercent;
              appliedCode = dc.code;
              if (dc.freeShipping) {
                freeShippingApplied = true;
              }
            } else {
              throw new BadRequestException(`Rabattkoden ${cleanCode} gäller inte för denna kategori (${variant.product.category}).`);
            }
          } else {
            throw new BadRequestException(`Rabattkoden ${cleanCode} är ogiltig.`);
          }
        }

        const booking = new Booking();
        booking.variant = variant;
        booking.customerFirstName = firstName.trim();
        booking.customerLastName = lastName.trim();
        booking.customerPhone = phone.trim();
        booking.status = 'pending';
        booking.discountCode = appliedCode;
        booking.discountPercent = discountPercent;
        booking.message = message ? message.trim() : undefined;
        booking.paymentStatus = paymentStatus || 'pending';
        booking.deliveryMethod = deliveryMethod || 'pickup';
        booking.shippingAddress = shippingAddress ? shippingAddress.trim() : undefined;
        booking.shippingCost = freeShippingApplied ? 0.0 : (shippingCost || 0.0);

        em.persist(booking);
        
        // Decrement stock by 1
        variant.stock -= 1;
        createdBookings.push(booking);
      }

      await em.flush();
      return createdBookings;
    });
  }
}
