# Inteligentne kostki 3×3

Listy ścianek, krawędzi i narożników oraz wyprowadzone z nich typy `CubeFace`,
`Edge`, `Corner` i `CubePiece` mają wspólne źródło w `src/cubes/cube-pieces.ts`.
Korzystają z niego model ruchów, konwersja danych `cubing.js`, sprawdzanie celu
treningu i miniatury. Kolejność list odpowiada dotychczasowemu zapisowi orbit;
`faceletIndicesForPiece` przyjmuje tylko kanoniczne oznaczenia z tych list.

Pełny zapis 54 naklejek ma typ oznaczony `CubeFacelets` z `src/cubes/cube-facelets.ts`.
Pozostaje stringiem w kolejności URFDLB. `parseCubeFacelets` sprawdza długość
oraz dozwolone litery, a `isCubeFacelets` pozwala zweryfikować odczyt urządzenia
bez rzucania wyjątku. Typ obejmuje model ruchów, konwersje, nagrania i stan UI;
nie gwarantuje fizycznej osiągalności stanu kostki.

Podstawowy ruch ścianki 3×3 ma typ `CubeMove` z `src/cubes/cube-move.ts`:
`CubeFace` z opcjonalnym sufiksem `'` lub `2`. `parseCubeMove` weryfikuje ruchy
odczytane ze smart kostki i parsowane ze scramble’a przed użyciem w modelu.
Surowe zdarzenia biblioteki zachowują typ zewnętrzny. Typ nie obejmuje ruchów
szerokich, warstw środkowych ani rotacji z algorytmów trenowania.

Typy wspólne stosujemy w całym przepływie danych, w tym w argumentach,
wynikach, stanie React i nagraniach. Walidacja odbywa się przy przejściu
od zewnętrznego tekstu do modelu. Zawężenie `as CubeFace[]` po rozbiciu
`CubePiece` albo `CubeFacelets` jest uzasadnione ich definicją; nie zastępuje
walidacji danych z urządzenia. Sama tablica `CubeFace[]` nie gwarantuje
54 elementów, a fragment ścianki nie jest pełnym `CubeFacelets`.

Nazwy kwaternionów mają rozróżniać orientację przesłaną przez GAN, orientację
względem próbki początkowej i obrót między próbkami. Dla danych sensora stosujemy
nazwy w rodzaju `ganSensorOrientation`, unikając mylącego `sensorRelative`.

Ekran układania korzysta z `smartcube-web-bluetooth` i wymaga przeglądarki obsługującej Web Bluetooth oraz bezpiecznego kontekstu. Integracja porównuje odczytane ścianki w kolejności URFDLB z kolejnymi stanami scramble'a obliczanymi od ułożonej kostki. Przed rozpoczęciem mieszania stan fizycznej kostki i stan zgłaszany przez urządzenie muszą być zgodne.

## Układ strony układania

Na desktopie strona wykorzystuje pełną szerokość: duży podgląd kostki i scramble
zajmują lewy panel, stoper i połączenie smart kostki panel środkowy,
a wyniki dnia prawy. Wysokość paneli dopasowuje się do miejsca pod paskiem
aplikacji; dodatkowe dane przewijamy wewnątrz paneli.
Podsumowanie dnia obejmuje liczbę ułożeń, średnią, najlepszy czas i stronicowaną
listę wyników. Na mniejszych ekranach panele tworzą jedną kolumnę ze stoperem
na początku. Pomiary można obsługiwać spacją oraz widocznymi przyciskami;
po pomiarze zapis i odrzucenie są dostępne również na desktopie.
Mobilny gest przytrzymania i pełnoekranowy pomiar pozostają dostępne.

`CubingVisualizer` ma opcjonalny wariant `hero`, używany na stronie układania
i w trenażerze CFOP; domyślny rozmiar innych wizualizacji pozostaje bez zmian.
Oba widoki korzystają ze wspólnego `useViewportWorkspace` do dopasowania wysokości.
Dane GYRO są w rozwijanym panelu. Ustawienia kalibracji położenia na głównej
stronie i w trenażerze są początkowo zwinięte.

## Bateria smart kostki

