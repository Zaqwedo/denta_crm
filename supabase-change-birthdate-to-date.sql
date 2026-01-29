-- Изменение типа колонки "Дата рождения пациента" на DATE
-- Выполните этот скрипт в SQL Editor в Supabase

-- 1. Проверка текущего типа колонки
SELECT 
    column_name,
    data_type,
    udt_name,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'patients'
AND column_name = 'Дата рождения пациента'
AND table_schema = 'public';

-- 2. Если колонка уже DATE, сначала конвертируем в TEXT для работы с форматами
-- Временно изменяем тип на TEXT для конвертации
DO $$
BEGIN
    -- Проверяем текущий тип
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'patients' 
        AND column_name = 'Дата рождения пациента'
        AND table_schema = 'public'
        AND data_type = 'date'
    ) THEN
        -- Если уже DATE, конвертируем в TEXT
        ALTER TABLE patients 
        ALTER COLUMN "Дата рождения пациента" TYPE TEXT 
        USING TO_CHAR("Дата рождения пациента", 'YYYY-MM-DD');
        
        RAISE NOTICE 'Колонка временно изменена на TEXT для конвертации';
    END IF;
END $$;

-- 3. Обновляем существующие значения: конвертируем из DD.MM.YYYY в YYYY-MM-DD
UPDATE patients
SET "Дата рождения пациента" = 
    CASE 
        WHEN "Дата рождения пациента" ~ '^\d{1,2}\.\d{1,2}\.\d{4}$' THEN
            -- Формат DD.MM.YYYY -> YYYY-MM-DD
            TO_CHAR(
                TO_DATE("Дата рождения пациента", 'DD.MM.YYYY'),
                'YYYY-MM-DD'
            )
        WHEN "Дата рождения пациента" ~ '^\d{4}-\d{2}-\d{2}$' THEN
            -- Уже в формате YYYY-MM-DD, оставляем как есть
            "Дата рождения пациента"
        ELSE
            -- Невалидный формат, очищаем
            NULL
    END
WHERE "Дата рождения пациента" IS NOT NULL;

-- 4. Удаляем все невалидные значения (NULL)
UPDATE patients 
SET "Дата рождения пациента" = NULL 
WHERE "Дата рождения пациента" IS NOT NULL 
  AND "Дата рождения пациента" !~ '^\d{4}-\d{2}-\d{2}$';

-- 5. Изменяем тип колонки на DATE
ALTER TABLE patients 
ALTER COLUMN "Дата рождения пациента" TYPE DATE 
USING CASE 
    WHEN "Дата рождения пациента" ~ '^\d{4}-\d{2}-\d{2}$' THEN
        "Дата рождения пациента"::DATE
    ELSE
        NULL
END;

-- 6. Проверка после изменения
SELECT 
    column_name,
    data_type,
    udt_name,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'patients'
AND column_name = 'Дата рождения пациента'
AND table_schema = 'public';

-- 7. Проверка нескольких записей
SELECT 
    id,
    "ФИО",
    "Дата рождения пациента",
    pg_typeof("Дата рождения пациента") as actual_type
FROM patients
WHERE "Дата рождения пациента" IS NOT NULL
LIMIT 5;
