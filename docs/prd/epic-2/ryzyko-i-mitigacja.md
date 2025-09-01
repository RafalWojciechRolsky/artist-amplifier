# Ryzyko i mitigacja
- Limity/awarie dostawców → retry/backoff, `ApiError` ze standardowym kształtem i minimalnym komunikatem.
- Sekrety/ENV → walidacja w 2.4; brak ekspozycji w kliencie; użycie Secret Manager na prod.
- Rollback: revert + poprzedni build (Vercel).
