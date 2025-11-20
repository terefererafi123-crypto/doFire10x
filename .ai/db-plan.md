# Schemat bazy danych PostgreSQL - DoFIRE

## 1. Przegląd

Baza danych dla aplikacji DoFIRE została zaprojektowana pod Supabase (PostgreSQL 14+) z wykorzystaniem Row Level Security (RLS) do ochrony danych użytkowników. Schemat obejmuje dwie główne tabele: `profiles` (dane użytkownika) i `investments` (rejestr inwestycji), oraz widok agregujący `v_investments_agg` do obliczeń wskaźników FIRE.

**Konwencje:**

- Nazwy tabel i kolumn w konwencji `snake_case`
- Wszystkie kwoty w PLN przechowywane jako `numeric(16,2)`
- Procenty przechowywane jako `numeric(5,2)`
- Wszystkie tabele pos iadają pola `created_at` i `updated_at` z automatyczną aktualizacją
- Wszystkie relacje z `auth.users` wykorzystują `ON DELETE CASCADE`

---

## 2. Typy danych niestandardowych

### 2.1. ENUM: asset_type

Typ wyliczeniowy definiujący dostępne typy aktywów inwestycyjnych.

```sql
CREATE TYPE asset_type AS ENUM ('etf', 'bond', 'stock', 'cash');
```

**Wartości:**

- `etf` - Exchange Traded Fund
- `bond` - Obligacja
- `stock` - Akcja
- `cash` - Gotówka

**Uwagi:**

- W przyszłości można dodać nowe wartości za pomocą: `ALTER TYPE asset_type ADD VALUE 'crypto';`
- ENUM zapewnia spójność danych i walidację na poziomie bazy

---

## 3. Tabele

### 3.1. Tabela: profiles

Tabela przechowująca dane użytkownika wymagane do obliczeń FIRE. Relacja 1:1 z `auth.users`.

**Uwaga:** Tabela `auth.users` jest zarządzana przez Supabase Auth i już istnieje w systemie. Tabela `profiles` rozszerza `auth.users` o dodatkowe dane potrzebne do obliczeń FIRE.

**Zależności:**

- Wymaga istniejącej tabeli `auth.users` (już istnieje w Supabase)
- Nie zależy od innych tabel ani typów w naszym schemacie
- Może być utworzona jako pierwsza tabela (nie wymaga ENUM `asset_type`)

**Kolumny:**

| Nazwa                 | Typ             | Nullable | Domyślna wartość    | Opis                                     |
| --------------------- | --------------- | -------- | ------------------- | ---------------------------------------- |
| `id`                  | `uuid`          | NOT NULL | `gen_random_uuid()` | Klucz podstawowy (UUID)                  |
| `user_id`             | `uuid`          | NOT NULL | -                   | Klucz obcy do `auth.users.id` (UNIQUE)   |
| `monthly_expense`     | `numeric(16,2)` | NOT NULL | `0.00`              | Miesięczne wydatki użytkownika (PLN)     |
| `withdrawal_rate_pct` | `numeric(5,2)`  | NOT NULL | `4.00`              | Roczna stopa wypłaty (procent)           |
| `expected_return_pct` | `numeric(5,2)`  | NOT NULL | `7.00`              | Oczekiwana roczna stopa zwrotu (procent) |
| `birth_date`          | `date`          | NULL     | -                   | Data urodzenia użytkownika (opcjonalna)  |
| `created_at`          | `timestamptz`   | NOT NULL | `now()`             | Data i czas utworzenia rekordu           |
| `updated_at`          | `timestamptz`   | NOT NULL | `now()`             | Data i czas ostatniej aktualizacji       |

**Klucze:**

- **Klucz podstawowy:** `profiles_pkey` na `id`
- **Klucz obcy:** `profiles_user_id_fkey` na `user_id` → `auth.users(id) ON DELETE CASCADE`
- **Unikalność:** `profiles_user_id_key` na `user_id` (zapewnia relację 1:1)

