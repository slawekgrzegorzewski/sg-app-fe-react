# Instrukcje frontendu

## Współpraca z centralą

Jeśli obok tego repozytorium znajduje się `sg-app-workspace`, przed pracą przeczytaj jego [AGENTS.md](../sg-app-workspace/AGENTS.md) oraz stosuj [zasady dokumentacji](../sg-app-workspace/docs/zasady-dokumentacji.md). Instrukcje nie dziedziczą się automatycznie pomiędzy repozytoriami. Przy pracy bez centrali zachowaj istniejące zmiany użytkownika, pisz dokumentację po polsku i aktualizuj ją wraz z implementacją. Szczegóły projektu zapisuj lokalnie w `docs/` lub `docs/agents/`; ustalenia obejmujące kilka repozytoriów zapisuj w centrali.

## IDE i analiza

- Frontend `sg-app-fe-react` jest otwarty w WebStorm. Przed użyciem MCP potwierdź projekt; preferuj dostępne narzędzia WebStorm do analizy, inspekcji, budowania i testów. Gdy funkcji lub połączenia brakuje, użyj właściwego narzędzia lokalnego i odnotuj istotne ograniczenia weryfikacji.
- Po zmianach kodu analizuj wszystkie zmienione pliki inspekcją IDE lub linterem. Popraw oczywiste, lokalne problemy; nie wyciszaj ostrzeżeń ani nie rozszerzaj refaktoryzacji tylko dla pustego raportu.
- Po każdym użyciu `@webstorm/execute_terminal_command` zamknij wykorzystany terminal. Jeśli MCP nie zapewnia zamknięcia terminala, użyj lokalnego narzędzia powłoki.
- Dla zmian wyłącznie dokumentacyjnych sprawdź strukturę Markdown, linki i `git diff --check`. Dla zmian interfejsu wykonaj weryfikację opisaną w `docs/wytyczne-interfejsu.md` i właściwych notatkach tematycznych.

## Formatowanie TypeScript i TSX

- W plikach `.ts` i `.tsx` proste argumenty mogą pozostać w jednym wierszu, np. `padStart(2, '0')`, `slice(0, 8)` lub `choose(value, options.mode)`. Za proste uznajemy literały, zmienne i bezpośrednie odczyty właściwości bez wywołań. Jeżeli choć jeden argument jest złożony, np. wywołaniem metody, konstruktorem, łańcuchem wywołań, lambdą, obiektem lub innym rozbudowanym wyrażeniem, zapisuj wszystkie argumenty pionowo, nawet jeśli mieszczą się w limicie długości wiersza. Nawias otwierający pozostaje przy nazwie, a zamykający przy ostatnim argumencie. Dotyczy to także pojedynczego złożonego argumentu.
- Wieloparametrowe deklaracje funkcji zapisuj pionowo, niezależnie od prostoty parametrów. Każdy parametr zajmuje osobny wiersz, z nawiasem zamykającym przy ostatnim.
- W tablicy z co najmniej dwoma elementami, zawierającej złożone wyrażenia, np. wywołania metod lub konstruktory, każdy element umieszczaj w osobnym wierszu. Po `[` rozpoczynaj nowy wiersz, elementy wcinaj o 4 spacje, a `]` umieszczaj w osobnym wierszu na poziomie tablicy. Proste argumenty wywołań będących elementami tablicy pozostają razem, np. `hex.slice(0, 8)`. Krótkie tablice prostych wartości oraz tablice z jednym elementem, również złożonym (np. `[...piece]` lub `[makeValue()]`), mogą pozostać w jednym wierszu.
- Każda gałąź `if`, `else if` i `else` oraz ciało pętli `for`, `for...of`, `for...in`, `while` i `do...while` muszą mieć klamry, także przy pojedynczej instrukcji lub wcześniejszym `return`, `continue`, `break` albo `throw`. Instrukcję zapisuj w osobnym wierszu wewnątrz bloku; nie używaj jednolinijkowych bloków ani postaci `if (condition) return;`.
- Bloki kodu wcinaj o 4 spacje, a kontynuacje wyrażeń i argumenty wywołań o 8 spacji względem poziomu nadrzędnego. Każde kolejne zagnieżdżenie zwiększa wcięcie; po jego zakończeniu wracaj do poziomu nadrzędnego. Nie używaj tabulatorów ani wyrównywania argumentów do kolumny nawiasu.
- Przy przełamywaniu warunków logicznych operatory `&&` i `||` umieszczaj na początku nowego wiersza, przed kolejnym operandem, nigdy na końcu poprzedniego. Zachowuj wcięcie kontynuacji i dodatkowe wcięcia zagnieżdżonych podwyrażeń.
- Łańcuchy rozbudowanych wywołań zapisuj po jednym wywołaniu w wierszu. Wyrażenia warunkowe rozbijaj na warunek oraz osobne gałęzie z `?` i `:`, wcięte względem warunku. Unikaj zagnieżdżonych ternary, szczególnie w JSX; wydzielaj nazwane wartości lub komponenty.
- Rozbudowane typy propsów deklaruj jako osobne typy. W wielowierszowym JSX każdy atrybut zapisuj w osobnym wierszu, z wcięciem o 4 spacje; zamykające `>` lub `/>` umieszczaj w osobnym wierszu, na poziomie znacznika otwierającego. Krótkie znaczniki mogą pozostać w jednym wierszu.
- Zachowuj docelową długość wiersza 120 znaków, średniki, pojedyncze cudzysłowy w TypeScript, podwójne w atrybutach JSX, brak dodatkowych spacji w nawiasach klamrowych oraz zakończenia wierszy LF. Przy jednym prostym parametrze funkcji strzałkowej pomijaj nawiasy okrągłe. Nie dodawaj końcowego przecinka po ostatnim argumencie wywołania; w wielowierszowych obiektach i tablicach stosuj końcowy przecinek.
- WebStorm korzysta z `.editorconfig`, a ESLint z `tools/eslint-style.cjs` i lokalnej wtyczki `eslint-plugin-sg-format`. Prettier pomija `.ts` i `.tsx`. Formatowanie wybranych plików kończ przez `npx eslint --fix <pliki>`, aby uwzględnić rozróżnienie prostych i złożonych argumentów oraz docelowe wcięcia JSX. `npm run format` obejmuje cały frontend, a `npm run format:check` sprawdza go bez zmian. Nie formatuj całego repozytorium przy zmianach dotyczących pojedynczego modułu.