Po połączeniu pokazujemy procent baterii z eventu `BATTERY`. Jeżeli urządzenie
zgłasza `capabilities.battery`, wysyłamy `REQUEST_BATTERY` po połączeniu i co
60 sekund. Rozłączenie lub odmontowanie komponentu zatrzymuje odświeżanie,
a ponowne połączenie usuwa poprzedni odczyt. Wartości spoza 0–100 oraz
niefinitywne są pomijane; do 20% wskaźnik wyróżnia niski poziom.
Brak obsługi lub błąd żądania pokazuje „Bateria: brak odczytu” i nie przerywa
połączenia ani pomiaru. Stan baterii nie jest zapisywany w nagraniu ułożenia.

Gdy biblioteka nie ustali wymaganego adresu MAC z danych urządzenia ani z pamięci przeglądarki, ekran prosi o jego ręczne wpisanie. Biblioteka zapisuje adres w `localStorage` dopiero po zweryfikowaniu połączenia; zapis jest osobny dla przeglądarki i adresu aplikacji, a jego utrata może wymagać ponownego wpisania.

Po odczytaniu stanu połączonej kostki wizualizacja 3D przedstawia jej aktualne ścianki, również gdy była wymieszana przed połączeniem. Ruchy aktualizują istniejący model, zachowując obrót widoku. Po rozłączeniu lub utracie stanu wizualizacja wraca do wyświetlania wpisanego scramble'a.

Pojedynczy rozpoznany obrót jest animowany od poprzedniego stanu. Przy szybkim odbiorze kolejnego ruchu widok rozpoczyna go ze znanego stanu pośredniego, a gdy nie da się jednoznacznie odtworzyć pojedynczego ruchu, synchronizuje się z najnowszym stanem bez animowania pominiętych obrotów. Dzięki temu opóźnione animacje nie zmieniają wyniku pomiaru ani nie pozostawiają nieaktualnego widoku.

Potwierdzenie scramble'a uruchamia lokalny solver `cubing.js` dla stanu kostki z chwili potwierdzenia, równolegle z inspekcją. Odwrócone rozwiązanie opisuje ten stan niezależnie od historii mieszania. Przed wpisaniem do pola wynik jest sprawdzany przez ponowne wykonanie ruchów od stanu ułożonego i ograniczany do 30 ruchów. To równoważny algorytm, a nie koniecznie oryginalna sekwencja ani losowy scramble zawodniczy. Reset lub rozłączenie unieważnia wynik obliczeń; podczas zapisu aplikacja czeka na ich zakończenie i przekazuje scramble wraz z wynikiem przez `StoreCubeResult`.

