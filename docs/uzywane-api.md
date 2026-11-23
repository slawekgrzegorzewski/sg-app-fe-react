# Wykorzystywane interfejsy API

Dokument opisuje połączenia sieciowe wykonywane bezpośrednio przez kod aplikacji. Rozróżnia standard GraphQL, wywołania HTTP o charakterze REST oraz integracje zewnętrzne, które nie należą do żadnej z tych dwóch grup.

## Podsumowanie

| Rodzaj komunikacji            | Punkt wejścia                                                | Zakres                                                                             |
| ----------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| GraphQL bez uwierzytelnienia  | `${adresBackendu}/auth/graphql`                              | logowanie i rejestracja                                                            |
| GraphQL z uwierzytelnieniem   | `${adresBackendu}/graphql`                                   | domeny oraz moduły Księgowość, Kostki, Raporty własności intelektualnej i Pożyczki |
| HTTP/REST z uwierzytelnieniem | `${adresBackendu}/task/{taskId}/attachment/{attachmentName}` | pobieranie załącznika zadania                                                      |
| Zewnętrzny skrypt Google      | `https://accounts.google.com/gsi/client`                     | pozyskanie poświadczenia Google Identity Services                                  |
| Keycloak                      | `https://auth.grzegorzewski.pl`                              | logowanie i odnawianie tokena dostępu dla uwierzytelnionych żądań                  |

W plikach `.graphql` zdefiniowano łącznie 97 operacji: 25 zapytań i 72 mutacje. Kod aplikacji wywołuje 89 z nich: 23 zapytania i 66 mutacji. Nie znaleziono subskrypcji GraphQL, połączeń WebSocket, `EventSource`, biblioteki Axios ani innych bezpośrednich wywołań `fetch` poza pobieraniem załącznika zadania.

## Trenażer CFOP

Aktywne operacje w `src/cubes/trainer/cube-trainer.graphql` to `GetCubeTrainer`
(katalog przypadków, warianty, preferencja i ostatnie próby),
`PreferCubeTrainerAlgorithm` (wybór wariantu do nauki) oraz `SaveCubeTrainerAttempt`
(zapis próby). Korzystają z uwierzytelnionego `/graphql`.
Pole `CubeTrainerCase.groupName` w `GetCubeTrainer` opisuje grupę przypadku
używaną do filtrowania katalogu F2L i OLL.
Szczegóły: [trenażer CFOP](agents/trenazer-cfop.md).

## Konfiguracja adresu serwera

Wspólny adres bazowy zwraca [`getBackendUrl()`](../src/utils/backend-url.ts):

- `REACT_APP_BACKEND_URL` jest wymaganym adresem podstawowym;
- na `localhost`, `127.0.0.1` i `[::1]` aplikacja zawsze używa adresu podstawowego;
- poza adresem lokalnym aplikacja używa `REACT_APP_NETWORK_BACKEND_URL`, jeśli ta zmienna jest dostępna;
- skrypt [`start-dev-network.mjs`](../scripts/start-dev-network.mjs) tworzy adres sieciowy przez zastąpienie lokalnego hosta adresem IPv4 komputera.

## GraphQL

### Klient publiczny

Klient skonfigurowany w [`src/index.tsx`](../src/index.tsx) używa `HttpLink` i punktu wejścia `/auth/graphql`. Nie dodaje nagłówka JWT. Obsługuje:

- `PerformLogin` — logowanie loginem, hasłem i kodem jednorazowym;
- `LoginWithGoogle` — wymiana poświadczenia Google na dane zalogowanego użytkownika;
- `PerformRegistration` — rejestracja użytkownika;
- `SetupMFA` — konfiguracja uwierzytelniania wieloskładnikowego podczas rejestracji.

### Klient uwierzytelniony

Klient skonfigurowany w [`Authenticated.tsx`](../src/security/Authenticated.tsx) używa `UploadHttpLink` i punktu wejścia `/graphql`. Przed wysłaniem operacji adapter Keycloak odnawia token dostępu, jeśli jego ważność jest krótsza niż 60 sekund. Każda operacja otrzymuje:

- `Authorization: Bearer {token Keycloak}`;
- `domainId: {publicId domeny z bieżącej trasy}`, jeśli trasa wskazuje domenę;
- `locale: {język przeglądarki}`;
- `Apollo-Require-Preflight: true`.

