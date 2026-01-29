-- Исправление таблицы deleted_patients: добавление колонки updated_at если её нет
-- Выполните этот скрипт в SQL Editor в Supabase

DO $$
BEGIN
    -- Проверяем, существует ли колонка updated_at в таблице deleted_patients
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'deleted_patients' 
        AND column_name = 'updated_at'
        AND table_schema = 'public'
    ) THEN
        -- Добавляем колонку updated_at
        ALTER TABLE deleted_patients 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        -- Обновляем существующие записи, устанавливая updated_at = created_at
        UPDATE deleted_patients 
        SET updated_at = created_at 
        WHERE updated_at IS NULL;
        
        RAISE NOTICE 'Колонка updated_at успешно добавлена в таблицу deleted_patients';
    ELSE
        RAISE NOTICE 'Колонка updated_at уже существует в таблице deleted_patients';
    END IF;
END $$;

-- Проверка структуры таблицы
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'deleted_patients'
AND table_schema = 'public'
ORDER BY ordinal_position;
