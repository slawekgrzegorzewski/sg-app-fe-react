# Trening siłowy — nazewnictwo i zakres API

## Nazewnictwo interfejsu

Encja `ExerciseFamily` jest w interfejsie użytkownika prezentowana jako **„Ćwiczenie”**. Określenie „ćwiczenie podstawowe” nie jest używane w interfejsie. Nazwy techniczne GraphQL, typów TypeScript oraz pól API pozostają bez zmian.

## Zakres operacji katalogu

Strona „Katalog ćwiczeń” korzysta wyłącznie z mutacji udostępnionych przez aktualny kontrakt GraphQL. Obsługuje:

- tworzenie ćwiczeń, wymiarów wariantów i wartości wariantów;
- przypisywanie wymiarów do ćwiczeń;
- dopuszczanie wartości wariantów dla przypisanych wymiarów;
- Interfejs nie obsługuje encji `Exercise`; nie ma jej na liście katalogu ani osobnych operacji zarządzania.

Kontrakt GraphQL udostępnia dla katalogu ćwiczeń tworzenie encji `ExerciseFamily`, wymiarów i wartości wariantów oraz konfigurację wartości dopuszczonych dla wymiaru ćwiczenia. Powiązane wartości wariantów są konfigurowane mutacją `setAllowedVariantValues`, która ustawia cały zestaw wartości oraz wartość domyślną.

## Nawigacja wymiarów

Warianty ćwiczeń nie są prezentowane jako globalna lista na stronie głównej katalogu. Użytkownik otwiera konfigurację, wybierając akcję „Konfiguruj” przy wybranym ćwiczeniu, a widok jest dostępny pod ścieżką `catalog/<exerciseFamilyPublicId>`. Sekcja „Warianty” pokazuje wyłącznie warianty tego ćwiczenia. Kliknięcie wariantu otwiera dialog z wszystkimi wartościami tego wariantu jako checkboxami; przypisane wartości są zaznaczone, a przy jednej wartości można zaznaczyć także opcję „Domyślna”. Podstrona zawiera powrót do głównego katalogu.

Podczas przypisywania wariantu do ćwiczenia formularz pokazuje tylko warianty, które nie są jeszcze przypisane do tego ćwiczenia. Jeżeli wszystkie warianty są już przypisane, interfejs ukrywa przycisk „Dodaj wariant”.

Konfiguracja dialogu pozwala zaznaczać i odznaczać możliwe wartości wariantu oraz zmieniać wartość domyślną. Zapis zastępuje dotychczasową konfigurację wartości dla danego wariantu.

Konfiguracja ćwiczenia obejmuje wymiary wariantów i przypisane do nich możliwe wartości. Interfejs nie udostępnia formularza ani operacji dla osobnej encji `Exercise`.

Elementy katalogu z zakresem `SYSTEM` są tylko do odczytu dla użytkownika domeny. Interfejs nie pokazuje dodawania wartości na podstronie systemowego wymiaru; dane domenowe można tworzyć w osobnym wymiarze i przypisywać do widocznej rodziny zgodnie z kontraktem API.

Nazwa ćwiczenia jest oparta na nazwie encji `ExerciseFamily` oraz konfiguracji wariantów. W interfejsie encja ta jest zawsze nazywana „Ćwiczenie”.

Wartości wariantów nie są prezentowane jako globalna lista. Użytkownik otwiera je akcją „Wartości” przy wybranym wariancie. Podstrona jest dostępna pod ścieżką `variant-dimensions/<variantDimensionPublicId>` i pokazuje wyłącznie wartości tego wariantu.
