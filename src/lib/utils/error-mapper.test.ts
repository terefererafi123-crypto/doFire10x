import { describe, it, expect } from 'vitest';
import {
  mapApiErrorCode,
  mapApiErrorsToFormErrors,
  investmentErrorMessages,
  profileErrorMessages,
} from './error-mapper';

describe('error-mapper', () => {
  describe('mapApiErrorCode', () => {
    it('should map investment error codes correctly', () => {
      // Arrange
      const code = 'amount_must_be_positive';

      // Act
      const result = mapApiErrorCode(code);

      // Assert
      expect(result).toBe('Kwota musi być większa od zera');
    });

    it('should map profile error codes correctly', () => {
      // Arrange
      const code = 'must_be_gte_zero';

      // Act
      const result = mapApiErrorCode(code);

      // Assert
      expect(result).toBe('Wartość musi być >= 0');
    });

    it('should return default message for unknown error code', () => {
      // Arrange
      const code = 'unknown_error_code_12345';

      // Act
      const result = mapApiErrorCode(code);

      // Assert
      expect(result).toBe('Wystąpił błąd walidacji');
    });

    it('should use custom error message map when provided', () => {
      // Arrange
      const code = 'custom_error';
      const customMap = {
        custom_error: 'Niestandardowy komunikat błędu',
      };

      // Act
      const result = mapApiErrorCode(code, customMap);

      // Assert
      expect(result).toBe('Niestandardowy komunikat błędu');
    });

    it('should map all investment error messages', () => {
      // Arrange & Act & Assert
      // Testujemy, że wszystkie kody z investmentErrorMessages są mapowane
      Object.entries(investmentErrorMessages).forEach(([code, message]) => {
        const result = mapApiErrorCode(code);
        expect(result).toBe(message);
      });
    });

    it('should map all profile error messages', () => {
      // Arrange & Act & Assert
      // Testujemy, że wszystkie kody z profileErrorMessages są mapowane
      Object.entries(profileErrorMessages).forEach(([code, message]) => {
        const result = mapApiErrorCode(code);
        expect(result).toBe(message);
      });
    });

    it('should handle empty string as error code', () => {
      // Arrange
      const code = '';

      // Act
      const result = mapApiErrorCode(code);

      // Assert
      expect(result).toBe('Wystąpił błąd walidacji');
    });
  });

  describe('mapApiErrorsToFormErrors', () => {
    it('should return empty object when fields is undefined', () => {
      // Arrange
      const fields = undefined;

      // Act
      const result = mapApiErrorsToFormErrors(fields);

      // Assert
      expect(result).toEqual({});
    });

    it('should return empty object when fields is empty', () => {
      // Arrange
      const fields = {};

      // Act
      const result = mapApiErrorsToFormErrors(fields);

      // Assert
      expect(result).toEqual({});
    });

    it('should map single field error correctly', () => {
      // Arrange
      const fields = {
        amount: 'amount_must_be_positive',
      };

      // Act
      const result = mapApiErrorsToFormErrors(fields);

      // Assert
      expect(result).toEqual({
        amount: 'Kwota musi być większa od zera',
      });
    });

    it('should map multiple field errors correctly', () => {
      // Arrange
      const fields = {
        amount: 'amount_must_be_positive',
        acquired_at: 'acquired_at_cannot_be_future',
        type: 'must_be_one_of_etf_bond_stock_cash',
      };

      // Act
      const result = mapApiErrorsToFormErrors(fields);

      // Assert
      expect(result).toEqual({
        amount: 'Kwota musi być większa od zera',
        acquired_at: 'Data nabycia nie może być z przyszłości',
        type: 'Typ musi być jednym z: ETF, Obligacja, Akcja, Gotówka',
      });
    });

    it('should handle unknown error codes in fields', () => {
      // Arrange
      const fields = {
        amount: 'unknown_error_code',
        monthly_expense: 'must_be_gte_zero',
      };

      // Act
      const result = mapApiErrorsToFormErrors(fields);

      // Assert
      expect(result).toEqual({
        amount: 'Wystąpił błąd walidacji',
        monthly_expense: 'Wartość musi być >= 0',
      });
    });

    it('should use custom error message map when provided', () => {
      // Arrange
      const fields = {
        custom_field: 'custom_error',
      };
      const customMap = {
        custom_error: 'Niestandardowy komunikat',
      };

      // Act
      const result = mapApiErrorsToFormErrors(fields, customMap);

      // Assert
      expect(result).toEqual({
        custom_field: 'Niestandardowy komunikat',
      });
    });

    it('should handle mixed known and unknown error codes', () => {
      // Arrange
      const fields = {
        amount: 'amount_must_be_positive', // znany kod
        notes: 'unknown_code_123', // nieznany kod
        type: 'invalid_enum_value', // znany kod
      };

      // Act
      const result = mapApiErrorsToFormErrors(fields);

      // Assert
      expect(result.amount).toBe('Kwota musi być większa od zera');
      expect(result.notes).toBe('Wystąpił błąd walidacji');
      expect(result.type).toBe('Nieprawidłowa wartość');
    });

    it('should preserve field names exactly as provided', () => {
      // Arrange
      const fields = {
        'monthly_expense': 'must_be_gte_zero',
        'withdrawal_rate_pct': 'must_be_lte_100',
        'expected_return_pct': 'must_be_lte_1000',
      };

      // Act
      const result = mapApiErrorsToFormErrors(fields);

      // Assert
      expect(Object.keys(result)).toEqual([
        'monthly_expense',
        'withdrawal_rate_pct',
        'expected_return_pct',
      ]);
    });
  });
});
