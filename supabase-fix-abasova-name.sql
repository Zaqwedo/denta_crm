-- Исправление имени врача "Абасова Т. М." на "Абасова Т.М." 
-- в таблицах doctors и patients
-- Выполните этот скрипт в SQL Editor в Supabase

-- 1. Проверяем текущее состояние в таблице doctors
SELECT 
    name,
    COUNT(*) as count
FROM doctors
WHERE name LIKE '%Абасова%'
GROUP BY name
ORDER BY name;

-- 2. Проверяем текущее состояние в таблице patients
SELECT 
    "Доктор",
    COUNT(*) as count
FROM patients
WHERE "Доктор" LIKE '%Абасова%'
GROUP BY "Доктор"
ORDER BY "Доктор";

-- 3. Обновляем таблицу doctors - исправляем все варианты на "Абасова Т.М."
UPDATE doctors
SET name = 'Абасова Т.М.'
WHERE name IN (
    'Абасова Т. М.',
    'Абасова Т. M.',
    'Абасова Т.М. ',
    'Абасова Т. М. ',
    'Абасова Т. M. '
)
OR name LIKE 'Абасова Т.%';

-- 4. Если правильной записи нет в doctors, добавляем её
INSERT INTO doctors (name)
SELECT 'Абасова Т.М.'
WHERE NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Абасова Т.М.');

-- 5. Удаляем дубликаты из doctors (оставляем только правильный вариант)
DELETE FROM doctors 
WHERE name IN ('Абасова Т. М.', 'Абасова Т. M.', 'Абасова Т.М. ', 'Абасова Т. М. ', 'Абасова Т. M. ')
  AND name != 'Абасова Т.М.';

-- 6. Обновляем таблицу patients - исправляем все варианты на "Абасова Т.М."
UPDATE patients
SET "Доктор" = 'Абасова Т.М.'
WHERE "Доктор" IN (
    'Абасова Т. М.',
    'Абасова Т. M.',
    'Абасова Т.М. ',
    'Абасова Т. М. ',
    'Абасова Т. M. '
)
OR ("Доктор" LIKE 'Абасова Т.%' AND "Доктор" != 'Абасова Т.М.');

-- 7. Проверяем результат в таблице doctors
SELECT 
    name,
    COUNT(*) as count
FROM doctors
WHERE name LIKE '%Абасова%'
GROUP BY name
ORDER BY name;

-- 8. Проверяем результат в таблице patients
SELECT 
    "Доктор",
    COUNT(*) as count
FROM patients
WHERE "Доктор" LIKE '%Абасова%'
GROUP BY "Доктор"
ORDER BY "Доктор";

-- 9. Показываем несколько примеров обновленных записей
SELECT 
    id,
    "ФИО",
    "Доктор"
FROM patients
WHERE "Доктор" = 'Абасова Т.М.'
LIMIT 5;
