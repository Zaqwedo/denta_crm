-- Проверка точного имени врача "Ломовцев К.А." в patients
-- Выполните этот скрипт в SQL Editor в Supabase

-- 1. Проверить все варианты имени "Ломовцев" в patients
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

-- 2. Проверить точное совпадение с "Ломовцев К.А."
SELECT 
    "Доктор",
    COUNT(*) as patients_count
FROM patients
WHERE "Доктор" = 'Ломовцев К.А.'
GROUP BY "Доктор";

-- 3. Проверить варианты с пробелами и без
SELECT 
    "Доктор",
    COUNT(*) as patients_count,
    CASE 
        WHEN "Доктор" = 'Ломовцев К.А.' THEN '✅ ТОЧНОЕ СОВПАДЕНИЕ'
        WHEN "Доктор" = 'Ломовцев К. А.' THEN '❌ С ПРОБЕЛОМ ПОСЛЕ ТОЧКИ'
        WHEN "Доктор" LIKE 'Ломовцев К.%' THEN '⚠️ ЧАСТИЧНОЕ СОВПАДЕНИЕ'
        ELSE '❓ ДРУГОЙ ВАРИАНТ'
    END as match_status
FROM patients
WHERE "Доктор" ILIKE '%ломовцев%'
GROUP BY "Доктор"
ORDER BY "Доктор";

-- 4. Показать несколько примеров пациентов с врачом "Ломовцев"
SELECT 
    id,
    "ФИО",
    "Доктор",
    "Дата записи"
FROM patients
WHERE "Доктор" ILIKE '%ломовцев%'
ORDER BY "Дата записи" DESC
LIMIT 10;
