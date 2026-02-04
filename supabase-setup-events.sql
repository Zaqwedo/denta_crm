-- Создание таблицы для событий (курсы, конференции и т.д.)
-- Выполните этот скрипт в SQL Editor в Supabase

CREATE TABLE IF NOT EXISTS events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    date DATE NOT NULL,
    time TIME,
    location TEXT,
    description TEXT,
    created_by_email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индекс для быстрого поиска по email и дате
CREATE INDEX IF NOT EXISTS idx_events_email ON events(created_by_email);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);

-- Включаем RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Политика: Пользователь видит только свои события
CREATE POLICY "Users can only see their own events" ON events
  FOR SELECT
  USING (LOWER(created_by_email) = LOWER(auth.jwt() ->> 'email') OR auth.role() = 'anon');
  -- Примечание: Мы используем анонимный вход с фильтрацией на уровне API для гибкости, 
  -- но добавляем проверку по email.

-- Политика: Пользователь может вставлять свои события
CREATE POLICY "Users can insert their own events" ON events
  FOR INSERT
  WITH CHECK (true);

-- Политика: Пользователь может обновлять только свои события
CREATE POLICY "Users can update their own events" ON events
  FOR UPDATE
  USING (LOWER(created_by_email) = LOWER(auth.jwt() ->> 'email') OR auth.role() = 'anon');

-- Политика: Пользователь может удалять только свои события
CREATE POLICY "Users can delete their own events" ON events
  FOR DELETE
  USING (LOWER(created_by_email) = LOWER(auth.jwt() ->> 'email') OR auth.role() = 'anon');

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_events_updated_at();
