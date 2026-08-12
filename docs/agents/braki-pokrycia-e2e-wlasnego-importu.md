# Braki pokrycia E2E własnego importu transakcji bankowych

## Status

Pełny przepływ „Własny import” na stronie okresów rozliczeniowych nie ma jeszcze testu E2E. Jest to świadomie odłożony zakres do kontynuacji. Test podstawowego tworzenia dochodów i wydatków nie zastępuje tego pokrycia, ponieważ własny import używa mutacji `ImportBankTransactions`, pozwala połączyć wiele transakcji oraz tworzy kilka elementów jednocześnie.

Scenariusze wymagają deterministycznych danych bankowych. Dane testowe powinny określać identyfikatory transakcji, przypisane konta, waluty i kwoty, aby test nie wybierał przypadkowo pierwszej pozycji dostępnej w środowisku.

## Wspólne skutki wymagające weryfikacji

Każdy scenariusz zatwierdzający własny import powinien sprawdzić:

- zmienne mutacji `ImportBankTransactions`, w tym dokładne `bankTransactionPublicIds` oraz zawartość `incomes`, `expenses` i `transfers`;
- powodzenie mutacji, brak błędów GraphQL i odświeżenie danych okresu;
- usunięcie zaimportowanych transakcji z listy oczekujących oraz odpowiednią zmianę licznika importu;
- pojawienie się utworzonych dochodów i wydatków we właściwych kategoriach wraz z kwotą, datą i opisem;
- dokładną zmianę liczników i podsumowań okresu w każdej walucie;
- dokładne salda wszystkich kont i skarbonek objętych importem;
- trwałość skutku po ponownym otwarciu strony i brak powtórnego zaimportowania tych samych transakcji.

## Scenariusze do zaimplementowania

### Własny import jako dochód

1. Zaznaczyć deterministyczną transakcję uznaniową i wybrać „Własny import”.
2. Dodać dochód bilansujący transakcję, jawnie wybierając konto, kategorię, datę i skarbonkę.
3. Sprawdzić przejście bilansu z „Bilans wymaga uzupełnienia” do „Bilans poprawny” oraz odblokowanie potwierdzenia.
4. Zatwierdzić import i zweryfikować skutki wspólne.
5. Saldo konta i wybranej skarbonki powinno wzrosnąć o kwotę dochodu.

### Własny import jako wydatek

1. Zaznaczyć deterministyczną transakcję obciążeniową i wybrać „Własny import”.
2. Dodać wydatek bilansujący transakcję, jawnie wybierając konto, kategorię, datę i skarbonkę.
3. Sprawdzić poprawność bilansu i zatwierdzić import.
4. Zweryfikować skutki wspólne; saldo konta i skarbonki powinno zmniejszyć się o kwotę wydatku.

### Własny import jako transfer

1. Zaznaczyć transakcje reprezentujące obie strony transferu między kontami w tej samej walucie.
2. Dodać transfer, wskazać konta źródłowe i docelowe, kwoty, datę oraz opis.
3. Sprawdzić zbilansowanie importu i zatwierdzić go.
4. Saldo konta źródłowego powinno spaść, a docelowego wzrosnąć o tę samą kwotę. Liczniki dochodów i wydatków nie powinny się zmienić.

### Własny import transferu z wymianą walut

1. Przygotować powiązane transakcje dla kont w różnych walutach.
2. Dodać transfer z różnymi kwotami źródłową i docelową.
3. Zweryfikować obie kwoty i waluty w zmiennych mutacji oraz dokładne salda obu kont po imporcie.

### Import złożony

1. Zaznaczyć zestaw transakcji wymagający jednoczesnego utworzenia dochodu, wydatku i transferu.
2. Sprawdzić, że niepełny zestaw pozostawia niezerowy bilans i blokuje przycisk „Potwierdź import”.
3. Dodać wszystkie elementy, następnie edytować po jednym dochodzie, wydatku i transferze.
4. Usunąć element i sprawdzić ponowne zablokowanie potwierdzenia, po czym odtworzyć poprawny bilans.
5. Zatwierdzić import i zweryfikować wszystkie wspólne skutki, w tym salda, podsumowania i usunięcie całego zestawu transakcji oczekujących.

### Anulowanie bez zapisu

1. Rozpocząć własny import, dodać wersje robocze elementów i zamknąć formularz.
2. Sprawdzić brak mutacji i brak zmian danych.
3. Otworzyć importer ponownie i potwierdzić, że wersje robocze nie zostały zachowane.
