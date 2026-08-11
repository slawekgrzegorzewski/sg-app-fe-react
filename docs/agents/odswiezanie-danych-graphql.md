# Odświeżanie danych GraphQL po mutacjach

## Dochody i wydatki okresu rozliczeniowego

- Po mutacjach `CreateIncome` i `CreateExpense` należy odświeżyć zarówno `BillingPeriodQuery`, jak i `GetFinanceManagement` oraz zaczekać na zakończenie obu zapytań przez `awaitRefetchQueries: true`.
- `BillingPeriodQuery` zasila liczniki, podsumowania i listy kategorii w widoku miesięcy, natomiast `GetFinanceManagement` dostarcza aktualne salda i dane formularza. Odświeżenie tylko jednego z tych zapytań pozostawia część interfejsu w nieaktualnym stanie.
- Samo `client.clearStore()` nie zastępuje jawnego `refetchQueries`: czyści pamięć podręczną, ale nie gwarantuje ponownego pobrania aktywnego okresu rozliczeniowego przed zamknięciem formularza.

Test E2E tworzący dochód lub wydatek powinien zarejestrować oczekiwanie na oba zapytania przed zatwierdzeniem formularza. Dzięki temu sprawdza kontrakt odświeżania interfejsu i nie opiera się na ręcznym przeładowaniu strony.
