-- Оптимизация производительности базы данных
-- Создание индексов для ускорения поиска и фильтрации

-- 1. Индекс для поиска по ФИО (Картотека и основной список)
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients("ФИО");

-- 2. Индекс для поиска по телефону (Поиск дублей и Картотека)
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients("Телефон");

-- 3. Индекс для фильтрации по врачу
CREATE INDEX IF NOT EXISTS idx_patients_doctor ON patients("Доктор");

-- 4. Индекс для фильтрации по дате рождения (используется при группировке в картотеке)
CREATE INDEX IF NOT EXISTS idx_patients_birth_date ON patients("Дата рождения пациента");

-- 5. Индекс для фильтрации по дате приема
CREATE INDEX IF NOT EXISTS idx_patients_visit_date ON patients("Дата записи");
