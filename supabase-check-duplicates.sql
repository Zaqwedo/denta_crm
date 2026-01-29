-- Проверка всех дубликатов в таблице patients
-- Выполните этот запрос в SQL Editor в Supabase

-- =====================================================
-- 1. КРАТКАЯ СТАТИСТИКА ДУБЛИКАТОВ
-- =====================================================

-- Показать количество дубликатов
SELECT 
    COUNT(*) as total_duplicate_groups,
    SUM(duplicate_count - 1) as total_duplicate_records_to_delete
FROM (
    SELECT 
        COUNT(*) as duplicate_count
    FROM patients
    GROUP BY 
        "ФИО",
        COALESCE("Телефон"::text, ''),
        COALESCE("Комментарии"::text, ''),
        COALESCE("Дата записи"::text, ''),
        COALESCE("Время записи"::text, ''),
        COALESCE("Статус"::text, ''),
        COALESCE("Доктор"::text, ''),
        COALESCE("Зубы"::text, ''),
        COALESCE("Медсестра"::text, ''),
        COALESCE("Дата рождения пациента"::text, ''),
        COALESCE(created_by_email::text, '')
    HAVING COUNT(*) > 1
) duplicates;

-- =====================================================
-- 2. ДЕТАЛЬНЫЙ СПИСОК ДУБЛИКАТОВ
-- =====================================================

-- Показать все группы дубликатов с количеством
SELECT 
    "ФИО",
    COALESCE("Телефон"::text, '') as "Телефон",
    COALESCE("Дата записи"::text, '') as "Дата записи",
    COALESCE("Время записи"::text, '') as "Время записи",
    COALESCE("Доктор"::text, '') as "Доктор",
    COUNT(*) as duplicate_count,
    MIN(created_at) as first_created,
    MAX(created_at) as last_created
FROM patients
GROUP BY 
    "ФИО",
    COALESCE("Телефон"::text, ''),
    COALESCE("Комментарии"::text, ''),
    COALESCE("Дата записи"::text, ''),
    COALESCE("Время записи"::text, ''),
    COALESCE("Статус"::text, ''),
    COALESCE("Доктор"::text, ''),
    COALESCE("Зубы"::text, ''),
    COALESCE("Медсестра"::text, ''),
    COALESCE("Дата рождения пациента"::text, ''),
    COALESCE(created_by_email::text, '')
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, "ФИО";

-- =====================================================
-- 3. ВСЕ ДУБЛИКАТЫ С ID (для просмотра перед удалением)
-- =====================================================

-- Показать все записи-дубликаты с их ID
WITH duplicates AS (
    SELECT 
        id,
        "ФИО",
        COALESCE("Телефон"::text, '') as "Телефон",
        COALESCE("Дата записи"::text, '') as "Дата записи",
        COALESCE("Время записи"::text, '') as "Время записи",
        COALESCE("Доктор"::text, '') as "Доктор",
        COALESCE("Статус"::text, '') as "Статус",
        created_at,
        ROW_NUMBER() OVER (
            PARTITION BY 
                "ФИО",
                COALESCE("Телефон"::text, ''),
                COALESCE("Комментарии"::text, ''),
                COALESCE("Дата записи"::text, ''),
                COALESCE("Время записи"::text, ''),
                COALESCE("Статус"::text, ''),
                COALESCE("Доктор"::text, ''),
                COALESCE("Зубы"::text, ''),
                COALESCE("Медсестра"::text, ''),
                COALESCE("Дата рождения пациента"::text, ''),
                COALESCE(created_by_email::text, '')
            ORDER BY created_at ASC
        ) as row_num
    FROM patients
)
SELECT 
    id,
    "ФИО",
    "Телефон",
    "Дата записи",
    "Время записи",
    "Доктор",
    "Статус",
    created_at,
    CASE 
        WHEN row_num = 1 THEN 'ОСТАВИТЬ (самая старая)'
        ELSE 'УДАЛИТЬ'
    END as action
FROM duplicates
WHERE row_num > 1 OR id IN (
    SELECT id FROM duplicates WHERE row_num = 1 AND id IN (
        SELECT id FROM duplicates WHERE row_num > 1
    )
)
ORDER BY "ФИО", created_at, row_num;

-- =====================================================
-- 4. ПРОСТАЯ ПРОВЕРКА: ЕСТЬ ЛИ ДУБЛИКАТЫ?
-- =====================================================

-- Быстрая проверка наличия дубликатов
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1
            FROM patients
            GROUP BY 
                "ФИО",
                COALESCE("Телефон"::text, ''),
                COALESCE("Комментарии"::text, ''),
                COALESCE("Дата записи"::text, ''),
                COALESCE("Время записи"::text, ''),
                COALESCE("Статус"::text, ''),
                COALESCE("Доктор"::text, ''),
                COALESCE("Зубы"::text, ''),
                COALESCE("Медсестра"::text, ''),
                COALESCE("Дата рождения пациента"::text, ''),
                COALESCE(created_by_email::text, '')
            HAVING COUNT(*) > 1
        ) THEN 'ДА, есть дубликаты'
        ELSE 'НЕТ, дубликатов нет'
    END as has_duplicates;
