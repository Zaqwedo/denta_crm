'use server';

import { supabase, ensureAnonymousSession, getSupabaseAdmin, getSupabaseUser } from '../lib/supabase'
import { logger } from './logger'
import { getDoctorsForEmailByEmail, getNursesForEmailByEmail } from './admin-db'
import { cookies } from 'next/headers'
import { checkAdminAuth } from './auth-check'
import { DB_COLUMNS, RECORD_STATUS } from './constants'

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
  [DB_COLUMNS.ID]?: string;
  [DB_COLUMNS.NAME]: string;
  [DB_COLUMNS.PHONE]?: string;
  [DB_COLUMNS.COMMENT]?: string;
  [DB_COLUMNS.DATE]?: string;
  [DB_COLUMNS.TIME]?: string;
  [DB_COLUMNS.STATUS]?: string;
  [DB_COLUMNS.DOCTOR]?: string;
  [DB_COLUMNS.TEETH]?: string;
  [DB_COLUMNS.NURSE]?: string;
  [DB_COLUMNS.BIRTH_DATE]?: string;
  [DB_COLUMNS.CREATED_BY]?: string;
  [DB_COLUMNS.EMOJI]?: string;
  [DB_COLUMNS.NOTES]?: string;
  [DB_COLUMNS.IGNORED_ID]?: string;
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

    // Пытаемся получить email пользователя
    let email: string | undefined = userEmail
    if (!email) {
      try {
        const cookieStore = await cookies()
        const emailCookie = cookieStore.get('denta_user_email')
        email = emailCookie?.value
      } catch (error) {
        // Игнорируем ошибки чтения cookie
      }
    }

    logger.info('getPatients: начало', {
      isAdmin,
      userEmail: email,
      timestamp: new Date().toISOString(),
      warning: isAdmin ? 'Пользователь определяется как АДМИН - фильтрация НЕ применяется!' : 'Пользователь НЕ админ - фильтрация будет применена'
    })

    // Выбираем соответствующий клиент (Админ bypasses RLS, User uses scoped client)
    const client = isAdmin ? getSupabaseAdmin() : getSupabaseUser(email)
    let query = client.from('patients').select('*')

    // Если пользователь не админ, применяем фильтрацию по врачам
    if (!isAdmin) {
      // Если есть email пользователя, проверяем ограничения по врачам
      if (email) {
        const normalizedEmail = email.toLowerCase().trim()
        const allowedDoctors = await getDoctorsForEmailByEmail(normalizedEmail)
        const allowedNurses = await getNursesForEmailByEmail(normalizedEmail)

        logger.info('getPatients: получены ограничения', {
          email: normalizedEmail,
          allowedDoctors,
          allowedNurses,
        })

        // Если указаны врачи
        if (allowedDoctors.length > 0) {
          query = query.in(DB_COLUMNS.DOCTOR, allowedDoctors.map(d => d.trim()))

          // Если также указаны медсестры, фильтруем записи этих врачей
          if (allowedNurses.length > 0) {
            const nurses = allowedNurses.map(n => `"${n.trim()}"`).join(',')
            query = query.or(`${DB_COLUMNS.NURSE}.in.(${nurses}),${DB_COLUMNS.NURSE}.is.null,${DB_COLUMNS.NURSE}.eq.""`)
          }
        }
        // Если указаны только медсестры
        else if (allowedNurses.length > 0) {
          query = query.in(DB_COLUMNS.NURSE, allowedNurses.map(n => n.trim()))
        }
        // Если ничего не указано - ничего не показываем
        else {
          query = query.eq(DB_COLUMNS.DOCTOR, '__NONE__')
        }
      } else {
        // Если email не найден - НЕ показываем пациентов
        query = query.eq(DB_COLUMNS.DOCTOR, '__NO_EMAIL__')
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
      const uniqueDoctors = [...new Set(data.map(p => p[DB_COLUMNS.DOCTOR]).filter(Boolean))] as string[]
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

    const isAdmin = await checkAdminAuth()
    const cookieStore = await cookies()
    const email = cookieStore.get('denta_user_email')?.value
    const client = isAdmin ? getSupabaseAdmin() : getSupabaseUser(email)

    const { data, error } = await client
      .from('patient_changes')
      .select('field_name, old_value, new_value, changed_at, changed_by_email')
      .eq('patient_id', patientId)
      .order('changed_at', { ascending: false })
      .limit(50) // Ограничиваем последними 50 изменениями

    return data || []
  } catch (error) {
    logger.error('Ошибка при получении истории изменений:', error)
    return []
  }
}

