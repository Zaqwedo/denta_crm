'use server';

import { supabase } from '../lib/supabase'

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
}

/**
 * Получает данные из таблицы 'patients' Supabase
 * @returns Массив объектов с данными пациентов
 */
export async function getPatients(): Promise<PatientData[]> {
  try {
    const { data, error } = await supabase
      .from('patients')
      .select('*');

    if (error) {
      console.error('Ошибка при получении данных пациентов из Supabase:', error);
      throw new Error(`Ошибка Supabase: ${error.message}`);
    }

    // Supabase возвращает массив объектов, каждый из которых соответствует строке таблицы
    // Приводим типы к PatientData
    return data as PatientData[];

  } catch (error) {
    console.error('Ошибка при получении данных пациентов:', error);
    throw error;
  }
}

/**
 * Добавляет нового пациента в таблицу 'patients' Supabase
 * @param data Данные пациента
 */
export async function addPatient(data: PatientData): Promise<void> {
  console.log('🚀 Supabase: addPatient вызван с данными:', data);

  // Валидация: ФИО является обязательным полем
  if (!data.ФИО || data.ФИО.trim() === '') {
    throw new Error('ФИО пациента обязательно для заполнения.');
  }

  try {
    const { error } = await supabase
      .from('patients')
      .insert([data]);

    if (error) {
      console.error('Ошибка при добавлении пациента в Supabase:', error);
      throw new Error(`Ошибка Supabase: ${error.message}`);
    }

    console.log('✅ Supabase: Пациент успешно добавлен!');

  } catch (error) {
    console.error('❌ Ошибка при добавлении пациента:', error);
    throw error;
  }
}

/**
 * Обновляет данные пациента в таблице 'patients' Supabase
 * @param patientId ID пациента (UUID)
 * @param updatedData Обновленные данные
 */
export async function updatePatient(patientId: string, updatedData: PatientData): Promise<void> {
  console.log('🚀 Supabase: updatePatient вызвана!');
  console.log('🔄 Supabase: ID для поиска:', patientId);
  console.log('🔄 Supabase: Данные для обновления:', updatedData);

  try {
    const { error } = await supabase
      .from('patients')
      .update(updatedData)
      .eq('id', patientId); // Обновляем по колонке 'id'

    if (error) {
      console.error('Ошибка при обновлении пациента в Supabase:', error);
      throw new Error(`Ошибка Supabase: ${error.message}`);
    }

    console.log('✅ Supabase: Пациент успешно обновлен!');

  } catch (error) {
    console.error('❌ Ошибка при обновлении пациента:', error);
    throw error;
  }
}

/**
 * Удаляет пациента из таблицы 'patients' Supabase
 * @param patientId ID пациента (UUID)
 */
export async function deletePatient(patientId: string): Promise<void> {
  console.log('🚀 Supabase: deletePatient вызвана!');
  console.log('🔄 Supabase: ID для удаления:', patientId);

  try {
    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', patientId); // Удаляем по колонке 'id'

    if (error) {
      console.error('Ошибка при удалении пациента из Supabase:', error);
      throw new Error(`Ошибка Supabase: ${error.message}`);
    }

    console.log('✅ Supabase: Пациент успешно удален!');

  } catch (error) {
    console.error('❌ Ошибка при удалении пациента:', error);
    throw error;
  }
}