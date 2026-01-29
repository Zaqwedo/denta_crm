-- Обновление статусов пациентов по дате записи
-- Выполните этот скрипт в SQL Editor в Supabase

-- 1. Обновляем статус для записей до сегодняшнего дня (включительно) на "Завершен"
UPDATE patients
SET "Статус" = 'Завершен'
WHERE "Дата записи" IS NOT NULL
  AND "Дата записи" < CURRENT_DATE;

-- 2. Обновляем статус для записей начиная с сегодняшнего дня и далее на "Ожидает"
UPDATE patients
SET "Статус" = 'Ожидает'
WHERE "Дата записи" IS NOT NULL
  AND "Дата записи" >= CURRENT_DATE;

-- 3. Проверка результатов
SELECT 
    "Статус",
    COUNT(*) as count,
    MIN("Дата записи") as min_date,
    MAX("Дата записи") as max_date
FROM patients
WHERE "Дата записи" IS NOT NULL
GROUP BY "Статус"
ORDER BY "Статус";

-- 4. Показываем несколько примеров записей
SELECT 
    id,
    "ФИО",
    "Дата записи",
    "Статус"
FROM patients
WHERE "Дата записи" IS NOT NULL
ORDER BY "Дата записи" DESC
LIMIT 10;
