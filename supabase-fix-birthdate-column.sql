-- Исправление типа колонки "Дата рождения пациента" на TEXT
-- Выполните этот скрипт в SQL Editor в Supabase

-- Проверка текущего типа колонки
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'patients'
AND column_name = 'Дата рождения пациента'
AND table_schema = 'public';

-- Изменение типа колонки на TEXT (если она не TEXT)
-- ВНИМАНИЕ: Это может занять время, если в таблице много записей
DO $$
BEGIN
    -- Проверяем тип колонки
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'patients' 
        AND column_name = 'Дата рождения пациента'
        AND table_schema = 'public'
        AND data_type != 'text'
    ) THEN
        -- Изменяем тип на TEXT
        ALTER TABLE patients 
        ALTER COLUMN "Дата рождения пациента" TYPE TEXT 
        USING "Дата рождения пациента"::text;
        
        RAISE NOTICE 'Колонка "Дата рождения пациента" успешно изменена на TEXT';
    ELSE
        RAISE NOTICE 'Колонка "Дата рождения пациента" уже имеет тип TEXT';
    END IF;
END $$;

-- Проверка после изменения
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'patients'
AND column_name = 'Дата рождения пациента'
AND table_schema = 'public';
