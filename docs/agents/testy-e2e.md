# Zasady testów E2E

## Środowisko i uruchamianie

- Testy pełnych przepływów użytkownika zapisujemy w katalogu `e2e/` i uruchamiamy przez Playwright w zainstalowanym Google Chrome.
- Zestaw ingerujący we wspólny stan wykonujemy szeregowo z jednym procesem roboczym. Nie włączamy automatycznych powtórek, ponieważ ponowna próba po częściowo wykonanej mutacji mogłaby zmienić znaczenie scenariusza albo powielić dane.
- Przy domyślnym adresie Playwright sam uruchamia frontend poleceniem `npm run start-dev-macos` na macOS albo `npm run start-dev` na pozostałych systemach i może wykorzystać istniejący serwer. Test oczekuje uruchomionego backendu. Jawne ustawienie `E2E_BASE_URL` oznacza frontend zarządzany zewnętrznie i wyłącza automatyczne uruchamianie lokalnego serwera.

## Interakcje z danymi

- Elementy tworzone wyłącznie na potrzeby sprawdzenia tworzenia, modyfikacji i usuwania otrzymują unikalną nazwę oraz są usuwane w bloku sprzątającym także po nieudanym sprawdzeniu.
- Scenariusz przenoszący powiązanie konta bankowego na konto testowe musi zapamiętać pierwotne konto i IBAN, a następnie odtworzyć powiązanie przed usunięciem danych testowych, również w ścieżce sprzątającej po błędzie.
- Scenariusz dochodów i wydatków używa dwóch widocznych kont. Po zapisaniu po dwóch operacjach każdego typu sprawdza zmianę liczników i podsumowań, zawartość dialogów wybranych kategorii oraz dokładne saldo każdego użytego konta. Weryfikację sald wykonuje przed opcjonalnym importem, aby import nie zaburzał oczekiwanych wartości.
- Scenariusz stopera zapisuje pięć deterministycznych czasów z użyciem zegara Playwrighta. Ostatni czas jest o `1 ms` krótszy od dotychczasowego rekordu, a pozostałe cztery są wolniejsze; pozwala to bez oczekiwania w czasie rzeczywistym sprawdzić licznik, średnią, nowy rekord, Ao5 oraz miesięczne i dzienne statystyki.
- Każda mutacja GraphQL musi być zweryfikowana co najmniej przez status odpowiedzi i brak pola `errors`. Jeżeli interfejs pokazuje rezultat operacji, sprawdzamy również ten widoczny skutek.
- Operacje nieodwracalne albo wpływające na dalsze scenariusze, takie jak zakończenie okresu rozliczeniowego, umieszczamy na końcu szeregowego zestawu.
- Brak danych opcjonalnych, na przykład transakcji oczekujących na import, wolno potraktować warunkowo tylko wtedy, gdy wymaganie dopuszcza taki stan. Powód zapisujemy w konsoli oraz adnotacjach raportu; pozostałych błędów i brakujących danych wymaganych nie ukrywamy.
- Scenariusze destrukcyjne muszą jasno dokumentować swój wpływ na dane. Nie należy uruchamiać ich przypadkowo jako części obserwowanych testów jednostkowych.
