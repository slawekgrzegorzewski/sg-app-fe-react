# Trenażer CFOP

Strona `trainer` w aplikacji Kostki zawiera sekcje CROSS, F2L, OLL i PLL.
Katalog i wyniki mają źródło w backendzie; model oraz ręczne dodawanie przypadków
opisuje [dokument backendu](../../../sg-app/docs/agents/trenazer-cfop.md).

## Układ strony

Na desktopie trenażer wykorzystuje pełną dostępną szerokość i trzy panele:
kostka z mieszaniem oraz wybranym algorytmem, stoper z połączeniem smart kostki,
a także katalog lub historia prób. Prawy panel ma zakładki „Przypadki i algorytmy”
i „Historia”; dla CROSS pokazuje samą historię. Przełączenie zakładki nie zmienia
przypadku, wariantu ani filtra grupy. Długie listy przewijają się w panelu.
Historia zachowuje czas, datę, tryb, liczniki i sekwencje w zwartym układzie.

Wysokość obszaru pod paskiem aplikacji jest obliczana przez wspólny
`useViewportWorkspace`, używany również na stronie układania. Kostka korzysta
z wariantu `hero` wizualizatora. Na telefonie panele układają się w jedną kolumnę,
z pomiarem na początku. Połączenie, bateria i ustawienia kalibracji korzystają
ze wspólnego komponentu `SmartCube` w wariancie zwartym.

## Przebieg

Dla F2L–PLL użytkownik ręcznie wybiera przypadek i wariant. Tryb „Poznaj i wybierz”
służy wypróbowaniu wariantów, a „Ćwicz” zapisuje próby treningowe. Przycisk wyboru
do nauki utrwala preferencję, używaną jako domyślny wariant przy ponownym wejściu.
Zmiana przypadku i wariantu jest zablokowana od rozpoczęcia inspekcji lub próby
do zapisu, odrzucenia albo anulowania.

Każdy przypadek ma własny scramble od ułożonej kostki, wspólny dla wariantów.
Miniatury w liście wyboru przypadków i na kartach wariantów powstają lokalnie
ze scramble'a przez `cubing.js`. Wynik obliczenia jest współdzielony dla tego
samego scramble'a. Warianty przypadku pokazują ten sam stan początkowy.
F2L używa widoku trzech ścian skierowanego na nieułożony slot, OLL pokazuje
orientację górnej warstwy (żółte i szare naklejki), a PLL także kolory bocznych
pasków. Przyjęto biały krzyż na D i żółtą ścianę U. Miniatury nie wymagają
plików obrazów, dodatkowych pól API ani migracji bazy.
Ładowanie lub błąd podglądu nie blokują wyboru przypadku ani wariantu.

