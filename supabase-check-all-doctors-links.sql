-- Полная проверка всех врачей и их связей с email
-- Выполните этот скрипт в SQL Editor в Supabase

-- 1. Показать всех врачей из таблицы doctors
SELECT 
    id,
    name as doctor_name,
    created_at
FROM doctors
ORDER BY name;

-- 2. Показать всех врачей из whitelist_email_doctors (связанные с email)
SELECT 
    DISTINCT doctor_name,
    COUNT(*) as linked_emails_count,
    array_agg(DISTINCT we.email ORDER BY we.email) as linked_emails
FROM whitelist_email_doctors wed
JOIN whitelist_emails we ON wed.whitelist_email_id = we.id
GROUP BY doctor_name
ORDER BY doctor_name;

-- 3. Сравнить: какие врачи есть в doctors, но не связаны ни с одним email
SELECT 
    d.name as doctor_name,
    COUNT(wed.id) as links_count,
    CASE 
        WHEN COUNT(wed.id) = 0 THEN '❌ НЕ СВЯЗАН С EMAIL'
        ELSE '✅ Связан с email'
    END as status
FROM doctors d
LEFT JOIN whitelist_email_doctors wed ON d.name = wed.doctor_name
GROUP BY d.name
ORDER BY d.name;

-- 4. Сравнить: какие врачи есть в whitelist, но нет в таблице doctors
SELECT 
    DISTINCT wed.doctor_name,
    COUNT(*) as links_count,
    CASE 
        WHEN d.id IS NULL THEN '❌ НЕТ В ТАБЛИЦЕ DOCTORS'
        ELSE '✅ Есть в таблице doctors'
    END as status
FROM whitelist_email_doctors wed
LEFT JOIN doctors d ON d.name = wed.doctor_name
GROUP BY wed.doctor_name, d.id
ORDER BY wed.doctor_name;

-- 5. Показать всех врачей из patients (уникальные)
SELECT 
    "Доктор" as doctor_name,
    COUNT(*) as patients_count
FROM patients
WHERE "Доктор" IS NOT NULL AND "Доктор" != ''
GROUP BY "Доктор"
ORDER BY "Доктор";

-- 6. Полная сводка: врач, есть ли в doctors, есть ли в patients, связан ли с email
WITH all_doctors AS (
    SELECT DISTINCT name as doctor_name FROM doctors
    UNION
    SELECT DISTINCT "Доктор" as doctor_name FROM patients WHERE "Доктор" IS NOT NULL AND "Доктор" != ''
    UNION
    SELECT DISTINCT doctor_name FROM whitelist_email_doctors
)
SELECT 
    ad.doctor_name,
    CASE WHEN d.id IS NOT NULL THEN '✅' ELSE '❌' END as in_doctors_table,
    CASE WHEN COUNT(DISTINCT p.id) > 0 THEN '✅' ELSE '❌' END as has_patients,
    COUNT(DISTINCT p.id) as patients_count,
    CASE WHEN COUNT(DISTINCT wed.id) > 0 THEN '✅' ELSE '❌' END as linked_to_email,
    COUNT(DISTINCT wed.id) as email_links_count,
    array_agg(DISTINCT we.email) FILTER (WHERE we.email IS NOT NULL) as linked_emails
FROM all_doctors ad
LEFT JOIN doctors d ON d.name = ad.doctor_name
LEFT JOIN patients p ON p."Доктор" = ad.doctor_name
LEFT JOIN whitelist_email_doctors wed ON wed.doctor_name = ad.doctor_name
LEFT JOIN whitelist_emails we ON wed.whitelist_email_id = we.id
GROUP BY ad.doctor_name, d.id
ORDER BY ad.doctor_name;

-- 7. Проверить точное совпадение имен: врач в whitelist vs врач в patients
SELECT 
    wed.doctor_name as whitelist_doctor,
    COUNT(DISTINCT we.email) as emails_count,
    COUNT(DISTINCT p.id) FILTER (WHERE p."Доктор" = wed.doctor_name) as exact_match_patients,
    COUNT(DISTINCT p.id) FILTER (WHERE p."Доктор" != wed.doctor_name AND p."Доктор" ILIKE '%' || SPLIT_PART(wed.doctor_name, ' ', 1) || '%') as similar_patients,
    CASE 
        WHEN COUNT(DISTINCT p.id) FILTER (WHERE p."Доктор" = wed.doctor_name) = 0 THEN '❌ НЕТ ТОЧНОГО СОВПАДЕНИЯ'
        ELSE '✅ Есть точное совпадение'
    END as match_status
FROM whitelist_email_doctors wed
JOIN whitelist_emails we ON wed.whitelist_email_id = we.id
LEFT JOIN patients p ON p."Доктор" ILIKE '%' || SPLIT_PART(wed.doctor_name, ' ', 1) || '%'
GROUP BY wed.doctor_name
ORDER BY wed.doctor_name;

-- 8. Детальная информация по каждому email и его врачам
SELECT 
    we.email,
    we.provider,
    array_agg(wed.doctor_name ORDER BY wed.doctor_name) FILTER (WHERE wed.doctor_name IS NOT NULL) as doctors,
    COUNT(wed.id) as doctors_count,
    (
        SELECT COUNT(DISTINCT p2.id)
        FROM whitelist_email_doctors wed2
        JOIN patients p2 ON p2."Доктор" = wed2.doctor_name
        WHERE wed2.whitelist_email_id = we.id
    ) as total_matching_patients
FROM whitelist_emails we
LEFT JOIN whitelist_email_doctors wed ON we.id = wed.whitelist_email_id
GROUP BY we.id, we.email, we.provider
ORDER BY we.email;
