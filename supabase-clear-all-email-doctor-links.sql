-- Удаление всех связей между email и врачами
-- Выполните этот скрипт в SQL Editor в Supabase
-- ВНИМАНИЕ: Это удалит ВСЕ связи! После этого нужно будет настроить их заново в админ-панели.

-- 1. Показать текущие связи перед удалением
SELECT 
    we.email,
    wed.doctor_name,
    wed.created_at
FROM whitelist_emails we
JOIN whitelist_email_doctors wed ON we.id = wed.whitelist_email_id
ORDER BY we.email, wed.doctor_name;

-- 2. Подсчитать количество связей
SELECT 
    COUNT(*) as total_links_count
FROM whitelist_email_doctors;

-- 3. УДАЛЕНИЕ ВСЕХ СВЯЗЕЙ
-- Раскомментируйте следующую строку для выполнения удаления:
-- DELETE FROM whitelist_email_doctors;

-- 4. Проверка после удаления (должно быть 0 записей)
SELECT 
    COUNT(*) as remaining_links_count
FROM whitelist_email_doctors;

-- 5. Показать все email (они останутся, удаляются только связи с врачами)
SELECT 
    id,
    email,
    provider,
    created_at
FROM whitelist_emails
ORDER BY email;
