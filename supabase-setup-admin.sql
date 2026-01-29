-- Админ-панель: Создание таблиц для управления данными

-- Таблица для врачей
CREATE TABLE IF NOT EXISTS doctors (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица для медсестер
CREATE TABLE IF NOT EXISTS nurses (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица для белых списков email
CREATE TABLE IF NOT EXISTS whitelist_emails (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'yandex', 'email')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица для админов
CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_whitelist_provider ON whitelist_emails(provider);
CREATE INDEX IF NOT EXISTS idx_whitelist_email ON whitelist_emails(email);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER update_doctors_updated_at
  BEFORE UPDATE ON doctors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nurses_updated_at
  BEFORE UPDATE ON nurses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whitelist_emails_updated_at
  BEFORE UPDATE ON whitelist_emails
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) политики
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE nurses ENABLE ROW LEVEL SECURITY;
ALTER TABLE whitelist_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Политики: все могут читать (для основного приложения)
CREATE POLICY "Anyone can read doctors" ON doctors
  FOR SELECT USING (true);

CREATE POLICY "Anyone can read nurses" ON nurses
  FOR SELECT USING (true);

CREATE POLICY "Anyone can read whitelist_emails" ON whitelist_emails
  FOR SELECT USING (true);

-- Политики для записи: разрешаем все операции
-- Проверка авторизации происходит на уровне API (checkAdminAuth)
-- RLS здесь разрешает операции, но API проверяет пароль админа

-- Удаляем политики если они существуют (для повторного выполнения скрипта)
DROP POLICY IF EXISTS "Allow insert doctors" ON doctors;
DROP POLICY IF EXISTS "Allow update doctors" ON doctors;
DROP POLICY IF EXISTS "Allow delete doctors" ON doctors;

DROP POLICY IF EXISTS "Allow insert nurses" ON nurses;
DROP POLICY IF EXISTS "Allow update nurses" ON nurses;
DROP POLICY IF EXISTS "Allow delete nurses" ON nurses;

DROP POLICY IF EXISTS "Allow insert whitelist_emails" ON whitelist_emails;
DROP POLICY IF EXISTS "Allow update whitelist_emails" ON whitelist_emails;
DROP POLICY IF EXISTS "Allow delete whitelist_emails" ON whitelist_emails;

-- Создаем политики для записи
CREATE POLICY "Allow insert doctors" ON doctors
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update doctors" ON doctors
  FOR UPDATE USING (true);

CREATE POLICY "Allow delete doctors" ON doctors
  FOR DELETE USING (true);

CREATE POLICY "Allow insert nurses" ON nurses
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update nurses" ON nurses
  FOR UPDATE USING (true);

CREATE POLICY "Allow delete nurses" ON nurses
  FOR DELETE USING (true);

CREATE POLICY "Allow insert whitelist_emails" ON whitelist_emails
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update whitelist_emails" ON whitelist_emails
  FOR UPDATE USING (true);

CREATE POLICY "Allow delete whitelist_emails" ON whitelist_emails
  FOR DELETE USING (true);

-- Вставка начальных данных (если таблицы пустые)
INSERT INTO doctors (name)
SELECT name FROM (VALUES
  ('Карнаухов В. A.'),
  ('Абасова Т. М.')
) AS v(name)
ON CONFLICT (name) DO NOTHING;

INSERT INTO nurses (name)
SELECT name FROM (VALUES
  ('Вовченко Ирина'),
  ('Железнова Надежда'),
  ('Попова Ирина'),
  ('Стрельникова Вера')
) AS v(name)
ON CONFLICT (name) DO NOTHING;

-- Вставка начальных белых списков (если есть)
INSERT INTO whitelist_emails (email, provider)
SELECT email, provider FROM (VALUES
  ('vladosabramov@yandex.ru', 'yandex'),
  ('workmail.abramov@gmail.com', 'google')
) AS v(email, provider)
ON CONFLICT (email) DO NOTHING;

-- Создание админа (пароль: app_password, hash: нужно будет сгенерировать)
-- Для простоты используем простую проверку в API, но можно добавить bcrypt позже
-- INSERT INTO admins (username, password_hash) VALUES ('admin', 'hash_here');
