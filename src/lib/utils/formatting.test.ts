import { describe, it, expect } from 'vitest';
import { formatCurrency, formatPercent, formatAge, formatYearsAndMonths } from './formatting';

describe('formatting', () => {
  describe('formatCurrency', () => {
    it('should format positive numbers as PLN with 2 decimal places', () => {
      // Arrange
      const value = 1350000.5;

      // Act
      const result = formatCurrency(value);

      // Assert
      expect(result).toContain('1');
      expect(result).toContain('350');
      expect(result).toContain('000');
      expect(result).toContain('zł');
      // Format polski: "1 350 000,50 zł"
      expect(result).toMatch(/1[\s]?350[\s]?000[,.]50[\s]?zł/);
    });

    it('should format zero correctly', () => {
      // Arrange
      const value = 0;

      // Act
      const result = formatCurrency(value);

      // Assert
      expect(result).toContain('0');
      expect(result).toContain('zł');
      // Format: "0,00 zł"
      expect(result).toMatch(/0[,.]00[\s]?zł/);
    });

    it('should format very large numbers correctly', () => {
      // Arrange
      const value = 999999999.99;

      // Act
      const result = formatCurrency(value);

      // Assert
      expect(result).toContain('zł');
      expect(result).toMatch(/999[\s]?999[\s]?999[,.]99[\s]?zł/);
    });

    it('should format negative numbers correctly', () => {
      // Arrange
      const value = -1000.5;

      // Act
      const result = formatCurrency(value);

      // Assert
      expect(result).toContain('-');
      expect(result).toContain('zł');
    });

    it('should format small decimal values correctly', () => {
      // Arrange
      const value = 0.01;

      // Act
      const result = formatCurrency(value);

      // Assert
      expect(result).toContain('0');
      expect(result).toContain('01');
      expect(result).toContain('zł');
    });

    it('should format values with no decimal part correctly', () => {
      // Arrange
      const value = 1000;

      // Act
      const result = formatCurrency(value);

      // Assert
      expect(result).toContain('1000');
      expect(result).toContain('00'); // 2 miejsca po przecinku
      expect(result).toContain('zł');
    });
  });

  describe('formatPercent', () => {
    it('should format 0-1 value as percentage with 2 decimals', () => {
      // Arrange
      const value = 0.0252; // 2.52%

      // Act
      const result = formatPercent(value);

      // Assert
      expect(result).toContain('%');
      expect(result).toMatch(/2[,.]52%/);
    });

    it('should format 0 as 0%', () => {
      // Arrange
      const value = 0;

      // Act
      const result = formatPercent(value);

      // Assert
      expect(result).toMatch(/0[,.]00%/);
    });

    it('should format 1 as 100%', () => {
      // Arrange
      const value = 1;

      // Act
      const result = formatPercent(value);

      // Assert
      expect(result).toMatch(/100[,.]00%/);
    });

    it('should format negative values correctly', () => {
      // Arrange
      const value = -0.05; // -5%

      // Act
      const result = formatPercent(value);

      // Assert
      expect(result).toContain('-');
      expect(result).toContain('%');
      expect(result).toMatch(/-5[,.]00%/);
    });

    it('should use custom decimal places when provided', () => {
      // Arrange
      const value = 0.123456;
      const decimals = 4;

      // Act
      const result = formatPercent(value, decimals);

      // Assert
      expect(result).toContain('%');
      // Powinno być zaokrąglone do 4 miejsc po przecinku
      expect(result).toMatch(/12[,.]3456%/);
    });

    it('should format values greater than 1 correctly', () => {
      // Arrange
      const value = 1.5; // 150%

      // Act
      const result = formatPercent(value);

      // Assert
      expect(result).toMatch(/150[,.]00%/);
    });
  });

  describe('formatAge', () => {
    it('should format age with one decimal place', () => {
      // Arrange
      const age = 58.3;

      // Act
      const result = formatAge(age);

      // Assert
      expect(result).toBe('58,3 lat');
    });

    it('should format integer age correctly', () => {
      // Arrange
      const age = 30;

      // Act
      const result = formatAge(age);

      // Assert
      expect(result).toBe('30,0 lat');
    });

    it('should format zero age correctly', () => {
      // Arrange
      const age = 0;

      // Act
      const result = formatAge(age);

      // Assert
      expect(result).toBe('0,0 lat');
    });

    it('should format decimal age with proper rounding', () => {
      // Arrange
      const age = 25.67;

      // Act
      const result = formatAge(age);

      // Assert
      expect(result).toMatch(/25[,.]7 lat/);
    });
  });

  describe('formatYearsAndMonths', () => {
    it('should format 0 years and 0 months as "0 lat"', () => {
      // Arrange
      const years = 0;

      // Act
      const result = formatYearsAndMonths(years);

      // Assert
      expect(result).toBe('0 lat');
    });

    it('should format only months correctly (0 years)', () => {
      // Arrange
      const years = 0.25; // 3 miesiące

      // Act
      const result = formatYearsAndMonths(years);

      // Assert
      expect(result).toContain('miesiąc');
      expect(result).not.toContain('lat');
      expect(result).not.toContain('rok');
    });

    it('should format 1 month correctly', () => {
      // Arrange
      const years = 1 / 12; // 1 miesiąc

      // Act
      const result = formatYearsAndMonths(years);

      // Assert
      expect(result).toBe('1 miesiąc');
    });

    it('should format 2-4 months correctly (miesiące)', () => {
      // Arrange
      const years = 3 / 12; // 3 miesiące

      // Act
      const result = formatYearsAndMonths(years);

      // Assert
      expect(result).toBe('3 miesiące');
    });

    it('should format 5+ months correctly (miesięcy)', () => {
      // Arrange
      const years = 6 / 12; // 6 miesięcy

      // Act
      const result = formatYearsAndMonths(years);

      // Assert
      expect(result).toBe('6 miesięcy');
    });

    it('should format only years correctly (0 months)', () => {
      // Arrange
      const years = 5.0; // 5 lat, 0 miesięcy

      // Act
      const result = formatYearsAndMonths(years);

      // Assert
      expect(result).toContain('5');
      expect(result).toContain('lat');
      expect(result).not.toContain('miesiąc');
    });

    it('should format 1 year correctly', () => {
      // Arrange
      const years = 1.0;

      // Act
      const result = formatYearsAndMonths(years);

      // Assert
      expect(result).toBe('1 rok');
    });

    it('should format 2-4 years correctly (lata)', () => {
      // Arrange
      const years = 3.0;

      // Act
      const result = formatYearsAndMonths(years);

      // Assert
      expect(result).toBe('3 lata');
    });

    it('should format 5+ years correctly (lat)', () => {
      // Arrange
      const years = 10.0;

      // Act
      const result = formatYearsAndMonths(years);

      // Assert
      expect(result).toBe('10 lat');
    });

    it('should format years and months together correctly', () => {
      // Arrange
      const years = 22.33; // 22 lata i ~4 miesiące

      // Act
      const result = formatYearsAndMonths(years);

      // Assert
      expect(result).toContain('22');
      expect(result).toContain('lat');
      expect(result).toContain('i');
      expect(result).toContain('miesiąc');
    });

    it('should format 1 year and 1 month correctly', () => {
      // Arrange
      const years = 1 + 1 / 12; // 1 rok i 1 miesiąc

      // Act
      const result = formatYearsAndMonths(years);

      // Assert
      expect(result).toBe('1 rok i 1 miesiąc');
    });

    it('should format 1 year and multiple months correctly', () => {
      // Arrange
      const years = 1 + 3 / 12; // 1 rok i 3 miesiące

      // Act
      const result = formatYearsAndMonths(years);

      // Assert
      expect(result).toBe('1 rok i 3 miesiące');
    });

    it('should handle fractional months with rounding', () => {
      // Arrange
      const years = 5.083; // 5 lat i ~1 miesiąc (5.083 * 12 = 60.996 ≈ 61 miesięcy, ale to jest 5 lat i 1 miesiąc)

      // Act
      const result = formatYearsAndMonths(years);

      // Assert
      expect(result).toContain('5');
      expect(result).toContain('lat');
      expect(result).toContain('i');
    });

    it('should handle large number of years correctly', () => {
      // Arrange
      const years = 50.5; // 50 lat i 6 miesięcy

      // Act
      const result = formatYearsAndMonths(years);

      // Assert
      expect(result).toContain('50');
      expect(result).toContain('lat');
      expect(result).toContain('i');
      expect(result).toContain('miesięcy');
    });
  });
});
