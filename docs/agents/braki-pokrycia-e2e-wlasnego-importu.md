# Braki pokrycia E2E własnego importu transakcji bankowych

## Status

Pełny przepływ „Własny import” na stronie okresów rozliczeniowych nie ma jeszcze testu E2E. Jest to świadomie odłożony zakres do kontynuacji. Test podstawowego tworzenia dochodów i wydatków nie zastępuje tego pokrycia, ponieważ własny import używa mutacji `ImportBankTransactions`, pozwala połączyć wiele transakcji oraz tworzy kilka elementów jednocześnie.

Bezpośredni przelew między kontami w różnych walutach jest sprawdzany osobno w `e2e/accounts.spec.ts`, łącznie z niezależnymi kwotami źródłową i docelową oraz wynikowymi saldami w interfejsie. Poniższy brak dotyczy wyłącznie utworzenia takiego transferu przez przepływ „Własny import”.

Scenariusze wymagają deterministycznych danych bankowych. Dane testowe powinny określać identyfikatory transakcji, przypisane konta, waluty i kwoty, aby test nie wybierał przypadkowo pierwszej pozycji dostępnej w środowisku.

## Wymagany zestaw danych bankowych

### Konta i pozostałe dane domeny

Środowisko przed uruchomieniem Playwrighta zawiera użytkownika fixture oraz wyłącznie rachunki źródłowe i surowe operacje z tabeli poniżej. Po zalogowaniu domena `e7c51293-86fe-47bc-94a8-98769790bcdb` musi widzieć rachunki `BA-PLN-A`, `BA-PLN-B` i `BA-EUR-C` w `bankAccountsNotAssignedToAccount`; dostęp do nich pochodzi ze wspólnego fixture `sg-banks-app`, a nie z procesu autoryzacji bankowej wykonywanego przez Playwright.

Projekt przygotowujący dane w `e2e/bootstrap.setup.ts` tworzy dla każdego uruchomienia:

- aktywny okres rozliczeniowy dla bieżącego miesiąca;
- widoczne konto `E2E Konto PLN A` w PLN z limitem kredytowym `10000 PLN`;
- widoczne konto `E2E Konto PLN B` w PLN z limitem kredytowym `10000 PLN`;
- widoczne konto `E2E Konto EUR C` w EUR z limitem kredytowym `10000 EUR`;
- kategorię `E2E Kategoria dochodu`;
- kategorię `E2E Kategoria wydatku`;
- skarbonkę `E2E Skarbonka PLN` w PLN z saldem początkowym `1000 PLN`.

Bootstrap przypisuje tymczasowo trzy rachunki źródłowe, rozpoznaje ich role po opisach surowych operacji, a następnie odtwarza docelowe przypisania A/B/C. Dzięki temu test nie zależy od kolejności IBAN-ów zwracanej przez backend. Publiczne identyfikatory danych domeny powstają podczas uruchomienia i test powinien odczytywać je z API, a nie przechowywać jako stałe.

Każda transakcja musi być niezaimportowana i mieć datę wewnątrz okresu rozliczeniowego tworzonego przez bootstrap. Opisy, `id` i `transactionPublicId` muszą być unikalne. Daty poszczególnych paczek powinny być różne, natomiast obie strony jednego transferu powinny mieć tę samą datę i wspólny identyfikator korelacyjny. Po przypisaniu rachunków przez bootstrap transakcja ma należeć do właściwego konta domeny.

### Pozycje oczekiwane w `BankTransactionsToImport`

Minimalny zestaw obejmuje siedem logicznych pozycji widocznych w importerze:

