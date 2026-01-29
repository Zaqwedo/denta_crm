-- Проверка и исправление типа колонки "Дата рождения пациента"
-- Выполните этот скрипт в SQL Editor в Supabase

-- 1. Проверка текущего типа
SELECT 
    column_name,
    data_type,
    udt_name,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'patients'
AND column_name = 'Дата рождения пациента'
AND table_schema = 'public';

-- 2. Если тип не text, изменяем его
ALTER TABLE patients 
ALTER COLUMN "Дата рождения пациента" TYPE TEXT 
USING COALESCE("Дата рождения пациента"::text, '');

-- 3. Проверка после изменения
SELECT 
    column_name,
    data_type,
    udt_name,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'patients'
AND column_name = 'Дата рождения пациента'
AND table_schema = 'public';

-- 4. Проверка существующих значений
SELECT 
    id,
    "ФИО",
    "Дата рождения пациента",
    pg_typeof("Дата рождения пациента") as actual_type
FROM patients
WHERE "Дата рождения пациента" IS NOT NULL
LIMIT 5;