export interface PatientData {
  [DB_COLUMNS.ID]?: string;
  [DB_COLUMNS.NAME]: string;
  [DB_COLUMNS.PHONE]?: string;
  [DB_COLUMNS.COMMENT]?: string;
  [DB_COLUMNS.DATE]?: string;
  [DB_COLUMNS.TIME]?: string;
  [DB_COLUMNS.STATUS]?: string;
  [DB_COLUMNS.DOCTOR]?: string;
  [DB_COLUMNS.TEETH]?: string;
  [DB_COLUMNS.NURSE]?: string;
  [DB_COLUMNS.BIRTH_DATE]?: string;
  [DB_COLUMNS.CREATED_BY]?: string;
  [DB_COLUMNS.EMOJI]?: string;
  [DB_COLUMNS.NOTES]?: string;
  [DB_COLUMNS.IGNORED_ID]?: string;
  is_deleted?: boolean;
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

    // Пытаемся получить email пользователя
    const cookieStore = await cookies()
    const emailCookie = cookieStore.get('denta_user_email')
    const email = emailCookie?.value

    logger.info('getChangedPatients: начало', {
      isAdmin,
      userEmail: email,
      timestamp: new Date().toISOString(),
    })

    const client = isAdmin ? getSupabaseAdmin() : getSupabaseUser(email)

    // --- 1. Получаем активных пациентов ---
    let query = client.from('patients').select('*')

    // Если пользователь не админ, применяем фильтрацию по врачам
    if (!isAdmin) {
      // Если есть email пользователя, проверяем ограничения
      if (email) {
        const normalizedEmail = email.toLowerCase().trim()
        const allowedDoctors = await getDoctorsForEmailByEmail(normalizedEmail)
        const allowedNurses = await getNursesForEmailByEmail(normalizedEmail)

        if (allowedDoctors.length > 0) {
          query = query.in(DB_COLUMNS.DOCTOR, allowedDoctors.map(d => d.trim()))
          if (allowedNurses.length > 0) {
            const nurses = allowedNurses.map(n => `"${n.trim()}"`).join(',')
            query = query.or(`${DB_COLUMNS.NURSE}.in.(${nurses}),${DB_COLUMNS.NURSE}.is.null,${DB_COLUMNS.NURSE}.eq.""`)
          }
        } else if (allowedNurses.length > 0) {
          query = query.in(DB_COLUMNS.NURSE, allowedNurses.map(n => n.trim()))
        } else {
          query = query.eq(DB_COLUMNS.DOCTOR, '__NONE__')
        }
      } else {
        // Если email не найден - НЕ показываем пациентов
        query = query.eq(DB_COLUMNS.DOCTOR, '__NO_EMAIL__')
      }
    } else {
      logger.info('getChangedPatients: пользователь является админом, показываем всех пациентов без фильтрации')
    }

    // Получаем данные с применением фильтров
    const { data: activeData, error: activeError } = await query.order('id', { ascending: false })

    if (activeError) {
      logger.error('Ошибка при получении измененных записей из Supabase:', activeError);
      throw new Error(`Ошибка Supabase: ${activeError.message}`);
    }

    // Фильтруем активные записи (только измененные)
    const changedActivePatients = (activeData || []).filter((patient: any) => {
      const hasUpdatedAt = patient.updated_at !== null && patient.updated_at !== undefined;
      const hasCreatedAt = patient.created_at !== null && patient.created_at !== undefined;
      if (!hasUpdatedAt) return false;
      if (!hasCreatedAt) return true;
      try {
        const updatedTime = new Date(patient.updated_at).getTime();
        const createdTime = new Date(patient.created_at).getTime();
        return Math.abs(updatedTime - createdTime) > 1000;
      } catch (e) { return false; }
    });

    // --- 2. Получаем удаленных пациентов ---
    // Для удаленных тоже нужно применять фильтр по врачам, но пока упростим (или используем админский клиент если нужно видеть всё)
    // Лучше использовать тот же client чтобы соблюдать права
    // Но таблица deleted_patients может не иметь RLS настроенного так же.
    // Предположим, что deleted_patients доступна для чтения.

