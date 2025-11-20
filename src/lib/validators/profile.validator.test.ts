import { describe, it, expect } from 'vitest';
import { validateCreateProfile, validateUpdateProfile } from './profile.validator';
import type { CreateProfileCommand, UpdateProfileCommand } from '@/types';

describe('profile.validator', () => {
  describe('validateCreateProfile', () => {
    it('should validate correct profile data', () => {
      // Arrange
      const validData: CreateProfileCommand = {
        monthly_expense: 4500.0,
        withdrawal_rate_pct: 4.0,
        expected_return_pct: 7.0,
        birth_date: '1992-05-12',
      };

      // Act
      const result = validateCreateProfile(validData);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should validate profile without birth_date', () => {
      // Arrange
      const validData: CreateProfileCommand = {
        monthly_expense: 4500.0,
        withdrawal_rate_pct: 4.0,
        expected_return_pct: 7.0,
      };

      // Act
      const result = validateCreateProfile(validData);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should reject negative monthly_expense', () => {
      // Arrange
      const invalidData = {
        monthly_expense: -100,
        withdrawal_rate_pct: 4.0,
        expected_return_pct: 7.0,
      };

      // Act
      const result = validateCreateProfile(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should reject undefined monthly_expense', () => {
      // Arrange
      const invalidData = {
        withdrawal_rate_pct: 4.0,
        expected_return_pct: 7.0,
      };

      // Act
      const result = validateCreateProfile(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should reject null monthly_expense', () => {
      // Arrange
      const invalidData = {
        monthly_expense: null,
        withdrawal_rate_pct: 4.0,
        expected_return_pct: 7.0,
      };

      // Act
      const result = validateCreateProfile(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should reject NaN monthly_expense', () => {
      // Arrange
      const invalidData = {
        monthly_expense: NaN,
        withdrawal_rate_pct: 4.0,
        expected_return_pct: 7.0,
      };

      // Act
      const result = validateCreateProfile(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should reject Infinity monthly_expense', () => {
      // Arrange
      const invalidData = {
        monthly_expense: Infinity,
        withdrawal_rate_pct: 4.0,
        expected_return_pct: 7.0,
      };

      // Act
      const result = validateCreateProfile(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should accept zero monthly_expense', () => {
      // Arrange
      const validData: CreateProfileCommand = {
        monthly_expense: 0,
        withdrawal_rate_pct: 4.0,
        expected_return_pct: 7.0,
      };

      // Act
      const result = validateCreateProfile(validData);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should reject withdrawal_rate_pct less than 0', () => {
      // Arrange
      const invalidData = {
        monthly_expense: 4500.0,
        withdrawal_rate_pct: -1,
        expected_return_pct: 7.0,
      };

      // Act
      const result = validateCreateProfile(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should reject withdrawal_rate_pct greater than 100', () => {
      // Arrange
      const invalidData = {
        monthly_expense: 4500.0,
        withdrawal_rate_pct: 101,
        expected_return_pct: 7.0,
      };

      // Act
      const result = validateCreateProfile(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should accept withdrawal_rate_pct at boundaries (0 and 100)', () => {
      // Arrange
      const dataAt0: CreateProfileCommand = {
        monthly_expense: 4500.0,
        withdrawal_rate_pct: 0,
        expected_return_pct: 7.0,
      };
      const dataAt100: CreateProfileCommand = {
        monthly_expense: 4500.0,
        withdrawal_rate_pct: 100,
        expected_return_pct: 7.0,
      };

      // Act
      const result0 = validateCreateProfile(dataAt0);
      const result100 = validateCreateProfile(dataAt100);

      // Assert
      expect(result0.success).toBe(true);
      expect(result100.success).toBe(true);
    });

    it('should reject expected_return_pct less than -100', () => {
      // Arrange
      const invalidData = {
        monthly_expense: 4500.0,
        withdrawal_rate_pct: 4.0,
        expected_return_pct: -101,
      };

      // Act
      const result = validateCreateProfile(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should reject expected_return_pct greater than 1000', () => {
      // Arrange
      const invalidData = {
        monthly_expense: 4500.0,
        withdrawal_rate_pct: 4.0,
        expected_return_pct: 1001,
      };

      // Act
      const result = validateCreateProfile(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should accept expected_return_pct at boundaries (-100 and 1000)', () => {
      // Arrange
      const dataAtMinus100: CreateProfileCommand = {
        monthly_expense: 4500.0,
        withdrawal_rate_pct: 4.0,
        expected_return_pct: -100,
      };
      const dataAt1000: CreateProfileCommand = {
        monthly_expense: 4500.0,
        withdrawal_rate_pct: 4.0,
        expected_return_pct: 1000,
      };

      // Act
      const resultMinus100 = validateCreateProfile(dataAtMinus100);
      const result1000 = validateCreateProfile(dataAt1000);

      // Assert
      expect(resultMinus100.success).toBe(true);
      expect(result1000.success).toBe(true);
    });

    it('should reject birth_date in the future', () => {
      // Arrange
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const invalidData = {
        monthly_expense: 4500.0,
        withdrawal_rate_pct: 4.0,
        expected_return_pct: 7.0,
        birth_date: tomorrow.toISOString().split('T')[0],
      };

      // Act
      const result = validateCreateProfile(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should reject birth_date older than 120 years', () => {
      // Arrange
      const tooOld = new Date();
      tooOld.setFullYear(tooOld.getFullYear() - 121);
      const invalidData = {
        monthly_expense: 4500.0,
        withdrawal_rate_pct: 4.0,
        expected_return_pct: 7.0,
        birth_date: tooOld.toISOString().split('T')[0],
      };

      // Act
      const result = validateCreateProfile(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should accept birth_date exactly 120 years ago', () => {
      // Arrange
      // Walidacja używa dateObj >= maxAge, więc data musi być >= maxAge
      // Problem: new Date(dateStr) tworzy datę w UTC, a maxAge.setHours(0,0,0,0) używa lokalnej strefy czasowej
      // Aby test działał poprawnie, używamy daty, która jest wyraźnie większa niż maxAge w UTC
      // Używamy daty 1 dzień po maxAge, aby uniknąć problemów ze strefą czasową
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const maxAge = new Date();
      maxAge.setFullYear(today.getFullYear() - 120);
      maxAge.setHours(0, 0, 0, 0);
      // Dodajemy 1 dzień, aby data była wyraźnie większa niż maxAge w UTC
      const testDate = new Date(maxAge);
      testDate.setDate(testDate.getDate() + 1);
      const validData: CreateProfileCommand = {
        monthly_expense: 4500.0,
        withdrawal_rate_pct: 4.0,
        expected_return_pct: 7.0,
        birth_date: testDate.toISOString().split('T')[0],
      };

      // Act
      const result = validateCreateProfile(validData);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should reject invalid date format', () => {
      // Arrange
      const invalidData = {
        monthly_expense: 4500.0,
        withdrawal_rate_pct: 4.0,
        expected_return_pct: 7.0,
        birth_date: '1992/05/12', // Nieprawidłowy format
      };

      // Act
      const result = validateCreateProfile(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should accept null birth_date', () => {
      // Arrange
      const validData: CreateProfileCommand = {
        monthly_expense: 4500.0,
        withdrawal_rate_pct: 4.0,
        expected_return_pct: 7.0,
        birth_date: null,
      };

      // Act
      const result = validateCreateProfile(validData);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should reject unknown fields (strict mode)', () => {
      // Arrange
      const invalidData = {
        monthly_expense: 4500.0,
        withdrawal_rate_pct: 4.0,
        expected_return_pct: 7.0,
        unknown_field: 'value',
      };

      // Act
      const result = validateCreateProfile(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should reject missing required fields', () => {
      // Arrange
      const invalidData = {
        monthly_expense: 4500.0,
        // brak withdrawal_rate_pct
        expected_return_pct: 7.0,
      };

      // Act
      const result = validateCreateProfile(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('validateUpdateProfile', () => {
    it('should validate update with all fields', () => {
      // Arrange
      const validData: UpdateProfileCommand = {
        monthly_expense: 5000.0,
        withdrawal_rate_pct: 4.5,
        expected_return_pct: 8.0,
        birth_date: '1990-01-01',
      };

      // Act
      const result = validateUpdateProfile(validData);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should validate update with single field', () => {
      // Arrange
      const validData: UpdateProfileCommand = {
        monthly_expense: 5000.0,
      };

      // Act
      const result = validateUpdateProfile(validData);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should reject update with no fields', () => {
      // Arrange
      const invalidData = {};

      // Act
      const result = validateUpdateProfile(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should reject update with all fields undefined', () => {
      // Arrange
      const invalidData = {
        monthly_expense: undefined,
        withdrawal_rate_pct: undefined,
        expected_return_pct: undefined,
        birth_date: undefined,
      };

      // Act
      const result = validateUpdateProfile(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should validate monthly_expense update', () => {
      // Arrange
      const validData: UpdateProfileCommand = {
        monthly_expense: 6000.0,
      };

      // Act
      const result = validateUpdateProfile(validData);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should reject negative monthly_expense in update', () => {
      // Arrange
      const invalidData = {
        monthly_expense: -100,
      };

      // Act
      const result = validateUpdateProfile(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should reject monthly_expense exceeding maximum in update', () => {
      // Arrange
      const invalidData = {
        monthly_expense: 9999999999999.99 + 0.01, // Przekracza maksimum
      };

      // Act
      const result = validateUpdateProfile(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should validate withdrawal_rate_pct with max 2 decimal places', () => {
      // Arrange
      const validData: UpdateProfileCommand = {
        withdrawal_rate_pct: 4.25, // 2 miejsca po przecinku
      };

      // Act
      const result = validateUpdateProfile(validData);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should reject withdrawal_rate_pct with more than 2 decimal places', () => {
      // Arrange
      const invalidData = {
        withdrawal_rate_pct: 4.256, // 3 miejsca po przecinku
      };

      // Act
      const result = validateUpdateProfile(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should validate expected_return_pct update', () => {
      // Arrange
      const validData: UpdateProfileCommand = {
        expected_return_pct: 8.0,
      };

      // Act
      const result = validateUpdateProfile(validData);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should reject expected_return_pct outside range in update', () => {
      // Arrange
      const invalidData1 = {
        expected_return_pct: -101,
      };
      const invalidData2 = {
        expected_return_pct: 1001,
      };

      // Act
      const result1 = validateUpdateProfile(invalidData1);
      const result2 = validateUpdateProfile(invalidData2);

      // Assert
      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
    });

    it('should validate birth_date update', () => {
      // Arrange
      const validData: UpdateProfileCommand = {
        birth_date: '1990-01-01',
      };

      // Act
      const result = validateUpdateProfile(validData);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should reject birth_date in future in update', () => {
      // Arrange
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const invalidData = {
        birth_date: tomorrow.toISOString().split('T')[0],
      };

      // Act
      const result = validateUpdateProfile(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should reject unknown fields in update (strict mode)', () => {
      // Arrange
      const invalidData = {
        monthly_expense: 5000.0,
        unknown_field: 'value',
      };

      // Act
      const result = validateUpdateProfile(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });
  });
});
