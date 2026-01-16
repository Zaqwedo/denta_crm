-- Диагностика фильтрации для email kapitancrumpled@gmail.com
-- Выполните этот скрипт в SQL Editor в Supabase

-- 1. Проверить, есть ли email в whitelist
SELECT 
    id,
    email,
    provider,
    created_at
FROM whitelist_emails
WHERE email = 'kapitancrumpled@gmail.com';

-- 2. Проверить связи с врачами для этого email
SELECT 
    we.id as whitelist_email_id,
    we.email,
    wed.id as link_id,
    wed.doctor_name,
    wed.created_at
FROM whitelist_emails we
LEFT JOIN whitelist_email_doctors wed ON we.id = wed.whitelist_email_id
WHERE we.email = 'kapitancrumpled@gmail.com';

-- 3. Проверить, сколько пациентов у врача "Ломовцев К.А."
SELECT 
    "Доктор",
    COUNT(*) as patients_count
FROM patients
WHERE "Доктор" = 'Ломовцев К.А.'
GROUP BY "Доктор";

-- 4. Проверить все варианты имени "Ломовцев" в patients (с учетом регистра и пробелов)
SELECT 
    DISTINCT "Доктор",
    LENGTH("Доктор") as name_length,
    TRIM("Доктор") as trimmed_name,
    LOWER("Доктор") as lowercased_name,
    COUNT(*) as patients_count
FROM patients
WHERE "Доктор" ILIKE '%ломовцев%'
GROUP BY "Доктор"
ORDER BY "Доктор";

-- 5. Проверить точное совпадение: есть ли пациенты с врачом из whitelist
SELECT 
    we.email,
    wed.doctor_name as whitelist_doctor,
    COUNT(p.id) as matching_patients_count,
    CASE 
        WHEN COUNT(p.id) = 0 THEN 'НЕТ СОВПАДЕНИЙ - проблема!'
        ELSE 'Есть совпадения'
    END as status
FROM whitelist_emails we
JOIN whitelist_email_doctors wed ON we.id = wed.whitelist_email_id
LEFT JOIN patients p ON p."Доктор" = wed.doctor_name
WHERE we.email = 'kapitancrumpled@gmail.com'
GROUP BY we.email, wed.doctor_name;

-- 6. Проверить, какие врачи есть в patients (все уникальные)
SELECT 
    "Доктор",
    COUNT(*) as patients_count
FROM patients
WHERE "Доктор" IS NOT NULL AND "Доктор" != ''
GROUP BY "Доктор"
ORDER BY "Доктор";

-- 7. Симуляция фильтрации: какие пациенты должны быть видны для этого email
SELECT 
    p.id,
    p."ФИО",
    p."Доктор",
    wed.doctor_name as whitelist_doctor,
    CASE 
        WHEN p."Доктор" = wed.doctor_name THEN 'ДОЛЖЕН БЫТЬ ВИДЕН'
        ELSE 'НЕ ДОЛЖЕН БЫТЬ ВИДЕН'
    END as should_be_visible
FROM patients p
CROSS JOIN (
    SELECT wed.doctor_name
    FROM whitelist_emails we
    JOIN whitelist_email_doctors wed ON we.id = wed.whitelist_email_id
    WHERE we.email = 'kapitancrumpled@gmail.com'
) wed
WHERE p."Доктор" = wed.doctor_name
ORDER BY p."Доктор", p."ФИО"
LIMIT 20;
