'use server'

import { revalidatePath } from 'next/cache'
import { DB_COLUMNS } from '@/lib/constants'
import { addPatient, updatePatient, archiveAndRemovePatient, getPatientChanges, restorePatient, PatientData, getPatients, updateUserProfile } from '@/lib/supabase-db'
import { groupPatientsForCardIndex } from '@/lib/patient-utils'
import { ClientInfo } from './card-index/types'
import { logger } from '@/lib/logger'
import { checkAdminAuth } from '@/lib/auth-check'
import { getDoctorsForEmailByEmail, getNursesForEmailByEmail } from '@/lib/admin-db'

export async function handleRestorePatient(patientId: string) {
  try {
    await restorePatient(patientId);
    revalidatePath('/patients');
    revalidatePath('/patients/changes');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function handleRevertChanges(patientId: string, userEmail: string) {
  try {
    // 1. Получаем последние изменения
    const changes = await getPatientChanges(patientId);
    if (!changes || changes.length === 0) {
      return { success: false, error: 'История изменений пуста' };
    }

    // 2. Находим время последнего изменения (первый элемент, т.к. сортировка DESC)
    const lastChangeTime = new Date(changes[0].changed_at).getTime();

    // 3. Фильтруем все изменения, которые произошли в эту же сессию (в пределах 2 секунд)
    const changesToRevert = changes.filter(c => {
      const t = new Date(c.changed_at).getTime();
      return Math.abs(t - lastChangeTime) < 2000;
    });

    if (changesToRevert.length === 0) {
      return { success: false, error: 'Нет изменений для отмены' };
    }

    // 4. Маппинг русских названий полей обратно в колонки БД
    const reverseFieldMapping: Record<string, string> = {
      'ФИО': DB_COLUMNS.NAME,
      'Телефон': DB_COLUMNS.PHONE,
      'Комментарии': DB_COLUMNS.COMMENT,
      'Дата записи': DB_COLUMNS.DATE,
      'Время записи': DB_COLUMNS.TIME,
      'Статус': DB_COLUMNS.STATUS,
      'Доктор': DB_COLUMNS.DOCTOR,
      'Зубы': DB_COLUMNS.TEETH,
      'Медсестра': DB_COLUMNS.NURSE,
      'Дата рождения': DB_COLUMNS.BIRTH_DATE,
      'Смайлик': DB_COLUMNS.EMOJI,
      'Общие заметки': DB_COLUMNS.NOTES
    };

    const updateData: Partial<PatientData> = {};
    let revertCount = 0;

    for (const change of changesToRevert) {
      const dbCol = reverseFieldMapping[change.field_name];
      if (dbCol) {
        // Восстанавливаем старое значение
        // Важно: если old_value null, передаем null/undefined
        // Используем as any, чтобы избежать ошибки TS при присваивании string в потенциально boolean поля (хотя в маппинге только строки)
        updateData[dbCol as keyof PatientData] = (change.old_value || undefined) as any;
        revertCount++;
      }
    }

    if (revertCount === 0) {
      return { success: false, error: 'Не удалось определить поля для отмены' }
    }

    logger.log(`Reverting ${revertCount} changes for patient ${patientId}`);

    // 5. Применяем обратные изменения
    // Указываем userEmail, чтобы в истории это отразилось как изменение этим пользователем
    await updatePatient(patientId, updateData as PatientData, userEmail);

    revalidatePath('/patients/changes');
    revalidatePath('/patients'); // Обновляем и список пациентов
    return { success: true };

  } catch (error) {
    logger.error('Ошибка при отмене изменений:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Ошибка при отмене изменений'
    }
  }
}


export async function handleAddPatient(formData: FormData) {
  logger.log('🚀 SERVER ACTION: handleAddPatient вызван')
  try {
    // Проверка наличия ФИО
    const rawName = formData.get('name')
    if (!rawName || rawName.toString().trim() === '') {
      throw new Error('ФИО пациента обязательно для заполнения')
    }

    // Helper function to get form value or undefined if empty
    const getFormValue = (key: string): string | undefined => {
      const value = formData.get(key) as string
      return value && value.trim() !== '' ? value : undefined
    }

    const patientData: PatientData = {
      ФИО: formData.get('name') as string, // Маппинг 'name' из формы в 'ФИО' для Supabase
      Телефон: getFormValue('phone'),
      Комментарии: getFormValue('comments'),
      'Дата записи': getFormValue('date'),
      'Время записи': getFormValue('time'),
      Статус: getFormValue('status') || 'Ожидает',
      Доктор: getFormValue('doctor'),
      Зубы: getFormValue('teeth'),
      Медсестра: getFormValue('nurse'),
      'Дата рождения пациента': getFormValue('birthDate'),
      created_by_email: getFormValue('created_by_email'),
    }

    logger.log('DEBUG: Processed patientData:', patientData)

    // Валидация обязательных полей на сервере
    if (!patientData.ФИО?.trim()) {
      logger.error('DEBUG: ФИО validation failed (empty):', {
        ФИО: patientData.ФИО,
        trimmed: patientData.ФИО?.trim(),
        length: patientData.ФИО?.trim().length
      })
      throw new Error('ФИО пациента обязательно для заполнения')
    }

    if (patientData.ФИО.length > 60) {
      throw new Error('ФИО пациента не может превышать 60 символов')
    }

    await addPatient(patientData)

    revalidatePath('/patients')
    revalidatePath('/calendar')

    return { success: true }
  } catch (error) {
    logger.error('Ошибка при добавлении пациента:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Произошла ошибка при добавлении пациента'
    }
  }
}

export async function handleUpdatePatient(patientId: string | number, formData: FormData, changedByEmail?: string) {
  try {
    // Helper function to get form value or undefined if empty
    const getFormValue = (key: string): string | undefined => {
      const value = formData.get(key) as string
      return value && value.trim() !== '' ? value : undefined
    }

    const patientData: PatientData = {
      ФИО: formData.get('name') as string,
      Телефон: getFormValue('phone'),
      Комментарии: getFormValue('comments'),
      'Дата записи': getFormValue('date'),
      'Время записи': getFormValue('time'),
      Статус: getFormValue('status'),
      Доктор: getFormValue('doctor'),
      Зубы: getFormValue('teeth'),
      Медсестра: getFormValue('nurse'),
      'Дата рождения пациента': getFormValue('birthDate'),
      created_by_email: getFormValue('created_by_email'),
    }

    logger.log('📝 HANDLE UPDATE: Начинаем обновление пациента');
    logger.log('📝 HANDLE UPDATE: ID:', patientId, 'тип:', typeof patientId);
    logger.log('📝 HANDLE UPDATE: Данные из формы:', patientData);

    if (patientData.ФИО && patientData.ФИО.length > 60) {
      throw new Error('ФИО пациента не может превышать 60 символов')
    }

    await updatePatient(String(patientId), patientData, changedByEmail)

    logger.log('✅ HANDLE UPDATE: Обновление успешно завершено');
    revalidatePath('/patients')
    revalidatePath('/calendar')
    revalidatePath('/patients/changes')

    return { success: true }
  } catch (error) {
    logger.error('❌ HANDLE UPDATE: Ошибка при обновлении пациента:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Произошла ошибка при обновлении пациента'
    }
  }
}

export async function handleDeletePatient(patientId: string | number, deletedByEmail: string) {
  try {
    await archiveAndRemovePatient(String(patientId), deletedByEmail)

    revalidatePath('/patients')

    return { success: true }
  } catch (error) {
    logger.error('Ошибка при удалении пациента:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Произошла ошибка при удалении пациента'
    }
  }
}
export async function handleGetGroupedPatients(): Promise<{ success: true, data: ClientInfo[] } | { success: false, error: string }> {
  try {
    const patients = await getPatients()
    const grouped = groupPatientsForCardIndex(patients)
    return { success: true, data: grouped }
  } catch (error) {
    logger.error('Ошибка при получении сгруппированных пациентов:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Ошибка при загрузке данных'
    }
  }
}

export async function handleGetDashboardStats(userEmail?: string) {
  try {
    const isAdmin = await checkAdminAuth()
    let allowedDoctors: string[] = []
    let allowedNurses: string[] = []

    if (!isAdmin && userEmail) {
      allowedDoctors = await getDoctorsForEmailByEmail(userEmail)
      allowedNurses = await getNursesForEmailByEmail(userEmail)
    }

    const today = new Date().toISOString().split('T')[0]
    const patients = await getPatients(userEmail)
    const todayCount = patients.filter(p => p[DB_COLUMNS.DATE] === today).length

    return {
      success: true,
      data: {
        isAdmin,
        allowedDoctors,
        allowedNurses,
        todayCount
      }
    }
  } catch (error) {
    logger.error('Ошибка при получении статистики дашборда:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Ошибка при загрузке статистики'
    }
  }
}

export async function handleUpdateUserProfile(email: string, firstName: string, lastName?: string) {
  try {
    await updateUserProfile(email, firstName, lastName)
    revalidatePath('/')
    revalidatePath('/patients')
    return { success: true }
  } catch (error) {
    logger.error('Ошибка в handleUpdateUserProfile:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Ошибка при обновлении профиля'
    }
  }
}