**Ograniczenia CHECK:**

- `profiles_monthly_expense_non_negative` - `monthly_expense >= 0`
- `profiles_withdrawal_rate_range` - `withdrawal_rate_pct >= 0 AND withdrawal_rate_pct <= 100`
- `profiles_expected_return_range` - `expected_return_pct >= -100 AND expected_return_pct <= 1000`
- `profiles_birth_date_valid` - `birth_date IS NULL OR (birth_date < current_date AND birth_date >= current_date - interval '120 years')`

**Indeksy:**

- `profiles_user_id_idx` na `user_id` (dla szybkiego wyszukiwania po user_id)

**RLS:**

- Polityka SELECT: `user_id = auth.uid()`
- Polityka INSERT: `user_id = auth.uid()`
- Polityka UPDATE: `user_id = auth.uid()`
- Polityka DELETE: `user_id = auth.uid()`

**Uwagi:**

- `monthly_expense` może wynosić 0 (dopuszczalne dla użytkowników bez wydatków)
- `birth_date` jest opcjonalne - jeśli NULL, obliczenia wieku nie będą możliwe
- `withdrawal_rate_pct` domyślnie 4% (reguła 4%)
- `expected_return_pct` domyślnie 7% (typowa stopa zwrotu dla portfela mieszanego)

---

### 3.2. Tabela: investments

Tabela przechowująca rejestr inwestycji użytkownika. Relacja 1:N z `auth.users` (poprzez `user_id`).

**Zależności:**

- Wymaga istniejącej tabeli `auth.users` (już istnieje w Supabase)
- Wymaga istniejącego typu ENUM `asset_type` (musi być utworzony przed tą tabelą)
- Może być utworzona po utworzeniu ENUM i tabeli `profiles` (kolejność `profiles` i `investments` może być dowolna, obie zależą tylko od `auth.users`)

**Kolumny:**

| Nazwa         | Typ             | Nullable | Domyślna wartość    | Opis                                 |
| ------------- | --------------- | -------- | ------------------- | ------------------------------------ |
| `id`          | `uuid`          | NOT NULL | `gen_random_uuid()` | Klucz podstawowy (UUID)              |
| `user_id`     | `uuid`          | NOT NULL | -                   | Klucz obcy do `auth.users.id`        |
| `type`        | `asset_type`    | NOT NULL | -                   | Typ aktywa (ENUM)                    |
| `amount`      | `numeric(16,2)` | NOT NULL | -                   | Kwota inwestycji (PLN)               |
| `acquired_at` | `date`          | NOT NULL | -                   | Data nabycia inwestycji              |
| `notes`       | `text`          | NULL     | -                   | Opcjonalne notatki (max 1000 znaków) |
| `created_at`  | `timestamptz`   | NOT NULL | `now()`             | Data i czas utworzenia rekordu       |
| `updated_at`  | `timestamptz`   | NOT NULL | `now()`             | Data i czas ostatniej aktualizacji   |

**Klucze:**

- **Klucz podstawowy:** `investments_pkey` na `id`
- **Klucz obcy:** `investments_user_id_fkey` na `user_id` → `auth.users(id) ON DELETE CASCADE`

**Ograniczenia CHECK:**

- `investments_amount_positive` - `amount > 0`
- `investments_acquired_at_not_future` - `acquired_at <= current_date`
- `investments_notes_valid` - `notes IS NULL OR (btrim(notes) <> '' AND char_length(notes) <= 1000)`

**Indeksy:**

- `investments_user_id_idx` na `user_id` (dla szybkiego wyszukiwania po user_id)
- `investments_acquired_at_idx` na `acquired_at` (dla sortowania i filtrowania po dacie)
- `investments_type_idx` na `type` (dla agregacji po typie aktywa)

**RLS:**

