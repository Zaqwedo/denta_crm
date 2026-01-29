-- Проверка типа колонки "Дата рождения пациента" в таблице patients
-- Выполните этот запрос в SQL Editor в Supabase

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'patients'
AND column_name = 'Дата рождения пациента'
AND table_schema = 'public';

-- Если тип не TEXT, нужно изменить его:
-- ALTER TABLE patients ALTER COLUMN "Дата рождения пациента" TYPE TEXT;
