'use server'

import { revalidatePath } from 'next/cache'
import { addPatient, updatePatient, deletePatient, archiveAndRemovePatient, PatientData } from '@/lib/supabase-db'
import { logger } from '@/lib/logger'

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
      logger.error('DEBUG: ФИО validation failed:', {
        ФИО: patientData.ФИО,
        trimmed: patientData.ФИО?.trim(),
        length: patientData.ФИО?.trim().length
      })
      throw new Error('ФИО пациента обязательно для заполнения')
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