- Polityka SELECT: `user_id = auth.uid()`
- Polityka INSERT: `user_id = auth.uid()`
- Polityka UPDATE: `user_id = auth.uid()`
- Polityka DELETE: `user_id = auth.uid()`

**Uwagi:**

- `amount` musi być większe od 0 (walidacja na poziomie bazy)
- `acquired_at` nie może być datą przyszłą (walidacja na poziomie bazy)
- `notes` może być NULL lub niepustym tekstem o maksymalnej długości 1000 znaków
- Hard delete - brak soft delete (zgodnie z wymaganiami PRD)

---

## 4. Widoki

### 4.1. Widok: v_investments_agg

Widok agregujący sumy i udziały procentowe dla każdego typu aktywa w portfelu użytkownika. Używany do obliczeń wskaźników FIRE i generowania AI Hint.

**Kolumny:**

| Nazwa          | Typ             | Opis                                |
| -------------- | --------------- | ----------------------------------- |
| `user_id`      | `uuid`          | Identyfikator użytkownika           |
| `total_amount` | `numeric(16,2)` | Suma wszystkich inwestycji          |
| `sum_stock`    | `numeric(16,2)` | Suma inwestycji typu 'stock'        |
| `sum_etf`      | `numeric(16,2)` | Suma inwestycji typu 'etf'          |
| `sum_bond`     | `numeric(16,2)` | Suma inwestycji typu 'bond'         |
| `sum_cash`     | `numeric(16,2)` | Suma inwestycji typu 'cash'         |
| `share_stock`  | `numeric(5,2)`  | Procentowy udział akcji (0-100)     |
| `share_etf`    | `numeric(5,2)`  | Procentowy udział ETF (0-100)       |
| `share_bond`   | `numeric(5,2)`  | Procentowy udział obligacji (0-100) |
| `share_cash`   | `numeric(5,2)`  | Procentowy udział gotówki (0-100)   |

**Definicja SQL:**

```sql
CREATE VIEW v_investments_agg AS
SELECT
  user_id,
  SUM(amount) AS total_amount,
  SUM(CASE WHEN type = 'stock' THEN amount ELSE 0 END) AS sum_stock,
  SUM(CASE WHEN type = 'etf' THEN amount ELSE 0 END) AS sum_etf,
  SUM(CASE WHEN type = 'bond' THEN amount ELSE 0 END) AS sum_bond,
  SUM(CASE WHEN type = 'cash' THEN amount ELSE 0 END) AS sum_cash,
  CASE
    WHEN SUM(amount) > 0 THEN
      (SUM(CASE WHEN type = 'stock' THEN amount ELSE 0 END) * 100.0 / SUM(amount))
    ELSE 0
  END AS share_stock,
  CASE
    WHEN SUM(amount) > 0 THEN
      (SUM(CASE WHEN type = 'etf' THEN amount ELSE 0 END) * 100.0 / SUM(amount))
    ELSE 0
  END AS share_etf,
  CASE
    WHEN SUM(amount) > 0 THEN
      (SUM(CASE WHEN type = 'bond' THEN amount ELSE 0 END) * 100.0 / SUM(amount))
    ELSE 0
  END AS share_bond,
  CASE
    WHEN SUM(amount) > 0 THEN
      (SUM(CASE WHEN type = 'cash' THEN amount ELSE 0 END) * 100.0 / SUM(amount))
    ELSE 0
  END AS share_cash
FROM investments
GROUP BY user_id;
```

**RLS:**

- Widok dziedziczy polityki RLS z tabeli `investments`
- Użytkownik może zobaczyć tylko swoje własne agregacje

**Uwagi:**

