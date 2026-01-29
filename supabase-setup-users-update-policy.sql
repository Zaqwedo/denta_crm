-- Добавление политики RLS для обновления users (если еще не существует)
-- Выполните этот скрипт в SQL Editor в Supabase

-- Удаляем политику если она существует (для повторного выполнения)
DROP POLICY IF EXISTS "Anyone can update users" ON users;

-- Политика для обновления данных пользователей
-- Разрешаем всем обновлять записи (проверка на уровне API)
CREATE POLICY "Anyone can update users" ON users
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Проверяем, что политика создана
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'users'
AND schemaname = 'public';
