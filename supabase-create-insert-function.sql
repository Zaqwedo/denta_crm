-- Создание SQL функции для безопасной вставки пациентов с явным приведением типов
-- Выполните этот скрипт в SQL Editor в Supabase

CREATE OR REPLACE FUNCTION insert_patient_safe(
    p_fio TEXT,
    p_telefon TEXT DEFAULT NULL,
    p_kommentarii TEXT DEFAULT NULL,
    p_data_zapisi TEXT DEFAULT NULL,
    p_vremya_zapisi TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_doktor TEXT DEFAULT NULL,
    p_zuby TEXT DEFAULT NULL,
    p_medsestra TEXT DEFAULT NULL,
    p_data_rozhdeniya TEXT DEFAULT NULL,
    p_created_by_email TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_id UUID;
BEGIN
    INSERT INTO patients (
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
        created_by_email
    ) VALUES (
        p_fio,
        NULLIF(p_telefon, ''),
        NULLIF(p_kommentarii, ''),
        NULLIF(p_data_zapisi, ''),
        NULLIF(p_vremya_zapisi, ''),
        NULLIF(p_status, ''),
        NULLIF(p_doktor, ''),
        NULLIF(p_zuby, ''),
        NULLIF(p_medsestra, ''),
        NULLIF(p_data_rozhdeniya, '')::TEXT,  -- Явное приведение к TEXT
        NULLIF(p_created_by_email, '')
    )
    RETURNING id INTO new_id;
    
    RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- Проверка функции
SELECT insert_patient_safe(
    'Тестовый пациент',
    '1234567890',
    'Тестовый комментарий',
    '01.01.2024',
    '10:00',
    'Завершен',
    'Тестовый доктор',
    '1,2,3',
    'Тестовая медсестра',
    '01.01.1990',  -- Дата рождения как строка
    NULL
);

-- Удаление тестовой записи
DELETE FROM patients WHERE "ФИО" = 'Тестовый пациент';