- Jeśli użytkownik nie ma żadnych inwestycji, widok nie zwróci wiersza dla tego użytkownika (GROUP BY nie tworzy wierszy dla brakujących danych)
- W aplikacji należy obsłużyć przypadek, gdy widok nie zwraca danych (total_amount będzie NULL w zapytaniu z LEFT JOIN, lub brak wiersza w zapytaniu bez JOIN)
- Udziały procentowe są obliczane z użyciem CASE WHEN, aby uniknąć dzielenia przez zero
- Udziały są zaokrąglane do 2 miejsc po przecinku (numeric(5,2))
- Widok jest zoptymalizowany do szybkich zapytań agregujących
- Aby uzyskać dane dla użytkowników bez inwestycji, można użyć LEFT JOIN z tabelą profiles:
  ```sql
  SELECT
    p.user_id,
    COALESCE(v.total_amount, 0) AS total_amount,
    COALESCE(v.share_stock, 0) AS share_stock,
    -- ... pozostałe kolumny
  FROM profiles p
  LEFT JOIN v_investments_agg v ON p.user_id = v.user_id;
  ```

---

## 5. Funkcje i triggery

### 5.1. Funkcja: set_updated_at()

Funkcja automatycznie aktualizująca kolumnę `updated_at` przy modyfikacji rekordu.

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Użycie:**

- Trigger na tabeli `profiles`
- Trigger na tabeli `investments`

---

### 5.2. Trigger: profiles_updated_at_trigger

Trigger automatycznie aktualizujący `updated_at` w tabeli `profiles`.

```sql
CREATE TRIGGER profiles_updated_at_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
```

---

### 5.3. Trigger: investments_updated_at_trigger

Trigger automatycznie aktualizujący `updated_at` w tabeli `investments`.

```sql
CREATE TRIGGER investments_updated_at_trigger
  BEFORE UPDATE ON investments
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
```

---

## 6. Row Level Security (RLS)

### 6.1. Zasady bezpieczeństwa

Wszystkie tabele użytkownika (`profiles`, `investments`) mają włączone RLS z prostą polityką właściciela:

**Polityka SELECT:**

```sql
CREATE POLICY "<table>_select_policy" ON <table>
  FOR SELECT
  USING (user_id = auth.uid());
```

**Polityka INSERT:**

```sql
CREATE POLICY "<table>_insert_policy" ON <table>
  FOR INSERT
  WITH CHECK (user_id = auth.uid());
```

**Polityka UPDATE:**

```sql
CREATE POLICY "<table>_update_policy" ON <table>
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

**Polityka DELETE:**

```sql
CREATE POLICY "<table>_delete_policy" ON <table>
  FOR DELETE
  USING (user_id = auth.uid());
```

### 6.2. Uprawnienia

**Rola `anon`:**

- Brak uprawnień do tabel i widoków (REVOKE ALL)

**Rola `authenticated`:**

- Uprawnienia do SELECT, INSERT, UPDATE, DELETE na `profiles` (z RLS)
- Uprawnienia do SELECT, INSERT, UPDATE, DELETE na `investments` (z RLS)
- Uprawnienia do SELECT na `v_investments_agg` (z RLS)

**Rola `service_role`:**

- Pełne uprawnienia do wszystkich tabel i widoków (bez RLS)

---

## 7. Relacje między tabelami

### 7.1. Diagram relacji

```
auth.users (Supabase - już istnieje)
    │
    ├──► profiles (1:1, ON DELETE CASCADE)
    │
    ├──► investments (1:N, ON DELETE CASCADE)
    │       │
    │       └──► v_investments_agg (VIEW - agreguje investments)
