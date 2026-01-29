-- Изменение типов колонок "Дата записи" и "Время записи"
-- Выполните этот скрипт в SQL Editor в Supabase

-- 1. Проверка текущих типов колонок
SELECT 
    column_name,
    data_type,
    udt_name,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'patients'
AND column_name IN ('Дата записи', 'Время записи')
AND table_schema = 'public';

-- 2. Изменение колонки "Дата записи" на DATE
-- Сначала конвертируем существующие значения из DD.MM.YYYY в YYYY-MM-DD
DO $$
BEGIN
    -- Если колонка уже DATE, временно конвертируем в TEXT
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'patients' 
        AND column_name = 'Дата записи'
        AND table_schema = 'public'
        AND data_type = 'date'
    ) THEN
        ALTER TABLE patients 
        ALTER COLUMN "Дата записи" TYPE TEXT 
        USING TO_CHAR("Дата записи", 'YYYY-MM-DD');
    END IF;
END $$;

-- Конвертируем все даты из DD.MM.YYYY в YYYY-MM-DD
UPDATE patients
SET "Дата записи" = 
    CASE 
        WHEN "Дата записи"::text ~ '^\d{1,2}\.\d{1,2}\.\d{4}$' THEN
            -- Формат DD.MM.YYYY -> YYYY-MM-DD
            TO_CHAR(
                TO_DATE("Дата записи"::text, 'DD.MM.YYYY'),
                'YYYY-MM-DD'
            )
        WHEN "Дата записи"::text ~ '^\d{4}-\d{2}-\d{2}$' THEN
            -- Уже в формате YYYY-MM-DD, оставляем как есть
            "Дата записи"::text
        ELSE
            NULL
    END
WHERE "Дата записи" IS NOT NULL;

-- Удаляем невалидные значения
UPDATE patients 
SET "Дата записи" = NULL 
WHERE "Дата записи" IS NOT NULL 
  AND "Дата записи"::text !~ '^\d{4}-\d{2}-\d{2}$';

-- Изменяем тип на DATE
ALTER TABLE patients 
ALTER COLUMN "Дата записи" TYPE DATE 
USING CASE 
    WHEN "Дата записи"::text ~ '^\d{4}-\d{2}-\d{2}$' THEN
        "Дата записи"::text::DATE
    ELSE
        NULL
END;

-- 3. Изменение колонки "Время записи" на TIME
-- Сначала конвертируем существующие значения в формат HH:MM:SS
DO $$
BEGIN
    -- Если колонка уже TIME, временно конвертируем в TEXT
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'patients' 
        AND column_name = 'Время записи'
        AND table_schema = 'public'
        AND data_type = 'time without time zone'
    ) THEN
        ALTER TABLE patients 
        ALTER COLUMN "Время записи" TYPE TEXT 
        USING TO_CHAR("Время записи", 'HH24:MI:SS');
    END IF;
END $$;

-- Нормализуем формат времени: HH:MM или HH:MM:SS -> HH:MM:SS
UPDATE patients
SET "Время записи" = 
    CASE 
        WHEN "Время записи"::text ~ '^\d{1,2}:\d{2}$' THEN
            -- Формат HH:MM -> HH:MM:SS
            "Время записи"::text || ':00'
        WHEN "Время записи"::text ~ '^\d{1,2}:\d{2}:\d{2}$' THEN
            -- Уже в формате HH:MM:SS, оставляем как есть
            "Время записи"::text
        ELSE
            NULL
    END
WHERE "Время записи" IS NOT NULL;

-- Удаляем невалидные значения
UPDATE patients 
SET "Время записи" = NULL 
WHERE "Время записи" IS NOT NULL 
  AND "Время записи"::text !~ '^\d{1,2}:\d{2}(:\d{2})?$';

-- Изменяем тип на TIME
ALTER TABLE patients 
ALTER COLUMN "Время записи" TYPE TIME 
USING CASE 
    WHEN "Время записи"::text ~ '^\d{1,2}:\d{2}(:\d{2})?$' THEN
        "Время записи"::text::TIME
    ELSE
        NULL
END;

-- 4. Замена всех вариантов "Карнаухов В. А." на "Карнаухов В.А." (убираем пробел после точки)
-- Заменяем все варианты: с пробелами, с латинской A, с кириллической А

-- Сначала обновляем таблицу doctors (если есть)
UPDATE doctors
SET name = 'Карнаухов В.А.'
WHERE name IN ('Карнаухов В. А.', 'Карнаухов В. A.', 'Карнаухов В.А. ');

-- Если записи нет, добавляем правильную
INSERT INTO doctors (name)
SELECT 'Карнаухов В.А.'
WHERE NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Карнаухов В.А.');

-- Удаляем старые варианты (если есть)
DELETE FROM doctors 
WHERE name IN ('Карнаухов В. А.', 'Карнаухов В. A.', 'Карнаухов В.А. ')
  AND name != 'Карнаухов В.А.';

-- Теперь обновляем таблицу patients
UPDATE patients
SET "Доктор" = 'Карнаухов В.А.'
WHERE "Доктор" IN ('Карнаухов В. А.', 'Карнаухов В. A.', 'Карнаухов В.А. ', 'Карнаухов В.А.');

-- 5. Проверка после изменения
SELECT 
    column_name,
    data_type,
    udt_name,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'patients'
AND column_name IN ('Дата записи', 'Время записи')
AND table_schema = 'public';

-- 6. Проверка нескольких записей
SELECT 
    id,
    "ФИО",
    "Дата записи",
    "Время записи",
    "Доктор",
    pg_typeof("Дата записи") as date_type,
    pg_typeof("Время записи") as time_type
FROM patients
WHERE "Дата записи" IS NOT NULL
LIMIT 5;
