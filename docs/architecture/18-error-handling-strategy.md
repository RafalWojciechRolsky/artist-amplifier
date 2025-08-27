# 18. Error Handling Strategy

Spójny model błędów między BFF i FE; jasne kody i komunikaty dla użytkownika; logi z `requestId`.

## 18.1 Standard błędów (ApiError)

Używamy jednego formatu (sekcja 5.3):

```ts
interface ApiError {
	error: {
		code: string; // INVALID_INPUT | PROVIDER_ERROR | INTERNAL_ERROR
		message: string; // zrozumiały komunikat dla użytkownika
		timestamp: string; // ISO 8601
	};
}
```

## 18.2 Backend (BFF): mapowanie i zasady (MVP)

- Błędne dane → 400 `INVALID_INPUT`
- Błąd dostawcy → 502 `PROVIDER_ERROR`
- Błąd serwera → 500 `INTERNAL_ERROR`
- Podstawowy `timestamp` w odpowiedzi.

## 18.3 Frontend: prezentacja (MVP)

- Komponent `ErrorBanner` renderuje `ApiError.error.message`.
- Przycisk "Spróbuj ponownie" po błędzie.
- Komunikaty inline (aria-live=polite).

## 18.4 Błędy (MVP)

Podstawowy przepływ: błąd → ErrorBanner → "Spróbuj ponownie"

## 18.5 Komunikaty i i18n (minimal)

- Komunikaty krótkie, nietechniczne. Dłuższe detale tylko w `details`/logach.
- Wersje językowe PL/EN (spójne z `UILanguage`).

---