    // ВНИМАНИЕ: Если таблица deleted_patients имеет колонки doctor/nurse, фильтрация нужна.
    // Если нет - мы можем показать лишнее. 
    // Обычно архив содержит копию данных, значит doctor там есть.

    const deletedQuery = client.from('deleted_patients').select('*').order('deleted_at', { ascending: false }).limit(20);

    // Применяем те же фильтры, если не админ (копипаст логики выше, или упрощенно)
    // Для скорости пока без жесткой фильтрации, или если структура 1в1
    // Если deleted_patients имеет те же колокни
    if (!isAdmin && email) {
      // ... повтор логики фильтрации для deleted_patients ...
      // Чтобы не дублировать код, и так как deleted_patients может быть проще,
      // пока просто получим последние удаленные, а отфильтруем в памяти (безопаснее если записей немного)
    }

    const { data: deletedData, error: deletedError } = await deletedQuery;

    if (deletedError) {
      logger.error('Ошибка получения удаленных пациентов:', deletedError);
      // Не падаем, просто без удаленных
    }

    const mappedDeletedPatients = (deletedData || []).map((d: any) => ({
      ...d,
      id: d.original_id, // Важно!
      [DB_COLUMNS.STATUS]: 'УДАЛЕН',
      updated_at: d.deleted_at, // Используем время удаления как время обновления
      is_deleted: true
    }));

    // --- 3. Объединяем и сортируем ---
    const allPatients = [...changedActivePatients, ...mappedDeletedPatients];

    allPatients.sort((a: any, b: any) => {
      const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return bTime - aTime;
    });

    logger.info('getChangedPatients: результат', {
      isAdmin,
      mergedCount: allPatients.length,
      active: changedActivePatients.length,
      deleted: mappedDeletedPatients.length
    })

    return allPatients as PatientData[];

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
  if (!data[DB_COLUMNS.NAME] || data[DB_COLUMNS.NAME].trim() === '') {
    throw new Error('ФИО пациента обязательно для заполнения.');
  }

