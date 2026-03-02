-- Wellbeing-Werte wurden bisher auf einer 0-10-Skala erfasst.
-- Umstellung auf 0-100: bestehende Datensätze einmalig hochskalieren.
UPDATE "Wellbeing"
SET
  "sleep" = "sleep" * 10,
  "energy" = "energy" * 10,
  "stress" = "stress" * 10,
  "motivation" = "motivation" * 10
WHERE
  "sleep" <= 10
  AND "energy" <= 10
  AND "stress" <= 10
  AND "motivation" <= 10;
