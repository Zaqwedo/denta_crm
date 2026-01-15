-- Форматирование времени в формат HH:MM (час:минута) без секунд
-- Выполните этот скрипт в SQL Editor в Supabase

-- =====================================================
-- 1. ПРОВЕРКА ТЕКУЩЕГО ФОРМАТА ВРЕМЕНИ
-- =====================================================

-- Проверяем тип колонки
SELECT 
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name = 'patients'
AND column_name = 'Время записи'
AND table_schema = 'public';

-- Показываем примеры текущих значений
SELECT 
    id,
    "ФИО",
    "Время записи",
    TO_CHAR("Время записи", 'HH24:MI:SS') as time_with_seconds,
    TO_CHAR("Время записи", 'HH24:MI') as time_without_seconds
FROM patients
WHERE "Время записи" IS NOT NULL
LIMIT 10;

-- =====================================================
-- 2. ОБНОВЛЕНИЕ ВРЕМЕНИ: ОБНУЛЕНИЕ СЕКУНД
-- =====================================================
-- Обновляем все значения времени, обнуляя секунды
-- (если колонка имеет тип TIME, секунды все равно хранятся, но будут равны 00)

UPDATE patients
SET "Время записи" = 
    CASE 
        WHEN "Время записи" IS NOT NULL THEN
            -- Берем только часы и минуты, обнуляем секунды
            (DATE_TRUNC('hour', "Время записи") + 
             (EXTRACT(MINUTE FROM "Время записи") || ' minutes')::INTERVAL)::TIME
        ELSE
            NULL
    END
WHERE "Время записи" IS NOT NULL;

-- =====================================================
-- 3. ПРИМЕРЫ SELECT ЗАПРОСОВ С ФОРМАТОМ HH:MM
-- =====================================================

-- Пример 1: Выборка времени в формате HH:MM
SELECT 
    id,
    "ФИО",
    "Дата записи",
    TO_CHAR("Время записи", 'HH24:MI') as "Время записи"
FROM patients
WHERE "Время записи" IS NOT NULL
ORDER BY "Дата записи" DESC, "Время записи" DESC
LIMIT 20;

-- Пример 2: Выборка с проверкой формата
SELECT 
    id,
    "ФИО",
    "Время записи" as "Время (TIME тип)",
    TO_CHAR("Время записи", 'HH24:MI') as "Время (HH:MM)",
    TO_CHAR("Время записи", 'HH24:MI:SS') as "Время (HH:MM:SS)"
FROM patients
WHERE "Время записи" IS NOT NULL
LIMIT 10;

-- =====================================================
-- 4. ПРОВЕРКА РЕЗУЛЬТАТОВ
-- =====================================================

-- Проверяем, что все секунды обнулены
SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN EXTRACT(SECOND FROM "Время записи") = 0 THEN 1 END) as records_with_zero_seconds,
    COUNT(CASE WHEN EXTRACT(SECOND FROM "Время записи") != 0 THEN 1 END) as records_with_nonzero_seconds
FROM patients
WHERE "Время записи" IS NOT NULL;

-- Показываем несколько примеров после обновления
SELECT 
    id,
    "ФИО",
    "Время записи",
    TO_CHAR("Время записи", 'HH24:MI') as formatted_time,
    EXTRACT(SECOND FROM "Время записи") as seconds
FROM patients
WHERE "Время записи" IS NOT NULL
LIMIT 10;