| Kod                   | Opis                                   | Konto źródłowe    | Konto docelowe    | Rachunek obciążony | Rachunek uznany | Obciążenie |  Uznanie | Kurs |
| --------------------- | -------------------------------------- | ----------------- | ----------------- | ------------------ | --------------- | ---------: | -------: | ---: |
| `CI-INCOME`           | `E2E własny import — dochód`           | —                 | `E2E Konto PLN A` | —                  | `BA-PLN-A`      |        `0` | `101,11` |  `1` |
| `CI-EXPENSE`          | `E2E własny import — wydatek`          | `E2E Konto PLN A` | —                 | `BA-PLN-A`         | —               |    `52,22` |      `0` |  `1` |
| `CI-TRANSFER-PLN`     | `E2E własny import — transfer PLN`     | `E2E Konto PLN A` | `E2E Konto PLN B` | `BA-PLN-A`         | `BA-PLN-B`      |   `203,33` | `203,33` |  `1` |
| `CI-TRANSFER-FX`      | `E2E własny import — transfer PLN EUR` | `E2E Konto PLN A` | `E2E Konto EUR C` | `BA-PLN-A`         | `BA-EUR-C`      |   `400,00` | `100,00` |  `4` |
| `CI-COMPLEX-INCOME`   | `E2E własny import złożony — dochód`   | —                 | `E2E Konto PLN A` | —                  | `BA-PLN-A`      |        `0` | `310,00` |  `1` |
| `CI-COMPLEX-EXPENSE`  | `E2E własny import złożony — wydatek`  | `E2E Konto PLN A` | —                 | `BA-PLN-A`         | —               |    `70,00` |      `0` |  `1` |
| `CI-COMPLEX-TRANSFER` | `E2E własny import złożony — transfer` | `E2E Konto PLN A` | `E2E Konto PLN B` | `BA-PLN-A`         | `BA-PLN-B`      |   `140,00` | `140,00` |  `1` |

Wartości w tabeli odpowiadają polom `sourceAccountPublicId`, `destinationAccountPublicId`, `debitBankAccountPublicId`, `creditBankAccountPublicId`, `debit`, `credit` i `conversionRate`. Każda pozycja musi mieć stabilny `transactionPublicId`, którego test użyje w `bankTransactionPublicIds`. Pozycja transferowa powinna dodatkowo wskazywać stabilne `debitTransactionPublicId` i `creditTransactionPublicId`.

Jeżeli backend zwraca obie strony transferu jako dwie osobne pozycje `BankTransactionToImport`, test powinien zaznaczyć obie. Wtedy każda strona musi mieć własny `transactionPublicId`, a oczekiwana lista `bankTransactionPublicIds` zawiera oba identyfikatory. Frontend potrafi złożyć transfer z jednostronnego obciążenia i jednostronnego uznania, jeżeli konta oraz kwoty spełniają warunki z tabeli.

### Surowe operacje bankowe

Jeżeli fixture powstaje na poziomie surowych transakcji bankowych, potrzeba dziesięciu operacji:

| Kod operacji                  | Pozycja logiczna      | Data | Rachunek domeny | Kierunek   |    Kwota | Waluta | Opis                                   | Referencja korelacyjna    |
| ----------------------------- | --------------------- | ---- | --------------- | ---------- | -------: | ------ | -------------------------------------- | ------------------------- |
| `RAW-CI-INCOME-CREDIT`        | `CI-INCOME`           | `D1` | `BA-PLN-A`      | uznanie    | `101,11` | PLN    | `E2E własny import — dochód`           | `REF-CI-INCOME`           |
| `RAW-CI-EXPENSE-DEBIT`        | `CI-EXPENSE`          | `D2` | `BA-PLN-A`      | obciążenie |  `52,22` | PLN    | `E2E własny import — wydatek`          | `REF-CI-EXPENSE`          |
| `RAW-CI-TRANSFER-PLN-DEBIT`   | `CI-TRANSFER-PLN`     | `D3` | `BA-PLN-A`      | obciążenie | `203,33` | PLN    | `E2E własny import — transfer PLN`     | `REF-CI-TRANSFER-PLN`     |
| `RAW-CI-TRANSFER-PLN-CREDIT`  | `CI-TRANSFER-PLN`     | `D3` | `BA-PLN-B`      | uznanie    | `203,33` | PLN    | `E2E własny import — transfer PLN`     | `REF-CI-TRANSFER-PLN`     |
| `RAW-CI-TRANSFER-FX-DEBIT`    | `CI-TRANSFER-FX`      | `D4` | `BA-PLN-A`      | obciążenie | `400,00` | PLN    | `E2E własny import — transfer PLN EUR` | `REF-CI-TRANSFER-FX`      |
| `RAW-CI-TRANSFER-FX-CREDIT`   | `CI-TRANSFER-FX`      | `D4` | `BA-EUR-C`      | uznanie    | `100,00` | EUR    | `E2E własny import — transfer PLN EUR` | `REF-CI-TRANSFER-FX`      |
| `RAW-CI-COMPLEX-INCOME`       | `CI-COMPLEX-INCOME`   | `D5` | `BA-PLN-A`      | uznanie    | `310,00` | PLN    | `E2E własny import złożony — dochód`   | `REF-CI-COMPLEX-INCOME`   |
| `RAW-CI-COMPLEX-EXPENSE`      | `CI-COMPLEX-EXPENSE`  | `D6` | `BA-PLN-A`      | obciążenie |  `70,00` | PLN    | `E2E własny import złożony — wydatek`  | `REF-CI-COMPLEX-EXPENSE`  |
| `RAW-CI-COMPLEX-TRANSFER-OUT` | `CI-COMPLEX-TRANSFER` | `D7` | `BA-PLN-A`      | obciążenie | `140,00` | PLN    | `E2E własny import złożony — transfer` | `REF-CI-COMPLEX-TRANSFER` |
| `RAW-CI-COMPLEX-TRANSFER-IN`  | `CI-COMPLEX-TRANSFER` | `D7` | `BA-PLN-B`      | uznanie    | `140,00` | PLN    | `E2E własny import złożony — transfer` | `REF-CI-COMPLEX-TRANSFER` |

