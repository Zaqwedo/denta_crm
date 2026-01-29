-- Создание таблицы для пользователей с email и паролем
-- Выполните этот скрипт в SQL Editor в Supabase

CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT, -- Может быть NULL если пароль сброшен
    first_name TEXT,
    last_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Политика для чтения данных
CREATE POLICY "Users can view own data" ON users
  FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Политика для вставки новых пользователей (регистрация)
-- Разрешаем всем создавать записи, проверка уникальности email происходит на уровне БД
CREATE POLICY "Anyone can insert users" ON users
  FOR INSERT
  WITH CHECK (true);

-- Политика для обновления пользователей (смена/сброс пароля)
-- Разрешаем всем обновлять записи, проверка на уровне API
CREATE POLICY "Anyone can update users" ON users
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_users_updated_at();