`UploadHttpLink` umożliwia przesyłanie plików za pomocą wieloczęściowych żądań GraphQL. Mechanizm jest używany przez mutację `UploadTaskAttachment` ze skalarem `Upload`. Błędy uwierzytelnienia `401`, `UNAUTHENTICATED` i `UNAUTHORIZED` powodują wylogowanie z Keycloak, a pozostałe błędy są rejestrowane wspólnie. Po uwierzytelnieniu zapytanie `GetCurrentUser` pobiera profil i aktywną domenę z backendu. JWT zwracany przez stare operacje logowania nie jest przechowywany ani wysyłany do chronionego API.

### Używane operacje według obszaru

#### Uwierzytelnianie i domeny

Zapytania:

- `GetCurrentUser`, `DomainsData`.

Mutacje:

- `SwitchDomain`;
- `CreateDomain`, `UpdateDomain`;
- `InviteUserToDomain`, `AcceptInvitationToDomain`, `RejectInvitationToDomain`;
- `SetUserDomainAccessLevel`.

`SwitchDomain` jest zadeklarowane razem z operacjami logowania, ale jest wykonywane przez klienta uwierzytelnionego pod `/graphql`.

#### Księgowość

Zapytania:

- konta i okresy: `GetFinanceManagement`, `GetFinanceManagementWithNotAssignedBankAccounts`, `GetAccountTransactions`, `BillingPeriodQuery`, `BankTransactionsToImport`;
- banki: `GetAvailableInstitutions`, `GetBankPermissions`;
- kontrahenci w ustawieniach firmy: `GetCounterparties`;
- ustawienia: `GetAccountantSettings`.

Mutacje:

- konta: `CreateAccount`, `UpdateAccount`, `DeleteAccount`, `ReorderAccount`, `AssignBankAccountToAccount`, `DeleteBankAccountAssignment`;
- okresy i rozliczenia: `CreateBillingPeriod`, `FinishBillingPeriod`, `CreateIncome`, `CreateExpense`, `CreateTransfer`, `MutuallyCancel`, `ImportBankTransactions`;
- integracja bankowa: `StartPermissionRequest`, `ConfirmPermission`, `TriggerFetchBankAccountData`;
- kategorie rozliczeń: `CreateBillingCategory`, `UpdateBillingCategory`, `DeleteBillingCategory`;
- klienci i dostawcy: `SaveCounterparty`;
- skarbonki: `CreatePiggyBank`, `UpdatePiggyBank`, `DeletePiggyBank`;
- ustawienia: `UpdateAccountantSettings`.

Aplikacja kliencka nie komunikuje się bezpośrednio z zewnętrznymi API banków. Rozpoczęcie zgody, jej potwierdzenie oraz pobranie danych bankowych są zlecane własnemu serwerowi przez GraphQL.

#### Kostki

Zapytania:

- `GetCubeResults`;
- `GetCubeStats`.

Mutacje:

- `StoreCubeResult`.

Integracja smart kostki odczytuje poziom baterii przez `REQUEST_BATTERY`
i zdarzenia `BATTERY`, gdy urządzenie deklaruje tę możliwość. Odczyt odbywa się
po połączeniu oraz co 60 sekund przez istniejące połączenie Bluetooth,
bez dodatkowego API backendu.

Biblioteka `cubing.js` jest przechowywana lokalnie w projekcie i kopiowana do `public/vendor/cubing`; nie stanowi wywołania API serwera aplikacji.

#### Raporty własności intelektualnej

Zapytania:

- `GetIntellectualPropertiesReport`;
- `IntellectualPropertiesRecords`;
- `AllTimeRecordCategories`;
- `SearchTasks`;
- `TimeRecords`.

Mutacje:

- raporty: `CreateIntellectualPropertyReport`, `UpdateIntellectualPropertyReport`, `DeleteIntellectualPropertyReport`;
- zadania: `CreateTask`, `UpdateTask`, `DeleteTask`;
- załączniki: `UploadTaskAttachment`, `DeleteTaskAttachment`;
- ewidencja czasu: `CreateTimeRecord`, `UpdateTimeRecord`, `DeleteTimeRecord`, `AssignCategoryToTimeRecord`;
- kategorie czasu: `CreateTimeRecordCategory`, `UpdateTimeRecordCategory`, `DeleteTimeRecordCategory`.

