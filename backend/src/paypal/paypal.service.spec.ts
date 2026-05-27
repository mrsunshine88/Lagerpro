import { Test, TestingModule } from '@nestjs/testing';
import { PaypalService } from './paypal.service';
import { getRepositoryToken } from '@mikro-orm/nestjs';
import { Variant } from '../entities/variant.entity.js';
import { Transaction } from '../entities/transaction.entity.js';
import { EntityManager } from '@mikro-orm/postgresql';

describe('PaypalService - parseShoeName', () => {
  let service: PaypalService;

  beforeEach(async () => {
    const mockRepo = {
      findOne: jest.fn(),
      persist: jest.fn(),
      flush: jest.fn(),
    };
    const mockEM: any = {
      findOne: jest.fn(),
      persist: jest.fn(),
      flush: jest.fn(),
      transactional: jest.fn((cb) => cb(mockEM)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaypalService,
        {
          provide: getRepositoryToken(Variant),
          useValue: mockRepo,
        },
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockRepo,
        },
        {
          provide: EntityManager,
          useValue: mockEM,
        },
      ],
    }).compile();

    service = module.get<PaypalService>(PaypalService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('parseShoeName', () => {
    it('should parse "Hanna svart 42" correctly', () => {
      // Accessing private method for testing purposes
      const parsed = (service as any).parseShoeName('Hanna svart 42');
      expect(parsed).toEqual({
        model: 'Hanna',
        color: 'svart',
        size: '42',
      });
    });

    it('should parse "Danny brun 42" correctly', () => {
      const parsed = (service as any).parseShoeName('Danny brun 42');
      expect(parsed).toEqual({
        model: 'Danny',
        color: 'brun',
        size: '42',
      });
    });

    it('should parse complex multi-word colors and float sizes: "Hanna ljus rosa 39.5"', () => {
      const parsed = (service as any).parseShoeName('Hanna ljus rosa 39.5');
      expect(parsed).toEqual({
        model: 'Hanna',
        color: 'ljus rosa',
        size: '39.5',
      });
    });

    it('should fallback to Universal if size is missing: "Kruka röd"', () => {
      const parsed = (service as any).parseShoeName('Kruka röd');
      expect(parsed).toEqual({
        model: 'Kruka',
        color: 'röd',
        size: 'Universal',
      });
    });

    it('should handle single-word names without color or size: "Hanna"', () => {
      const parsed = (service as any).parseShoeName('Hanna');
      expect(parsed).toEqual({
        model: 'Hanna',
        color: 'Universal',
        size: 'Universal',
      });
    });
  });
});
