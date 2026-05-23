import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, EntityManager } from '@mikro-orm/postgresql';
import { Setting } from '../entities/setting.entity.js';
import { Booking } from '../entities/booking.entity.js';
import { Transaction } from '../entities/transaction.entity.js';
import { Variant } from '../entities/variant.entity.js';
import * as https from 'https';

@Injectable()
export class SwishService {
  private mockPayments = new Map<string, { bookingIds: number[]; amount: number; status: string }>();

  constructor(
    @InjectRepository(Setting)
    private readonly settingRepository: EntityRepository<Setting>,
    @InjectRepository(Booking)
    private readonly bookingRepository: EntityRepository<Booking>,
    private readonly em: EntityManager,
  ) {}

  // Helper function to perform HTTPS request using raw node https module and agent
  private makeSwishRequest(
    urlStr: string,
    payload: any,
    agent: https.Agent,
  ): Promise<{ headers: any; body: string }> {
    return new Promise((resolve, reject) => {
      const url = new URL(urlStr);
      const postData = JSON.stringify(payload);

      const options: https.RequestOptions = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'POST',
        agent: agent,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({ headers: res.headers, body: data });
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.write(postData);
      req.end();
    });
  }

  async initiatePayment(data: {
    bookingIds: number[];
    phoneNumber: string;
  }): Promise<{ success: true; paymentId: string; isMock: boolean }> {
    const { bookingIds, phoneNumber } = data;
    if (!bookingIds || bookingIds.length === 0 || !phoneNumber) {
      throw new BadRequestException('Boknings-ID och telefonnummer krävs.');
    }

    // Retrieve settings
    const merchantIdSetting = await this.settingRepository.findOne({ key: 'swish_merchant_id' });
    const certSetting = await this.settingRepository.findOne({ key: 'swish_tls_certificate' });
    const keySetting = await this.settingRepository.findOne({ key: 'swish_tls_key' });

    const merchantId = merchantIdSetting?.value?.trim();
    const cert = certSetting?.value?.trim();
    const key = keySetting?.value?.trim();

    // Check total amount and verify bookings exist
    let totalAmount = 0;
    const bookings: Booking[] = [];
    
    for (const bId of bookingIds) {
      const booking = await this.em.findOne(Booking, bId, { populate: ['variant'] });
      if (!booking) {
        throw new NotFoundException(`Bokningen med ID ${bId} hittades inte.`);
      }
      bookings.push(booking);
      
      // Calculate discounted price
      const price = Math.round(booking.variant.sellingPrice * (1.0 - booking.discountPercent / 100.0));
      totalAmount += price;
    }

    // Add shipping cost from first booking if any (all batch bookings share same deliveryMethod/shippingCost)
    if (bookings[0]?.deliveryMethod === 'shipping') {
      totalAmount += bookings[0].shippingCost;
    }

    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');

    // CHECK IF WE SHOULD RUN IN MOCK MODE (if credentials are missing)
    if (!merchantId || !cert || !key) {
      console.log('[SWISH] API-nycklar saknas. Kör i MOCK MODE.');
      const mockPaymentId = 'MOCK-PAYMENT-' + Math.random().toString(36).substring(2, 15).toUpperCase();
      
      this.mockPayments.set(mockPaymentId, {
        bookingIds,
        amount: totalAmount,
        status: 'pending',
      });

      return {
        success: true,
        paymentId: mockPaymentId,
        isMock: true,
      };
    }

    // PRODUCTION SWISH API CALL
    try {
      console.log(`[SWISH] Initierar riktig Swish-betalning på ${totalAmount} kr...`);
      
      const agent = new https.Agent({
        cert: cert,
        key: key,
        rejectUnauthorized: true, // Use false if testing in Swish Sandbox with test certs
      });

      const orderRef = `BATCH-${bookingIds.join('-')}`;
      const payload = {
        payeePaymentReference: orderRef,
        callbackUrl: process.env.SWISH_CALLBACK_URL || 'https://lagerpro.se/api/public/payments/swish/callback',
        payerAlias: cleanPhone,
        payeeAlias: merchantId,
        amount: totalAmount.toFixed(2),
        currency: 'SEK',
        message: bookings.map(b => b.variant.sku).join(', ').substring(0, 50),
      };

      // Call Swish production API
      const swishUrl = process.env.SWISH_API_URL || 'https://cpc.getswish.net/swish-cpcapi/api/v1/paymentrequests';
      const response = await this.makeSwishRequest(swishUrl, payload, agent);

      // Swish returns the payment request ID in the Location header
      const location = response.headers['location'];
      if (!location) {
        throw new Error('Swish returnerade inte Location header.');
      }

      const paymentId = (Array.isArray(location) ? location[0] : location).split('/').pop() || '';
      return {
        success: true,
        paymentId,
        isMock: false,
      };
    } catch (err: any) {
      console.error('[SWISH] Riktigt Swish-anrop misslyckades:', err.message);
      throw new BadRequestException('Swish-betalningen kunde inte initieras. Kontrollera era certifikat och bankinställningar.');
    }
  }

  // HANDLE MOCK PAYMENT PAYMENT SIMULATION (Frontend calls this to simulate a successful swish callback)
  async simulateMockPayment(paymentId: string): Promise<{ success: boolean }> {
    const mock = this.mockPayments.get(paymentId);
    if (!mock) {
      throw new NotFoundException('Hittade inte den simulerade betalningen.');
    }

    if (mock.status === 'paid') {
      return { success: true };
    }

    mock.status = 'paid';
    await this.completeOrderPayments(mock.bookingIds);
    return { success: true };
  }

  // WEBHOOK CALLBACK FROM REAL SWISH
  async handleSwishCallback(payload: {
    id: string;
    status: string;
    amount: number;
    payeePaymentReference: string;
  }): Promise<void> {
    console.log('[SWISH CALLBACK] Mottog callback för betalning:', payload.id, 'Status:', payload.status);
    
    if (payload.status !== 'PAID') {
      console.log('[SWISH CALLBACK] Betalningen avbröts eller misslyckades.');
      return;
    }

    // Parse booking IDs from payment reference (BATCH-1-2-3)
    const ref = payload.payeePaymentReference;
    if (ref && ref.startsWith('BATCH-')) {
      const idStrings = ref.replace('BATCH-', '').split('-');
      const bookingIds = idStrings.map(id => parseInt(id)).filter(Boolean);
      await this.completeOrderPayments(bookingIds);
    }
  }

  // Mark bookings as PAID and register transactional sales
  private async completeOrderPayments(bookingIds: number[]): Promise<void> {
    await this.em.transactional(async (em) => {
      for (const bId of bookingIds) {
        const booking = await em.findOne(Booking, bId, { populate: ['variant'] });
        if (!booking) continue;

        if (booking.paymentStatus === 'paid') continue;

        booking.paymentStatus = 'paid';
        booking.status = 'reserved'; // Keep reserved for pickup

        // Calculate discounted price
        const sellingPrice = Math.round(booking.variant.sellingPrice * (1.0 - booking.discountPercent / 100.0));

        // Create transaction directly since it is paid!
        const transaction = new Transaction();
        transaction.variant = booking.variant;
        transaction.type = 'sale';
        transaction.quantity = 1;
        transaction.purchasePrice = booking.variant.purchasePrice;
        transaction.sellingPrice = sellingPrice;
        transaction.createdAt = new Date();

        em.persist(transaction);
        console.log(`[SWISH SUCCESS] Order #${booking.id} är nu betald via Swish och bokförd i statistiken!`);
      }
    });
  }
}