`D1`–`D7` oznaczają stabilne, nieprzyszłe daty należące do aktywnego okresu rozliczeniowego. Mogą przypadać na ten sam dzień, jeżeli operacje zachowają unikalne identyfikatory i opisy. Obie strony każdego transferu muszą mieć identyczny znacznik czasu albo co najmniej tę samą datę wymaganą przez mechanizm korelacji backendu.

Obie strony transferu powinny mieć wspólną referencję bankową, zgodne daty i opisy pozwalające backendowi je skorelować. Dla transferu w jednej walucie kwoty muszą być równe. Dla transferu walutowego kwoty muszą być różne, a relacja `400,00 PLN / 100,00 EUR` odpowiada kursowi `4`.

W bieżącym fixture importer zwraca te operacje jako dziesięć pozycji, dlatego bootstrap otwiera przycisk `10 transakcji do zaimportowania` i sprawdza widoczność okna importu przed odczytaniem identyfikatorów potrzebnych do docelowego przypisania rachunków.

### Przypisanie transakcji do scenariuszy

| Scenariusz                  | Zaznaczane pozycje            | Bilans początkowy importu                      | Elementy końcowe                                                             |
| --------------------------- | ----------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------- |
| Dochód                      | `CI-INCOME`                   | `E2E Konto PLN A: +101,11 PLN`                 | dochód `101,11 PLN` na konto A, w kategorii dochodu i z uznaniem skarbonki   |
| Wydatek                     | `CI-EXPENSE`                  | `E2E Konto PLN A: -52,22 PLN`                  | wydatek `52,22 PLN` z konta A, w kategorii wydatku i z obciążeniem skarbonki |
| Transfer PLN                | `CI-TRANSFER-PLN`             | konto A: `-203,33 PLN`, konto B: `+203,33 PLN` | transfer `203,33 PLN` z A do B                                               |
| Transfer walutowy           | `CI-TRANSFER-FX`              | konto A: `-400,00 PLN`, konto C: `+100,00 EUR` | transfer `400,00 PLN` z A na `100,00 EUR` do C                               |
| Anulowanie i import złożony | wszystkie trzy `CI-COMPLEX-*` | konto A: `+100,00 PLN`, konto B: `+140,00 PLN` | dochód `310,00 PLN`, wydatek `70,00 PLN`, transfer `140,00 PLN` z A do B     |

Paczka złożona służy najpierw do scenariusza anulowania bez zapisu. Po ponownym otwarciu importera i potwierdzeniu braku wersji roboczych ta sama paczka jest używana do zapisu importu złożonego. Nie potrzeba dzięki temu dodatkowej transakcji tylko do anulowania.

Każdy scenariusz zatwierdzający import zużywa swoje pozycje i usuwa je z listy oczekujących. Fixture musi być odtwarzany przed kolejnym pełnym uruchomieniem testów. Istniejący test podstawowego importu nie może wybierać pierwszej przypadkowej pozycji z tego zestawu; powinien mieć osobną transakcję albo wybierać opis przeznaczony wyłącznie dla swojego scenariusza.

### Dodatkowe transakcje dla całego importera

Akcja „Anuluj wzajemnie” nie należy do formularza „Własny import”. Jeżeli zakres zostanie rozszerzony na wszystkie tryby importera, potrzebne będą jeszcze dwie niezaimportowane pozycje w tej samej walucie: uznanie `33,33 PLN` i obciążenie `33,33 PLN`, najlepiej na tym samym koncie PLN. Ich suma musi wynosić dokładnie zero, aby przycisk „Anuluj wzajemnie” był dostępny.

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
