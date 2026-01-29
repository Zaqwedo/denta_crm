-- Создание таблицы связи между email и врачами
-- Выполните этот скрипт в SQL Editor в Supabase

-- Таблица связи email-врачи (many-to-many)
CREATE TABLE IF NOT EXISTS whitelist_email_doctors (
    id SERIAL PRIMARY KEY,
    whitelist_email_id INTEGER NOT NULL REFERENCES whitelist_emails(id) ON DELETE CASCADE,
    doctor_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(whitelist_email_id, doctor_name)
);

-- Индекс для быстрого поиска по email
CREATE INDEX IF NOT EXISTS idx_whitelist_email_doctors_email_id ON whitelist_email_doctors(whitelist_email_id);

-- Индекс для быстрого поиска по врачу
CREATE INDEX IF NOT EXISTS idx_whitelist_email_doctors_doctor ON whitelist_email_doctors(doctor_name);

-- Включаем RLS
ALTER TABLE whitelist_email_doctors ENABLE ROW LEVEL SECURITY;

-- Политика для чтения (все могут читать)
CREATE POLICY "Anyone can read whitelist_email_doctors" ON whitelist_email_doctors
  FOR SELECT USING (true);

-- Политика для вставки (разрешаем всем, проверка на уровне API)
CREATE POLICY "Anyone can insert whitelist_email_doctors" ON whitelist_email_doctors
  FOR INSERT WITH CHECK (true);

-- Политика для удаления (разрешаем всем, проверка на уровне API)
CREATE POLICY "Anyone can delete whitelist_email_doctors" ON whitelist_email_doctors
  FOR DELETE USING (true);
