import { describe, it, expect } from 'vitest';
import {
  validateCreateInvestment,
  validateUpdateInvestment,
  validateInvestmentListQuery,
  investmentIdParamSchema,
} from './investment.validator';
import type { CreateInvestmentCommand, UpdateInvestmentCommand, InvestmentListQuery } from '@/types';

describe('investment.validator', () => {
  describe('validateCreateInvestment', () => {
    it('should validate correct investment data', () => {
      // Arrange
      const validData: CreateInvestmentCommand = {
        type: 'etf',
        amount: 10000.0,
        acquired_at: '2024-01-15',
        notes: 'ETF SP500',
      };

      // Act
      const result = validateCreateInvestment(validData);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('etf');
        expect(result.data.amount).toBe(10000.0);
        expect(result.data.acquired_at).toBe('2024-01-15');
      }
    });

    it('should validate investment without notes', () => {
      // Arrange
      const validData: CreateInvestmentCommand = {
        type: 'bond',
        amount: 5000.0,
        acquired_at: '2024-01-15',
      };

      // Act
      const result = validateCreateInvestment(validData);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should validate all asset types', () => {
      // Arrange
      const types: Array<CreateInvestmentCommand['type']> = ['etf', 'bond', 'stock', 'cash'];

      // Act & Assert
      types.forEach((type) => {
        const data: CreateInvestmentCommand = {
          type,
          amount: 1000.0,
          acquired_at: '2024-01-15',
        };
        const result = validateCreateInvestment(data);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid asset type', () => {
      // Arrange
      const invalidData = {
        type: 'invalid_type',
        amount: 1000.0,
        acquired_at: '2024-01-15',
      };

      // Act
      const result = validateCreateInvestment(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should reject amount <= 0', () => {
      // Arrange
      const invalidData1 = {
        type: 'etf',
        amount: 0,
        acquired_at: '2024-01-15',
      };
      const invalidData2 = {
        type: 'etf',
        amount: -100,
        acquired_at: '2024-01-15',
      };

      // Act
      const result1 = validateCreateInvestment(invalidData1);
      const result2 = validateCreateInvestment(invalidData2);

      // Assert
      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
    });

    it('should reject amount exceeding maximum', () => {
      // Arrange
      const invalidData = {
        type: 'etf',
        amount: 999999999999.99 + 0.01, // Przekracza maksimum
        acquired_at: '2024-01-15',
      };

      // Act
      const result = validateCreateInvestment(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should reject NaN amount', () => {
      // Arrange
      const invalidData = {
        type: 'etf',
        amount: NaN,
        acquired_at: '2024-01-15',
      };

      // Act
      const result = validateCreateInvestment(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should reject Infinity amount', () => {
      // Arrange
      const invalidData = {
        type: 'etf',
        amount: Infinity,
        acquired_at: '2024-01-15',
      };

      // Act
      const result = validateCreateInvestment(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should reject future acquired_at date', () => {
      // Arrange
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const invalidData = {
        type: 'etf',
        amount: 1000.0,
        acquired_at: tomorrow.toISOString().split('T')[0],
      };

      // Act
      const result = validateCreateInvestment(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should accept today as acquired_at date', () => {
      // Arrange
      const today = new Date();
      const validData: CreateInvestmentCommand = {
        type: 'etf',
        amount: 1000.0,
        acquired_at: today.toISOString().split('T')[0],
      };

      // Act
      const result = validateCreateInvestment(validData);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should reject invalid date format', () => {
      // Arrange
      const invalidData = {
        type: 'etf',
        amount: 1000.0,
        acquired_at: '2024/01/15', // Nieprawidłowy format
      };

      // Act
      const result = validateCreateInvestment(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should reject missing acquired_at', () => {
      // Arrange
      const invalidData = {
        type: 'etf',
        amount: 1000.0,
        // brak acquired_at
      };

      // Act
      const result = validateCreateInvestment(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should transform empty notes string to null', () => {
      // Arrange
      const data = {
        type: 'etf',
        amount: 1000.0,
        acquired_at: '2024-01-15',
        notes: '', // Pusty string
      };

      // Act
      const result = validateCreateInvestment(data);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notes).toBeNull();
      }
    });

    it('should transform whitespace-only notes to null', () => {
      // Arrange
      const data = {
        type: 'etf',
        amount: 1000.0,
        acquired_at: '2024-01-15',
        notes: '   ', // Tylko białe znaki
      };

      // Act
      const result = validateCreateInvestment(data);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notes).toBeNull();
      }
    });

    it('should reject notes exceeding 1000 characters', () => {
      // Arrange
      const invalidData = {
        type: 'etf',
        amount: 1000.0,
        acquired_at: '2024-01-15',
        notes: 'a'.repeat(1001), // 1001 znaków
      };

      // Act
      const result = validateCreateInvestment(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should accept notes with exactly 1000 characters', () => {
      // Arrange
      const validData: CreateInvestmentCommand = {
        type: 'etf',
        amount: 1000.0,
        acquired_at: '2024-01-15',
        notes: 'a'.repeat(1000), // Dokładnie 1000 znaków
      };

      // Act
      const result = validateCreateInvestment(validData);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should reject unknown fields (strict mode)', () => {
      // Arrange
      const invalidData = {
        type: 'etf',
        amount: 1000.0,
        acquired_at: '2024-01-15',
        unknown_field: 'value',
      };

      // Act
      const result = validateCreateInvestment(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('validateUpdateInvestment', () => {
    it('should validate update with all fields', () => {
      // Arrange
      const validData: UpdateInvestmentCommand = {
        type: 'stock',
        amount: 15000.0,
        acquired_at: '2024-02-01',
        notes: 'Updated notes',
      };

      // Act
      const result = validateUpdateInvestment(validData);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should validate update with single field', () => {
      // Arrange
      const validData: UpdateInvestmentCommand = {
        amount: 15000.0,
      };

      // Act
      const result = validateUpdateInvestment(validData);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should reject update with no fields', () => {
      // Arrange
      const invalidData = {};

      // Act
      const result = validateUpdateInvestment(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should validate type update', () => {
      // Arrange
      const validData: UpdateInvestmentCommand = {
        type: 'cash',
      };

      // Act
      const result = validateUpdateInvestment(validData);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should reject invalid type in update', () => {
      // Arrange
      const invalidData = {
        type: 'invalid_type',
      };

      // Act
      const result = validateUpdateInvestment(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should validate amount update', () => {
      // Arrange
      const validData: UpdateInvestmentCommand = {
        amount: 20000.0,
      };

      // Act
      const result = validateUpdateInvestment(validData);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should reject amount <= 0 in update', () => {
      // Arrange
      const invalidData = {
        amount: 0,
      };

      // Act
      const result = validateUpdateInvestment(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should reject amount exceeding maximum in update', () => {
      // Arrange
      // Używamy wartości wyraźnie większej niż maksimum, aby uniknąć problemów z precyzją JavaScript
      // JavaScript ma ograniczoną precyzję dla liczb zmiennoprzecinkowych (~15-17 cyfr znaczących)
      // 1000000000000000 (1e15) może być traktowane jako równe 999999999999999.99 z powodu precyzji
      // Używamy wartości, która jest wyraźnie większa: 1e16
      const invalidData = {
        amount: 10000000000000000, // 1e16 - wyraźnie większe niż maksimum 999999999999999.99
      };

      // Act
      const result = validateUpdateInvestment(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should validate acquired_at update', () => {
      // Arrange
      const validData: UpdateInvestmentCommand = {
        acquired_at: '2024-01-20',
      };

      // Act
      const result = validateUpdateInvestment(validData);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should reject future acquired_at in update', () => {
      // Arrange
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const invalidData = {
        acquired_at: tomorrow.toISOString().split('T')[0],
      };

      // Act
      const result = validateUpdateInvestment(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should validate notes update', () => {
      // Arrange
      const validData: UpdateInvestmentCommand = {
        notes: 'New notes',
      };

      // Act
      const result = validateUpdateInvestment(validData);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should accept null notes in update', () => {
      // Arrange
      const validData: UpdateInvestmentCommand = {
        notes: null,
      };

      // Act
      const result = validateUpdateInvestment(validData);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should reject notes exceeding 1000 characters in update', () => {
      // Arrange
      const invalidData = {
        notes: 'a'.repeat(1001),
      };

      // Act
      const result = validateUpdateInvestment(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should reject unknown fields in update (strict mode)', () => {
      // Arrange
      const invalidData = {
        amount: 15000.0,
        unknown_field: 'value',
      };

      // Act
      const result = validateUpdateInvestment(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('validateInvestmentListQuery', () => {
    it('should validate correct query parameters', () => {
      // Arrange
      const validQuery: InvestmentListQuery = {
        limit: 50,
        type: 'etf',
        sort: 'amount_desc',
      };

      // Act
      const result = validateInvestmentListQuery(validQuery);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should use default limit of 25 when not provided', () => {
      // Arrange
      const query = {};

      // Act
      const result = validateInvestmentListQuery(query);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(25);
      }
    });

    it('should use default sort when not provided', () => {
      // Arrange
      const query = {};

      // Act
      const result = validateInvestmentListQuery(query);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sort).toBe('acquired_at_desc');
      }
    });

    it('should coerce string limit to number', () => {
      // Arrange
      const query = {
        limit: '50',
      };

      // Act
      const result = validateInvestmentListQuery(query);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
      }
    });

    it('should reject limit less than 1', () => {
      // Arrange
      const query = {
        limit: 0,
      };

      // Act
      const result = validateInvestmentListQuery(query);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should reject limit greater than 200', () => {
      // Arrange
      const query = {
        limit: 201,
      };

      // Act
      const result = validateInvestmentListQuery(query);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should accept limit at boundaries (1 and 200)', () => {
      // Arrange
      const query1 = { limit: 1 };
      const query2 = { limit: 200 };

      // Act
      const result1 = validateInvestmentListQuery(query1);
      const result2 = validateInvestmentListQuery(query2);

      // Assert
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });

    it('should validate all sort options', () => {
      // Arrange
      const sortOptions = ['acquired_at_desc', 'acquired_at_asc', 'amount_desc', 'amount_asc'];

      // Act & Assert
      sortOptions.forEach((sort) => {
        const query = { sort };
        const result = validateInvestmentListQuery(query);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid sort option', () => {
      // Arrange
      const query = {
        sort: 'invalid_sort',
      };

      // Act
      const result = validateInvestmentListQuery(query);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should validate all asset types in query', () => {
      // Arrange
      const types = ['etf', 'bond', 'stock', 'cash'];

      // Act & Assert
      types.forEach((type) => {
        const query = { type };
        const result = validateInvestmentListQuery(query);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid asset type in query', () => {
      // Arrange
      const query = {
        type: 'invalid_type',
      };

      // Act
      const result = validateInvestmentListQuery(query);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should validate date format for acquired_at_from', () => {
      // Arrange
      const query = {
        acquired_at_from: '2024-01-01',
      };

      // Act
      const result = validateInvestmentListQuery(query);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should reject invalid date format for acquired_at_from', () => {
      // Arrange
      const query = {
        acquired_at_from: '2024/01/01',
      };

      // Act
      const result = validateInvestmentListQuery(query);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should validate date format for acquired_at_to', () => {
      // Arrange
      const query = {
        acquired_at_to: '2024-12-31',
      };

      // Act
      const result = validateInvestmentListQuery(query);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should accept optional cursor', () => {
      // Arrange
      const query = {
        cursor: 'some-opaque-cursor-string',
      };

      // Act
      const result = validateInvestmentListQuery(query);

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe('investmentIdParamSchema', () => {
    it('should validate correct UUID', () => {
      // Arrange
      const validId = {
        id: '123e4567-e89b-12d3-a456-426614174000',
      };

      // Act
      const result = investmentIdParamSchema.safeParse(validId);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID format', () => {
      // Arrange
      const invalidId = {
        id: 'not-a-uuid',
      };

      // Act
      const result = investmentIdParamSchema.safeParse(invalidId);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should reject empty string as UUID', () => {
      // Arrange
      const invalidId = {
        id: '',
      };

      // Act
      const result = investmentIdParamSchema.safeParse(invalidId);

      // Assert
      expect(result.success).toBe(false);
    });
  });
});
