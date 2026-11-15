# Formatowanie TypeScript i TSX

Źródłem zasad jest [AGENTS.md](../../AGENTS.md). Preferowany styl TypeScript
nawiązuje do pionowego formatowania stosowanego w Javie, z opisanymi niżej
wyjątkami dla prostych argumentów i tablic.

## Stan automatyzacji

W drzewie roboczym brakuje obecnie `.editorconfig`, `tools/eslint-style.cjs`
oraz plików lokalnej wtyczki `tools/eslint-plugin-sg-format`. `package.json`
nadal odwołuje się do tej konfiguracji, dlatego projektowy ESLint nie startuje.
Poniższy opis przedstawia wymaganą konfigurację po jej przywróceniu; same
instrukcje nie zapewniają automatycznego formatowania w WebStormie.
Brak konfiguracji nie znosi ustalonych reguł stylu.

## Reguły i docelowa konfiguracja

Proste argumenty (literały, zmienne, odczyty właściwości) pozostają w jednym
wierszu, jeśli mieszczą się w 120 znakach. Wywołania metod, konstruktory,
łańcuchy wywołań, lambdy, obiekty i inne złożone argumenty wymuszają pionowy
układ całej listy, również dla pojedynczego argumentu. Deklaracje funkcji
z wieloma parametrami są pionowe. Bloki mają wcięcie 4 spacji, kontynuacje 8,
a atrybuty i dzieci JSX 4 spacji względem poziomu nadrzędnego.
Tablice z co najmniej dwoma elementami zawierające złożone wyrażenia mają każdy element w osobnym wierszu,
z wcięciem o 4 spacje i nawiasem `]` w osobnym wierszu. Krótkie tablice prostych
wartości mogą pozostać w jednym wierszu. WebStorm ma ustawienie
`array_initializer_wrap = normal`, a pionowy układ tablic ze złożonymi elementami
wymusza reguła ESLinta `sg-format/vertical-arrays`.
Tablica z jednym elementem może pozostać w jednym wierszu, również dla złożonego
elementu, np. `[...piece]` lub `[makeValue()]`.
Argumenty wywołań mają osobne ustawienie `call_parameters_wrap = normal`, więc
np. `hex.slice(0, 8)` pozostaje w jednym wierszu.

```ts
const padded = text.padStart(2, '0');
const prefix = hex.slice(0, 8);
const selected = choose(
        current,
        findAlternative(options));
```

WebStorm odczytuje `.editorconfig` przy zwykłym przeformatowaniu kodu.
Rozróżnienie złożoności argumentów zapewnia lokalna wtyczka ESLinta;
sam formatter IDE nie ma takiej opcji. Po przeformatowaniu używamy akcji
**Fix ESLint Problems**. W ustawieniach **Languages & Frameworks → JavaScript →
Code Quality Tools → ESLint** wybieramy **Automatic ESLint configuration**
oraz **Run eslint --fix on save**, aby ostatni etap wykonywał się przy zapisie.
ESLint domyka również różnice w formatowaniu JSX względem natywnego formattera.

Prettier ignoruje pliki TypeScript, więc nie składa ponownie złożonych wywołań.
Może nadal formatować pliki innych typów. Instalacja `npm install` rejestruje
lokalną wtyczkę z katalogu `tools/eslint-plugin-sg-format`, bez pobierania jej
z zewnętrznego rejestru.

Wybrane pliki:

```sh
npx eslint --fix src/cubes/trainer/TrainerSession.tsx
```

Cały frontend:

```sh
npm run format
npm run format:check
npm run test:format
```

Reguły stylu są ostrzeżeniami, żeby dotychczasowe formatowanie nie blokowało
uruchomienia aplikacji. `format:check` odrzuca także ostrzeżenia. Starszy kod może
wymagać przeformatowania; konfiguracja nie uruchamia masowej zmiany istniejących
plików. Pliki generowane i biblioteka `cubing` są wyłączone z nowych reguł stylu.

Testy wtyczki sprawdzają wynik i idempotencję formatowania, zachowanie komentarzy,
sygnatury TypeScript, konstruktory, lambdy, ternary, operatory logiczne i JSX.