#### Pożyczki

Zapytania:

- `GetLoans`;
- `SingleLoan`;
- `SimulateExistingLoan`.

Mutacje:

- `CreateLoan`, `UpdateLoan`, `DeleteLoan`;
- `CreateInstallment`;
- `CreateConstantForNFirstInstallmentRateStrategyConfig`, `DeleteRateStrategyConfig`;
- `CreateNthDayOfMonthRepaymentDayStrategyConfig`, `DeleteRepaymentDayStrategyConfig`.

### Operacje zadeklarowane, ale niewywoływane

Poniższe operacje są obecne w plikach `.graphql` i generowanych typach, ale nie znaleziono ich użycia w kodzie aplikacji:

| Obszar              | Zapytania                 | Mutacje                                                                                 |
| ------------------- | ------------------------- | --------------------------------------------------------------------------------------- |
| Dokumenty finansowe | `MonthFinancialDocuments` | `createBill`, `UpdateBill`, `CreateInvoice`, `UpdateInvoice`, `deleteFinancialDocument` |
| Pożyczki            | `SimulateLoan`            | `DeleteInstallment`                                                                     |

Nie należy traktować tych operacji jako aktywnie wykorzystywanego API bez ponownego sprawdzenia ich użycia.

## HTTP/REST

Kod aplikacji wykonuje jedno bezpośrednie wywołanie `fetch`, zdefiniowane w [`TaskView.tsx`](../src/intellectual-property-report/TaskView.tsx):

| Metoda | Ścieżka                                      | Uwierzytelnienie                         | Parametry                    | Odpowiedź                                        |
| ------ | -------------------------------------------- | ---------------------------------------- | ---------------------------- | ------------------------------------------------ |
| `POST` | `/task/{taskId}/attachment/{attachmentName}` | `Authorization: Bearer {token Keycloak}` | `domainId` w ciągu zapytania | dane binarne odczytywane przez `response.blob()` |

Endpoint służy do pobrania załącznika zadania. Otrzymany obiekt `Blob` jest udostępniany użytkownikowi jako plik przez tymczasowy adres `URL.createObjectURL`.

Wysyłanie i usuwanie załączników nie korzysta z REST: odbywa się odpowiednio przez mutacje GraphQL `UploadTaskAttachment` i `DeleteTaskAttachment`.

## Integracje zewnętrzne poza GraphQL i REST

Komponent [`LoginWithGoogleButton.tsx`](../src/security/login/LoginWithGoogleButton.tsx) ładuje skrypt Google Identity Services z `https://accounts.google.com/gsi/client`. Skrypt przekazuje poświadczenie do funkcji przeglądarkowej `handleCredentialResponse`, a aplikacja przesyła je następnie do własnego serwera mutacją GraphQL `LoginWithGoogle`.

Adapter [`keycloak-js`](../src/security/keycloak.ts) łączy się z `https://auth.grzegorzewski.pl` i klientem `sg-frontend`. Realm `sg-test` obowiązuje w konfiguracjach deweloperskich, a `sg` w produkcji. Adapter używa `login-required` oraz PKCE `S256`; tokeny pozostają w jego pamięci. Integracja uruchamia się po wejściu do chronionej części aplikacji. Po uwierzytelnieniu sprawdza token co 30 sekund również bez żądań API i w karcie w tle; odnawia go przy mniej niż 60 sekundach ważności. Dodatkowe sprawdzenie następuje po powrocie do karty, odzyskaniu fokusu okna i sieci. Zegary mogą być wstrzymane przez przeglądarkę; maksymalny czas sesji Keycloak pozostaje wiążący. Szczegóły trwałej konwencji opisuje [dokument uwierzytelniania](agents/uwierzytelnianie-keycloak.md).

Połączenia wykonywane wewnętrznie przez skrypt Google są zarządzane przez Google Identity Services i nie są jawnie definiowane w kodzie aplikacji.

### Przekierowania i zasoby wskazane przez serwer

W kodzie występują także adresy otrzymywane z GraphQL, które przeglądarka otwiera lub pobiera bez użycia jawnego klienta HTTP:

