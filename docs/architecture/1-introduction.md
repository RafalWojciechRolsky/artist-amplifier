# 1. Introduction

Ten dokument definiuje pełnostosową (full‑stack) architekturę dla projektu Artist Amplifier jako MVP typu single‑page, single‑screen. Celem jest dostarczenie jednego, mierzalnego rezultatu: edytowalnego opisu prasowego na podstawie minimalnych danych artysty i pojedynczego pliku audio.

- UI pozostaje responsywne; wskaźniki postępu podczas generowania. Brak twardego limitu czasu po stronie UI (NFR1) — analiza może trwać do kilku minut; dla MVP realizujemy synchroniczny przepływ (jedno żądanie oczekujące ~1–2 min po stronie BFF).
- Prywatność: brak logowania i baz użytkowników; brak trwałego przechowywania danych. Wszystkie dane przetwarzane w pamięci/tymczasowo i usuwane po sesji (NFR2).
- Użyteczność: cały przepływ na jednym ekranie (single page, single screen) (NFR3).
- Kompatybilność: przyjmowane formaty .mp3/.wav do 50 MB; walidacja i czytelne komunikaty błędów (NFR4).
- Integracje zewnętrzne (analiza audio, LLM): bezpośrednio z klienta, gdy bezpieczne; minimalny BFF wyłącznie jeśli konieczny (ochrona kluczy, CORS, limity). Zasada YAGNI.

Starter Template / Existing Project: N/A — Greenfield project.

---