Przykład:

```tsx
const selected = chooseAlgorithm(
        trainerCase,
        algorithms.filter(
                algorithm => isAvailable(algorithm, stage)));

return (
    <TrainerSession
        stage={stage}
        algorithm={selected}
    />
);
```

## Typy i model kostki

- W module kostek używaj wspólnych typów `CubeFace`, `Edge`, `Corner`, `CubePiece`, `CubeFacelets` i `CubeMove` wszędzie, gdzie odpowiadają znaczeniu danych; nie zastępuj ich ponownie ogólnym `string`. Ich zakres i walidację opisują [notatki o smart kostkach](docs/agents/smart-kostki.md).
- Osie i kierunki obrotów opisuj enumami `Axis` i `RotationDirection`, zamiast przekazywać nieopisane liczby.
- Zamknięte listy ścianek i elementów zapisuj jako jawne tablice literałów, z których wyprowadzamy typy; nie odtwarzaj ich przez `.split(' ')`. Dane z zewnętrznych źródeł waliduj przed przekazaniem do modelu.
- Zasady trenażera, w tym orientację wizualizacji i grupowanie przypadków, opisuje [trenażer CFOP](docs/agents/trenazer-cfop.md).

## Dokumentacja i kontrakty

- Punktem wejścia jest [README](README.md) i [indeks dokumentacji](docs/README.md). Zachowuj zgodność notatek z `docs/wytyczne-interfejsu.md`.
- Po dodaniu, usunięciu albo zmianie połączenia sieciowego aktualizuj `docs/uzywane-api.md`, rozróżniając aktywne operacje od kontraktu tylko zadeklarowanego w kodzie.
- Źródłowy schemat GraphQL należy do backendu. Lokalny `schema.graphql` i operacje `.graphql` są wejściem do `npm run codegen`; nie poprawiaj ręcznie wygenerowanego `src/types.ts`.
- Zasady testów Playwrighta i wpływ na dane opisują `docs/testy-integracyjne-e2e.md` oraz `docs/agents/testy-e2e.md`. Wspólne wymagania fixture są w centrali, a implementacja scenariuszy pozostaje tutaj.

## Uwierzytelnianie podczas weryfikacji

- Bieżący przepływ chronionych tras wykorzystuje Keycloak; stosuj `docs/agents/uwierzytelnianie-keycloak.md`.
- Skrót logowania przez stary lokalny formularz (`slag`, dowolne niepuste hasło i OTP) dotyczy wyłącznie lokalnego backendu z implementacją deweloperską i jawnie otwartego starego formularza `/login`. Nie zastępuje uwierzytelniania Keycloak ani nie dotyczy produkcji.
