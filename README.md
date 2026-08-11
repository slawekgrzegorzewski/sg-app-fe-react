# sg-app-fe-react

Aplikacja kliencka oparta na React i TypeScript. Projekt został pierwotnie utworzony za pomocą [Create React App](https://github.com/facebook/create-react-app).

## Najważniejsze polecenia

Polecenia uruchamiamy w głównym katalogu projektu.

### `npm run start-dev`

Przygotowuje lokalne zasoby biblioteki `cubing.js` i uruchamia serwer deweloperski z konfiguracją z pliku `.env`.

Na macOS można użyć `npm run start-dev-macos`, które korzysta z pliku `.env.macos`.

### `npm test`

Uruchamia testy w trybie interaktywnym. Jednorazowe uruchomienie testów bez trybu obserwowania:

```bash
CI=true npm test -- --watchAll=false
```

### `npm run test:e2e`

Uruchamia w Google Chrome pełny, destrukcyjny test integracyjny interakcji z danymi. Playwright automatycznie uruchamia lokalny frontend; backend musi być wcześniej dostępny. Szczegóły konfiguracji i zakres operacji opisuje dokument [Testy integracyjne E2E](docs/testy-integracyjne-e2e.md).

Wariant `npm run test:e2e:headed` pozostawia widoczne okno przeglądarki podczas testu.

### `npm run typecheck`

Sprawdza typy TypeScript bez generowania plików wynikowych.

### `npm run build`

Tworzy zoptymalizowaną kompilację z konfiguracją z pliku `.env` w katalogu `build/`.

Wariant korzystający z `.env.production` uruchamiamy przez `npm run build-prod`.

### `npm run codegen`

Generuje typy i dokumenty TypeScript na podstawie operacji GraphQL oraz konfiguracji `codegen.ts`.

### `npm run format` i `npm run format:check`

Odpowiednio formatują pliki TSX oraz pliki testów E2E za pomocą Prettier albo sprawdzają ich formatowanie bez wprowadzania zmian.

### `npm run update-cubing`

Aktualizuje przechowywaną w repozytorium przeglądarkową wersję biblioteki `cubing.js`.

## Dokumentacja projektu

- [Wytyczne interfejsu użytkownika](docs/wytyczne-interfejsu.md)
- [Wykorzystywane interfejsy API](docs/uzywane-api.md)
- [Testy integracyjne E2E](docs/testy-integracyjne-e2e.md)
- [Ustalenia dotyczące nawigacji i interfejsu kont](docs/agents/nawigacja-i-interfejs-kont.md)
- [Zasady testów E2E](docs/agents/testy-e2e.md)
- [Zasady utrzymywania dokumentacji](docs/agents/utrzymywanie-dokumentacji.md)

Dokumentacja techniczna wykorzystanych narzędzi:

- [React](https://react.dev/)
- [Create React App](https://facebook.github.io/create-react-app/docs/getting-started)
