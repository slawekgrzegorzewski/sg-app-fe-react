# Szczegóły implementacji treningu siłowego

## Zakres dokumentu

Dokument opisuje ustalenia dotyczące katalogu ćwiczeń aplikacji `STRENGTH_TRAINING`, formularzy konfiguracji oraz przypadków brzegowych obsługiwanych przez interfejs.

Najważniejsze pliki implementacji:

- `../../src/strength-training/StrengthTrainingCatalogManagement.tsx` — widoki katalogu, formularze i dialog konfiguracji;
- `../../src/strength-training/StrengthTrainingCatalogPage.tsx` — routing podstron katalogu;
- `../../src/strength-training/model/strength-training.graphql` — operacje GraphQL modułu;
- `../../src/utils/forms/Form.tsx` — wspólny formularz, w tym dynamiczne pola i generowane wartości;
- `../../src/application/components/SimpleCrudList.tsx` — listy CRUD i obsługa kliknięcia wiersza.

## Nazewnictwo interfejsu

- Encja `ExerciseFamily` jest prezentowana jako **„Ćwiczenie”**.
- `Variant dimensions` są prezentowane jako **„Warianty”**.
- Wartości przypisane do wariantu są nazywane **„Możliwe wartości wariantu”** w dialogu konfiguracji.
- Akcja przy ćwiczeniu na stronie głównej nazywa się **„Konfiguruj”**.
- Akcja przejścia do wartości globalnego wariantu na stronie głównej nazywa się **„Wartości”**.
- Akcja dodawania wartości w formularzach nazywa się **„Dodaj wartość”**.
- Termin „Przypisane warianty” nie jest używany jako nazwa sekcji; sekcja na podstronie ćwiczenia nazywa się **„Warianty”**.
- Encje z `scope = SYSTEM` są oznaczane w interfejsie etykietą **„Systemowa”**. Oznaczenie jest widoczne na kafelkach/listach oraz w opcjach wyboru formularzy.

## Nawigacja

- Strona główna katalogu jest dostępna pod `catalog`.
- Konfiguracja wariantów wybranego ćwiczenia jest dostępna pod `catalog/<exerciseFamilyPublicId>`.
- Wartości wybranego globalnego wariantu są dostępne pod `variant-dimensions/<variantDimensionPublicId>`.
- Podstrony zawierają przycisk **„Powrót do katalogu”**.
- Na stronie głównej przycisk **„Konfiguruj”** otwiera konfigurację wariantów wybranego ćwiczenia.
- Interfejs nie zawiera osobnej encji `Exercise` ani możliwości jej tworzenia, edycji lub dezaktywacji.
- Na stronie `variant-dimensions/<variantDimensionPublicId>` dialog dodawania wartości nie pokazuje pola „Wariant”; identyfikator wariantu jest ustawiany z kontekstu podstrony.

## Warianty przypisane do ćwiczenia

### Formularz dodawania

- Ćwiczenie jest automatycznie ustawione na podstawie podstrony i pozostaje zapisane w danych formularza.
- Pole „Ćwiczenie” jest w tym formularzu ukryte, ponieważ jego wartość wynika z kontekstu podstrony.
- Formularz pokazuje tylko warianty, które nie są jeszcze przypisane do danego ćwiczenia.
- Pozycja wariantu:
  - musi być dodatnią liczbą całkowitą;
- musi być unikatowa w ramach jednego ćwiczenia;
  - jest automatycznie ustawiana na pierwszą wolną pozycję, np. dla pozycji `1, 3` formularz proponuje `2`.
- Jeśli wszystkie warianty są już przypisane, przycisk **„Dodaj wariant”** jest ukryty.

### Lista wariantów

- Kliknięcie dowolnego miejsca całego wiersza wariantu otwiera dialog konfiguracji jego możliwych wartości.
- Nie ma osobnego przycisku przy nazwie wariantu służącego do otwierania dialogu.
- Przy wariancie wyświetlane jest krótkie podsumowanie, np.:

  `Możliwe wartości: Szeroki (domyślna), Wąski`

