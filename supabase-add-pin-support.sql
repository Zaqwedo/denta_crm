-- Миграция: Добавление поддержки PIN-кода для пользователей
-- Выполните этот скрипт в SQL Editor в Supabase

-- Добавляем колонку для хеша PIN-кода (4-значного)
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_code_hash TEXT;

-- Комментарий к колонке
COMMENT ON COLUMN users.pin_code_hash IS 'Хешированный 4-значный PIN-код для быстрого входа';
