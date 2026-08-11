# Wytyczne interfejsu użytkownika

Ten dokument opisuje zasady przyjęte podczas przebudowy stron Kostek, Okresów rozliczeniowych, Kont, Pożyczek i Ustawień. Należy traktować go jako checklistę przy tworzeniu oraz modernizacji kolejnych widoków.

## Układ strony

- Główna zawartość powinna być wyśrodkowana i mieć ograniczoną szerokość. Dla standardowych widoków używamy `maxWidth: 960px`.
- Odstępy powinny być responsywne: mniejsze na telefonie i większe od breakpointu `sm`.
- Tytuł strony powinien używać spójnej hierarchii nagłówków, zwykle `Typography` z wariantem `h3`.
- Sekcje grupujemy w obramowanych komponentach `Paper`. Nagłówek sekcji powinien zawierać nazwę oraz, jeśli ma to sens, lekki `Chip` z liczbą elementów.
- Na dużym ekranie powiązane sekcje mogą znajdować się obok siebie, a na telefonie powinny układać się w jedną kolumnę.
- Nie stosujemy sztywnych szerokości, jeśli mogą powodować przewijanie strony na urządzeniach mobilnych.

## Listy i prezentacja danych

- Elementy list powinny być zwarte, czytelne i oddzielone separatorami albo własnymi kartami.
- Najważniejsza informacja ma być wizualnie pierwsza, a dane pomocnicze powinny używać słabszego koloru tekstu.
- Pokazujemy liczbę wszystkich, aktywnych lub ukrytych elementów, jeśli pomaga to zrozumieć zawartość strony.
- Pusta lista musi mieć jawny, przyjazny komunikat zamiast pozostawienia pustej przestrzeni.
- Długie nazwy, adresy i identyfikatory nie mogą rozszerzać widoku; stosujemy m.in. `overflowWrap: 'anywhere'`.
- Tabele, których nie da się sensownie dostosować do urządzeń mobilnych, umieszczamy w kontenerze z poziomym przewijaniem.
- Daty i liczby prezentujemy zgodnie z polską lokalizacją. Dla liczb finansowych warto stosować cyfry tabelaryczne.

## Przyciski i akcje

- Główna akcja strony lub sekcji powinna być łatwa do znalezienia i mieć etykietę tekstową.
- Na telefonie ważne przyciski mogą zajmować całą dostępną szerokość.
- Małe akcje przy pojedynczym wierszu mogą być ikonami, ale każda musi mieć `Tooltip` i jednoznaczny `aria-label`.
- Ikony akcji powinny być niewielkie i mieć wystarczający odstęp, aby nie wyglądały jak jeden przycisk.
- Kolory akcji muszą pochodzić z motywu. Kolor błędu wykorzystujemy wyłącznie do działań destrukcyjnych, a kolor sukcesu do pozytywnego statusu lub zatwierdzenia.
- Nie używamy wielkich liter w etykietach, jeżeli nie wymaga tego nazwa własna.

## Formularze i dialogi

- Formularze otwierane w dialogach używają zwartej prezentacji pól (`presentation: 'dialog'`) i pól o pełnej szerokości.
- Standardowy dialog formularza ma rozsądną maksymalną szerokość, zazwyczaj `sm`, oraz poprawnie działający układ mobilny.
- Nagłówek dialogu zawiera konkretny tytuł oraz przycisk zamknięcia `X`.
- Treść i akcje dialogu powinny być wizualnie rozdzielone.
- Tytuły i etykiety zatwierdzenia muszą opisywać rzeczywistą operację, np. „Dodaj konto”, a nie ogólne „OK”.
- Dialog można anulować przyciskiem, znakiem `X`, klawiszem Escape oraz kliknięciem poza nim, o ile formularz nie wymaga świadomego zabezpieczenia niezapisanych danych.
- Zamknięcie formularza otwartego z dialogu nadrzędnego powinno przywracać dialog nadrzędny, jeśli taki przepływ rozpoczął operację.
- Potwierdzenie działania destrukcyjnego jasno wskazuje element i konsekwencje operacji. Przycisk zatwierdzający używa koloru błędu.
- Pola daty powinny wizualnie pasować do pozostałych pól formularza i korzystać z polskiej lokalizacji.
- Wartości pól pozostają kontrolowane przez cały cykl życia komponentu; początkowa wartość nie może zmieniać się z `undefined` na wartość zdefiniowaną.

## Stany widoku

- Ładowanie sygnalizujemy wspólnym komponentem `LoadingIndicator`.
- Błąd pobierania danych pokazujemy przez `ErrorDisplay`, wraz z możliwością ponowienia operacji, jeśli jest dostępna.
- Stan pusty opisuje, czego brakuje i — jeśli to możliwe — wskazuje akcję pozwalającą dodać pierwszy element.
- Operacja w toku blokuje jedynie kontrolki, których ponowne użycie mogłoby wysłać tę samą operację drugi raz. Edytowanie jednego pola nie może niepotrzebnie blokować całego formularza.

## Responsywność

