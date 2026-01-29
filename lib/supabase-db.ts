'use server';

import { supabase, ensureAnonymousSession } from '../lib/supabase'
import { logger } from './logger'
import { getDoctorsForEmailByEmail, getNursesForEmailByEmail } from './admin-db'
import { cookies } from 'next/headers'
import { checkAdminAuth } from './auth-check'

/**
 * Безопасно устанавливает анонимную сессию, игнорируя ошибки об отключенной анонимной аутентификации
 */
async function safeEnsureAnonymousSession(): Promise<void> {
  try {
    await ensureAnonymousSession()
  } catch (authError: any) {
    // Игнорируем ошибку, если анонимная аутентификация отключена
    if (authError?.code === 'anonymous_provider_disabled' || authError?.status === 422) {
      // Просто продолжаем без сессии - возможно RLS политики разрешают доступ
      return
    }
    // Пробрасываем другие ошибки
    throw authError
  }
}

export interface PatientData {
  id?: string; // ID записи (UUID)
  ФИО: string; // ФИО (обязательное)
  Телефон?: string; // Телефон
  Комментарии?: string; // Комментарии
  'Дата записи'?: string; // Дата записи
  'Время записи'?: string; // Время записи
  Статус?: string; // Статус
  Доктор?: string; // Доктор
  Зубы?: string; // Зубы
  Медсестра?: string; // Медсестра
  'Дата рождения пациента'?: string; // Дата рождения пациента
  created_by_email?: string; // Почта того, кто создал запись
}

/**
 * Получает данные из таблицы 'patients' Supabase
 * @param userEmail Email пользователя для фильтрации по врачам (опционально, если не указан, читается из cookie)
 * @returns Массив объектов с данными пациентов
 */
