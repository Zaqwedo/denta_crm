-- =====================================================
-- НАСТРОЙКА RLS V2 - С ПРОВЕРКОЙ EMAIL ИЗ ЗАГОЛОВКОВ
-- =====================================================
-- Этот скрипт настраивает Row Level Security (RLS) для таблиц
-- с использованием заголовка x-denta-user-email для фильтрации данных

-- =====================================================
-- 1. СОЗДАНИЕ ФУНКЦИИ ДЛЯ ПОЛУЧЕНИЯ EMAIL ИЗ ЗАГОЛОВКА
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_email()
RETURNS TEXT AS $$
DECLARE
  email_b64 TEXT;
  email_decoded TEXT;
BEGIN
  -- Получаем base64-encoded email из заголовка запроса
  email_b64 := current_setting('request.headers', true)::json->>'x-denta-user-email-b64';
  
  IF email_b64 IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Декодируем из base64
  email_decoded := convert_from(decode(email_b64, 'base64'), 'UTF8');
  
  RETURN email_decoded;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. СОЗДАНИЕ ФУНКЦИИ ДЛЯ ПРОВЕРКИ ПРАВ ДОСТУПА К ВРАЧУ
-- =====================================================

CREATE OR REPLACE FUNCTION user_can_access_doctor(doctor_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_email TEXT;
  email_id INTEGER;
BEGIN
  -- Получаем email пользователя из заголовка
  user_email := get_user_email();
  
  -- Если email не указан, запрещаем доступ
  IF user_email IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Нормализуем email
  user_email := LOWER(TRIM(user_email));
  
  -- Находим ID email в whitelist
  SELECT id INTO email_id
  FROM whitelist_emails
  WHERE LOWER(TRIM(email)) = user_email
  LIMIT 1;
  
  -- Если email не в whitelist, запрещаем доступ
  IF email_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Проверяем, есть ли у этого email доступ к указанному врачу
  RETURN EXISTS (
    SELECT 1
    FROM whitelist_email_doctors
    WHERE whitelist_email_id = email_id
    AND doctor_name = doctor_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. СОЗДАНИЕ ФУНКЦИИ ДЛЯ ПРОВЕРКИ ПРАВ ДОСТУПА К МЕДСЕСТРЕ
-- =====================================================

CREATE OR REPLACE FUNCTION user_can_access_nurse(nurse_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_email TEXT;
  email_id INTEGER;
BEGIN
  -- Получаем email пользователя из заголовка
  user_email := get_user_email();
  
  -- Если email не указан, запрещаем доступ
  IF user_email IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Нормализуем email
  user_email := LOWER(TRIM(user_email));
  
  -- Находим ID email в whitelist
  SELECT id INTO email_id
  FROM whitelist_emails
  WHERE LOWER(TRIM(email)) = user_email
  LIMIT 1;
  
  -- Если email не в whitelist, запрещаем доступ
  IF email_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Проверяем, есть ли у этого email доступ к указанной медсестре
  RETURN EXISTS (
    SELECT 1
    FROM whitelist_email_nurses
    WHERE whitelist_email_id = email_id
    AND nurse_name = nurse_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. ОБНОВЛЕНИЕ ПОЛИТИК RLS ДЛЯ ТАБЛИЦЫ patients
-- =====================================================

-- Удаляем старые политики
DROP POLICY IF EXISTS "Users can view patients" ON patients;
DROP POLICY IF EXISTS "Users can insert patients" ON patients;
DROP POLICY IF EXISTS "Users can update patients" ON patients;
DROP POLICY IF EXISTS "Users can delete patients" ON patients;

-- Создаем новые политики с проверкой прав доступа

-- Политика для чтения: пользователь видит только пациентов своих врачей/медсестер
CREATE POLICY "Users can view patients based on email"
  ON patients
  FOR SELECT
  USING (
    -- Разрешаем доступ, если пользователь имеет доступ к врачу этого пациента
    user_can_access_doctor("Доктор")
    OR
    -- Или если пользователь имеет доступ к медсестре этого пациента
    (
      "Медсестра" IS NOT NULL 
      AND "Медсестра" != '' 
      AND user_can_access_nurse("Медсестра")
    )
  );

-- Политика для вставки: пользователь может добавлять пациентов только к своим врачам
CREATE POLICY "Users can insert patients based on email"
  ON patients
  FOR INSERT
  WITH CHECK (
    user_can_access_doctor("Доктор")
  );

-- Политика для обновления: пользователь может обновлять только пациентов своих врачей
CREATE POLICY "Users can update patients based on email"
  ON patients
  FOR UPDATE
  USING (
    user_can_access_doctor("Доктор")
    OR
    (
      "Медсестра" IS NOT NULL 
      AND "Медсестра" != '' 
      AND user_can_access_nurse("Медсестра")
    )
  )
  WITH CHECK (
    user_can_access_doctor("Доктор")
  );

-- Политика для удаления: пользователь может удалять только пациентов своих врачей
CREATE POLICY "Users can delete patients based on email"
  ON patients
  FOR DELETE
  USING (
    user_can_access_doctor("Доктор")
  );

-- =====================================================
-- 5. ОБНОВЛЕНИЕ ПОЛИТИК RLS ДЛЯ ТАБЛИЦЫ patient_changes
-- =====================================================

DROP POLICY IF EXISTS "Users can view patient changes" ON patient_changes;
DROP POLICY IF EXISTS "Users can insert patient changes" ON patient_changes;

-- Политика для чтения истории изменений
CREATE POLICY "Users can view patient changes based on email"
  ON patient_changes
  FOR SELECT
  USING (
    -- Проверяем, имеет ли пользователь доступ к пациенту
    EXISTS (
      SELECT 1
      FROM patients
      WHERE patients.id::text = patient_changes.patient_id
      AND (
        user_can_access_doctor(patients."Доктор")
        OR
        (
          patients."Медсестра" IS NOT NULL 
          AND patients."Медсестра" != '' 
          AND user_can_access_nurse(patients."Медсестра")
        )
      )
    )
  );

-- Политика для вставки истории изменений
CREATE POLICY "Users can insert patient changes based on email"
  ON patient_changes
  FOR INSERT
  WITH CHECK (
    -- Проверяем, имеет ли пользователь доступ к пациенту
    EXISTS (
      SELECT 1
      FROM patients
      WHERE patients.id::text = patient_changes.patient_id
      AND user_can_access_doctor(patients."Доктор")
    )
  );

-- =====================================================
-- 6. ОБНОВЛЕНИЕ ПОЛИТИК RLS ДЛЯ ТАБЛИЦЫ deleted_patients
-- =====================================================

DROP POLICY IF EXISTS "Users can view deleted patients" ON deleted_patients;
DROP POLICY IF EXISTS "Users can insert deleted patients" ON deleted_patients;

-- Политика для чтения удаленных пациентов
CREATE POLICY "Users can view deleted patients based on email"
  ON deleted_patients
  FOR SELECT
  USING (
    user_can_access_doctor("Доктор")
    OR
    (
      "Медсестра" IS NOT NULL 
      AND "Медсестра" != '' 
      AND user_can_access_nurse("Медсестра")
    )
  );

-- Политика для вставки удаленных пациентов
CREATE POLICY "Users can insert deleted patients based on email"
  ON deleted_patients
  FOR INSERT
  WITH CHECK (
    user_can_access_doctor("Доктор")
  );

-- =====================================================
-- 7. ПРОВЕРКА НАСТРОЕК
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
    cmd
FROM pg_policies
WHERE tablename IN ('patients', 'deleted_patients', 'patient_changes')
AND schemaname = 'public'
ORDER BY tablename, policyname;

-- Показать созданные функции
SELECT
    proname as function_name,
    pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname IN ('get_user_email', 'user_can_access_doctor', 'user_can_access_nurse')
ORDER BY proname;
