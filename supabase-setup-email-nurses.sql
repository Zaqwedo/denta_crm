-- Создание таблицы связи между email и медсестрами
-- Таблица связи email-медсестры (many-to-many)
CREATE TABLE IF NOT EXISTS whitelist_email_nurses (
    id SERIAL PRIMARY KEY,
    whitelist_email_id INTEGER NOT NULL REFERENCES whitelist_emails(id) ON DELETE CASCADE,
    nurse_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(whitelist_email_id, nurse_name)
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_whitelist_email_nurses_email_id ON whitelist_email_nurses(whitelist_email_id);
CREATE INDEX IF NOT EXISTS idx_whitelist_email_nurses_nurse ON whitelist_email_nurses(nurse_name);

-- Включаем RLS
ALTER TABLE whitelist_email_nurses ENABLE ROW LEVEL SECURITY;

-- Политики (разрешаем всем, проверка на уровне API)
CREATE POLICY "Anyone can read whitelist_email_nurses" ON whitelist_email_nurses FOR SELECT USING (true);
CREATE POLICY "Anyone can insert whitelist_email_nurses" ON whitelist_email_nurses FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete whitelist_email_nurses" ON whitelist_email_nurses FOR DELETE USING (true);