- [`BanksPermissionsManagement.tsx`](../src/accountant/settings/BanksPermissionsManagement.tsx) przechodzi przez `window.location.replace` do `permission.confirmationLink`, aby kontynuować proces zgody bankowej;
- ten sam komponent wyświetla logo instytucji przez adres `institution.logo`;
- [`Register.tsx`](../src/security/register/Register.tsx) wyświetla kod konfiguracji MFA przez adres `qrLink` zwrócony podczas rejestracji.

Dokładne hosty tych zasobów i przekierowań zależą od wartości zwróconych przez serwer. Nie są one zapisanymi na stałe endpointami REST aplikacji.

## Utrzymywanie dokumentu

Przy dodawaniu lub usuwaniu połączenia sieciowego należy zaktualizować ten dokument. W szczególności trzeba sprawdzić:

- konfiguracje `ApolloClient`, `HttpLink`, `UploadHttpLink` i pozostałych linków Apollo;
- użycia `useQuery`, `useLazyQuery`, `useMutation` i ewentualnego `useSubscription`;
- pliki `*.graphql` oraz operacje, które nie mają użycia w kodzie;
- bezpośrednie wywołania `fetch`, `XMLHttpRequest`, klientów HTTP, WebSocket i `EventSource`;
- zewnętrzne skrypty oraz usługi ładowane w czasie działania aplikacji.

### Dane trenażera CROSS

`saveCubeTrainerAttempt` przesyła opcjonalne pełne nagranie smart próby CROSS.
Historia korzysta z `cubeTrainerAttempts`, pobierając także `aiReview` dla ikony
i dialogu oceny. Ponowne wejście pobiera aktualne dane przez `cache-and-network`;
frontend nie uruchamia ocen i nie odpytuje cyklicznie o ich wynik.
Backend zapisuje nagranie i analizę CFOP, a zapis oceny udostępnia klientom MCP.
Zapytania `cubeTrainerCrossAttempts`, `cubeTrainerCrossAttempt` oraz mutacja
`saveCubeTrainerCrossAttemptAiReview` należą do schematu, ale frontend ich nie wywołuje.

## Księgowość firmowa

Strony firmy należą do istniejącej aplikacji `ACCOUNTANT` (Księgowość);
`ACCOUNTS` jest identyfikatorem jej dotychczasowej strony Konta, a nie osobną aplikacją.
`isCompany = true` udostępnia stronę księgowości firmy i ustawia ją jako startową.
`isCompany = false` udostępnia dotychczasowe strony Miesiące, Konta i Pożyczki.
Ustawienia pozostają dostępne w obu trybach. Menu na komputerze i telefonie oraz
dispatcher korzystają z tej samej reguły widoczności. Wejście pod adres strony
niedostępnej w bieżącym trybie przekierowuje na stronę startową.
Nawigacja i dispatcher obserwują `GetAccountantSettings`; ponowne pobranie po zmianie
trybu aktualizuje strony bez tworzenia nowej aplikacji lub roli.