Stan odtwarza lokalne `cubing.js`; konwersja do URFDLB normalizuje kolory względem
środków i uwzględnia kolejność orbit biblioteki. Wizualizacja ćwiczeń F2L, OLL i PLL zaczyna
od odwróconej ułożonej kostki (`z2` przed scramble'em): żółta ściana jest u góry,
biały krzyż na dole, a zielona ściana z przodu. Z prawej jest pomarańczowa,
z lewej czerwona, z tyłu niebieska. Miniatury używają tej samej palety.
Dla smart kostki obrót widoku nakładamy po przekształceniu surowego stanu,
a ruch animacji przeliczamy do obróconego układu przez `R⁻¹ · M · R`.
Przy `z2` ruch urządzenia D (żółta ścianka) staje się U wizualizacji,
U staje się D, R i L zamieniają się miejscami, a F i B pozostają bez zmian.
Końcówki apostrofu i półobrotu zachowujemy. Ten sam przelicznik obowiązuje
przy synchronizacji pełnego stanu i animacji pojedynczego ruchu; inaczej
animacja i jej stan końcowy mogą wskazywać inną warstwę.
Nie zmienia to surowych ruchów urządzenia ani zapisywanej sekwencji.
Wizualizacja pokazuje stan początkowy, a po połączeniu smart kostki jej aktualne ścianki.

Scramble katalogowy `A` jest zapisany w układzie żółta U / biała D. Przed
porównaniem ze stanem urządzenia przeliczamy go jako `z2 A z2`; oba obroty
anulują zmianę położenia środków. W tym surowym układzie urządzenia biały krzyż
jest na U, więc F2L, OLL i PLL sprawdzają cel względem U i taką ściankę zapisują
w próbie. Wizualizacja i tekst algorytmu nadal używają układu katalogowego.
CROSS zachowuje wybór ścianki i dotychczasowy układ urządzenia.
Dla zadanej konfiguracji trenażera wystarcza zgodność aktualnych ścianek
ze stanem docelowym: po połączeniu z już wymieszaną kostką nie wymagamy
ponownego zaobserwowania wszystkich ruchów mieszania.

Dla CROSS aplikacja generuje mieszanie 3×3, a użytkownik wybiera ściankę krzyża.
Nie ma jeszcze katalogu CROSS ani oceny przez agenta.

## Sterowanie i cele

Zwykła kostka: spacja lub przycisk Start uruchamia pomiar, kolejna spacja lub Stop
go kończy. Użytkownik ocenia próbę i jawnie wybiera zapis lub odrzucenie.
Nie wpisuje sekwencji rozwiązania i nie otrzymuje wyliczonej liczby ruchów.

Smart kostka: po osiągnięciu zadanego stanu użytkownik potwierdza gotowość
przyciskiem lub spacją. Obowiązuje dotychczasowa inspekcja do 15 sekund:
pierwszy ruch albo koniec inspekcji uruchamia pomiar. Każdy ruch sprawdza cel:

- CROSS: cztery krawędzie krzyża wraz ze zgodnością z bocznymi środkami.
- F2L: krzyż i wszystkie cztery sloty.
- OLL: F2L i orientacja ostatniej warstwy.
- PLL: cała kostka ułożona, włącznie z końcowym AUF.

Osiągnięcie celu zatrzymuje pomiar na ostatnim ruchu. Przycisk „Zatrzymaj i oceń
próbę” pozwala zakończyć nieudaną próbę. Feedback pozostaje w UI; zapis wymaga
jawnej decyzji również przy nieosiągniętym celu. Rozłączenie podczas inspekcji lub
układania odrzuca bieżącą próbę.

Historia pokazuje ostatnie 100 prób etapu, z filtrem wybranego przypadku.
Porównanie wariantów wykorzystuje średnią z tej widocznej historii; nie jest to
średnia całej historii ani zestaw pełnych statystyk. Smart próby pokazują liczbę
ruchów, QTM i faktyczną sekwencję w układzie urządzenia, obok kopii wybranego
wariantu. Ocena nie wymaga ścisłej zgodności sekwencji z wariantem.

Katalog jest wypełniany migracją backendu z danych JPerma. Edycja katalogu
pozostaje poza UI.

## Grupy przypadków

F2L i OLL udostępniają filtr „Grupa przypadków” z opcją „Wszystkie grupy”.
Lista przypadków zawiera nagłówki grup. Wybór grupy wybiera pierwszy dostępny
przypadek i jego domyślny wariant; zmiana etapu przywraca wszystkie grupy.
Filtr jest zablokowany podczas próby. Przypadki z pustym `groupName` trafiają
do „Bez grupy”; gdy cały etap nie ma grup, filtr i nagłówki są ukryte.
Nazwy oraz przypisania pochodzą z katalogu backendu przez `CubeTrainerCase.groupName`.
OLL zachowuje 15 grup z katalogu JPerma, F2L sześć podgrup Basic F2L.
Nie oznaczają one obowiązkowej kolejności nauki.

## Data zapisu próby

`performedAt` wysyłamy w formacie scalara GraphQL `LocalDateTime` używanym przez
backend: `YYYY-MM-DD HH:mm:ss.SSS`, bez strefy czasowej, ze spacją między datą
a godziną. ISO z separatorem `T` jest przez ten scalar odrzucane przed wejściem
do serwisu. Ponowienie zachowuje oryginalny czas i UUID próby; na granicy zapisu
normalizujemy także separator starszej próby pozostającej w stanie komponentu.
