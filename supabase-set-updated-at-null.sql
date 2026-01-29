-- Установка NULL в поле updated_at для всех записей
-- Выполните этот скрипт в SQL Editor в Supabase

-- =====================================================
-- 1. ПРОВЕРКА ТЕКУЩЕГО СОСТОЯНИЯ
-- =====================================================

-- Показать количество записей с updated_at
SELECT 
    COUNT(*) as total_records,
    COUNT(updated_at) as records_with_updated_at,
    COUNT(*) - COUNT(updated_at) as records_with_null_updated_at
FROM patients;

-- =====================================================
-- 2. УСТАНОВКА NULL В updated_at
-- =====================================================

-- Временно отключаем триггер, который автоматически обновляет updated_at
DROP TRIGGER IF EXISTS update_patients_updated_at ON patients;

-- Устанавливаем NULL в поле updated_at для всех записей
-- Это удалит все значения в колонке updated_at
UPDATE patients
SET updated_at = NULL
WHERE updated_at IS NOT NULL;

-- Включаем триггер обратно (если он был)
-- Проверяем, существует ли функция триггера
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'update_updated_at_column'
    ) THEN
        CREATE TRIGGER update_patients_updated_at
            BEFORE UPDATE ON patients
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        
        RAISE NOTICE 'Триггер update_patients_updated_at восстановлен';
    ELSE
        RAISE NOTICE 'Функция триггера не найдена, триггер не создан';
    END IF;
END $$;

-- =====================================================
-- 3. ПРОВЕРКА РЕЗУЛЬТАТА
-- =====================================================

-- Проверяем, что все записи имеют NULL в updated_at
SELECT 
    COUNT(*) as total_records,
    COUNT(updated_at) as records_with_updated_at,
    COUNT(*) - COUNT(updated_at) as records_with_null_updated_at
FROM patients;

-- Показываем несколько записей для проверки
SELECT 
    id,
    "ФИО",
    created_at,
    updated_at
FROM patients
ORDER BY created_at DESC
LIMIT 10;