Aktywny widok „Księgowość firmy” korzysta z zapytania `CompanyAccounting`
(`companyLedger`, `companyAccountingDocuments` i `ledgerCalculationStrategies`) oraz mutacji
`createCompanyLedgerEntry` i `createAccountingDocument`.
Operacje znajdują się w `src/accountant/model/company-accounting.graphql`.
Dokument wymaga kwot netto i VAT (także jawnego zera), rodzaju i waluty;
brutto wylicza backend. Utworzenie dokumentu nie księguje go automatycznie.
Formularz wpisu pozwala wybrać gotową strategię typu `NET_AND_VAT_PERCENTAGE`.
Katalog jest systemowy i zarządzany przez SQL, bez ekranu administracyjnego.
Początkowe pozycje to „Kwota netto” i strategia eksploatacji auta w środkach trwałych
przy użytku mieszanym oraz odliczeniu 50% VAT. Zachowujemy ten sam typ i obie pozycje.
`parameters` jest wariantem interfejsu GraphQL `LedgerCalculationParameters`.
Fragment dla `NetAndVatPercentageParameters` odczytuje `costPercentage` oraz
`deductibleVatPercentage`. Formularz pokazuje procent kosztu i procent VAT do odliczenia,
a także VAT do odliczenia, VAT nieodliczony i podstawę kosztu w walucie dokumentu.
Podgląd używa Decimal i tej samej kolejności co backend: VAT do odliczenia obcina
do groszy w kierunku zera, VAT nieodliczony wylicza jako różnicę względem całego VAT,
następnie stosuje procent kosztu do netto z nieodliczonym VAT i zaokrągla HALF_UP.
Dopiero ten koszt przelicza kursem i ponownie zaokrągla HALF_UP.
Dla netto 100 i VAT 23,01 podział VAT to 11,50/11,51, a koszt wynosi 83,63;
dla VAT 23,05 koszt wynosi 83,65. Nie stosujemy uproszczenia do 37,5% VAT.
„Kwota netto” ma parametry 100/100, a eksploatacja auta 75/50.
Klient przesyła `calculationStrategyPublicId`, kurs i kolumnę, bez procentów
i bez wyliczonego kosztu. Backend sam oblicza wynik. Pełne zasady modelu
opisuje dokumentacja backendu wskazana poniżej.
Odpowiedzi wpisu zawierają wyliczony koszt w walucie dokumentu (`includedAmount`) i kurs. Migawki dokumentu i strategii backend
zapisuje w zdarzeniu `ENTRY_CREATED`; nie są polami odpowiedzi wpisu ani osobnym
ekranem historii.
Nieobsługiwany wariant parametrów blokuje podgląd i zapis zamiast stosowania wzoru procentowego.
Brak katalogu blokuje nowe wpisy, a nie tworzenie dokumentów. Brak historycznego
podziału netto/VAT blokuje przeliczenie dokumentu; UI nie odgaduje tych kwot.
Pole kursu jest ukryte, gdy waluta dokumentu jest taka sama jak waluta księgi;
podgląd i zapis używają wtedy kursu 1. Zmiana dokumentu na walutę księgi usuwa
wcześniej wpisany kurs obcej waluty.

Formularz ogranicza kolumny według rodzaju dokumentu: faktury sprzedaży do przychodów,
faktury zakupu do wydatków. Dla paragonów i innych dokumentów użytkownik wybiera
rodzaj wpisu (przychód albo wydatek). Zmiana dokumentu resetuje kolumnę i pola B+R;
zmiana kierunku wpisu czyści B+R. Ukryte pola B+R nie są przenoszone do wpisu przychodowego.
Ta wersja wymaga backendu po migracji V61; zmieniony kontrakt tworzenia wpisu
należy wdrożyć wraz z frontendem.
Klient pobiera dane firmy wyłącznie po włączeniu `isCompany`; backend niezależnie
weryfikuje uprawnienia i domenę. Użytkownik tworzy dokument, a następnie wpisuje
powiązaną pozycję księgi w formularzu. Wpis otwiera szczegóły dokumentu.
PDF służy wyłącznie do poznania struktury KPiR; aplikacja nie importuje plików PDF.

Źródłem zasad modelu i ręcznego wprowadzania danych jest [dokumentacja backendu](../../sg-app/docs/agents/ksiegowosc-firmowa.md).
Najpierw należy wdrożyć backend z migracją V61, następnie frontend.
Wpisy korzystają z danych powiązanego `AccountingDocument`; stare operacje
`monthLedger` i `addRevenueAndExpenseEntry` zostały usunięte z kontraktu.

Pole `AccountingDocument.postedToLedger` określa, czy dokument ma już wpis w KPiR,
także w innym miesiącu. Formularz proponuje wyłącznie dokumenty z wartością `false`;
zaksięgowane dokumenty pozostają widoczne na liście ze statusem „Ujęty w KPiR”.
Gdy wszystkie dokumenty są zaksięgowane, przycisk dodawania wpisu jest wyłączony.
Backend niezależnie od UI uniemożliwia drugi wpis dla tego samego dokumentu.

Typy `AccountingDocumentType.ZUS` i `INSURANCE_POLICY` są dostępne w formularzu
dokumentu jako „ZUS” i „Polisa”. Są wydatkowe: UI pokazuje tylko kolumny kosztowe,
a backend odrzuca księgowanie ich jako przychodu. Pozostały kontrakt dokumentu
i wpisu nie zmienia się; wpis KPiR nadal wymaga dokumentu i strategii.
Przed frontendem należy wdrożyć backend z migracją V62.


