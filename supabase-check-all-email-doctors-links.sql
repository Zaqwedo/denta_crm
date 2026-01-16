-- Полная диагностика всех связей email-врачи
-- Выполните этот скрипт в SQL Editor в Supabase

-- 1. Показать все email с их врачами
SELECT 
    we.email,
    we.provider,
    COALESCE(array_agg(wed.doctor_name ORDER BY wed.doctor_name) FILTER (WHERE wed.doctor_name IS NOT NULL), ARRAY[]::text[]) as doctors,
    COUNT(wed.id) as doctors_count
FROM whitelist_emails we
LEFT JOIN whitelist_email_doctors wed ON we.id = wed.whitelist_email_id
GROUP BY we.id, we.email, we.provider
ORDER BY we.email;

-- 2. Проверить точное совпадение имен врачей
-- Показывает, есть ли пациенты для каждого врача из whitelist
SELECT 
    we.email,
    wed.doctor_name as whitelist_doctor,
    COUNT(DISTINCT p.id) as matching_patients_count,
    CASE 
        WHEN COUNT(DISTINCT p.id) = 0 THEN '❌ НЕТ СОВПАДЕНИЙ'
        ELSE '✅ Есть совпадения'
    END as status
FROM whitelist_emails we
JOIN whitelist_email_doctors wed ON we.id = wed.whitelist_email_id
LEFT JOIN patients p ON p."Доктор" = wed.doctor_name
GROUP BY we.email, wed.doctor_name
ORDER BY we.email, wed.doctor_name;

-- 3. Найти несоответствия имен (врач в whitelist, но нет точного совпадения в patients)
SELECT 
    we.email,
    wed.doctor_name as whitelist_doctor,
    array_agg(DISTINCT p."Доктор") FILTER (WHERE p."Доктор" IS NOT NULL AND p."Доктор" ILIKE '%' || SPLIT_PART(wed.doctor_name, ' ', 1) || '%') as similar_doctors_in_patients,
    CASE 
        WHEN COUNT(p.id) FILTER (WHERE p."Доктор" = wed.doctor_name) = 0 THEN '❌ НЕТ ТОЧНОГО СОВПАДЕНИЯ'
        ELSE '✅ Точное совпадение есть'
    END as status
FROM whitelist_emails we
JOIN whitelist_email_doctors wed ON we.id = wed.whitelist_email_id
LEFT JOIN patients p ON p."Доктор" ILIKE '%' || SPLIT_PART(wed.doctor_name, ' ', 1) || '%'
GROUP BY we.email, wed.doctor_name
HAVING COUNT(p.id) FILTER (WHERE p."Доктор" = wed.doctor_name) = 0
ORDER BY we.email, wed.doctor_name;

-- 4. Показать все уникальные имена врачей в patients
SELECT 
    "Доктор",
    COUNT(*) as patients_count
FROM patients
WHERE "Доктор" IS NOT NULL AND "Доктор" != ''
GROUP BY "Доктор"
ORDER BY "Доктор";

-- 5. Показать все уникальные имена врачей в whitelist
SELECT 
    DISTINCT doctor_name,
    COUNT(*) as links_count
FROM whitelist_email_doctors
GROUP BY doctor_name
ORDER BY doctor_name;

-- 6. Сравнить: какие врачи есть в whitelist, но нет в patients (точное совпадение)
SELECT 
    DISTINCT wed.doctor_name as whitelist_doctor,
    COUNT(DISTINCT we.email) as emails_count,
    COUNT(DISTINCT p.id) FILTER (WHERE p."Доктор" = wed.doctor_name) as matching_patients_count
FROM whitelist_email_doctors wed
JOIN whitelist_emails we ON wed.whitelist_email_id = we.id
LEFT JOIN patients p ON p."Доктор" = wed.doctor_name
GROUP BY wed.doctor_name
HAVING COUNT(DISTINCT p.id) FILTER (WHERE p."Доктор" = wed.doctor_name) = 0
ORDER BY wed.doctor_name;
