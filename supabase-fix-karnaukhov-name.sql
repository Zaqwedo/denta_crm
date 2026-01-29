-- Исправление имени врача "Карнаухов В. А." на "Карнаухов В.А." 
-- в таблицах doctors и patients
-- Выполните этот скрипт в SQL Editor в Supabase

-- 1. Проверяем текущее состояние в таблице doctors
SELECT 
    name,
    COUNT(*) as count
FROM doctors
WHERE name LIKE '%Карнаухов%'
GROUP BY name
ORDER BY name;

-- 2. Проверяем текущее состояние в таблице patients
SELECT 
    "Доктор",
    COUNT(*) as count
FROM patients
WHERE "Доктор" LIKE '%Карнаухов%'
GROUP BY "Доктор"
ORDER BY "Доктор";

-- 3. Обновляем таблицу doctors - исправляем все варианты на "Карнаухов В.А."
UPDATE doctors
SET name = 'Карнаухов В.А.'
WHERE name IN (
    'Карнаухов В. А.',
    'Карнаухов В. A.',
    'Карнаухов В.А. ',
    'Карнаухов В. А. ',
    'Карнаухов В. A. '
)
OR name LIKE 'Карнаухов В.%';

-- 4. Если правильной записи нет в doctors, добавляем её
INSERT INTO doctors (name)
SELECT 'Карнаухов В.А.'
WHERE NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Карнаухов В.А.');

-- 5. Удаляем дубликаты из doctors (оставляем только правильный вариант)
DELETE FROM doctors 
WHERE name IN ('Карнаухов В. А.', 'Карнаухов В. A.', 'Карнаухов В.А. ', 'Карнаухов В. А. ', 'Карнаухов В. A. ')
  AND name != 'Карнаухов В.А.';

-- 6. Обновляем таблицу patients - исправляем все варианты на "Карнаухов В.А."
UPDATE patients
SET "Доктор" = 'Карнаухов В.А.'
WHERE "Доктор" IN (
    'Карнаухов В. А.',
    'Карнаухов В. A.',
    'Карнаухов В.А. ',
    'Карнаухов В. А. ',
    'Карнаухов В. A. '
)
OR ("Доктор" LIKE 'Карнаухов В.%' AND "Доктор" != 'Карнаухов В.А.');

-- 7. Проверяем результат в таблице doctors
SELECT 
    name,
    COUNT(*) as count
FROM doctors
WHERE name LIKE '%Карнаухов%'
GROUP BY name
ORDER BY name;

-- 8. Проверяем результат в таблице patients
SELECT 
    "Доктор",
    COUNT(*) as count
FROM patients
WHERE "Доктор" LIKE '%Карнаухов%'
GROUP BY "Доктор"
ORDER BY "Доктор";

-- 9. Показываем несколько примеров обновленных записей
SELECT 
    id,
    "ФИО",
    "Доктор"
FROM patients
WHERE "Доктор" = 'Карнаухов В.А.'
LIMIT 5;
