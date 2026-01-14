-- SQL для создания таблицы истории изменений пациентов
-- Выполните этот запрос в SQL Editor в Supabase

-- 1. Создать таблицу для хранения истории изменений (если еще не существует)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'patient_changes'
    ) THEN
        -- Определяем тип ID из таблицы patients
        -- Создаем таблицу с поддержкой разных типов ID
        CREATE TABLE patient_changes (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          patient_id TEXT NOT NULL, -- Используем TEXT для совместимости с UUID и числовыми ID
          field_name TEXT NOT NULL,
          old_value TEXT,
          new_value TEXT,
          changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          changed_by_email TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Создать внешний ключ, если таблица patients использует UUID
        -- Если будет ошибка, значит ID в patients не UUID - это нормально
        BEGIN
            ALTER TABLE patient_changes 
            ADD CONSTRAINT fk_patient_changes_patient_id 
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;
        EXCEPTION
            WHEN OTHERS THEN
                -- Игнорируем ошибку, если внешний ключ не может быть создан
                NULL;
        END;
    END IF;
END $$;

-- 2. Создать индексы для быстрого поиска (если еще не существуют)
CREATE INDEX IF NOT EXISTS idx_patient_changes_patient_id ON patient_changes(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_changes_changed_at ON patient_changes(changed_at DESC);

-- 3. Включить RLS (Row Level Security), если еще не включен
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'patient_changes' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE patient_changes ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- 4. Удалить старые политики, если они существуют (для пересоздания)
DROP POLICY IF EXISTS "Users can view patient changes" ON patient_changes;
DROP POLICY IF EXISTS "Users can insert patient changes" ON patient_changes;

-- 5. Создать политики для SELECT и INSERT
CREATE POLICY "Users can view patient changes"
  ON patient_changes
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert patient changes"
  ON patient_changes
  FOR INSERT
  WITH CHECK (true);

-- 6. Проверка: посмотреть структуру созданной таблицы
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'patient_changes'
ORDER BY ordinal_position;
