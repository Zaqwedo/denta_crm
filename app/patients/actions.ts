'use server'

import { revalidatePath } from 'next/cache'
import { addPatient, updatePatient, deletePatient, PatientData } from '@/lib/supabase-db'

export async function handleAddPatient(formData: FormData) {
  console.log('🚀 SERVER ACTION: handleAddPatient вызван')
  try {
    // Проверка наличия ФИО
    const rawName = formData.get('name')
    if (!rawName || rawName.toString().trim() === '') {
      throw new Error('ФИО пациента обязательно для заполнения')
    }

    const patientData: PatientData = {
      ФИО: formData.get('name') as string, // Маппинг 'name' из формы в 'ФИО' для Supabase
      Телефон: formData.get('phone') as string,
      Комментарии: formData.get('comments') as string,
      'Дата записи': formData.get('date') as string,
      'Время записи': formData.get('time') as string,
      Статус: (formData.get('status') as string) || 'Ожидает',
      Доктор: formData.get('doctor') as string,
      Зубы: formData.get('teeth') as string,
      Медсестра: formData.get('nurse') as string,
      'Дата рождения пациента': formData.get('birthDate') as string,
    }

    console.log('DEBUG: Processed patientData:', patientData)

    // Валидация обязательных полей на сервере
    if (!patientData.ФИО?.trim()) {
      console.error('DEBUG: ФИО validation failed:', {
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
    console.error('Ошибка при добавлении пациента:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Произошла ошибка при добавлении пациента' 
    }
  }
}

export async function handleUpdatePatient(patientId: string | number, formData: FormData) {
  try {
    const patientData: PatientData = {
      ФИО: formData.get('name') as string,
      Телефон: formData.get('phone') as string,
      Комментарии: formData.get('comments') as string,
      'Дата записи': formData.get('date') as string,
      'Время записи': formData.get('time') as string,
      Статус: formData.get('status') as string,
      Доктор: formData.get('doctor') as string,
      Зубы: formData.get('teeth') as string,
      Медсестра: formData.get('nurse') as string,
      'Дата рождения пациента': formData.get('birthDate') as string,
    }

    console.log('📝 HANDLE UPDATE: Начинаем обновление пациента');
    console.log('📝 HANDLE UPDATE: ID:', patientId, 'тип:', typeof patientId);
    console.log('📝 HANDLE UPDATE: Данные из формы:', patientData);

    await updatePatient(patientId, patientData)

    console.log('✅ HANDLE UPDATE: Обновление успешно завершено');
    revalidatePath('/patients')
    revalidatePath('/calendar')

    return { success: true }
  } catch (error) {
    console.error('❌ HANDLE UPDATE: Ошибка при обновлении пациента:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Произошла ошибка при обновлении пациента'
    }
  }
}

export async function handleDeletePatient(patientId: string | number) {
  try {
    await deletePatient(patientId)
    
    revalidatePath('/patients')
    
    return { success: true }
  } catch (error) {
    console.error('Ошибка при удалении пациента:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Произошла ошибка при удалении пациента' 
    }
  }
}
