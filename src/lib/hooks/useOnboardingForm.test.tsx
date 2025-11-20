import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useOnboardingForm } from './useOnboardingForm';
import type { CreateProfileCommand, CreateInvestmentCommand } from '@/types';

describe('useOnboardingForm', () => {
  describe('validateProfileForm', () => {
    it('should return no errors for valid profile data', () => {
      // Arrange
      const { result } = renderHook(() => useOnboardingForm());
      const validData: CreateProfileCommand = {
        monthly_expense: 4500.0,
        withdrawal_rate_pct: 4.0,
        expected_return_pct: 7.0,
        birth_date: '1992-05-12',
      };

      // Act
      const errors = result.current.validateProfileForm(validData);

      // Assert
      expect(errors).toEqual({});
    });

    it('should return no errors for profile without birth_date', () => {
      // Arrange
      const { result } = renderHook(() => useOnboardingForm());
      const validData: CreateProfileCommand = {
        monthly_expense: 4500.0,
        withdrawal_rate_pct: 4.0,
        expected_return_pct: 7.0,
      };

      // Act
      const errors = result.current.validateProfileForm(validData);

      // Assert
      expect(errors).toEqual({});
    });

    it('should return error for undefined monthly_expense', () => {
      // Arrange
      const { result } = renderHook(() => useOnboardingForm());
      const invalidData = {
        withdrawal_rate_pct: 4.0,
        expected_return_pct: 7.0,
      } as CreateProfileCommand;

      // Act
      const errors = result.current.validateProfileForm(invalidData);

      // Assert
      expect(errors.monthly_expense).toBe('Miesięczne wydatki są wymagane');
    });

    it('should return error for null monthly_expense', () => {
      // Arrange
      const { result } = renderHook(() => useOnboardingForm());
      const invalidData = {
        monthly_expense: null,
        withdrawal_rate_pct: 4.0,
        expected_return_pct: 7.0,
      } as CreateProfileCommand;

      // Act
      const errors = result.current.validateProfileForm(invalidData);

      // Assert
      expect(errors.monthly_expense).toBe('Miesięczne wydatki są wymagane');
    });

    it('should return error for NaN monthly_expense', () => {
      // Arrange
      const { result } = renderHook(() => useOnboardingForm());
      const invalidData: CreateProfileCommand = {
        monthly_expense: NaN,
        withdrawal_rate_pct: 4.0,
        expected_return_pct: 7.0,
      };

      // Act
      const errors = result.current.validateProfileForm(invalidData);

      // Assert
      expect(errors.monthly_expense).toBe('Miesięczne wydatki są wymagane');
    });

    it('should return error for Infinity monthly_expense', () => {
      // Arrange
      const { result } = renderHook(() => useOnboardingForm());
      const invalidData: CreateProfileCommand = {
        monthly_expense: Infinity,
        withdrawal_rate_pct: 4.0,
        expected_return_pct: 7.0,
      };

      // Act
      const errors = result.current.validateProfileForm(invalidData);

      // Assert
      expect(errors.monthly_expense).toBe('Miesięczne wydatki są wymagane');
    });

    it('should return error for negative monthly_expense', () => {
      // Arrange
      const { result } = renderHook(() => useOnboardingForm());
      const invalidData: CreateProfileCommand = {
        monthly_expense: -100,
        withdrawal_rate_pct: 4.0,
        expected_return_pct: 7.0,
      };

      // Act
      const errors = result.current.validateProfileForm(invalidData);

      // Assert
      expect(errors.monthly_expense).toBe('Miesięczne wydatki muszą być >= 0');
    });

    it('should accept zero monthly_expense', () => {
      // Arrange
      const { result } = renderHook(() => useOnboardingForm());
      const validData: CreateProfileCommand = {
        monthly_expense: 0,
        withdrawal_rate_pct: 4.0,
        expected_return_pct: 7.0,
      };

      // Act
      const errors = result.current.validateProfileForm(validData);

      // Assert
      expect(errors.monthly_expense).toBeUndefined();
    });

    it('should return error for undefined withdrawal_rate_pct', () => {
      // Arrange
      const { result } = renderHook(() => useOnboardingForm());
      const invalidData = {
        monthly_expense: 4500.0,
        expected_return_pct: 7.0,
      } as CreateProfileCommand;

      // Act
      const errors = result.current.validateProfileForm(invalidData);

      // Assert
      expect(errors.withdrawal_rate_pct).toBe('Stopa wypłat jest wymagana');
    });

    it('should return error for withdrawal_rate_pct < 0', () => {
      // Arrange
      const { result } = renderHook(() => useOnboardingForm());
      const invalidData: CreateProfileCommand = {
        monthly_expense: 4500.0,
        withdrawal_rate_pct: -1,
        expected_return_pct: 7.0,
      };

      // Act
      const errors = result.current.validateProfileForm(invalidData);

      // Assert
      expect(errors.withdrawal_rate_pct).toBe('Stopa wypłat musi być w zakresie 0-100');
    });

    it('should return error for withdrawal_rate_pct > 100', () => {
      // Arrange
      const { result } = renderHook(() => useOnboardingForm());
      const invalidData: CreateProfileCommand = {
        monthly_expense: 4500.0,
        withdrawal_rate_pct: 101,
        expected_return_pct: 7.0,
      };

      // Act
      const errors = result.current.validateProfileForm(invalidData);

      // Assert
      expect(errors.withdrawal_rate_pct).toBe('Stopa wypłat musi być w zakresie 0-100');
    });

    it('should accept withdrawal_rate_pct at boundaries (0 and 100)', () => {
      // Arrange
      const { result } = renderHook(() => useOnboardingForm());
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
      const errors0 = result.current.validateProfileForm(dataAt0);
      const errors100 = result.current.validateProfileForm(dataAt100);

      // Assert
      expect(errors0.withdrawal_rate_pct).toBeUndefined();
      expect(errors100.withdrawal_rate_pct).toBeUndefined();
    });

    it('should return error for expected_return_pct < -100', () => {
      // Arrange
      const { result } = renderHook(() => useOnboardingForm());
      const invalidData: CreateProfileCommand = {
        monthly_expense: 4500.0,
        withdrawal_rate_pct: 4.0,
        expected_return_pct: -101,
      };

      // Act
      const errors = result.current.validateProfileForm(invalidData);

      // Assert
      expect(errors.expected_return_pct).toBe('Oczekiwany zwrot musi być w zakresie -100 do 1000');
    });

    it('should return error for expected_return_pct > 1000', () => {
      // Arrange
      const { result } = renderHook(() => useOnboardingForm());
      const invalidData: CreateProfileCommand = {
        monthly_expense: 4500.0,
        withdrawal_rate_pct: 4.0,
        expected_return_pct: 1001,
      };

      // Act
      const errors = result.current.validateProfileForm(invalidData);

      // Assert
      expect(errors.expected_return_pct).toBe('Oczekiwany zwrot musi być w zakresie -100 do 1000');
    });

    it('should accept expected_return_pct at boundaries (-100 and 1000)', () => {
      // Arrange
      const { result } = renderHook(() => useOnboardingForm());
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
      const errorsMinus100 = result.current.validateProfileForm(dataAtMinus100);
      const errors1000 = result.current.validateProfileForm(dataAt1000);

      // Assert
      expect(errorsMinus100.expected_return_pct).toBeUndefined();
      expect(errors1000.expected_return_pct).toBeUndefined();
    });

    it('should return error for birth_date in the future', () => {
      // Arrange
      const { result } = renderHook(() => useOnboardingForm());
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const invalidData: CreateProfileCommand = {
        monthly_expense: 4500.0,
        withdrawal_rate_pct: 4.0,
        expected_return_pct: 7.0,
        birth_date: tomorrow.toISOString().split('T')[0],
      };

      // Act
      const errors = result.current.validateProfileForm(invalidData);

      // Assert
      expect(errors.birth_date).toBe('Data urodzenia musi być w przeszłości');
    });

    it('should return error for birth_date older than 120 years', () => {
      // Arrange
      const { result } = renderHook(() => useOnboardingForm());
      const tooOld = new Date();
      tooOld.setFullYear(tooOld.getFullYear() - 121);
      const invalidData: CreateProfileCommand = {
        monthly_expense: 4500.0,
        withdrawal_rate_pct: 4.0,
        expected_return_pct: 7.0,
        birth_date: tooOld.toISOString().split('T')[0],
      };

      // Act
      const errors = result.current.validateProfileForm(invalidData);

      // Assert
      expect(errors.birth_date).toBe('Data urodzenia nie może być starsza niż 120 lat');
    });

    it('should return multiple errors for multiple invalid fields', () => {
      // Arrange
      const { result } = renderHook(() => useOnboardingForm());
      const invalidData = {
        monthly_expense: -100,
        withdrawal_rate_pct: 101,
        expected_return_pct: 1001,
      } as CreateProfileCommand;

      // Act
      const errors = result.current.validateProfileForm(invalidData);

      // Assert
      expect(errors.monthly_expense).toBeDefined();
      expect(errors.withdrawal_rate_pct).toBeDefined();
      expect(errors.expected_return_pct).toBeDefined();
    });
  });

  describe('validateInvestmentForm', () => {
    it('should return no errors for valid investment data', () => {
      // Arrange
      const { result } = renderHook(() => useOnboardingForm());
      const validData: CreateInvestmentCommand = {
        type: 'etf',
        amount: 10000.0,
        acquired_at: '2024-01-15',
        notes: 'ETF SP500',
      };

      // Act
      const errors = result.current.validateInvestmentForm(validData);

      // Assert
      expect(errors).toEqual({});
    });

    it('should return no errors for investment without notes', () => {
      // Arrange
      const { result } = renderHook(() => useOnboardingForm());
      const validData: CreateInvestmentCommand = {
        type: 'bond',
        amount: 5000.0,
        acquired_at: '2024-01-15',
      };

      // Act
      const errors = result.current.validateInvestmentForm(validData);

      // Assert
      expect(errors).toEqual({});
    });

    it('should return error for invalid type', () => {
      // Arrange
      const { result } = renderHook(() => useOnboardingForm());
      const invalidData = {
        type: 'invalid_type',
        amount: 1000.0,
        acquired_at: '2024-01-15',
      } as CreateInvestmentCommand;

      // Act
      const errors = result.current.validateInvestmentForm(invalidData);

      // Assert
      expect(errors.type).toBe('Wybierz typ inwestycji');
    });

    it('should return error for undefined type', () => {
      // Arrange
      const { result } = renderHook(() => useOnboardingForm());
      const invalidData = {
        amount: 1000.0,
        acquired_at: '2024-01-15',
      } as CreateInvestmentCommand;

      // Act
      const errors = result.current.validateInvestmentForm(invalidData);

      // Assert
      expect(errors.type).toBe('Wybierz typ inwestycji');
    });

    it('should validate all valid asset types', () => {
      // Arrange
      const { result } = renderHook(() => useOnboardingForm());
      const types: Array<CreateInvestmentCommand['type']> = ['etf', 'bond', 'stock', 'cash'];

      // Act & Assert
      types.forEach((type) => {
        const data: CreateInvestmentCommand = {
          type,
          amount: 1000.0,
          acquired_at: '2024-01-15',
        };
        const errors = result.current.validateInvestmentForm(data);
        expect(errors.type).toBeUndefined();
      });
    });

    it('should return error for amount <= 0', () => {
      // Arrange
      const { result } = renderHook(() => useOnboardingForm());
      const invalidData1: CreateInvestmentCommand = {
        type: 'etf',
        amount: 0,
        acquired_at: '2024-01-15',
      };
      const invalidData2: CreateInvestmentCommand = {
        type: 'etf',
        amount: -100,
        acquired_at: '2024-01-15',
      };

      // Act
      const errors1 = result.current.validateInvestmentForm(invalidData1);
      const errors2 = result.current.validateInvestmentForm(invalidData2);

      // Assert
      expect(errors1.amount).toBe('Kwota musi być większa od 0 i mniejsza niż 999999999999.99');
      expect(errors2.amount).toBe('Kwota musi być większa od 0 i mniejsza niż 999999999999.99');
    });

    it('should return error for amount > max', () => {
      // Arrange
      const { result } = renderHook(() => useOnboardingForm());
      const invalidData: CreateInvestmentCommand = {
        type: 'etf',
        amount: 999999999999.99 + 0.01,
        acquired_at: '2024-01-15',
      };

      // Act
      const errors = result.current.validateInvestmentForm(invalidData);

      // Assert
      expect(errors.amount).toBe('Kwota musi być większa od 0 i mniejsza niż 999999999999.99');
    });

    it('should return error for undefined amount', () => {
      // Arrange
      const { result } = renderHook(() => useOnboardingForm());
      const invalidData = {
        type: 'etf',
        acquired_at: '2024-01-15',
      } as CreateInvestmentCommand;

      // Act
      const errors = result.current.validateInvestmentForm(invalidData);

      // Assert
      expect(errors.amount).toBe('Kwota musi być większa od 0 i mniejsza niż 999999999999.99');
    });

    it('should return error for NaN amount', () => {
      // Arrange
      const { result } = renderHook(() => useOnboardingForm());
      const invalidData: CreateInvestmentCommand = {
        type: 'etf',
        amount: NaN,
        acquired_at: '2024-01-15',
      };

      // Act
      const errors = result.current.validateInvestmentForm(invalidData);

      // Assert
      expect(errors.amount).toBe('Kwota musi być większa od 0 i mniejsza niż 999999999999.99');
    });

    it('should return error for missing acquired_at', () => {
      // Arrange
      const { result } = renderHook(() => useOnboardingForm());
      const invalidData = {
        type: 'etf',
        amount: 1000.0,
      } as CreateInvestmentCommand;

      // Act
      const errors = result.current.validateInvestmentForm(invalidData);

      // Assert
      expect(errors.acquired_at).toBe('Data nabycia jest wymagana');
    });

    it('should return error for future acquired_at', () => {
      // Arrange
      const { result } = renderHook(() => useOnboardingForm());
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const invalidData: CreateInvestmentCommand = {
        type: 'etf',
        amount: 1000.0,
        acquired_at: tomorrow.toISOString().split('T')[0],
      };

      // Act
      const errors = result.current.validateInvestmentForm(invalidData);

      // Assert
      expect(errors.acquired_at).toBe('Data nabycia nie może być w przyszłości');
    });

    it('should accept today as acquired_at', () => {
      // Arrange
      const { result } = renderHook(() => useOnboardingForm());
      const today = new Date();
      const validData: CreateInvestmentCommand = {
        type: 'etf',
        amount: 1000.0,
        acquired_at: today.toISOString().split('T')[0],
      };

      // Act
      const errors = result.current.validateInvestmentForm(validData);

      // Assert
      expect(errors.acquired_at).toBeUndefined();
    });

    it('should return error for notes exceeding 1000 characters', () => {
      // Arrange
      const { result } = renderHook(() => useOnboardingForm());
      const invalidData: CreateInvestmentCommand = {
        type: 'etf',
        amount: 1000.0,
        acquired_at: '2024-01-15',
        notes: 'a'.repeat(1001),
      };

      // Act
      const errors = result.current.validateInvestmentForm(invalidData);

      // Assert
      expect(errors.notes).toBe('Notatki nie mogą przekraczać 1000 znaków');
    });

    it('should accept notes with exactly 1000 characters', () => {
      // Arrange
      const { result } = renderHook(() => useOnboardingForm());
      const validData: CreateInvestmentCommand = {
        type: 'etf',
        amount: 1000.0,
        acquired_at: '2024-01-15',
        notes: 'a'.repeat(1000),
      };

      // Act
      const errors = result.current.validateInvestmentForm(validData);

      // Assert
      expect(errors.notes).toBeUndefined();
    });

    it('should accept empty string notes (optional)', () => {
      // Arrange
      const { result } = renderHook(() => useOnboardingForm());
      const validData: CreateInvestmentCommand = {
        type: 'etf',
        amount: 1000.0,
        acquired_at: '2024-01-15',
        notes: '',
      };

      // Act
      const errors = result.current.validateInvestmentForm(validData);

      // Assert
      expect(errors.notes).toBeUndefined();
    });

    it('should return multiple errors for multiple invalid fields', () => {
      // Arrange
      const { result } = renderHook(() => useOnboardingForm());
      const invalidData = {
        type: 'invalid_type',
        amount: -100,
        // brak acquired_at
      } as CreateInvestmentCommand;

      // Act
      const errors = result.current.validateInvestmentForm(invalidData);

      // Assert
      expect(errors.type).toBeDefined();
      expect(errors.amount).toBeDefined();
      expect(errors.acquired_at).toBeDefined();
    });
  });
});

