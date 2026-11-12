# Uwierzytelnianie żądań przez Keycloak

- Chronione żądania GraphQL oraz pobieranie załączników używają tokena dostępu klienta `sg-frontend` serwera `https://auth.grzegorzewski.pl`. Backend musi przyjmować ten token jako `Bearer`.
- Realm wybieramy przez `REACT_APP_KEYCLOAK_REALM` razem z adresem backendu: `.env` i `.env.macos` ustawiają `sg-test`, a `.env.production` ustawia `sg`. Uruchomienie deweloperskie w sieci lokalnej korzysta z tego samego `sg-test` również wtedy, gdy adres backendu zostanie zastąpiony adresem IP komputera.
- Adapter `keycloak-js` inicjalizujemy jednokrotnie z `login-required` i PKCE `S256`. Przed każdym chronionym żądaniem wywołujemy `updateToken(60)`, ponieważ token może wygasnąć podczas otwartej sesji.
- Wejście na chronioną trasę inicjalizuje Keycloak również bez lokalnego profilu. Następnie klient pobiera `currentUser` przez uwierzytelniony GraphQL z pominięciem pamięci podręcznej Apollo i dopiero po zapisaniu profilu otwiera trasę. Dzięki temu lokalnie zapisany profil nie zastępuje aktualnych danych konta z backendu, a brak profilu nie kieruje do starego formularza logowania.
- `currentUser.domain.publicId` jest identyfikatorem aktywnej domeny w lokalnym modelu `User.domainPublicId`; role i dostępne domeny pochodzą z tej samej odpowiedzi.
- Chronione żądania Apollo przekazują publiczny identyfikator domeny z bieżącej trasy w nagłówku `domainId`. Gdy trasa nie wskazuje jeszcze domeny, nagłówek pomijamy; nie korzystamy z lokalnie zapisanego profilu, który podczas przełączania domen może być nieaktualny.
- Po `switchDomain` zapisujemy nowy profil bez nawigacji. Adres trasy określa wybraną aplikację, domenę i podstronę; ponowny odczyt profilu nie powinien przenosić użytkownika do pierwszej dostępnej aplikacji.
- Strona startowa i powrót po wylogowaniu kierują na chronioną trasę, która uruchamia Keycloak. Stary formularz `/login` pozostaje dostępny wyłącznie po jawnym wejściu na ten adres.
- Token dostępu i token odświeżający Keycloak pozostają w pamięci adaptera. Nie zapisujemy ich w `localStorage` ani w obiekcie `CurrentUser`.
- Istniejące operacje logowania i zmiany domeny nadal występują w aplikacji. JWT zwracany przez te operacje nie jest używany do chronionych żądań ani zapisywany.
- Wylogowanie czyści lokalny profil i kończy sesję Keycloak, aby kolejne wejście do części chronionej wymagało ponownego uwierzytelnienia.
- Pakiet `keycloak-js` publikuje deklaracje typów przez pole `exports`, którego projektowa konfiguracja TypeScript z `moduleResolution: node` nie odczytuje. Mapowanie `paths` w `tsconfig.json` wskazuje jego deklarację bez zmiany rozwiązywania modułów dla całej aplikacji.
- `keycloak-js` dostarcza kod ESM, którego Jest uruchamiany przez `react-scripts` nie przekształca z `node_modules`. Testy komponentów, które tylko pośrednio importują adapter, powinny mockować projektowy moduł `security/keycloak`; zachowanie adaptera sprawdzamy osobno w `keycloak.test.ts`.

## Wygasanie i diagnostyka odświeżania

`updateToken(60)` oznacza odświeżenie, jeśli tokenowi pozostało mniej niż 60 sekund
ważności; sam nie uruchamia cyklicznego odświeżania. Samo wygaśnięcie tokena dostępu
nie uniemożliwia odnowienia go przez nadal ważny refresh token.

Po udanym uwierzytelnieniu jeden zegar co 30 sekund wywołuje `updateToken(60)`,
również bez aktywności użytkownika i przy ukrytej karcie. Odnowienie następuje
więc zwykle około minuty przed wygaśnięciem tokena, a nie przy każdym sprawdzeniu.
Powrót do widocznej karty, odzyskanie fokusu okna lub połączenia sieciowego
uruchamia dodatkowe sprawdzenie. Żądania API i podtrzymywanie współdzielą trwającą
operację odświeżania. Wylogowanie jawne lub zgłoszone przez adapter usuwa zegar
oraz nasłuchiwanie zdarzeń.

Błąd podtrzymywania jest logowany, ale nie powoduje jawnego wylogowania:
przy błędzie przejściowym następne sprawdzenie ponawia próbę. Przeglądarka może
ograniczyć lub wstrzymać zegary karty w tle, a uśpiony komputer nie wykonuje kodu.
Powrót do karty sprawdza wtedy sesję, lecz nie przywróci wygasłego refresh tokena.
Podtrzymywanie nie omija maksymalnego czasu sesji Keycloak.
Limity sesji definiują [realmy infrastruktury](../../../sg-app-swarm-deployment/apps/configs/application/).
Zgodnie z [dokumentacją Keycloak](https://www.keycloak.org/docs/latest/server_admin/index.html#_timeouts)
limit bezczynności sesji odnawia uwierzytelnienie lub żądanie odświeżenia tokena;
aktywność w samym interfejsie i żądania do naszego backendu nie robią tego bezpośrednio.

Adapter `keycloak-js` 26.2.4 przy odpowiedzi HTTP 400 z endpointu odświeżania
czyści tokeny i przy `login-required` sam rozpoczyna logowanie. Błędy sieciowe
i serwera propaguje do wywołującego; projektowy wrapper loguje błąd podtrzymywania i pozwala ponowić próbę
przy kolejnym sprawdzeniu, bez odrębnego komunikatu odzyskiwania sesji. Promise inicjalizacji pozostaje
zapamiętana i nie jest miarą aktualnej ważności sesji.

Osobna ścieżka w `Authenticated.tsx` wywołuje pełne `logOut()` po HTTP 401
lub wskazanych błędach uwierzytelnienia GraphQL. Nie próbuje wcześniej wymusić
odnowienia tokena ani ponowić operacji. HTTP 401 nie dowodzi wygaśnięcia tokena:
backend zwraca go również przy innych błędach walidacji tokena lub konta.

Przy diagnozie konkretnego incydentu należy rozróżnić brak żądania odświeżenia,
odrzucenie go przez Keycloak oraz HTTP 401 z backendu. Statyczne pliki realmów
nie potwierdzają bieżących ustawień serwera; potrzebny jest odczyt konfiguracji
aktywnego realmu i odpowiedzi sieciowej z chwili wystąpienia problemu.
