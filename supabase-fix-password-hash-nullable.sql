-- Исправление колонки password_hash для поддержки NULL (сброс пароля)
-- Выполните этот скрипт в SQL Editor в Supabase
-- Этот скрипт безопасен для повторного выполнения

-- Проверяем текущее состояние колонки
DO $$
DECLARE
    col_is_nullable boolean;
BEGIN
    SELECT columns.is_nullable INTO col_is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'password_hash';
    
    IF col_is_nullable = false THEN
        -- Если колонка NOT NULL, делаем её nullable
        ALTER TABLE users 
          ALTER COLUMN password_hash DROP NOT NULL;
        
        RAISE NOTICE 'Колонка password_hash теперь может быть NULL';
    ELSE
        RAISE NOTICE 'Колонка password_hash уже может быть NULL';
    END IF;
END $$;

-- Добавляем комментарий для документации
COMMENT ON COLUMN users.password_hash IS 'Хеш пароля. NULL если пароль сброшен администратором.';

-- Проверяем результат
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name = 'password_hash';