```

### 7.2. Opis relacji

1. **auth.users → profiles (1:1)**
   - Każdy użytkownik ma dokładnie jeden profil
   - Klucz obcy: `profiles.user_id` → `auth.users.id`
   - `ON DELETE CASCADE` - usunięcie użytkownika usuwa profil

2. **auth.users → investments (1:N)**
   - Każdy użytkownik może mieć wiele inwestycji
   - Klucz obcy: `investments.user_id` → `auth.users.id`
   - `ON DELETE CASCADE` - usunięcie użytkownika usuwa wszystkie jego inwestycje
   - **Uwaga:** `investments` nie zależy od `profiles` - obie tabele są niezależne i zależą tylko od `auth.users`

3. **investments → v_investments_agg (agregacja)**
   - Widok agreguje dane z tabeli `investments` dla każdego użytkownika
   - Nie ma bezpośredniej relacji klucza obcego (widok)
   - Widok zwraca wiersze tylko dla użytkowników, którzy mają przynajmniej jedną inwestycję

---

## 8. Indeksy

### 8.1. Indeksy podstawowe

| Tabela        | Indeks                        | Kolumny       | Typ         | Opis                              |
| ------------- | ----------------------------- | ------------- | ----------- | --------------------------------- |
| `profiles`    | `profiles_pkey`               | `id`          | PRIMARY KEY | Klucz podstawowy                  |
| `profiles`    | `profiles_user_id_key`        | `user_id`     | UNIQUE      | Zapewnia relację 1:1              |
| `profiles`    | `profiles_user_id_idx`        | `user_id`     | B-tree      | Szybkie wyszukiwanie po user_id   |
| `investments` | `investments_pkey`            | `id`          | PRIMARY KEY | Klucz podstawowy                  |
| `investments` | `investments_user_id_idx`     | `user_id`     | B-tree      | Szybkie wyszukiwanie po user_id   |
| `investments` | `investments_acquired_at_idx` | `acquired_at` | B-tree      | Sortowanie i filtrowanie po dacie |
| `investments` | `investments_type_idx`        | `type`        | B-tree      | Agregacja po typie aktywa         |

### 8.2. Uwagi dotyczące indeksów

- Indeksy na `user_id` są krytyczne dla wydajności zapytań z RLS
- Indeks na `acquired_at` przyspiesza sortowanie i filtrowanie inwestycji
- Indeks na `type` przyspiesza agregacje w widoku `v_investments_agg`
- Wszystkie indeksy używają domyślnego typu B-tree (optymalny dla większości zapytań)

---

## 9. Walidacja danych

### 9.1. Ograniczenia CHECK

**Tabela profiles:**

- `monthly_expense >= 0` - wydatki nie mogą być ujemne
- `withdrawal_rate_pct >= 0 AND withdrawal_rate_pct <= 100` - stopa wypłaty w zakresie 0-100%
- `expected_return_pct >= -100 AND expected_return_pct <= 1000` - stopa zwrotu w realistycznym zakresie
- `birth_date` - data musi być w przeszłości i nie starsza niż 120 lat

**Tabela investments:**

- `amount > 0` - kwota musi być większa od zera
- `acquired_at <= current_date` - data nabycia nie może być przyszła
- `notes` - jeśli podane, musi być niepustym tekstem o maksymalnej długości 1000 znaków

### 9.2. Walidacja po stronie aplikacji

Oprócz ograniczeń CHECK na poziomie bazy, aplikacja powinna również walidować:

- Format danych przed wysłaniem do bazy
- Komunikaty błędów przyjazne dla użytkownika
- Obsługa błędów 401/403 (autoryzacja)

---

## 10. Migracje

### 10.1. Struktura migracji

Migracje są rozdzielone na trzy etapy dla lepszej kontroli i zgodności z CI/CD. **Kolejność jest krytyczna** - tabele muszą być tworzone w odpowiedniej kolejności, aby zależności były poprawne.

**Etap A: Struktury (kolejność zależności)**

1. **Tworzenie typów ENUM** (nie zależą od niczego)
   - `asset_type` ENUM

2. **Tworzenie tabel w kolejności zależności:**
   - `profiles` - zależy tylko od `auth.users` (które już istnieje w Supabase)
   - `investments` - zależy od `auth.users` i używa ENUM `asset_type`

3. **Tworzenie kluczy podstawowych i obcych:**
   - Klucze podstawowe (PRIMARY KEY) dla każdej tabeli
   - Klucze obce (FOREIGN KEY) z `ON DELETE CASCADE`

4. **Tworzenie indeksów:**
   - Indeksy na kolumnach używanych w zapytaniach

**Uwaga:** W tym etapie tabele są tworzone z domyślnymi wartościami dla kolumn NOT NULL (np. `DEFAULT 0.00`, `DEFAULT 4.00`, `DEFAULT now()`), ale bez CHECK constraints. Domyślne wartości są konieczne, ponieważ kolumny są NOT NULL.

**Etap B: CHECK constraints i triggery**

1. **Dodawanie CHECK constraints:**
   - Ograniczenia dla `profiles` (monthly_expense, withdrawal_rate_pct, expected_return_pct, birth_date)
   - Ograniczenia dla `investments` (amount, acquired_at, notes)
   - **Uwaga:** CHECK constraints są dodawane po utworzeniu tabel, aby umożliwić wstawienie danych, które mogą nie spełniać wszystkich ograniczeń podczas migracji

2. **Tworzenie funkcji i triggerów:**
   - Funkcja `set_updated_at()`
   - Trigger `profiles_updated_at_trigger`
   - Trigger `investments_updated_at_trigger`

**Etap C: RLS i GRANT-y**

1. **Włączanie RLS na tabelach:**
   - `ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;`
   - `ALTER TABLE investments ENABLE ROW LEVEL SECURITY;`

2. **Tworzenie polityk RLS:**
   - Polityki SELECT, INSERT, UPDATE, DELETE dla `profiles`
   - Polityki SELECT, INSERT, UPDATE, DELETE dla `investments`

3. **Nadawanie uprawnień (GRANT):**
   - Uprawnienia dla roli `authenticated` (SELECT, INSERT, UPDATE, DELETE)

4. **Odbieranie uprawnień (REVOKE):**
   - Odebranie wszystkich uprawnień dla roli `anon` i `public`

5. **Tworzenie widoków:**
   - Widok `v_investments_agg` (zależy od tabeli `investments`)

### 10.2. Kolejność wykonywania

1. Migracja A: `001_create_structure.sql`
   - ENUM → profiles → investments → klucze → indeksy

2. Migracja B: `002_add_constraints_and_defaults.sql`
   - CHECK constraints → funkcje → triggery

3. Migracja C: `003_enable_rls_and_grants.sql`
   - RLS → polityki → GRANT-y → REVOKE-y → widoki

### 10.3. Diagram zależności

```
auth.users (już istnieje w Supabase)
    │
    ├──► asset_type ENUM (niezależny, nie zależy od niczego)
    │
    ├──► profiles (zależy tylko od auth.users)
    │
    └──► investments (zależy od auth.users + asset_type ENUM)
            │
            └──► v_investments_agg VIEW (zależy od investments)
