# Testy integracyjne E2E

Testy w katalogu `e2e/` obsługuje Playwright. Uruchamiają one rzeczywistą aplikację w Google Chrome i wykonują operacje przez interfejs użytkownika oraz skonfigurowane API GraphQL.

## Wymagania

- uruchomiony backend;
- zainstalowana przeglądarka Google Chrome;
- konto testowe mające dostęp do aplikacji Księgowość i Kostki;
- dane wymagane przez sprawdzane formularze, między innymi co najmniej jedno konto powiązane z kontem bankowym, dwa widoczne konta oraz kategoria transakcji.

Domyślnie Playwright uruchamia frontend poleceniem `npm run start-dev-macos` na macOS albo `npm run start-dev` na pozostałych systemach. Czeka na jego dostępność pod adresem `http://localhost:3000`, a po zakończeniu testów zamyka uruchomiony proces. Jeżeli frontend już działa pod tym adresem, wykorzystuje istniejący serwer.

Logowanie używa loginu `slag` oraz niepustych wartości hasła i kodu jednorazowego właściwych dla środowiska deweloperskiego.

## Uruchamianie

```bash
npm run test:e2e
```

Widoczne okno przeglądarki można włączyć poleceniem:

```bash
npm run test:e2e:headed
```

Konfigurację można nadpisać zmiennymi środowiskowymi:

- `E2E_BASE_URL` — adres samodzielnie uruchomionego frontendu; ustawienie tej zmiennej wyłącza automatyczne uruchamianie lokalnego serwera;
- `E2E_LOGIN`, `E2E_PASSWORD`, `E2E_OTP` — dane logowania;
- `E2E_DOMAIN_PUBLIC_ID` — publiczny identyfikator domeny, jeżeli test nie powinien ustalać go z adresu po zalogowaniu.

Raport HTML jest zapisywany w `playwright-report/`, a ślady i zrzuty ekranu nieudanych prób w `test-results/e2e/`. Katalogi te nie są wersjonowane.

## Zakres i wpływ na dane

Zestaw wykonuje kolejno:

1. utworzenie konta z unikalną nazwą testową, przeniesienie na nie powiązania bankowego z innego konta, zmianę nazwy, odtworzenie pierwotnego powiązania i usunięcie konta testowego;
2. zapis dwóch dochodów i dwóch wydatków na dwóch kontach, sprawdzenie podsumowań, kategorii i sald kont oraz import jednej dostępnej transakcji bankowej;
3. zapis pięciu kontrolowanych wyników kostki, sprawdzenie liczby ułożeń i dzisiejszej średniej, pobicie rekordu oraz weryfikację kart, dziennego wiersza i tabeli Top 10 na stronie statystyk;
4. zakończenie aktywnego okresu rozliczeniowego.

Test jest destrukcyjny: dochody, wydatki, zaimportowana transakcja i wyniki kostki pozostają zapisane, a okres rozliczeniowy zostaje zakończony. Należy uruchamiać go wyłącznie w środowisku, w którym taki wpływ na dane jest akceptowalny.

Brak transakcji bankowej do importu jest dopuszczalnym stanem. Test zapisuje wtedy informację w wyjściu i raporcie, po czym kontynuuje bez błędu. Tak samo traktuje wcześniej zakończony okres, dzięki czemu ponowne uruchomienie nie zgłasza fałszywego niepowodzenia tylko dlatego, że destrukcyjny krok został już wykonany.
