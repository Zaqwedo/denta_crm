-- Исправление имен врачей в whitelist_email_doctors для соответствия именам в patients
-- Выполните этот скрипт в SQL Editor в Supabase

-- 1. Показать текущие несоответствия
SELECT 
    wed.id,
    wed.doctor_name as whitelist_doctor_name,
    we.email,
    COUNT(DISTINCT p."Доктор") as matching_patients_doctors_count,
    array_agg(DISTINCT p."Доктор") FILTER (WHERE p."Доктор" IS NOT NULL) as patients_doctor_names
FROM whitelist_email_doctors wed
JOIN whitelist_emails we ON wed.whitelist_email_id = we.id
LEFT JOIN patients p ON p."Доктор" ILIKE '%' || wed.doctor_name || '%'
WHERE we.email = 'kapkapitancrumpled@gmail.com'
GROUP BY wed.id, wed.doctor_name, we.email;

-- 2. Исправить "Абасов" на "Абасова Т.М." для email kapkapitancrumpled@gmail.com
UPDATE whitelist_email_doctors
SET doctor_name = 'Абасова Т.М.'
WHERE whitelist_email_id IN (
    SELECT id FROM whitelist_emails WHERE email = 'kapkapitancrumpled@gmail.com'
)
AND doctor_name IN ('Абасов', 'Абасова', 'абасов', 'абасова');

-- 3. Проверить результат
SELECT 
    we.email,
    wed.doctor_name,
    COUNT(p.id) as matching_patients_count
FROM whitelist_emails we
JOIN whitelist_email_doctors wed ON we.id = wed.whitelist_email_id
LEFT JOIN patients p ON p."Доктор" = wed.doctor_name
WHERE we.email = 'kapkapitancrumpled@gmail.com'
GROUP BY we.email, wed.doctor_name;

-- 4. Универсальный скрипт: найти и исправить все несоответствия
-- Находит врачей в whitelist, которые не имеют точного совпадения в patients
-- и пытается найти похожие имена
WITH whitelist_doctors AS (
    SELECT 
        wed.id,
        wed.whitelist_email_id,
        wed.doctor_name,
        we.email
    FROM whitelist_email_doctors wed
    JOIN whitelist_emails we ON wed.whitelist_email_id = we.id
),
matching_doctors AS (
    SELECT DISTINCT
        wd.id,
        wd.doctor_name as whitelist_name,
        p."Доктор" as patient_doctor_name
    FROM whitelist_doctors wd
    LEFT JOIN patients p ON p."Доктор" ILIKE '%' || wd.doctor_name || '%'
    WHERE p."Доктор" IS NOT NULL
)
SELECT 
    wd.email,
    wd.doctor_name as current_whitelist_name,
    md.patient_doctor_name as suggested_patient_name,
    CASE 
        WHEN md.patient_doctor_name IS NULL THEN 'НЕ НАЙДЕНО в patients'
        WHEN md.patient_doctor_name = wd.doctor_name THEN 'ТОЧНОЕ СОВПАДЕНИЕ'
        ELSE 'ЧАСТИЧНОЕ СОВПАДЕНИЕ - нужно исправить'
    END as status
FROM whitelist_doctors wd
LEFT JOIN matching_doctors md ON md.id = wd.id
ORDER BY wd.email, wd.doctor_name;
