-- Обновление таблицы users для поддержки NULL в password_hash (сброс пароля)
-- Выполните этот скрипт в SQL Editor в Supabase

-- Изменяем колонку password_hash, чтобы она могла быть NULL
ALTER TABLE users 
  ALTER COLUMN password_hash DROP NOT NULL;

-- Комментарий для документации
COMMENT ON COLUMN users.password_hash IS 'Хеш пароля. NULL если пароль сброшен администратором.';
