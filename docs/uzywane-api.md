# Wykorzystywane interfejsy API

Dokument opisuje połączenia sieciowe wykonywane bezpośrednio przez kod aplikacji. Rozróżnia standard GraphQL, wywołania HTTP o charakterze REST oraz integracje zewnętrzne, które nie należą do żadnej z tych dwóch grup.

## Podsumowanie

| Rodzaj komunikacji            | Punkt wejścia                                                | Zakres                                                                             |
| ----------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| GraphQL bez uwierzytelnienia  | `${adresBackendu}/auth/graphql`                              | logowanie i rejestracja                                                            |
| GraphQL z uwierzytelnieniem   | `${adresBackendu}/graphql`                                   | domeny oraz moduły Księgowość, Kostki, Raporty własności intelektualnej i Pożyczki |
| HTTP/REST z uwierzytelnieniem | `${adresBackendu}/task/{taskId}/attachment/{attachmentName}` | pobieranie załącznika zadania                                                      |
| Zewnętrzny skrypt Google      | `https://accounts.google.com/gsi/client`                     | pozyskanie poświadczenia Google Identity Services                                  |

W plikach `.graphql` zdefiniowano łącznie 93 operacje: 23 zapytania i 70 mutacji. Kod aplikacji wywołuje 85 z nich: 21 zapytań i 64 mutacje. Nie znaleziono subskrypcji GraphQL, połączeń WebSocket, `EventSource`, biblioteki Axios ani innych bezpośrednich wywołań `fetch` poza pobieraniem załącznika zadania.

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

Klient skonfigurowany w [`Authenticated.tsx`](../src/security/Authenticated.tsx) używa `UploadHttpLink` i punktu wejścia `/graphql`. Każda operacja otrzymuje:

- `Authorization: Bearer {jwt}` — jeśli token JWT jest dostępny;
- `locale: {język przeglądarki}`;
- `Apollo-Require-Preflight: true`.

`UploadHttpLink` umożliwia przesyłanie plików za pomocą wieloczęściowych żądań GraphQL. Mechanizm jest używany przez mutację `UploadTaskAttachment` ze skalarem `Upload`. Błędy uwierzytelnienia `401`, `UNAUTHENTICATED` i `UNAUTHORIZED` powodują wylogowanie, a pozostałe błędy są rejestrowane wspólnie.

### Używane operacje według obszaru

#### Uwierzytelnianie i domeny

Zapytania:

- `DomainsData`.

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
- kontrahenci: `GetAllClients`, `GetAllSuppliers`;
- ustawienia: `GetAccountantSettings`.

Mutacje:

- konta: `CreateAccount`, `UpdateAccount`, `DeleteAccount`, `ReorderAccount`, `AssignBankAccountToAccount`, `DeleteBankAccountAssignment`;
- okresy i rozliczenia: `CreateBillingPeriod`, `FinishBillingPeriod`, `CreateIncome`, `CreateExpense`, `CreateTransfer`, `MutuallyCancel`, `ImportBankTransactions`;
- integracja bankowa: `StartPermissionRequest`, `ConfirmPermission`, `TriggerFetchBankAccountData`;
- kategorie rozliczeń: `CreateBillingCategory`, `UpdateBillingCategory`, `DeleteBillingCategory`;
- klienci: `CreateClient`, `UpdateClient`, `DeleteClient`;
- dostawcy: `CreateSupplier`, `UpdateSupplier`, `DeleteSupplier`;
- skarbonki: `CreatePiggyBank`, `UpdatePiggyBank`, `DeletePiggyBank`;
- ustawienia: `UpdateAccountantSettings`.

Aplikacja kliencka nie komunikuje się bezpośrednio z zewnętrznymi API banków. Rozpoczęcie zgody, jej potwierdzenie oraz pobranie danych bankowych są zlecane własnemu serwerowi przez GraphQL.

#### Kostki

Zapytania:

- `GetCubeResults`;
- `GetCubeStats`.

Mutacje:

- `StoreCubeResult`.

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

| Metoda | Ścieżka                                      | Uwierzytelnienie              | Parametry                    | Odpowiedź                                        |
| ------ | -------------------------------------------- | ----------------------------- | ---------------------------- | ------------------------------------------------ |
| `POST` | `/task/{taskId}/attachment/{attachmentName}` | `Authorization: Bearer {jwt}` | `domainId` w ciągu zapytania | dane binarne odczytywane przez `response.blob()` |

Endpoint służy do pobrania załącznika zadania. Otrzymany obiekt `Blob` jest udostępniany użytkownikowi jako plik przez tymczasowy adres `URL.createObjectURL`.

Wysyłanie i usuwanie załączników nie korzysta z REST: odbywa się odpowiednio przez mutacje GraphQL `UploadTaskAttachment` i `DeleteTaskAttachment`.

## Integracje zewnętrzne poza GraphQL i REST

Komponent [`LoginWithGoogleButton.tsx`](../src/security/login/LoginWithGoogleButton.tsx) ładuje skrypt Google Identity Services z `https://accounts.google.com/gsi/client`. Skrypt przekazuje poświadczenie do funkcji przeglądarkowej `handleCredentialResponse`, a aplikacja przesyła je następnie do własnego serwera mutacją GraphQL `LoginWithGoogle`.

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
