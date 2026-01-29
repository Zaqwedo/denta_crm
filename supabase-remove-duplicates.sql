-- Удаление полных дубликатов из таблицы patients
-- Выполните этот скрипт в SQL Editor в Supabase
-- ВНИМАНИЕ: Сначала проверьте количество дубликатов, затем удалите их
-- ЛОГИКА: Дубликаты определяются по всем полям КРОМЕ статуса. 
--         Если есть несколько записей с одинаковыми данными, оставляется запись со статусом "Завершен"
--         Если все записи имеют статус "Завершен", оставляется самая старая (по created_at)

-- =====================================================
-- 1. ПРОВЕРКА ДУБЛИКАТОВ
-- =====================================================

-- Показать количество дубликатов (записи с одинаковыми значениями всех полей кроме статуса, id, created_at, updated_at)
SELECT 
    "ФИО",
    COALESCE("Телефон"::text, '') as "Телефон",
    COALESCE("Комментарии"::text, '') as "Комментарии",
    COALESCE("Дата записи"::text, '') as "Дата записи",
    COALESCE("Время записи"::text, '') as "Время записи",
    COALESCE("Доктор"::text, '') as "Доктор",
    COALESCE("Зубы"::text, '') as "Зубы",
    COALESCE("Медсестра"::text, '') as "Медсестра",
    COALESCE("Дата рождения пациента"::text, '') as "Дата рождения пациента",
    COALESCE(created_by_email::text, '') as created_by_email,
    COUNT(*) as duplicate_count,
    STRING_AGG(DISTINCT COALESCE("Статус"::text, ''), ', ') as statuses
FROM patients
GROUP BY 
    "ФИО",
    COALESCE("Телефон"::text, ''),
    COALESCE("Комментарии"::text, ''),
    COALESCE("Дата записи"::text, ''),
    COALESCE("Время записи"::text, ''),
    COALESCE("Доктор"::text, ''),
    COALESCE("Зубы"::text, ''),
    COALESCE("Медсестра"::text, ''),
    COALESCE("Дата рождения пациента"::text, ''),
    COALESCE(created_by_email::text, '')
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Показать все дубликаты с их ID и статусами
WITH duplicates AS (
    SELECT 
        id,
        "ФИО",
        "Телефон",
        "Комментарии",
        "Дата записи",
        "Время записи",
        "Статус",
        "Доктор",
        "Зубы",
        "Медсестра",
        "Дата рождения пациента",
        created_by_email,
        created_at,
        ROW_NUMBER() OVER (
            PARTITION BY 
                "ФИО",
                COALESCE("Телефон"::text, ''),
                COALESCE("Комментарии"::text, ''),
                COALESCE("Дата записи"::text, ''),
                COALESCE("Время записи"::text, ''),
                COALESCE("Доктор"::text, ''),
                COALESCE("Зубы"::text, ''),
                COALESCE("Медсестра"::text, ''),
                COALESCE("Дата рождения пациента"::text, ''),
                COALESCE(created_by_email::text, '')
            ORDER BY 
                CASE WHEN COALESCE("Статус"::text, '') = 'Завершен' THEN 0 ELSE 1 END,
                created_at ASC
        ) as row_num
    FROM patients
)
SELECT 
    id,
    "ФИО",
    "Телефон",
    "Дата записи",
    "Время записи",
    "Статус",
    created_at,
    CASE 
        WHEN row_num = 1 THEN 'ОСТАВИТЬ'
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
-- 2. УДАЛЕНИЕ ДУБЛИКАТОВ (ПО СТАТУСУ)
-- =====================================================
-- ВНИМАНИЕ: Этот запрос удалит дубликаты, оставив запись со статусом "Завершен"
-- Если все записи имеют статус "Завершен", оставит самую старую (по created_at)
-- Раскомментируйте и выполните после проверки выше

DELETE FROM patients
WHERE id IN (
    SELECT id
    FROM (
        SELECT 
            id,
            "Статус",
            ROW_NUMBER() OVER (
                PARTITION BY 
                    "ФИО",
                    COALESCE("Телефон"::text, ''),
                    COALESCE("Комментарии"::text, ''),
                    COALESCE("Дата записи"::text, ''),
                    COALESCE("Время записи"::text, ''),
                    COALESCE("Доктор"::text, ''),
                    COALESCE("Зубы"::text, ''),
                    COALESCE("Медсестра"::text, ''),
                    COALESCE("Дата рождения пациента"::text, ''),
                    COALESCE(created_by_email::text, '')
                ORDER BY 
                    CASE WHEN COALESCE("Статус"::text, '') = 'Завершен' THEN 0 ELSE 1 END,
                    created_at ASC
            ) as row_num
        FROM patients
    ) duplicates
    WHERE row_num > 1
);

-- =====================================================
-- 3. ПРОВЕРКА РЕЗУЛЬТАТА
-- =====================================================

-- После удаления проверьте, что дубликатов больше нет
SELECT 
    COUNT(*) as total_patients
FROM patients;

-- Проверка на наличие дубликатов после удаления
SELECT 
    COUNT(*) as remaining_duplicates
FROM (
    SELECT 
        "ФИО",
        COALESCE("Телефон"::text, '') as "Телефон",
        COALESCE("Комментарии"::text, '') as "Комментарии",
        COALESCE("Дата записи"::text, '') as "Дата записи",
        COALESCE("Время записи"::text, '') as "Время записи",
        COALESCE("Доктор"::text, '') as "Доктор",
        COALESCE("Зубы"::text, '') as "Зубы",
        COALESCE("Медсестра"::text, '') as "Медсестра",
        COALESCE("Дата рождения пациента"::text, '') as "Дата рождения пациента",
        COALESCE(created_by_email::text, '') as created_by_email,
        COUNT(*) as cnt
    FROM patients
    GROUP BY 
        "ФИО",
        COALESCE("Телефон"::text, ''),
        COALESCE("Комментарии"::text, ''),
        COALESCE("Дата записи"::text, ''),
        COALESCE("Время записи"::text, ''),
        COALESCE("Доктор"::text, ''),
        COALESCE("Зубы"::text, ''),
        COALESCE("Медсестра"::text, ''),
        COALESCE("Дата рождения пациента"::text, ''),
        COALESCE(created_by_email::text, '')
    HAVING COUNT(*) > 1
) duplicates;