Po wykonaniu mieszania z ułożonej kostki użytkownik potwierdza gotowość spacją lub przyciskiem na urządzeniu dotykowym; mieszanie może być zgodne z wyświetlonym algorytmem albo dowolne. Po podłączeniu smart kostki spacja w stanie spoczynku nie uruchamia ręcznego stopera, dzięki czemu nie rozpoczyna pomiaru przed potwierdzeniem scramble'a. Potwierdzenie rozpoczyna 15-sekundową inspekcję, a pierwszy ruch albo upływ tego czasu rozpoczyna pomiar. Stan ułożony kończy pomiar. Czas jest mierzony zegarem przeglądarki przy odbiorze zdarzeń, więc opóźnienia Bluetooth i odzyskane ruchy mogą wpływać na dokładność. Rozłączenie podczas inspekcji lub pomiaru powoduje jego odrzucenie. Obsługiwane są podstawowe ruchy ścianek 3×3 (`U`, `R`, `F`, `D`, `L`, `B` z opcjonalnym `2` lub `'`).

Czas wyliczony ze znaczników ruchów kostki, od pierwszego do ostatniego ruchu, jest prezentowany informacyjnie wraz z różnicą względem zapisywanego czasu po zakończeniu pomiaru. Dodatnia różnica oznacza, że czas kostki jest dłuższy. Zapis nadal wykorzystuje dotychczasowy pomiar zegarem przeglądarki, w tym czas od końca inspekcji, jeśli minęła przed pierwszym ruchem.

Gdy kostka wysyła zdarzenia `GYRO`, wizualizacja obraca scenę na podstawie kwaternionu, skalibrowanego względem pierwszego poprawnego odczytu po połączeniu. Przycisk resetu pozwala ponownie skalibrować położenie względem ostatniego odczytu, gdy użytkownik trzyma zieloną ściankę do przodu, a białą do góry; przycisk jest dostępny po otrzymaniu danych żyroskopu. Reset ustawia widok na wysokości środka kostki z niewielkim podglądem prawej ścianki, a użytkownik może później ręcznie obrócić kamerę. Oba widoki korzystają z tej samej kalibracji; po rozłączeniu przywracany jest zwykły widok. Integracja wykorzystuje eksperymentalny dostęp `cubing.js` do sceny 3D oraz przekształcenie osi z przykładu GAN, dlatego zgodność osi innych modeli wymaga sprawdzenia na urządzeniach. Ręczny obrót kamery pozostaje dostępny.

Po potwierdzeniu scramble'a frontend zbiera surowe zdarzenia `MOVE` i `GYRO` do zakończenia układania, zachowując ich oryginalne pola, czas odbioru `performance.now()`, `performance.timeOrigin`, początkowy stan ścianek, ostatnią dostępną próbkę żyroskopu sprzed inspekcji oraz momenty inspekcji i startu. Dane żyroskopu umożliwiają późniejszą analizę obrotów, ale same obroty nie są klasyfikowane. Zakończony zapis można pobrać jako JSON przed resetem lub zapisem wyniku. Przy zapisie wyniku `StoreCubeResult` przesyła go w opcjonalnym polu `recording` jako tekst JSON. Backend zapisuje go razem z wynikiem w kolumnie `cube_record.recording` typu `jsonb`; starsze i ręczne wyniki nie wymagają raportu. Nieudany zapis zachowuje raport do ponowienia próby. Backend akceptuje obiekt wersji 1 z tablicą `events`, do 5 milionów znaków. Raport nie jest pobierany przez zapytania list i statystyk. Anulowanie i przerwanie połączenia w trakcie próby odrzuca jej nagranie.

Po podłączeniu smart kostki główny widok pokazuje panel GYRO obok wizualizacji (na telefonie pod nią). Panel prezentuje surowy kwaternion `w/x/y/z` oraz opcjonalną prędkość obrotową `x/y/z`, przed normalizacją i kalibracją widoku. Odczyt panelu odświeża się co 100 ms niezależnie od głównego ekranu; nagranie nadal zachowuje wszystkie zdarzenia. Przed pierwszą próbką widoczny jest komunikat oczekiwania, a po rozłączeniu panel znika i odczyt jest czyszczony.

## Wspólna sesja Bluetooth

`SmartCubeSessionProvider` jest właścicielem połączenia w module Kostki,
powyżej stron Kostki, Trenażer i Statystyki. Jego klucz zawiera konto i domenę.
Zmiana strony lub etapu CROSS/F2L/OLL/PLL odmontowuje jedynie lokalny panel:
Bluetooth pozostaje aktywny, bez ponownego wyboru urządzenia i pytania o MAC.
Wyjście z modułu, zmiana konta lub domeny oraz ręczne „Rozłącz” zamykają sesję.
Odświeżenie karty nadal wymaga ponownego połączenia. Aplikacja nie zapobiega
rozłączeniu przez urządzenie, przeglądarkę lub system operacyjny.

`SmartCubeSession` odbiera strumień urządzenia przez jedną subskrypcję i zachowuje
aktualny stan ścianek, baterię, ostatnią poprawną próbkę GYRO i punkt kalibracji.
Aktualizuje stan ruchami również wtedy, gdy żaden ekran pomiaru nie jest
zamontowany. Nowy panel otrzymuje bieżący stan, a nie historię zdarzeń MOVE.
Kalibracja pozostaje wspólna. Odczyty baterii są odświeżane przez aktywny panel;
podczas oglądania samych statystyk zachowujemy ostatni znany wynik.

Inspekcja, stoper, ukończone nagranie i niesfinalizowana próba należą do ekranu,
nie do połączenia. Przy odmontowaniu anulujemy lokalny timer i subskrypcję;
nowy ekran nie przejmuje próby ani nie zapisuje jej ruchów ponownie. Zmiana
etapu w trenażerze pozostaje zablokowana podczas aktywnej próby. Utrata Bluetooth
anuluje aktywny pomiar tak jak wcześniej; ponowne połączenie jest jawne.

Testy sesji i providera sprawdzają jedno połączenie przy nawigacji, odczyt
zmienionej kostki po powrocie ze statystyk, zachowanie baterii, anulowanie
starej inspekcji, ręczne i fizyczne rozłączenie oraz spóźnione zakończenie
łączenia po opuszczeniu modułu.
