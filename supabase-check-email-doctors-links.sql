-- Проверка связей между email и врачами
-- Выполните этот скрипт в SQL Editor в Supabase для диагностики

-- 1. Показать все email в whitelist с их врачами
SELECT 
    we.id as whitelist_email_id,
    we.email,
    we.provider,
    we.created_at,
    COALESCE(
        json_agg(
            json_build_object(
                'id', wed.id,
                'doctor_name', wed.doctor_name
            )
        ) FILTER (WHERE wed.id IS NOT NULL),
        '[]'::json
    ) as doctors
FROM whitelist_emails we
LEFT JOIN whitelist_email_doctors wed ON we.id = wed.whitelist_email_id
GROUP BY we.id, we.email, we.provider, we.created_at
ORDER BY we.email;

-- 2. Показать только email с их врачами (более читаемый формат)
SELECT 
    we.email,
    we.provider,
    array_agg(wed.doctor_name ORDER BY wed.doctor_name) FILTER (WHERE wed.doctor_name IS NOT NULL) as doctors,
    COUNT(wed.id) as doctors_count
FROM whitelist_emails we
LEFT JOIN whitelist_email_doctors wed ON we.id = wed.whitelist_email_id
GROUP BY we.id, we.email, we.provider
ORDER BY we.email;

-- 3. Показать все связи email-врачи
SELECT 
    wed.id,
    we.email,
    we.provider,
    wed.doctor_name,
    wed.created_at
FROM whitelist_email_doctors wed
JOIN whitelist_emails we ON wed.whitelist_email_id = we.id
ORDER BY we.email, wed.doctor_name;

-- 4. Проверить, есть ли email без врачей
SELECT 
    we.email,
    we.provider,
    COUNT(wed.id) as doctors_count
FROM whitelist_emails we
LEFT JOIN whitelist_email_doctors wed ON we.id = wed.whitelist_email_id
GROUP BY we.id, we.email, we.provider
HAVING COUNT(wed.id) = 0
ORDER BY we.email;

-- 5. Проверить, есть ли связи с несуществующими email
SELECT 
    wed.id,
    wed.whitelist_email_id,
    wed.doctor_name
FROM whitelist_email_doctors wed
LEFT JOIN whitelist_emails we ON wed.whitelist_email_id = we.id
WHERE we.id IS NULL;