```

**Kolejność tworzenia (krytyczna dla poprawności migracji):**

1. **`asset_type` ENUM** - musi być pierwszy (nie zależy od niczego)
2. **`profiles` tabela** - zależy tylko od `auth.users` (już istnieje)
3. **`investments` tabela** - zależy od `auth.users` (już istnieje) i `asset_type` ENUM (utworzony w kroku 1)
4. **Klucze i indeksy** - po utworzeniu wszystkich tabel
5. **CHECK constraints** - po utworzeniu struktury (dodawane w etapie B)
6. **Funkcje i triggery** - po utworzeniu tabel i constraints
7. **RLS i polityki** - po utworzeniu wszystkich tabel
8. **Widoki** - na końcu (zależą od tabeli `investments`)

**Uwaga:** Tabele `profiles` i `investments` nie zależą od siebie wzajemnie - obie zależą tylko od `auth.users`. Kolejność tworzenia `profiles` przed `investments` jest zalecana ze względów logicznych (profil użytkownika przed jego inwestycjami), ale technicznie `investments` może być utworzona przed `profiles`, o ile `asset_type` ENUM już istnieje.

---

## 11. Obliczenia FIRE (runtime)

### 11.1. Formuły obliczeniowe

Obliczenia są wykonywane w runtime po stronie aplikacji (nie są zapisywane w bazie):

```typescript
// Dane wejściowe z profiles
const monthly_expense = profile.monthly_expense;
const withdrawal_rate_pct = profile.withdrawal_rate_pct;
const expected_return_pct = profile.expected_return_pct;
const birth_date = profile.birth_date;