export async function getPatients(userEmail?: string): Promise<PatientData[]> {
  try {
    // Устанавливаем анонимную сессию для RLS
    await safeEnsureAnonymousSession()

    // Проверяем, является ли пользователь админом
    // Админ всегда видит всех пациентов без фильтрации
    const isAdmin = await checkAdminAuth()

    logger.info('getPatients: начало', {
      isAdmin,
      userEmail,
      timestamp: new Date().toISOString(),
      warning: isAdmin ? 'Пользователь определяется как АДМИН - фильтрация НЕ применяется!' : 'Пользователь НЕ админ - фильтрация будет применена'
    })

    let query = supabase.from('patients').select('*')
    let email: string | undefined = userEmail // Объявляем email вне блока для использования в логах

    // Если пользователь не админ, применяем фильтрацию по врачам
    if (!isAdmin) {
      // Если email не передан, пытаемся получить из cookie
      if (!email) {
        try {
          const cookieStore = await cookies()
          const emailCookie = cookieStore.get('denta_user_email')
          email = emailCookie?.value
          logger.info('getPatients: email получен из cookie', {
            email: email,
            hasCookie: !!emailCookie,
            cookieValue: emailCookie?.value
          })
        } catch (error) {
          logger.error('getPatients: ошибка чтения cookie', { error })
          // Игнорируем ошибки чтения cookie
        }
      } else {
        logger.info('getPatients: email передан как параметр', { email })
      }

      // Если есть email пользователя, проверяем ограничения по врачам
      if (email) {
        const normalizedEmail = email.toLowerCase().trim()
        logger.info('getPatients: проверка ограничений по врачам', {
          email: normalizedEmail
        })

        const allowedDoctors = await getDoctorsForEmailByEmail(normalizedEmail)
        const allowedNurses = await getNursesForEmailByEmail(normalizedEmail)

        logger.info('getPatients: получены ограничения', {
          email: normalizedEmail,
          allowedDoctors,
          allowedNurses,
        })

        // Если указаны врачи ИЛИ медсестры - формируем фильтр
        if (allowedDoctors.length > 0 || allowedNurses.length > 0) {
          const filterParts: string[] = []

          if (allowedDoctors.length > 0) {
            const doctors = allowedDoctors.map(d => `"${d.trim()}"`).join(',')
            filterParts.push(`Доктор.in.(${doctors})`)
          }

          if (allowedNurses.length > 0) {
            const nurses = allowedNurses.map(n => `"${n.trim()}"`).join(',')
            filterParts.push(`Медсестра.in.(${nurses})`)
          }

          const filterStr = filterParts.join(',')
          query = query.or(filterStr)

          logger.info('getPatients: применен фильтр or()', { filterStr })
        } else {
          // Если ничего не указано - ничего не показываем
          query = query.eq('Доктор', '__NONE__')
        }
      } else {
        // Если email не найден - НЕ показываем пациентов
        query = query.eq('Доктор', '__NO_EMAIL__')
      }
    } else {
      // Если админ, пытаемся получить email для логов, но не применяем фильтр
      logger.info('getPatients: пользователь является админом, показываем всех пациентов без фильтрации')
      if (!email) {
        try {
          const cookieStore = await cookies()
          const emailCookie = cookieStore.get('denta_user_email')
          email = emailCookie?.value
        } catch (error) {
          // Игнорируем ошибки чтения cookie
        }
      }
    }
    // Если админ - не применяем фильтрацию, показываем всех пациентов

    const { data, error } = await query

    // Логируем результат запроса
    logger.info('getPatients: результат запроса', {
      isAdmin,
      email: email ? email.toLowerCase().trim() : 'не указан',
      patientsCount: data?.length || 0,
      hasError: !!error,
      errorMessage: error?.message
    })

    // Если есть данные, логируем уникальных врачей в результате
    if (data && data.length > 0) {
      const uniqueDoctors = [...new Set(data.map(p => p.Доктор).filter(Boolean))]
      logger.info('getPatients: врачи в результате запроса', {
        email: email ? email.toLowerCase().trim() : 'не указан',
        uniqueDoctors,
        uniqueDoctorsCount: uniqueDoctors.length,
        totalPatients: data.length
      })

      // Если не админ и есть email, проверяем, соответствуют ли врачи в результате разрешенным
      if (!isAdmin && email) {
        const normalizedEmail = email.toLowerCase().trim()
        const allowedDoctors = await getDoctorsForEmailByEmail(normalizedEmail)

        logger.info('getPatients: сравнение врачей в результате с разрешенными', {
          email: normalizedEmail,
          allowedDoctors,
          doctorsInResult: uniqueDoctors,
          allowedDoctorsCount: allowedDoctors.length,
          doctorsInResultCount: uniqueDoctors.length
        })

        if (allowedDoctors.length > 0) {
          // Проверяем точное совпадение
          const exactMatches = uniqueDoctors.filter(d => allowedDoctors.includes(d))
          const unexpectedDoctors = uniqueDoctors.filter(d => !allowedDoctors.includes(d))

          logger.info('getPatients: анализ совпадений', {
            email: normalizedEmail,
            exactMatches,
            exactMatchesCount: exactMatches.length,
            unexpectedDoctors,
            unexpectedDoctorsCount: unexpectedDoctors.length
          })

          if (unexpectedDoctors.length > 0) {
            logger.warn('getPatients: ВНИМАНИЕ - в результате есть врачи, которых нет в whitelist!', {
              email: normalizedEmail,
              allowedDoctors,
              unexpectedDoctors,
              allDoctorsInResult: uniqueDoctors,
              warning: 'Возможно, проблема с точным совпадением имен врачей!'
            })
          }

          // Проверяем, все ли разрешенные врачи есть в результате
          const missingDoctors = allowedDoctors.filter(d => !uniqueDoctors.includes(d))
          if (missingDoctors.length > 0) {
            logger.warn('getPatients: ВНИМАНИЕ - некоторые разрешенные врачи отсутствуют в результате!', {
              email: normalizedEmail,
              allowedDoctors,
              missingDoctors,
              doctorsInResult: uniqueDoctors,
              warning: 'Возможно, у этих врачей нет пациентов или проблема с фильтрацией!'
            })
          }
        } else {
          logger.warn('getPatients: ВНИМАНИЕ - allowedDoctors пустой, но есть результат!', {
            email: normalizedEmail,
            doctorsInResult: uniqueDoctors,
            warning: 'Это означает, что фильтр не применялся!'
          })
        }
      }
    }

    if (error) {
      logger.error('Ошибка при получении данных пациентов из Supabase:', error);

      // Более детальная обработка ошибок
      if (error.message.includes('fetch failed') || error.message.includes('network')) {
        throw new Error(`Ошибка подключения к Supabase. Проверьте NEXT_PUBLIC_SUPABASE_URL: ${error.message}`);
      } else if (error.message.includes('Invalid API key') || error.message.includes('JWT')) {
        throw new Error(`Неверный API ключ Supabase. Проверьте NEXT_PUBLIC_SUPABASE_ANON_KEY: ${error.message}`);
      } else {
        throw new Error(`Ошибка Supabase: ${error.message}`);
      }
    }

    // Supabase возвращает массив объектов, каждый из которых соответствует строке таблицы
    // Приводим типы к PatientData
    return data as PatientData[];

  } catch (error) {
    logger.error('Ошибка при получении данных пациентов:', error);

    // Если это уже наша ошибка, пробрасываем как есть
    if (error instanceof Error && error.message.startsWith('Ошибка')) {
      throw error;
    }

    // Иначе оборачиваем в понятное сообщение
    throw new Error(`Ошибка при загрузке пациентов: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Получает историю изменений для конкретного пациента
 * @param patientId ID пациента
 * @returns Массив объектов с историей изменений
 */
export async function getPatientChanges(patientId: string): Promise<Array<{
  field_name: string
  old_value: string | null
  new_value: string | null
  changed_at: string
  changed_by_email: string | null
}>> {
  try {
    // Устанавливаем анонимную сессию для RLS
    await safeEnsureAnonymousSession()

    const { data, error } = await supabase
      .from('patient_changes')
      .select('field_name, old_value, new_value, changed_at, changed_by_email')
      .eq('patient_id', patientId)
      .order('changed_at', { ascending: false })
      .limit(50) // Ограничиваем последними 50 изменениями

    if (error) {
      logger.error('Ошибка при получении истории изменений:', error)
      return []
    }

    return data || []
  } catch (error) {
    logger.error('Ошибка при получении истории изменений:', error)
    return []
  }
}

/**
 * Получает измененные записи пациентов (где updated_at существует и отличается от created_at)
 * С применением фильтрации по врачам для не-админов
 * @returns Массив объектов с данными измененных пациентов
 */
export async function getChangedPatients(): Promise<PatientData[]> {
  try {
    // Устанавливаем анонимную сессию для RLS
    await safeEnsureAnonymousSession()

    // Проверяем, является ли пользователь админом
    const isAdmin = await checkAdminAuth()

    logger.info('getChangedPatients: начало', {
      isAdmin,
      timestamp: new Date().toISOString(),
    })

    let query = supabase.from('patients').select('*')
    let email: string | undefined

    // Если пользователь не админ, применяем фильтрацию по врачам
    if (!isAdmin) {
      // Получаем email из cookie
      try {
        const cookieStore = await cookies()
        const emailCookie = cookieStore.get('denta_user_email')
        email = emailCookie?.value
        logger.info('getChangedPatients: email получен из cookie', {
          email: email,
          hasCookie: !!emailCookie,
        })
      } catch (error) {
        logger.error('getChangedPatients: ошибка чтения cookie', { error })
      }

      // Если есть email пользователя, проверяем ограничения
      if (email) {
        const normalizedEmail = email.toLowerCase().trim()
        const allowedDoctors = await getDoctorsForEmailByEmail(normalizedEmail)
        const allowedNurses = await getNursesForEmailByEmail(normalizedEmail)

        if (allowedDoctors.length > 0 || allowedNurses.length > 0) {
          const filterParts: string[] = []

          if (allowedDoctors.length > 0) {
            const doctors = allowedDoctors.map(d => `"${d.trim()}"`).join(',')
            filterParts.push(`Доктор.in.(${doctors})`)
          }

          if (allowedNurses.length > 0) {
            const nurses = allowedNurses.map(n => `"${n.trim()}"`).join(',')
            filterParts.push(`Медсестра.in.(${nurses})`)
          }

          const filterStr = filterParts.join(',')
          query = query.or(filterStr)
        } else {
          query = query.eq('Доктор', '__NONE__')
        }
      } else {
        query = query.eq('Доктор', '__NO_EMAIL__')
      }
    } else {
      logger.info('getChangedPatients: пользователь является админом, показываем всех пациентов без фильтрации')
    }

    // Получаем данные с применением фильтров
    const { data, error } = await query.order('id', { ascending: false })

    if (error) {
      logger.error('Ошибка при получении измененных записей из Supabase:', error);
      throw new Error(`Ошибка Supabase: ${error.message}`);
    }

    if (!data) {
      return [];
    }

    // Фильтруем записи, которые были изменены (updated_at существует и отличается от created_at)
    const changedPatients = data.filter((patient: any) => {
      // Проверяем наличие полей created_at и updated_at
      const hasUpdatedAt = patient.updated_at !== null && patient.updated_at !== undefined;
      const hasCreatedAt = patient.created_at !== null && patient.created_at !== undefined;

      if (!hasUpdatedAt) {
        // Если updated_at нет, значит поле еще не настроено в Supabase
        return false;
      }

      if (!hasCreatedAt) {
        // Если created_at нет, но updated_at есть, считаем запись измененной
        return true;
      }

      // Сравниваем даты (с точностью до секунды)
      try {
        const updatedTime = new Date(patient.updated_at).getTime();
        const createdTime = new Date(patient.created_at).getTime();
        // Если updated_at отличается от created_at более чем на 1 секунду, значит запись была изменена
        return Math.abs(updatedTime - createdTime) > 1000;
      } catch (e) {
        // Если не удалось распарсить даты, пропускаем запись
        return false;
      }
    });

    // Сортируем по updated_at (новые изменения сверху)
    changedPatients.sort((a: any, b: any) => {
      const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return bTime - aTime;
    });

    logger.info('getChangedPatients: результат', {
      isAdmin,
      email: email ? email.toLowerCase().trim() : 'не указан',
      totalPatients: data.length,
      changedPatientsCount: changedPatients.length,
    })

    return changedPatients as PatientData[];

  } catch (error) {
    logger.error('Ошибка при получении измененных записей:', error);
    throw error;
  }
}

/**
 * Добавляет нового пациента в таблицу 'patients' Supabase
 * @param data Данные пациента
 */
export async function addPatient(data: PatientData): Promise<void> {
  logger.log('🚀 Supabase: addPatient вызван с данными:', data);

  // Валидация: ФИО является обязательным полем
  if (!data.ФИО || data.ФИО.trim() === '') {
    throw new Error('ФИО пациента обязательно для заполнения.');
  }

  try {
    // Устанавливаем анонимную сессию для RLS
    await safeEnsureAnonymousSession()

    const { error } = await supabase
      .from('patients')
      .insert([data]);

    if (error) {
      logger.error('Ошибка при добавлении пациента в Supabase:', error);
      throw new Error(`Ошибка Supabase: ${error.message}`);
    }

    logger.log('✅ Supabase: Пациент успешно добавлен!');

  } catch (error) {
    logger.error('❌ Ошибка при добавлении пациента:', error);
    throw error;
  }
}

/**
 * Сохраняет историю изменений пациента
 */
async function savePatientChanges(
  patientId: string,
  oldData: PatientData,
  newData: PatientData,
  changedByEmail?: string
): Promise<void> {
  try {
    const changes: Array<{
      patient_id: string
      field_name: string
      old_value: string | null
      new_value: string | null
      changed_by_email?: string
    }> = []

    // Маппинг русских названий полей на понятные названия
    const fieldMapping: Record<string, string> = {
      'ФИО': 'ФИО',
      'Телефон': 'Телефон',
      'Комментарии': 'Комментарии',
      'Дата записи': 'Дата записи',
      'Время записи': 'Время записи',
      'Статус': 'Статус',
      'Доктор': 'Доктор',
      'Зубы': 'Зубы',
      'Медсестра': 'Медсестра',
      'Дата рождения пациента': 'Дата рождения',
    }

    // Сравниваем каждое поле
    Object.keys(fieldMapping).forEach((key) => {
      const oldValue = oldData[key as keyof PatientData]?.toString() || null
      const newValue = newData[key as keyof PatientData]?.toString() || null

      // Если значение изменилось
      if (oldValue !== newValue) {
        changes.push({
          patient_id: patientId,
          field_name: fieldMapping[key],
          old_value: oldValue,
          new_value: newValue,
          changed_by_email: changedByEmail,
        })
      }
    })

    // Сохраняем изменения, если они есть
    if (changes.length > 0) {
      // Устанавливаем анонимную сессию для RLS
      await ensureAnonymousSession()

      const { error } = await supabase
        .from('patient_changes')
        .insert(changes)

      if (error) {
        logger.error('Ошибка при сохранении истории изменений:', error)
        // Не бросаем ошибку, чтобы не прервать обновление пациента
      } else {
        logger.log(`✅ Сохранено ${changes.length} изменений для пациента ${patientId}`)
      }
    }
  } catch (error) {
    logger.error('Ошибка при сохранении истории изменений:', error)
    // Не бросаем ошибку, чтобы не прервать обновление пациента
  }
}

/**
 * Обновляет данные пациента в таблице 'patients' Supabase
 * @param patientId ID пациента (UUID)
 * @param updatedData Обновленные данные
 * @param changedByEmail Email пользователя, который внес изменения (опционально)
 */
export async function updatePatient(
  patientId: string,
  updatedData: PatientData,
  changedByEmail?: string
): Promise<void> {
  logger.log('🚀 Supabase: updatePatient вызвана!');
  logger.log('🔄 Supabase: ID для поиска:', patientId);
  logger.log('🔄 Supabase: Данные для обновления:', updatedData);

  try {
    // Устанавливаем анонимную сессию для RLS
    await safeEnsureAnonymousSession()

    // Получаем старые данные перед обновлением
    const { data: oldData, error: fetchError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single()

    if (fetchError) {
      logger.error('Ошибка при получении старых данных пациента:', fetchError)
      // Продолжаем обновление даже если не удалось получить старые данные
    }

    // Обновляем данные
    const { error } = await supabase
      .from('patients')
      .update(updatedData)
      .eq('id', patientId)

    if (error) {
      logger.error('Ошибка при обновлении пациента в Supabase:', error)
      throw new Error(`Ошибка Supabase: ${error.message}`)
    }

    logger.log('✅ Supabase: Пациент успешно обновлен!')

    // Сохраняем историю изменений, если есть старые данные
    if (oldData) {
      await savePatientChanges(patientId, oldData as PatientData, updatedData, changedByEmail)
    }

  } catch (error) {
    logger.error('❌ Ошибка при обновлении пациента:', error)
    throw error
  }
}

/**
 * Удаляет пациента из таблицы 'patients' Supabase
 * @param patientId ID пациента (UUID)
 */
export async function deletePatient(patientId: string): Promise<void> {
  logger.log('🚀 Supabase: deletePatient вызвана!');
  logger.log('🔄 Supabase: ID для удаления:', patientId);

  try {
    // Устанавливаем анонимную сессию для RLS
    await safeEnsureAnonymousSession()

    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', patientId); // Удаляем по колонке 'id'

    if (error) {
      logger.error('Ошибка при удалении пациента из Supabase:', error);
      throw new Error(`Ошибка Supabase: ${error.message}`);
    }

    logger.log('✅ Supabase: Пациент успешно удален!');

  } catch (error) {
    logger.error('❌ Ошибка при удалении пациента:', error);
    throw error;
  }
}

/**
 * Переносит пациента в таблицу 'deleted_patients' перед удалением
 * @param patientId ID пациента (UUID)
 * @param deletedByEmail Почта того, кто удалил
 */
export async function archiveAndRemovePatient(patientId: string, deletedByEmail: string): Promise<void> {
  logger.log('🚀 Supabase: archiveAndRemovePatient вызван для ID:', patientId);

  try {
    // Устанавливаем анонимную сессию для RLS
    await safeEnsureAnonymousSession()

    // 1. Сначала получаем данные пациента
    const { data: patient, error: fetchError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single();

    if (fetchError || !patient) {
      throw new Error(`Не удалось найти пациента: ${fetchError?.message || 'запись не найдена'}`);
    }

    // 2. Вставляем данные в таблицу deleted_patients
    // Исключаем id, created_at, updated_at и другие системные поля, которые могут конфликтовать
    const { id, created_at, updated_at, ...patientDataWithoutSystemFields } = patient as any;

    const { error: insertError } = await supabase
      .from('deleted_patients')
      .insert([{
        ...patientDataWithoutSystemFields,
        original_id: String(id), // Принудительно в строку
        deleted_by_email: deletedByEmail,
        deleted_at: new Date().toISOString()
      }]);

    if (insertError) {
      logger.error('Ошибка при архивации пациента:', insertError);
      throw new Error(`Ошибка архивации: ${insertError.message}`);
    }

    // 3. Если архивация успешна, удаляем из основной таблицы
    const { error: deleteError } = await supabase
      .from('patients')
      .delete()
      .eq('id', patientId);

    if (deleteError) {
      throw new Error(`Ошибка при удалении после архивации: ${deleteError.message}`);
    }

    logger.log('✅ Supabase: Пациент успешно архивирован и удален!');

  } catch (error) {
    logger.error('❌ Ошибка в archiveAndRemovePatient:', error);
    throw error;
  }
}