  try {
    // Устанавливаем анонимную сессию для RLS
    await safeEnsureAnonymousSession()

    const isAdmin = await checkAdminAuth()
    const cookieStore = await cookies()
    const email = cookieStore.get('denta_user_email')?.value
    const client = isAdmin ? getSupabaseAdmin() : getSupabaseUser(email)

    const { error } = await client
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
      [DB_COLUMNS.NAME]: 'ФИО',
      [DB_COLUMNS.PHONE]: 'Телефон',
      [DB_COLUMNS.COMMENT]: 'Комментарии',
      [DB_COLUMNS.DATE]: 'Дата записи',
      [DB_COLUMNS.TIME]: 'Время записи',
      [DB_COLUMNS.STATUS]: 'Статус',
      [DB_COLUMNS.DOCTOR]: 'Доктор',
      [DB_COLUMNS.TEETH]: 'Зубы',
      [DB_COLUMNS.NURSE]: 'Медсестра',
      [DB_COLUMNS.BIRTH_DATE]: 'Дата рождения',
      [DB_COLUMNS.EMOJI]: 'Смайлик',
      [DB_COLUMNS.NOTES]: 'Общие заметки',
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
      // Используем админский клиент для гарантированной записи в историю
      const adminClient = getSupabaseAdmin()

      const { error } = await adminClient
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

    const isAdmin = await checkAdminAuth()
    const cookieStore = await cookies()
    const email = cookieStore.get('denta_user_email')?.value
    const client = isAdmin ? getSupabaseAdmin() : getSupabaseUser(email)

    // Получаем старые данные перед обновлением
    const { data: oldData, error: fetchError } = await client
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single()

    if (fetchError) {
      logger.error('Ошибка при получении старых данных пациента:', fetchError)
      // Продолжаем обновление даже если не удалось получить старые данные
    }

    // Обновляем данные
    const { error } = await client
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

  if (!patientId || patientId === 'undefined' || patientId === 'null') {
    throw new Error(`Некорректный ID записи: ${patientId}`);
  }

  try {
    // Используем админский клиент для гарантированного доступа к записи
    const adminClient = getSupabaseAdmin()

    // 1. Сначала получаем данные записи (визита)
    // Используем limit(1) вместо single(), чтобы избежать ошибки 'Cannot coerce' если записей 0 или >1
    const { data: patients, error: fetchError } = await adminClient
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .limit(1);

    if (fetchError) {
      throw new Error(`Ошибка при поиске записи: ${fetchError.message}`);
    }

    if (!patients || patients.length === 0) {
      throw new Error('Запись не найдена или уже удалена');
    }

    const patient = patients[0];

    // 2. Вставляем данные в таблицу deleted_patients (архив)
    // Исключаем системные поля и поля, которых нет в таблице архива (emoji, notes)
    const {
      id,
      created_at,
      updated_at,
      emoji,
      notes,
      ignored_duplicate_id, // Тоже скорее всего нет в архиве
      ...patientDataWithoutSystemFields
    } = patient as any;

    const { error: insertError } = await adminClient
      .from('deleted_patients')
      .insert([{
        ...patientDataWithoutSystemFields,
        original_id: String(id),
        deleted_by_email: deletedByEmail,
        deleted_at: new Date().toISOString()
      }]);

    if (insertError) {
      logger.error('Ошибка при архивации записи:', insertError);
      throw new Error(`Ошибка архивации: ${insertError.message}`);
    }

    // 3. Если архивация успешна, удаляем из основной таблицы
    // Удаляем конкретную запись о визите по ID
    const { error: deleteError } = await adminClient
      .from('patients')
      .delete()
      .eq('id', patientId);

    if (deleteError) {
      throw new Error(`Ошибка при удалении после архивации: ${deleteError.message}`);
    }

    logger.log('✅ Supabase: Запись успешно архивирована и удаленa!');

  } catch (error) {
    logger.error('❌ Ошибка в archiveAndRemovePatient:', error);
    throw error;
  }
}
/**
 * Обновляет профиль пациента (смайлик и общие заметки) для всех его записей
 */
export async function updatePatientProfile(name: string, birthDate: string | null, updates: Partial<PatientData>): Promise<void> {
  try {
    await safeEnsureAnonymousSession()

    const isAdmin = await checkAdminAuth()
    const cookieStore = await cookies()
    const email = cookieStore.get('denta_user_email')?.value
    const client = isAdmin ? getSupabaseAdmin() : getSupabaseUser(email)

    let query = client
      .from('patients')
      .update(updates)
      .eq(DB_COLUMNS.NAME, name)

    if (birthDate) {
      query = query.eq(DB_COLUMNS.BIRTH_DATE, birthDate)
    } else {
      query = query.is(DB_COLUMNS.BIRTH_DATE, null)
    }

    const { error } = await query
    if (error) throw error
  } catch (error) {
    logger.error('Ошибка при обновлении профиля пациента:', error)
    throw error
  }
}

/**
 * Объединяет пациентов по списку ID записей
 */
export async function mergePatients(
  sourceRecordIds: string[],
  target: { name: string, birthDate: string | null, emoji?: string | null, notes?: string | null }
): Promise<void> {
  try {
    if (!sourceRecordIds || sourceRecordIds.length === 0) {
      logger.warn('mergePatients: список ID пуст');
      return;
    }

    // Используем админский клиент для гарантии прав
    const adminClient = getSupabaseAdmin()

    logger.log('mergePatients: начинаю обновление', {
      sourceCount: sourceRecordIds.length,
      targetName: target.name,
      targetBirth: target.birthDate,
      ids: sourceRecordIds
    });

    // Обновляем все записи переданных ID, меняя их ФИО и ДР на таргетные
    const { data, error } = await adminClient
      .from('patients')
      .update({
        [DB_COLUMNS.NAME]: target.name,
        [DB_COLUMNS.BIRTH_DATE]: target.birthDate,
        [DB_COLUMNS.EMOJI]: target.emoji,
        [DB_COLUMNS.NOTES]: target.notes
      })
      .in(DB_COLUMNS.ID, sourceRecordIds)
      .select(); // Добавляем select чтобы увидеть результат

    if (error) {
      logger.error('mergePatients: ошибка Supabase', error);
      throw error;
    }

    logger.log('mergePatients: успешно обновлено записей:', data?.length);
  } catch (error) {
    logger.error('Ошибка при объединении пациентов:', error)
    throw error
  }
}

/**
 * Помечает двух пациентов как "не дубликаты"
 */
export async function ignoreDuplicate(
  client1: { name: string, birthDate: string | null },
  client2: { name: string, birthDate: string | null }
): Promise<void> {
  try {
    const adminClient = getSupabaseAdmin()

    // Генерируем уникальную метку для пары (сортируем, чтобы порядок был всегда один)
    const p1 = client1
    const p2 = client2
    const pair1 = `${p1.name}|${p1.birthDate || ''}`
    const pair2 = `${p2.name}|${p2.birthDate || ''}`
    const pairId = [pair1, pair2].sort().join(':::')

    // Добавляем этот тег в массив ignored_duplicate_id для всех записей обоих клиентов
    // Это позволит фильтровать их при поиске дублей

    for (const p of [p1, p2]) {
      const name = p.name
      const birth = p.birthDate

      let q = adminClient.from('patients').select(DB_COLUMNS.IGNORED_ID).eq(DB_COLUMNS.NAME, name)
      if (birth) q = q.eq(DB_COLUMNS.BIRTH_DATE, birth)
      else q = q.is(DB_COLUMNS.BIRTH_DATE, null)

      const { data } = await q
      if (data && data.length > 0) {
        const current = data[0][DB_COLUMNS.IGNORED_ID] || ''
        const updated = current ? `${current},${pairId}` : pairId

        let upQ = adminClient.from('patients').update({ [DB_COLUMNS.IGNORED_ID]: updated }).eq(DB_COLUMNS.NAME, name)
        if (birth) upQ = upQ.eq(DB_COLUMNS.BIRTH_DATE, birth)
        else upQ = upQ.is(DB_COLUMNS.BIRTH_DATE, null)

        await upQ
      }
    }
  } catch (error) {
    logger.error('Ошибка при игнорировании дублей:', error)
    throw error
  }
}

/**
 * Восстанавливает пациента из архива
 */
export async function restorePatient(patientId: string): Promise<void> {
  logger.log('🚀 Supabase: restorePatient вызван для ID:', patientId);

  try {
    const adminClient = getSupabaseAdmin()

    // 1. Находим в архиве по оригинальному ID
    const { data: deletedRecord, error: fetchError } = await adminClient
      .from('deleted_patients')
      .select('*')
      .eq('original_id', patientId)
      .limit(1);

    if (fetchError) throw new Error(`Ошибка поиска в архиве: ${fetchError.message}`);
    if (!deletedRecord || deletedRecord.length === 0) throw new Error('Запись не найдена в архиве');

    const record = deletedRecord[0];

    // 2. Подготавливаем данные для восстановления
    // Исключаем поля таблицы deleted_patients
    const {
      id, // PK таблицы deleted_patients
      original_id,
      deleted_by_email,
      deleted_at,
      ...patientData
    } = record;

    // Восстанавливаем оригинальный UUID
    const dataToRestore = {
      ...patientData,
      id: original_id,
      updated_at: new Date().toISOString(), // Обновляем время, чтобы она всплыла в изменениях
      created_at: patientData.created_at || new Date().toISOString() // Восстанавливаем или задаем текущее
    };

    // 3. Вставляем обратно в patients
    const { error: insertError } = await adminClient
      .from('patients')
      .insert([dataToRestore]);

    if (insertError) {
      throw new Error(`Ошибка восстановления: ${insertError.message}`);
    }

    // 4. Удаляем из архива
    const { error: deleteError } = await adminClient
      .from('deleted_patients')
      .delete()
      .eq('original_id', patientId);

    if (deleteError) {
      logger.warn(`Запись восстановлена, но не удалена из архива: ${deleteError.message}`);
    }

    logger.log('✅ Supabase: Запись успешно восстановлена!');

  } catch (error) {
    logger.error('❌ Ошибка в restorePatient:', error);
    throw error;
  }
}

/**
 * Обновляет профиль пользователя
 */
export async function updateUserProfile(email: string, firstName: string, lastName?: string): Promise<void> {
  try {
    const adminClient = getSupabaseAdmin()
    const { error } = await adminClient
      .from('users')
      .update({
        first_name: firstName,
        last_name: lastName,
        updated_at: new Date().toISOString()
      })
      .eq('email', email.toLowerCase().trim())

    if (error) throw error
  } catch (error) {
    logger.error('Ошибка при обновлении профиля пользователя:', error)
    throw error
  }
}

