# Instrukcje frontendu

## Współpraca z centralą

Jeśli obok tego repozytorium znajduje się `sg-app-workspace`, przed pracą przeczytaj jego [AGENTS.md](../sg-app-workspace/AGENTS.md) oraz stosuj [zasady dokumentacji](../sg-app-workspace/docs/zasady-dokumentacji.md). Instrukcje nie dziedziczą się automatycznie pomiędzy repozytoriami. Przy pracy bez centrali zachowaj istniejące zmiany użytkownika, pisz dokumentację po polsku i aktualizuj ją wraz z implementacją. Szczegóły projektu zapisuj lokalnie w `docs/` lub `docs/agents/`; ustalenia obejmujące kilka repozytoriów zapisuj w centrali.

## IDE i analiza

- Frontend `sg-app-fe-react` jest otwarty w WebStorm. Przed użyciem MCP potwierdź projekt; preferuj dostępne narzędzia WebStorm do analizy, inspekcji, budowania i testów. Gdy funkcji lub połączenia brakuje, użyj właściwego narzędzia lokalnego i odnotuj istotne ograniczenia weryfikacji.
- Po zmianach kodu analizuj wszystkie zmienione pliki inspekcją IDE lub linterem. Popraw oczywiste, lokalne problemy; nie wyciszaj ostrzeżeń ani nie rozszerzaj refaktoryzacji tylko dla pustego raportu.
- Po każdym użyciu `@webstorm/execute_terminal_command` zamknij wykorzystany terminal. Jeśli MCP nie zapewnia zamknięcia terminala, użyj lokalnego narzędzia powłoki.
- Dla zmian wyłącznie dokumentacyjnych sprawdź strukturę Markdown, linki i `git diff --check`. Dla zmian interfejsu wykonaj weryfikację opisaną w `docs/wytyczne-interfejsu.md` i właściwych notatkach tematycznych.

## Dokumentacja i kontrakty

- Punktem wejścia jest [README](README.md) i [indeks dokumentacji](docs/README.md). Zachowuj zgodność notatek z `docs/wytyczne-interfejsu.md`.
- Po dodaniu, usunięciu albo zmianie połączenia sieciowego aktualizuj `docs/uzywane-api.md`, rozróżniając aktywne operacje od kontraktu tylko zadeklarowanego w kodzie.
- Źródłowy schemat GraphQL należy do backendu. Lokalny `schema.graphql` i operacje `.graphql` są wejściem do `npm run codegen`; nie poprawiaj ręcznie wygenerowanego `src/types.ts`.
- Zasady testów Playwrighta i wpływ na dane opisują `docs/testy-integracyjne-e2e.md` oraz `docs/agents/testy-e2e.md`. Wspólne wymagania fixture są w centrali, a implementacja scenariuszy pozostaje tutaj.

## Uwierzytelnianie podczas weryfikacji

- Bieżący przepływ chronionych tras wykorzystuje Keycloak; stosuj `docs/agents/uwierzytelnianie-keycloak.md`.
- Skrót logowania przez stary lokalny formularz (`slag`, dowolne niepuste hasło i OTP) dotyczy wyłącznie lokalnego backendu z implementacją deweloperską i jawnie otwartego starego formularza `/login`. Nie zastępuje uwierzytelniania Keycloak ani nie dotyczy produkcji.