- Wartość domyślna jest wyróżniona chipem koloru głównego i tekstem `(domyślna)`.
- Jeśli wariant nie ma skonfigurowanych możliwych wartości, podsumowanie pokazuje `Brak`.

## Dialog konfiguracji możliwych wartości wariantu

Dialog jest otwierany kliknięciem wiersza wariantu.

- Dialog pokazuje wszystkie globalne wartości wybranego wariantu.
- Checkbox wartości jest zaznaczony, jeśli wartość jest możliwa dla danego wariantu w wybranym ćwiczeniu podstawowym.
- Użytkownik może zaznaczać i odznaczać wartości.
- Wartość używana już w konkretnym ćwiczeniu pozostaje zaznaczona i ma zablokowany checkbox. Nie można również zmienić jej statusu domyślnego; przy wartości wyświetla się oznaczenie „Używana”.
- Przy każdej wartości znajduje się dodatkowy checkbox **„Domyślna”**.
- Checkbox „Domyślna” jest dostępny tylko dla zaznaczonej wartości.
- W danym wariancie może być wskazana najwyżej jedna wartość domyślna.
- Odznaczenie wartości domyślnej usuwa także wskazanie domyślności.
- Zapis zastępuje cały dotychczasowy zestaw możliwych wartości dla danego wariantu.
- Dialog korzysta z mutacji `setAllowedVariantValues`.

### Mutacja `setAllowedVariantValues`

Mutacja przyjmuje:

```graphql
input SetAllowedStrengthTrainingVariantValuesInput {
    familyDimensionPublicId: UUID!
    variantValuePublicIds: [UUID!]!
    defaultValuePublicId: UUID
}
```

`variantValuePublicIds` zawiera identyfikatory globalnych wartości wariantu. `defaultValuePublicId` również odnosi się do globalnej wartości wariantu i może być pusty.

Stara mutacja `allowVariantValue` nie jest już używana.

## Zakres formularzy

Formularze katalogu dotyczą ćwiczeń (`ExerciseFamily`), wymiarów wariantów i ich wartości. Interfejs nie zawiera formularza ani operacji zarządzania encją `Exercise`.

## Przypadki brzegowe

1. **Brak przypisanych wariantów** — lista wariantów pokazuje komunikat pustego stanu, a formularz dodawania wariantu może być dostępny, jeśli istnieją warianty globalne.
2. **Wszystkie warianty przypisane** — przycisk „Dodaj wariant” jest ukryty.
3. **Brak możliwych wartości wariantu** — dialog nie ma zaznaczonych wartości, a podsumowanie wariantu pokazuje `Brak`.
4. **Wszystkie wartości wariantu możliwe** — wszystkie checkboxy wartości są zaznaczone.
5. **Brak wartości domyślnej** — wszystkie checkboxy „Domyślna” są odznaczone.
6. **Zmiana wartości domyślnej** — poprzednia wartość przestaje być domyślna, a nowa zostaje wskazana jako domyślna.
7. **Odznaczenie wartości domyślnej** — wartość pozostaje możliwa, ale nie jest już domyślna.
8. **Wariant z wieloma możliwymi wartościami** — podsumowanie pokazuje wszystkie wartości, a domyślna jest wyróżniona.

## Weryfikacja

Najważniejsze testy modułu znajdują się w `../../src/strength-training/StrengthTrainingCatalogPage.test.tsx` i obejmują między innymi:

- katalog ćwiczeń;
- konfigurację wariantów wybranego ćwiczenia;
- automatyczną pierwszą wolną pozycję i walidację unikatowości;
- ukrywanie przycisku po przypisaniu wszystkich wariantów;
- dialog checkboxów możliwych wartości;
- wybór i zmianę wartości domyślnej;
- ograniczenie konfiguracji do wartości przypisanych do wymiaru ćwiczenia.

Po zmianach uruchamiane są testy ukierunkowane oraz kompilacja projektu. Nie wykonujemy commitów bez wyraźnej prośby.