Księgowość firmy pobiera teraz `counterparties` w zapytaniu `CompanyAccounting`.
Zarządzanie katalogiem znajduje się w Ustawienia → Firma, w sekcjach Klienci i Dostawcy.
Sekcje pobierają `GetCounterparties`, filtrują po `kind` i wywołują `saveCounterparty(publicId, input)` do tworzenia,
edytowania, archiwizowania i przywracania. Starsze operacje `GetAllClients`,
`GetAllSuppliers` oraz `Create/Update/DeleteClient` i `Create/Update/DeleteSupplier`
pozostają zadeklarowane, ale ustawienia ich nie wywołują. Strona księgowości nie
wyświetla katalogu; formularz dokumentu pozwala wybrać
aktywnego kontrahenta lub pozostać przy danych ręcznych. Zapis przekazuje
opcjonalne `counterpartyPublicId` i trzy edytowalne pola kopii danych dokumentu.
Szczegóły niepowiązanego dokumentu udostępniają
`createCounterpartyFromDocument(documentPublicId)`, które tworzy kontrahenta
i wiąże go z dokumentem. Pozostałe dane dokumentu pozostają zachowane.
Model i ograniczenia opisuje [dokumentacja backendu](../../sg-app/docs/agents/ksiegowosc-firmowa.md#kontrahenci-i-kopia-danych-dokumentu).
Wymagany jest najpierw backend z uzupełnioną V62, następnie frontend.

`Counterparty` jest wspólnym interfejsem GraphQL typów `Client` i `Supplier`.
`CounterpartyInput` wymaga `kind` (`CLIENT` lub `SUPPLIER`), którego nie zmieniamy
dla istniejącego kontrahenta. Formularz dokumentu filtruje katalog według jego typu:
sprzedaż — klienci; zakup, ZUS i polisy — dostawcy; paragony i pozostałe — oba typy.
`CreateCounterpartyFromDocument` przekazuje `kind`: rozpoznany z rodzaju dokumentu
albo wybrany przez użytkownika dla paragonów i pozostałych dokumentów.


`CreateCompanyLedgerEntry` obsługuje opcjonalne `input.amountOverride`.
Formularz udostępnia ręczną kwotę w walucie dokumentu i pokazuje wynik przeliczenia
na PLN; puste pole korzysta ze strategii. Zmiana dokumentu lub strategii usuwa
nadpisanie, aby nie przenosić korekty do innego obliczenia. Rejestrację nadpisania
w zdarzeniu opisuje [model księgowości backendu](../../sg-app/docs/agents/ksiegowosc-firmowa.md#ręczne-nadpisanie-kwoty-strategii).

Klient Apollo używany po zalogowaniu definiuje `possibleTypes` dla interfejsu
`Counterparty` (`Client`, `Supplier`), aby odczyt fragmentów zachowywał dane obu typów.


`CompanyAccounting` pobiera również `companyLedgerAvailableDocuments(yearMonth)`:
niezaksięgowane dokumenty z bieżącego i wcześniejszych miesięcy. Formularz wpisu
korzysta z tej listy, pokazując numer i datę dokumentu. Lista dokumentów na stronie
nadal pokazuje miesiąc wystawienia. Najpierw należy wdrożyć backend udostępniający
nowe pole GraphQL, potem frontend. Zmiana nie wymaga migracji SQL.

Miesiąc docelowej KPiR jest wysyłany jako `CompanyLedgerEntryInput.ledgerMonth`.
`entryDate` jest datą zdarzenia i może pochodzić z wcześniejszego miesiąca lub roku.
Wymagany jest backend z migracją V63 przed wdrożeniem frontendu.

Edycja KPiR korzysta z `updateCompanyLedgerEntry(publicId, input)`.
Zapytanie księgi pobiera też `calculationStrategyPublicId` z ostatniego zdarzenia wpisu.
Dokument i miesiąc KPiR pozostają stałe. Wymagany backend z migracją V64 przed frontendem.

`CompanyAccounting` pobiera `companyLedger.monthSummary` i `yearToDateSummary`.
Stopka KPiR pokazuje sumy miesiąca i narastająco od stycznia do wybranego miesiąca
w PLN, także dla miesięcy bez wpisów. Najpierw wdrażamy backend z polami podsumowań;
migracja bazy nie jest potrzebna.
