# Uwierzytelnianie żądań przez Keycloak

- Chronione żądania GraphQL oraz pobieranie załączników używają tokena dostępu klienta `sg-frontend` serwera `https://auth.grzegorzewski.pl`. Backend musi przyjmować ten token jako `Bearer`.
- Realm wybieramy przez `REACT_APP_KEYCLOAK_REALM` razem z adresem backendu: `.env` i `.env.macos` ustawiają `sg-test`, a `.env.production` ustawia `sg`. Uruchomienie deweloperskie w sieci lokalnej korzysta z tego samego `sg-test` również wtedy, gdy adres backendu zostanie zastąpiony adresem IP komputera.
- Adapter `keycloak-js` inicjalizujemy jednokrotnie z `login-required` i PKCE `S256`. Przed każdym chronionym żądaniem wywołujemy `updateToken(30)`, ponieważ token może wygasnąć podczas otwartej sesji.
- Wejście na chronioną trasę inicjalizuje Keycloak również bez lokalnego profilu. Następnie klient pobiera `currentUser` przez uwierzytelniony GraphQL z pominięciem pamięci podręcznej Apollo i dopiero po zapisaniu profilu otwiera trasę. Dzięki temu lokalnie zapisany profil nie zastępuje aktualnych danych konta z backendu, a brak profilu nie kieruje do starego formularza logowania.
- `currentUser.domain.publicId` jest identyfikatorem aktywnej domeny w lokalnym modelu `User.domainPublicId`; role i dostępne domeny pochodzą z tej samej odpowiedzi.
- Chronione żądania Apollo przekazują publiczny identyfikator domeny z bieżącej trasy w nagłówku `domainId`. Gdy trasa nie wskazuje jeszcze domeny, nagłówek pomijamy; nie korzystamy z lokalnie zapisanego profilu, który podczas przełączania domen może być nieaktualny.
- Po `switchDomain` zapisujemy nowy profil bez nawigacji. Adres trasy określa wybraną aplikację, domenę i podstronę; ponowny odczyt profilu nie powinien przenosić użytkownika do pierwszej dostępnej aplikacji.
- Strona startowa i powrót po wylogowaniu kierują na chronioną trasę, która uruchamia Keycloak. Stary formularz `/login` pozostaje dostępny wyłącznie po jawnym wejściu na ten adres.
- Token dostępu i token odświeżający Keycloak pozostają w pamięci adaptera. Nie zapisujemy ich w `localStorage` ani w obiekcie `CurrentUser`.
- Istniejące operacje logowania i zmiany domeny nadal występują w aplikacji. JWT zwracany przez te operacje nie jest używany do chronionych żądań ani zapisywany.
- Wylogowanie czyści lokalny profil i kończy sesję Keycloak, aby kolejne wejście do części chronionej wymagało ponownego uwierzytelnienia.
- Pakiet `keycloak-js` publikuje deklaracje typów przez pole `exports`, którego projektowa konfiguracja TypeScript z `moduleResolution: node` nie odczytuje. Mapowanie `paths` w `tsconfig.json` wskazuje jego deklarację bez zmiany rozwiązywania modułów dla całej aplikacji.
