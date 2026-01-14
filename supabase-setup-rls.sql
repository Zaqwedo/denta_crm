-- Полная настройка Row Level Security (RLS) для всех таблиц в Supabase
-- Выполните этот запрос в SQL Editor в Supabase
-- Этот скрипт безопасно настраивает RLS без потери данных

-- =====================================================
-- 1. НАСТРОЙКА RLS ДЛЯ ОСНОВНОЙ ТАБЛИЦЫ patients
-- =====================================================

-- Включить RLS для таблицы patients
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Удалить существующие политики (если они есть)
DROP POLICY IF EXISTS "Users can view patients" ON patients;
DROP POLICY IF EXISTS "Users can insert patients" ON patients;
DROP POLICY IF EXISTS "Users can update patients" ON patients;
DROP POLICY IF EXISTS "Users can delete patients" ON patients;

-- Создать политики для аутентифицированных пользователей (включая анонимных)
CREATE POLICY "Users can view patients"
  ON patients
  FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Users can insert patients"
  ON patients
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Users can update patients"
  ON patients
  FOR UPDATE
  USING (auth.role() = 'authenticated' OR auth.role() = 'anon')
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Users can delete patients"
  ON patients
  FOR DELETE
  USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- =====================================================
-- 2. НАСТРОЙКА RLS ДЛЯ ТАБЛИЦЫ deleted_patients
-- =====================================================

-- Создать таблицу deleted_patients, если она еще не существует
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'deleted_patients'
    ) THEN
        -- Создаем таблицу с той же структурой, что и patients, но с дополнительными полями
        CREATE TABLE deleted_patients (
            -- Копируем все поля из patients
            original_id TEXT PRIMARY KEY, -- Оригинальный ID из patients таблицы
            "ФИО" TEXT NOT NULL,
            "Телефон" TEXT,
            "Комментарии" TEXT,
            "Дата записи" TEXT,
            "Время записи" TEXT,
            "Статус" TEXT,
            "Доктор" TEXT,
            "Зубы" TEXT,
            "Медсестра" TEXT,
            "Дата рождения пациента" TEXT,
            created_by_email TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            -- Дополнительные поля для удаленных записей
            deleted_by_email TEXT,
            deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END $$;

-- Включить RLS для таблицы deleted_patients
ALTER TABLE deleted_patients ENABLE ROW LEVEL SECURITY;

-- Удалить существующие политики (если они есть)
DROP POLICY IF EXISTS "Users can view deleted patients" ON deleted_patients;
DROP POLICY IF EXISTS "Users can insert deleted patients" ON deleted_patients;

-- Создать политики для аутентифицированных пользователей (включая анонимных)
CREATE POLICY "Users can view deleted patients"
  ON deleted_patients
  FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Users can insert deleted patients"
  ON deleted_patients
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- =====================================================
-- 3. НАСТРОЙКА RLS ДЛЯ ТАБЛИЦЫ patient_changes
-- =====================================================

-- Создать таблицу patient_changes, если она еще не существует
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'patient_changes'
    ) THEN
        CREATE TABLE patient_changes (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            patient_id TEXT NOT NULL,
            field_name TEXT NOT NULL,
            old_value TEXT,
            new_value TEXT,
            changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            changed_by_email TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Создать индексы для производительности
        CREATE INDEX IF NOT EXISTS idx_patient_changes_patient_id ON patient_changes(patient_id);
        CREATE INDEX IF NOT EXISTS idx_patient_changes_changed_at ON patient_changes(changed_at DESC);
    END IF;
END $$;

-- Включить RLS для таблицы patient_changes
ALTER TABLE patient_changes ENABLE ROW LEVEL SECURITY;

-- Удалить существующие политики (если они есть)
DROP POLICY IF EXISTS "Users can view patient changes" ON patient_changes;
DROP POLICY IF EXISTS "Users can insert patient changes" ON patient_changes;

-- Создать политики для аутентифицированных пользователей (включая анонимных)
CREATE POLICY "Users can view patient changes"
  ON patient_changes
  FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Users can insert patient changes"
  ON patient_changes
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- =====================================================
-- 4. ПРОВЕРКА НАСТРОЕК
-- =====================================================

-- Показать статус RLS для всех таблиц
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('patients', 'deleted_patients', 'patient_changes')
AND schemaname = 'public'
ORDER BY tablename;

-- Показать все политики RLS
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename IN ('patients', 'deleted_patients', 'patient_changes')
AND schemaname = 'public'
ORDER BY tablename, policyname;

-- Показать структуру таблиц
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name IN ('patients', 'deleted_patients', 'patient_changes')
AND table_schema = 'public'
ORDER BY table_name, ordinal_position;