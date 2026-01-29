-- Безопасный SQL для настройки отслеживания изменений в Supabase
-- Выполните этот запрос в SQL Editor в Supabase

-- 1. Добавить поле updated_at, если его еще нет
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'patients' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE patients 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        -- Обновить существующие записи, установив updated_at = created_at
        UPDATE patients 
        SET updated_at = created_at 
        WHERE updated_at IS NULL;
    END IF;
END $$;

-- 2. Создать функцию для автоматического обновления updated_at (если еще не существует)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 3. Удалить триггер, если он существует, и создать заново
DROP TRIGGER IF EXISTS update_patients_updated_at ON patients;

CREATE TRIGGER update_patients_updated_at
    BEFORE UPDATE ON patients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Проверка: посмотреть структуру таблицы
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'patients'
ORDER BY ordinal_position;
