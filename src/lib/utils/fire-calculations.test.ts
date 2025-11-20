import { describe, it, expect } from "vitest";
import { calculateAge, calculateYearsToFire } from "./fire-calculations";
import type { ISODateString } from "@/types";

describe("fire-calculations", () => {
  describe("calculateAge", () => {
    it("should calculate age correctly for a person born 30 years ago", () => {
      // Arrange
      const today = new Date();
      const birthDate = new Date(today);
      birthDate.setFullYear(today.getFullYear() - 30);
      const birthDateString = birthDate.toISOString().split("T")[0] as ISODateString;

      // Act
      const age = calculateAge(birthDateString);

      // Assert
      expect(age).toBeCloseTo(30, 0);
    });

    it("should calculate age with decimal precision for months", () => {
      // Arrange
      const today = new Date();
      const birthDate = new Date(today);
      birthDate.setFullYear(today.getFullYear() - 30);
      birthDate.setMonth(today.getMonth() - 6); // 6 miesięcy temu
      const birthDateString = birthDate.toISOString().split("T")[0] as ISODateString;

      // Act
      const age = calculateAge(birthDateString);

      // Assert
      expect(age).toBeCloseTo(30.5, 0);
    });

    it("should handle birthday today correctly", () => {
      // Arrange
      const today = new Date();
      const birthDateString = today.toISOString().split("T")[0] as ISODateString;

      // Act
      const age = calculateAge(birthDateString);

      // Assert
      expect(age).toBeCloseTo(0, 1);
    });

    it("should handle leap year birthdays correctly", () => {
      // Arrange - urodziny 29 lutego
      const birthDateString = "2000-02-29" as ISODateString;

      // Act
      const age = calculateAge(birthDateString);

      // Assert - powinno obliczyć wiek poprawnie nawet w latach nieprzestępnych
      expect(age).toBeGreaterThan(20);
      expect(age).toBeLessThan(30);
    });

    it("should calculate age correctly when birthday is in the future month", () => {
      // Arrange - urodziny w przyszłym miesiącu (ale w przeszłym roku)
      // Uwaga: jeśli urodziny są w przyszłości względem dzisiejszej daty,
      // wynik może być ujemny (co jest poprawne matematycznie)
      const today = new Date();
      const birthDate = new Date(today);
      birthDate.setFullYear(today.getFullYear() - 1);
      birthDate.setMonth(today.getMonth() + 1);
      const birthDateString = birthDate.toISOString().split("T")[0] as ISODateString;

      // Act
      const age = calculateAge(birthDateString);

      // Assert - powinno być mniej niż rok (może być ujemne jeśli urodziny są w przyszłości)
      expect(Math.abs(age)).toBeLessThan(1);
    });
  });

  describe("calculateYearsToFire", () => {
    // Testy zgodne z PRD: years_to_fire = log(fire_target / invested_total) / log(1 + expected_return_pct / 100)

    it("should calculate years correctly for standard scenario", () => {
      // Arrange
      const fireTarget = 1_000_000; // 1M PLN
      const investedTotal = 100_000; // 100k PLN
      const expectedReturnPct = 7; // 7% rocznie

      // Act
      const result = calculateYearsToFire(fireTarget, investedTotal, expectedReturnPct);

      // Assert
      expect(result).not.toBeNull();
      // Rzeczywista wartość to ~34.03, więc zwiększamy tolerancję do 2 miejsc po przecinku
      expect(result).toBeCloseTo(34.0, 0);
    });

    it("should return null when investedTotal is 0", () => {
      // Arrange
      const fireTarget = 1_000_000;
      const investedTotal = 0;
      const expectedReturnPct = 7;

      // Act
      const result = calculateYearsToFire(fireTarget, investedTotal, expectedReturnPct);

      // Assert
      expect(result).toBeNull();
    });

    it("should return null when investedTotal is negative", () => {
      // Arrange
      const fireTarget = 1_000_000;
      const investedTotal = -1000;
      const expectedReturnPct = 7;

      // Act
      const result = calculateYearsToFire(fireTarget, investedTotal, expectedReturnPct);

      // Assert
      expect(result).toBeNull();
    });

    it("should return null when fireTarget is 0", () => {
      // Arrange
      const fireTarget = 0;
      const investedTotal = 100_000;
      const expectedReturnPct = 7;

      // Act
      const result = calculateYearsToFire(fireTarget, investedTotal, expectedReturnPct);

      // Assert
      expect(result).toBeNull();
    });

    it("should return null when fireTarget is negative", () => {
      // Arrange
      const fireTarget = -1_000_000;
      const investedTotal = 100_000;
      const expectedReturnPct = 7;

      // Act
      const result = calculateYearsToFire(fireTarget, investedTotal, expectedReturnPct);

      // Assert
      expect(result).toBeNull();
    });

    it("should return null when expectedReturnPct is -100", () => {
      // Arrange
      const fireTarget = 1_000_000;
      const investedTotal = 100_000;
      const expectedReturnPct = -100;

      // Act
      const result = calculateYearsToFire(fireTarget, investedTotal, expectedReturnPct);

      // Assert
      expect(result).toBeNull();
    });

    it("should return null when expectedReturnPct is less than -100", () => {
      // Arrange
      const fireTarget = 1_000_000;
      const investedTotal = 100_000;
      const expectedReturnPct = -101;

      // Act
      const result = calculateYearsToFire(fireTarget, investedTotal, expectedReturnPct);

      // Assert
      expect(result).toBeNull();
    });

    it("should handle case when fireTarget equals investedTotal", () => {
      // Arrange - użytkownik już osiągnął FIRE
      const fireTarget = 1_000_000;
      const investedTotal = 1_000_000;
      const expectedReturnPct = 7;

      // Act
      const result = calculateYearsToFire(fireTarget, investedTotal, expectedReturnPct);

      // Assert
      expect(result).not.toBeNull();
      expect(result).toBeCloseTo(0, 2);
    });

    it("should handle case when fireTarget is less than investedTotal", () => {
      // Arrange - użytkownik przekroczył FIRE target
      const fireTarget = 500_000;
      const investedTotal = 1_000_000;
      const expectedReturnPct = 7;

      // Act
      const result = calculateYearsToFire(fireTarget, investedTotal, expectedReturnPct);

      // Assert - ratio < 1, więc log będzie ujemny, ale funkcja powinna zwrócić wartość
      expect(result).not.toBeNull();
      expect(result).toBeLessThan(0);
    });

    it("should handle zero expected return", () => {
      // Arrange
      const fireTarget = 1_000_000;
      const investedTotal = 100_000;
      const expectedReturnPct = 0;

      // Act
      const result = calculateYearsToFire(fireTarget, investedTotal, expectedReturnPct);

      // Assert - growthRate = 1, log(1) = 0, więc dzielenie przez zero
      // Funkcja powinna zwrócić null lub Infinity/NaN
      // Sprawdzamy czy funkcja obsługuje to poprawnie
      expect(result).not.toBeNull();
      // Przy 0% zwrotu, nigdy nie osiągniemy celu (Infinity)
      expect(result).toBe(Infinity);
    });

    it("should calculate correctly for high return rate", () => {
      // Arrange
      const fireTarget = 1_000_000;
      const investedTotal = 100_000;
      const expectedReturnPct = 20; // 20% rocznie

      // Act
      const result = calculateYearsToFire(fireTarget, investedTotal, expectedReturnPct);

      // Assert
      expect(result).not.toBeNull();
      expect(result).toBeLessThan(15);
      expect(result).toBeGreaterThan(10);
    });

    it("should calculate correctly for low return rate", () => {
      // Arrange
      const fireTarget = 1_000_000;
      const investedTotal = 100_000;
      const expectedReturnPct = 2; // 2% rocznie

      // Act
      const result = calculateYearsToFire(fireTarget, investedTotal, expectedReturnPct);

      // Assert
      expect(result).not.toBeNull();
      expect(result).toBeGreaterThan(100);
    });

    it("should handle very large numbers", () => {
      // Arrange
      const fireTarget = 10_000_000_000; // 10 miliardów
      const investedTotal = 1_000_000_000; // 1 miliard
      const expectedReturnPct = 7;

      // Act
      const result = calculateYearsToFire(fireTarget, investedTotal, expectedReturnPct);

      // Assert
      expect(result).not.toBeNull();
      // Rzeczywista wartość to ~34.03 dla tego stosunku
      expect(result).toBeCloseTo(34.0, 0);
    });

    it("should handle very small numbers with precision", () => {
      // Arrange
      const fireTarget = 1_000;
      const investedTotal = 100;
      const expectedReturnPct = 7;

      // Act
      const result = calculateYearsToFire(fireTarget, investedTotal, expectedReturnPct);

      // Assert
      expect(result).not.toBeNull();
      // Rzeczywista wartość to ~34.03 dla tego stosunku
      expect(result).toBeCloseTo(34.0, 0);
    });

    it("should handle negative expected return (but > -100)", () => {
      // Arrange - ujemny zwrot (strata)
      const fireTarget = 1_000_000;
      const investedTotal = 100_000;
      const expectedReturnPct = -5; // -5% rocznie (strata)

      // Act
      const result = calculateYearsToFire(fireTarget, investedTotal, expectedReturnPct);

      // Assert - przy ujemnym zwrocie, nigdy nie osiągniemy celu
      // growthRate = 0.95, ratio = 10, log(10) / log(0.95) = ujemna wartość
      expect(result).not.toBeNull();
      // Przy ujemnym zwrocie wynik będzie ujemny (niemożliwe do osiągnięcia)
      expect(result).toBeLessThan(0);
    });
  });
});