- Każdy zmieniany widok sprawdzamy co najmniej na szerokości dużego ekranu i typowego telefonu.
- Na urządzeniu mobilnym najważniejsza zawartość oraz akcje muszą być widoczne bez poziomego przewijania strony.
- Elementy dotykowe muszą mieć wygodny obszar interakcji, nawet jeśli sama ikona pozostaje mała.
- Zmiana stanu nie powinna przesuwać aktywnego obszaru spod palca ani powodować zaznaczenia całej strony.
- Po operacji wymagającej decyzji użytkownika przewijamy widok tak, aby przyciski akcji były w pełni widoczne, jeśli inaczej znalazłyby się poza ekranem.

## Dostępność

- Zachowujemy poprawną hierarchię nagłówków i semantyczne regiony strony.
- Dialog ma dostępny tytuł powiązany przez `aria-labelledby`.
- `label` pola formularza wskazuje jego `id`, a nie `name`.
- Dostępna nazwa kontrolki powinna odpowiadać widocznej etykiecie.
- Wszystkie akcje mają być dostępne z klawiatury, a fokus musi być widoczny.
- Nie opieramy znaczenia wyłącznie na kolorze.
- Element klikalny powinien być natywnym przyciskiem lub linkiem, a nie `div` z obsługą kliknięcia.

## Motyw i współdzielone komponenty

- Korzystamy z tokenów motywu (`palette`, `spacing`, `shape`) zamiast wpisywania kolorów i wymiarów niezależnych od reszty aplikacji.
- Nowy motyw powinien być samodzielny i nie importować ustawień innego motywu tylko po to, aby odziedziczyć brakującą konfigurację.
- Preferujemy istniejące komponenty współdzielone, w szczególności `FormDialog`, `ConfirmationDialog`, `ErrorDisplay`, `LoadingIndicator` i wariant ustawień `SimpleCrudList`.
- Rozszerzenie komponentu współdzielonego nie może zmieniać wyglądu dotychczasowych użyć bez jawnego wybrania nowego wariantu.

## Nawigacja i `DrawerAppBar`

- Aktualnie wybrana strona musi być wizualnie wyróżniona na dużym ekranie i w menu mobilnym. Kontrolka aktywnej strony powinna mieć również `aria-current="page"`.
- Pasek powinien zachowywać czytelną hierarchię: nazwa aplikacji jest elementem nadrzędnym, strony są nawigacją, a użytkownik, domena i motyw są kontrolkami pomocniczymi.
- Wygląd `DrawerAppBar` nie może zależeć od sprawdzania identyfikatora konkretnego wariantu motywu. Komponent korzysta z semantycznych kolorów i pozostałych tokenów aktywnego motywu.
- Mobilny panel boczny zajmuje pełną wysokość, ma spójne tło, nagłówek i widoczny przycisk zamknięcia.
- Pozycje menu mobilnego muszą mieć wygodny obszar dotykowy. Aktywna pozycja jest jednoznacznie zaznaczona i nie polega wyłącznie na zmianie koloru tekstu.
- Rozwijane sekcje użytkownika, aplikacji i domeny pokazują ikonę kierunku oraz ustawiają `aria-expanded` i `aria-controls`.
- Kontrolki otwierające menu aplikacji, domeny, użytkownika lub wariantu motywu powinny komunikować stan przez `aria-haspopup` i `aria-expanded`.
- Etykiety dostępności są napisane po polsku i opisują działanie, np. „Otwórz menu”, „Zmień tryb motywu” i „Zmień wariant motywu”.
- Akcje przy zaproszeniach do domen są prawdziwymi przyciskami z `Tooltip` i jednoznacznym `aria-label`. Nie używamy elementów układu, takich jak `Grid`, jako kontrolek klikanych.
- Pasek zaproszeń jest responsywny i nie korzysta ze stałej szerokości, która może rozszerzyć ekran telefonu.
- Podczas pobierania danych domen nie pozostawiamy pustego ekranu. Pokazujemy `LoadingIndicator` albo zachowujemy szkielet paska z lokalnym wskaźnikiem ładowania.
- Przyklejony `AppBar` nie może powodować poziomego przepełnienia ani zasłaniać treści po nawigacji i przewijaniu.

## Weryfikacja zmiany

Po zakończeniu pracy należy:

1. Obejrzeć widok na dużym ekranie i urządzeniu mobilnym.
2. Przejść wszystkie zakładki oraz dialogi, w tym zamknięcie przyciskiem, `X`, Escape i kliknięciem w tło.
3. Sprawdzić stany ładowania, błędu i pustej listy, jeśli można je bezpiecznie odtworzyć.
4. Sprawdzić konsolę przeglądarki pod kątem nowych błędów i ostrzeżeń.
5. Uruchomić testy, TypeScript i ESLint.
6. Przejrzeć diff, aby upewnić się, że zmiana nie objęła niezwiązanych plików.
7. Nie wykonywać destrukcyjnych operacji na rzeczywistych danych tylko w celu wizualnej weryfikacji.
