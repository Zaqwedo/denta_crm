-- Исправление связи врача для email kapitancrumpled@gmail.com
-- Выполните этот скрипт в SQL Editor в Supabase

-- 1. Проверить текущие связи для этого email
SELECT 
    we.email,
    wed.id,
    wed.doctor_name,
    wed.created_at
FROM whitelist_emails we
LEFT JOIN whitelist_email_doctors wed ON we.id = wed.whitelist_email_id
WHERE we.email = 'kapitancrumpled@gmail.com'
ORDER BY wed.doctor_name;

-- 2. Если нужно изменить связь с "Ломовцев К.А." на "Абасова Т.М."
-- Сначала удаляем старую связь
DELETE FROM whitelist_email_doctors
WHERE whitelist_email_id IN (
    SELECT id FROM whitelist_emails WHERE email = 'kapitancrumpled@gmail.com'
)
AND doctor_name = 'Ломовцев К.А.';

-- 3. Добавляем новую связь с "Абасова Т.М."
INSERT INTO whitelist_email_doctors (whitelist_email_id, doctor_name)
SELECT 
    we.id,
    'Абасова Т.М.'
FROM whitelist_emails we
WHERE we.email = 'kapitancrumpled@gmail.com'
AND NOT EXISTS (
    SELECT 1 FROM whitelist_email_doctors wed 
    WHERE wed.whitelist_email_id = we.id 
    AND wed.doctor_name = 'Абасова Т.М.'
);

-- 4. Если нужно добавить оба врача (и Ломовцев К.А., и Абасова Т.М.)
-- Сначала удаляем все существующие связи
DELETE FROM whitelist_email_doctors
WHERE whitelist_email_id IN (
    SELECT id FROM whitelist_emails WHERE email = 'kapitancrumpled@gmail.com'
);

-- Затем добавляем оба врача
INSERT INTO whitelist_email_doctors (whitelist_email_id, doctor_name)
SELECT we.id, doctor_name
FROM whitelist_emails we
CROSS JOIN (VALUES 
    ('Ломовцев К.А.'),
    ('Абасова Т.М.')
) AS doctors(doctor_name)
WHERE we.email = 'kapitancrumpled@gmail.com';

-- 5. Проверить результат
SELECT 
    we.email,
    wed.doctor_name,
    COUNT(p.id) as matching_patients_count
FROM whitelist_emails we
JOIN whitelist_email_doctors wed ON we.id = wed.whitelist_email_id
LEFT JOIN patients p ON p."Доктор" = wed.doctor_name
WHERE we.email = 'kapitancrumpled@gmail.com'
GROUP BY we.email, wed.doctor_name
ORDER BY wed.doctor_name;
