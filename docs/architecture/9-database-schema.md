# 9. Database Schema

MVP bez jakiejkolwiek bazy danych ani cache. Brak trwałego przechowywania danych.

## 9.1 Założenia

- Brak przechowywania PII oraz plików audio.
- Dane przetwarzane wyłącznie w trakcie obsługi żądania (request-scope).
- Brak KV/Redis i brak lokalnych cache metadanych w MVP.

## 9.2 Retencja i prywatność

- Po zakończeniu żądania dane są odrzucane; brak retencji.
- Rate limiting rozważany w przyszłości – patrz **Future Enhancements**.

## 9.3 Konfiguracja

- Brak flag/zmiennych ENV związanych ze storage (usuwamy `ENABLE_KV`, `KV_*`).

---
