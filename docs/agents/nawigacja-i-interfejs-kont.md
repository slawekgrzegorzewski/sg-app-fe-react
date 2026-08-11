# Nawigacja i interfejs kont — ustalenia implementacyjne

Ten dokument uzupełnia [`docs/wytyczne-interfejsu.md`](../wytyczne-interfejsu.md) o konkretne decyzje podjęte podczas modernizacji `DrawerAppBar` i widoku kont. Opisuje trwałe reguły, które należy zachować przy kolejnych zmianach.

## Kolory `DrawerAppBar`

- Tekst i ikony umieszczone bezpośrednio na tle `primary.main` używają `primary.contrastText`. Nie używamy w tym miejscu `secondary.light`, ponieważ część ciemnych wariantów ma jasny kolor główny i nie zapewnia wtedy odpowiedniego kontrastu.
- Półprzezroczyste separatory oraz tła zaznaczenia wyliczamy przez `alpha(theme.palette.primary.contrastText, opacity)`. Nie wpisujemy na sztywno białych wartości `rgba(...)`.
- Aktywna strona jest zaznaczona jednocześnie zmianą tła i grubości tekstu oraz ma `aria-current="page"`.

## Zaproszenia do domen

- Podczas akceptowania albo odrzucania zaproszenia blokujemy oba przyciski dotyczące tej samej domeny, aby nie można było wysłać konkurencyjnych operacji dla jednego zaproszenia.
- Nie blokujemy akcji innych zaproszeń. Stan operacji jest śledzony osobno według publicznego identyfikatora domeny.
- Po odrzuceniu zaproszenia czekamy najpierw na zakończenie mutacji, a następnie na odświeżenie danych domen.

## Stany zapytania w dialogu transakcji

- Po otwarciu transakcji konta dialog pozostaje widoczny przez cały czas pobierania danych. `LoadingIndicator` jest wyświetlany wewnątrz dialogu, dzięki czemu użytkownik zachowuje kontekst wykonanej akcji.
- Błąd pobierania również pokazujemy wewnątrz tego samego dialogu przez `ErrorDisplay`, wraz z przyciskiem ponowienia zapytania.
- Nie zastępujemy dialogu pustym fragmentem podczas ładowania ani samym komunikatem błędu poza dialogiem.

## Asynchroniczny zapis formularza

- Wspólny `Form` przyjmuje synchroniczny lub asynchroniczny `onSave` i czeka na jego zakończenie.
- Przycisk zatwierdzenia jest wyłączony, gdy `formik.isSubmitting` jest ustawione, co zapobiega ponownemu wysłaniu tej samej operacji.
- Stan `isSubmitting` może zostać zakończony dopiero po rozstrzygnięciu `onSave`, także w przypadku błędu. Nie stosujemy sztucznego opóźnienia przed wywołaniem zapisu.
- Pozostałe kontrolki nie są automatycznie blokowane tylko dlatego, że trwa zapis; blokadę rozszerzamy wyłącznie wtedy, gdy konkretna interakcja mogłaby spowodować niespójność.

## Rozmiary akcji skarbonki

- Przyciski dodawania i odejmowania środków mają responsywny obszar interakcji:
    - telefon (`xs`): `40 × 40 px`, ikona `16 px`;
    - pełny widok (`sm` i większy): `28 × 28 px`, ikona `14 px`.
- Mały wygląd ikony na dużym ekranie nie może zmniejszać mobilnego obszaru dotykowego.
- Obie akcje zachowują jednoznaczne polskie `aria-label` oraz `Tooltip`.

## Weryfikacja regresji

- Testy `AccountTransactions` obejmują dialog podczas ładowania, błąd oraz ponowienie zapytania.
- Testy wspólnego `Form` sprawdzają, że nierozstrzygnięty zapis wyłącza przycisk zatwierdzenia i nie pozwala uruchomić operacji ponownie.
- Po zmianach w tych obszarach uruchamiamy odpowiednie testy komponentów, TypeScript, Prettier i kompilację produkcyjną.