// Dane wejściowe z v_investments_agg
const invested_total = agg.total_amount;

// Obliczenia
const annual_expense = monthly_expense * 12;
const fire_target = annual_expense / (withdrawal_rate_pct / 100);
const fire_progress = invested_total / fire_target;
const years_to_fire = Math.log(fire_target / invested_total) / Math.log(1 + expected_return_pct / 100);
const fire_age = age + years_to_fire; // age obliczane z birth_date
```

### 11.2. AI Hint (deterministyczny)

Reguły oceny ryzyka na podstawie danych z `v_investments_agg`:

```typescript
const share_stock = agg.share_stock;
const share_etf = agg.share_etf;
const share_bond = agg.share_bond;
const share_cash = agg.share_cash;

if (share_stock + share_etf >= 80) {
  return "Wysokie ryzyko – duży udział akcji i ETF.";
}
if (share_bond >= 50) {
  return "Bezpieczny portfel – przewaga obligacji.";
}
if (share_cash >= 30) {
  return "Zbyt dużo gotówki – rozważ inwestowanie nadwyżki.";
}
if (share_stock + share_etf < 40) {
  return "Zbyt mało akcji – niższy potencjał wzrostu.";
}
```

---

## 12. Uwagi i decyzje projektowe

### 12.1. Decyzje techniczne

1. **UUID jako klucze podstawowe**
   - Zapewnia unikalność bez potrzeby synchronizacji między serwerami
   - Lepsze bezpieczeństwo (nie ujawnia liczby rekordów)
   - Zgodne z praktykami Supabase

2. **numeric(16,2) dla kwot**
   - Precyzja do 2 miejsc po przecinku (grosze)
   - Zakres do 999,999,999,999,999.99 PLN (wystarczający dla MVP)
   - Unika problemów z zaokrąglaniem zmiennoprzecinkowym

3. **numeric(5,2) dla procentów**
   - Precyzja do 2 miejsc po przecinku
   - Zakres -999.99% do 9999.99% (wystarczający dla MVP)
   - Umożliwia przechowywanie zarówno dodatnich, jak i ujemnych stóp zwrotu

4. **ENUM dla typów aktywów**
   - Zapewnia spójność danych
   - Walidacja na poziomie bazy
   - Łatwe rozszerzenie o nowe typy w przyszłości

5. **RLS z prostą polityką właściciela**
   - Prosta i wydajna implementacja
   - Zgodna z best practices Supabase
   - Zapewnia pełną izolację danych użytkowników

### 12.2. Założenia MVP

1. **Brak trwałego zapisu wyników obliczeń**
   - Wszystkie obliczenia wykonywane w runtime
   - Brak tabeli do przechowywania historii obliczeń
   - Zgodne z wymaganiami PRD

2. **Brak audytu zmian**
   - Brak tabeli audytu
   - Brak logowania zmian danych
   - Prostość MVP

3. **Brak partycjonowania**
   - Tabele nie są partycjonowane
   - Wystarczające dla MVP (mała skala)

4. **Brak limitów liczby rekordów**
   - Brak ograniczeń liczby inwestycji na użytkownika
   - Walidacja po stronie aplikacji (opcjonalnie)

5. **Brak funkcji RPC**
   - Wszystkie obliczenia po stronie aplikacji
   - Brak procedur składowanych
   - Prostość MVP

### 12.3. Rozszerzenia w przyszłości

1. **Nowe typy aktywów**
   - Możliwość dodania 'crypto', 'real_estate', itp.
   - Wymaga: `ALTER TYPE asset_type ADD VALUE 'crypto';`

2. **Historia obliczeń**
   - Tabela do przechowywania historii obliczeń FIRE
   - Pozwoli na śledzenie postępu w czasie

3. **Integracja z API finansowymi**
   - Automatyczne pobieranie aktualnych wartości aktywów
   - Wymaga dodatkowej tabeli do cache'owania danych

4. **Wielowalutowość**
   - Rozszerzenie o wsparcie wielu walut
   - Wymaga dodatkowej tabeli z kursami wymiany

---

## 13. Testowanie

### 13.1. Testy jednostkowe (opcjonalne)

- Walidacja CHECK constraints
- Testy triggerów (updated_at)
- Testy widoku v_investments_agg

### 13.2. Testy integracyjne

- Testy RLS (użytkownik może zobaczyć tylko swoje dane)
- Testy ON DELETE CASCADE
- Testy walidacji danych

### 13.3. Testy E2E (Playwright)

- Testy CRUD inwestycji
- Testy obliczeń FIRE
- Testy AI Hint
- Testy autoryzacji (401/403)

---

## 14. Bezpieczeństwo

### 14.1. Ochrona danych

- RLS włączone na wszystkich tabelach użytkownika
- Rola `anon` nie ma uprawnień do tabel
- Rola `authenticated` ma uprawnienia tylko z RLS
- Rola `service_role` ma pełne uprawnienia (używana tylko w backendzie)

### 14.2. Walidacja danych

- CHECK constraints na poziomie bazy
- Walidacja po stronie aplikacji
- Obsługa błędów 401/403

### 14.3. Bezpieczeństwo Supabase

- Autoryzacja przez Supabase Auth (magic link)
- Sesje utrzymywane przez Supabase
- HTTPS wymagany dla wszystkich połączeń

---

## 15. Wydajność

### 15.1. Optymalizacje

- Indeksy na kolumnach używanych w zapytaniach (user_id, acquired_at, type)
- Widok v_investments_agg zoptymalizowany do szybkich agregacji
- Użycie COALESCE i NULLIF dla bezpiecznych obliczeń

### 15.2. Skalowalność

- Schemat zaprojektowany dla małej skali (MVP)
- Brak partycjonowania (możliwe w przyszłości)
- Brak cache'owania (możliwe w przyszłości)

---

## 16. Dokumentacja migracji

### 16.1. Pliki migracji

Migracje powinny być przechowywane w katalogu `supabase/migrations/` w formacie:

- `YYYYMMDDHHMMSS_description.sql`

### 16.2. Przykładowa struktura

```
supabase/
  migrations/
    20240101000000_create_structure.sql
    20240101000001_add_constraints_and_defaults.sql
    20240101000002_enable_rls_and_grants.sql
```

### 16.3. Wykonywanie migracji

Migracje są wykonywane automatycznie przez Supabase CLI lub ręcznie przez Supabase Dashboard.

---

## 17. Podsumowanie

Schemat bazy danych DoFIRE został zaprojektowany jako proste, skalowalne i bezpieczne rozwiązanie dla MVP aplikacji kalkulatora FIRE. Zawiera:

- **2 tabele:** `profiles`, `investments`
- **1 widok:** `v_investments_agg`
- **1 ENUM:** `asset_type`
- **RLS:** Włączone na wszystkich tabelach użytkownika
- **Indeksy:** Zoptymalizowane do szybkich zapytań
- **Walidacja:** CHECK constraints i walidacja po stronie aplikacji
- **Bezpieczeństwo:** Pełna izolacja danych użytkowników przez RLS

Schemat jest gotowy do implementacji i zgodny z wymaganiami PRD oraz best practices PostgreSQL i Supabase.
