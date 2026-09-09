import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, EntityManager } from '@mikro-orm/postgresql';
import { Booking } from '../entities/booking.entity.js';
import { SettingsService } from '../settings/settings.service.js';

@Injectable()
export class ShippingService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: EntityRepository<Booking>,
    private readonly settingsService: SettingsService,
    private readonly em: EntityManager,
  ) {}

  async generateShippingLabel(bookingId: number): Promise<{ trackingNumber: string; labelUrl: string }> {
    const booking = await this.bookingRepository.findOne({ id: bookingId });
    if (!booking) {
      throw new NotFoundException('Bokningen hittades inte.');
    }

    const config = await this.settingsService.getShippingConfig();
    const provider = config.provider; // 'postnord' or 'dhl'

    // Here you would integrate with PostNord or DHL API.
    // For this demonstration, we mock the response.
    const trackingNumber = `${provider.toUpperCase()}-${Math.floor(Math.random() * 1000000000)}`;
    const labelUrl = `https://example.com/labels/${trackingNumber}.pdf`;

    booking.trackingNumber = trackingNumber;
    booking.shippingLabelUrl = labelUrl;
    booking.status = 'confirmed'; // Automatically confirm it when label is generated
    
    await this.em.flush();

    return { trackingNumber, labelUrl };
  }
}
