-- Проверка имен врачей для email kapkapitancrumpled@gmail.com
-- Выполните этот скрипт в SQL Editor в Supabase

-- 1. Проверить связи для этого email
SELECT 
    we.email,
    wed.doctor_name as whitelist_doctor_name,
    wed.created_at
FROM whitelist_emails we
LEFT JOIN whitelist_email_doctors wed ON we.id = wed.whitelist_email_id
WHERE we.email = 'kapkapitancrumpled@gmail.com'
ORDER BY wed.doctor_name;

-- 2. Проверить, какие имена врачей есть в таблице patients (похожие на "Абасов")
SELECT 
    "Доктор",
    COUNT(*) as patients_count
FROM patients
WHERE "Доктор" ILIKE '%абасов%'
GROUP BY "Доктор"
ORDER BY "Доктор";

-- 3. Проверить все уникальные имена врачей в patients
SELECT 
    "Доктор",
    COUNT(*) as patients_count
FROM patients
WHERE "Доктор" IS NOT NULL AND "Доктор" != ''
GROUP BY "Доктор"
ORDER BY "Доктор";

-- 4. Проверить точное совпадение: есть ли пациенты с врачом, который указан в whitelist
SELECT 
    we.email,
    wed.doctor_name as whitelist_doctor,
    COUNT(p.id) as matching_patients_count
FROM whitelist_emails we
JOIN whitelist_email_doctors wed ON we.id = wed.whitelist_email_id
LEFT JOIN patients p ON p."Доктор" = wed.doctor_name
WHERE we.email = 'kapkapitancrumpled@gmail.com'
GROUP BY we.email, wed.doctor_name;

-- 5. Проверить все варианты имен врачей, похожих на "Абасов" (с учетом регистра и пробелов)
SELECT 
    DISTINCT "Доктор",
    LENGTH("Доктор") as name_length,
    TRIM("Доктор") as trimmed_name,
    LOWER("Доктор") as lowercased_name
FROM patients
WHERE "Доктор" ILIKE '%абасов%'
ORDER BY "Доктор";
