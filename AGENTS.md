# Instrukcje projektowe

## Utrzymywanie wiedzy projektowej

Jeżeli podczas pracy zostanie ustalona nowa trwała decyzja, konwencja albo ograniczenie implementacyjne specyficzne dla tego projektu, przed zakończeniem zadania zapisz je w odpowiednim pliku Markdown w katalogu `docs/agents/`.

- Zaktualizuj istniejący dokument tematyczny, jeżeli obejmuje dane zagadnienie; w przeciwnym razie utwórz nowy dokument tematyczny.
- Zapisuj wynikającą z ustaleń regułę i jej uzasadnienie, a nie chronologiczny zapis rozmowy ani tymczasowe szczegóły analizy.
- Utrzymuj zgodność tych notatek z implementacją i nadrzędną dokumentacją projektu, taką jak `docs/wytyczne-interfejsu.md`.
- Nie powielaj informacji, które zostały już jasno opisane w `docs/agents/`; w razie potrzeby odsyłaj do nadrzędnego dokumentu projektowego.

## Analiza kodu po zmianach

Po każdej zmianie uruchom analizę kodu dla wszystkich zmodyfikowanych plików, korzystając z inspekcji IDE, lintera albo innego narzędzia właściwego dla danego typu pliku.

- Popraw wykryte problemy, które są oczywiste, proste do usunięcia i nie wymagają decyzji projektowej ani ryzykownej zmiany zachowania.
- Nie wyciszaj ostrzeżeń ani nie wprowadzaj szerokich refaktoryzacji wyłącznie po to, aby uzyskać pusty raport analizy.
- Jeżeli problemu nie można bezpiecznie poprawić w zakresie bieżącego zadania, pozostaw kod bez zmian i krótko opisz problem w podsumowaniu.

## Zamykanie terminala po wykonaniu polecenia

Po każdym użyciu narzędzia `@webstorm/execute_terminal_command` zamknij utworzone albo wykorzystane przez nie okno terminala. Nie pozostawiaj w IDE otwartych okien terminala po zakończeniu polecenia, niezależnie od tego, czy polecenie zakończyło się powodzeniem, błędem, czy przekroczeniem limitu czasu.

## Korzystanie z MCP IntelliJ

Korzystaj z MCP wystawionego przez IntelliJ IDEA, skonfigurowanego w `.codex/config.toml`, do analizy projektu, wyszukiwania symboli i odwołań, inspekcji oraz budowania i uruchamiania testów. Gdy narzędzie IntelliJ MCP zapewnia daną funkcję, preferuj je przed poleceniem powłoki.

## Język dokumentacji

Cała dokumentacja projektowa, w tym `AGENTS.md` oraz pliki w katalogach `docs/` i `docs/agents/`, musi być pisana po polsku.

- Pozostawiaj bez tłumaczenia kod źródłowy, identyfikatory, nazwy API, nazwy własne i techniczne wartości wymagane przez narzędzia.
- Nowym dokumentom nadawaj polskie nazwy plików, o ile nie istnieje techniczny wymóg użycia konkretnej nazwy angielskiej.
- Przy aktualizowaniu istniejącego dokumentu popraw także napotkane angielskie fragmenty, które nie są terminami technicznymi.

## Informacja zwrotna o języku angielskim

Jeżeli użytkownik napisze w poleceniu tekst konwersacyjny po angielsku, na końcu odpowiedzi dodaj krótką sekcję `Ocena języka angielskiego`, która pomoże mu w nauce.

- Jeśli angielski jest poprawny i naturalny, krótko to zaznacz.
- Jeśli tekst można poprawić, podaj poprawioną wersję oraz jedno lub dwa zwięzłe objaśnienia najważniejszych poprawek.
- Oceniaj tekst użytkownika napisany językiem naturalnym, a nie kod źródłowy, identyfikatory, ścieżki plików, logi ani cytowane teksty osób trzecich.
- Traktuj tę sekcję jako dodatek do głównego zadania; nie może ona opóźniać ani przerywać realizacji polecenia.

## Logowanie do lokalnej aplikacji podczas weryfikacji w przeglądarce

Jeżeli weryfikacja lokalnej wersji aplikacji (`localhost`) w przeglądarce wymaga uwierzytelnienia:

- Użyj `slag` jako loginu.
- Jako hasło i kod jednorazowy podaj dowolne niepuste ciągi znaków; wersja deweloperska nie weryfikuje tych wartości.
- Ten skrót dotyczy wyłącznie lokalnego środowiska deweloperskiego. Nie zakładaj, że działa ani że wolno go stosować w innym środowisku.
