'use server';

import { supabase, ensureAnonymousSession } from './supabase'
import { logger } from './logger'

/**
 * Безопасно устанавливает анонимную сессию
 */
async function safeEnsureAnonymousSession(): Promise<void> {
  try {
    await ensureAnonymousSession()
  } catch (authError: any) {
    if (authError?.code === 'anonymous_provider_disabled' || authError?.status === 422) {
      return
    }
    throw authError
  }
}

// ========== ВРАЧИ ==========

export async function getDoctors(): Promise<string[]> {
  try {
    await safeEnsureAnonymousSession()
    
    const { data, error } = await supabase
      .from('doctors')
      .select('name')
      .order('name', { ascending: true })
    
    if (error) {
      logger.error('Ошибка получения врачей:', error)
      throw error
    }
    
    return data?.map(d => d.name) || []
  } catch (error) {
    logger.error('Ошибка получения врачей:', error)
    return []
  }
}

export async function addDoctor(name: string): Promise<void> {
  try {
    await safeEnsureAnonymousSession()
    
    const { error } = await supabase
      .from('doctors')
      .insert({ name: name.trim() })
    
    if (error) {
      logger.error('Ошибка добавления врача:', error)
      throw error
    }
  } catch (error) {
    logger.error('Ошибка добавления врача:', error)
    throw error
  }
}

export async function deleteDoctor(name: string): Promise<void> {
  try {
    await safeEnsureAnonymousSession()
    
    const { error } = await supabase
      .from('doctors')
      .delete()
      .eq('name', name)
    
    if (error) {
      logger.error('Ошибка удаления врача:', error)
      throw error
    }
  } catch (error) {
    logger.error('Ошибка удаления врача:', error)
    throw error
  }
}

// ========== МЕДСЕСТРЫ ==========

export async function getNurses(): Promise<string[]> {
  try {
    await safeEnsureAnonymousSession()
    
    const { data, error } = await supabase
      .from('nurses')
      .select('name')
      .order('name', { ascending: true })
    
    if (error) {
      logger.error('Ошибка получения медсестер:', error)
      throw error
    }
    
    return data?.map(n => n.name) || []
  } catch (error) {
    logger.error('Ошибка получения медсестер:', error)
    return []
  }
}

export async function addNurse(name: string): Promise<void> {
  try {
    await safeEnsureAnonymousSession()
    
    const { error } = await supabase
      .from('nurses')
      .insert({ name: name.trim() })
    
    if (error) {
      logger.error('Ошибка добавления медсестры:', error)
      throw error
    }
  } catch (error) {
    logger.error('Ошибка добавления медсестры:', error)
    throw error
  }
}

export async function deleteNurse(name: string): Promise<void> {
  try {
    await safeEnsureAnonymousSession()
    
    const { error } = await supabase
      .from('nurses')
      .delete()
      .eq('name', name)
    
    if (error) {
      logger.error('Ошибка удаления медсестры:', error)
      throw error
    }
  } catch (error) {
    logger.error('Ошибка удаления медсестры:', error)
    throw error
  }
}

// ========== БЕЛЫЕ СПИСКИ ==========

export interface WhitelistEmail {
  id: number
  email: string
  provider: 'google' | 'yandex' | 'email'
  created_at: string
  doctors?: string[] // Врачи, которых может видеть этот email
}

export async function getWhitelistEmails(provider?: 'google' | 'yandex' | 'email'): Promise<WhitelistEmail[]> {
  try {
    await safeEnsureAnonymousSession()
    
    let query = supabase
      .from('whitelist_emails')
      .select('*')
      .order('email', { ascending: true })
    
    if (provider) {
      query = query.eq('provider', provider)
    }
    
    const { data, error } = await query
    
    if (error) {
      logger.error('Ошибка получения белых списков:', error)
      throw error
    }
    
    // Загружаем врачей для каждого email
    const emailsWithDoctors = await Promise.all(
      (data || []).map(async (email) => {
        const doctors = await getDoctorsForEmail(email.id)
        return { ...email, doctors }
      })
    )
    
    return emailsWithDoctors
  } catch (error) {
    logger.error('Ошибка получения белых списков:', error)
    return []
  }
}

// Получить врачей для конкретного email
export async function getDoctorsForEmail(whitelistEmailId: number): Promise<string[]> {
  try {
    await safeEnsureAnonymousSession()
    
    const { data, error } = await supabase
      .from('whitelist_email_doctors')
      .select('doctor_name')
      .eq('whitelist_email_id', whitelistEmailId)
    
    if (error) {
      logger.error('Ошибка получения врачей для email:', error)
      return []
    }
    
    return data?.map(d => d.doctor_name) || []
  } catch (error) {
    logger.error('Ошибка получения врачей для email:', error)
    return []
  }
}

// Получить врачей для email по самому email
export async function getDoctorsForEmailByEmail(email: string): Promise<string[]> {
  try {
    await safeEnsureAnonymousSession()
    
    // Сначала находим ID email в whitelist_emails
    const { data: emailData, error: emailError } = await supabase
      .from('whitelist_emails')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single()
    
    if (emailError || !emailData) {
      return []
    }
    
    return await getDoctorsForEmail(emailData.id)
  } catch (error) {
    logger.error('Ошибка получения врачей для email:', error)
    return []
  }
}

export async function addWhitelistEmail(
  email: string, 
  provider: 'google' | 'yandex' | 'email',
  doctorNames?: string[]
): Promise<void> {
  try {
    await safeEnsureAnonymousSession()
    
    // Добавляем email
    const { data: emailData, error: emailError } = await supabase
      .from('whitelist_emails')
      .insert({ 
        email: email.trim().toLowerCase(),
        provider 
      })
      .select()
      .single()
    
    if (emailError) {
      logger.error('Ошибка добавления email в белый список:', emailError)
      throw emailError
    }
    
    // Если указаны врачи, добавляем связи
    if (doctorNames && doctorNames.length > 0 && emailData) {
      const { error: doctorsError } = await supabase
        .from('whitelist_email_doctors')
        .insert(
          doctorNames.map(doctorName => ({
            whitelist_email_id: emailData.id,
            doctor_name: doctorName.trim()
          }))
        )
      
      if (doctorsError) {
        logger.error('Ошибка добавления врачей для email:', doctorsError)
        // Не пробрасываем ошибку, так как email уже добавлен
      }
    }
  } catch (error) {
    logger.error('Ошибка добавления email в белый список:', error)
    throw error
  }
}

export async function updateWhitelistEmailDoctors(
  email: string,
  doctorNames: string[]
): Promise<void> {
  try {
    await safeEnsureAnonymousSession()
    
    // Находим ID email
    const { data: emailData, error: emailError } = await supabase
      .from('whitelist_emails')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single()
    
    if (emailError || !emailData) {
      throw new Error('Email not found')
    }
    
    // Удаляем все существующие связи
    const { error: deleteError } = await supabase
      .from('whitelist_email_doctors')
      .delete()
      .eq('whitelist_email_id', emailData.id)
    
    if (deleteError) {
      logger.error('Ошибка удаления старых связей:', deleteError)
    }
    
    // Добавляем новые связи
    if (doctorNames.length > 0) {
      const { error: insertError } = await supabase
        .from('whitelist_email_doctors')
        .insert(
          doctorNames.map(doctorName => ({
            whitelist_email_id: emailData.id,
            doctor_name: doctorName.trim()
          }))
        )
      
      if (insertError) {
        logger.error('Ошибка добавления новых связей:', insertError)
        throw insertError
      }
    }
  } catch (error) {
    logger.error('Ошибка обновления врачей для email:', error)
    throw error
  }
}

export async function deleteWhitelistEmail(email: string): Promise<void> {
  try {
    await safeEnsureAnonymousSession()
    
    // Сначала находим ID для удаления связей
    const { data: emailData } = await supabase
      .from('whitelist_emails')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()
    
    // Удаляем email (связи удалятся автоматически через CASCADE)
    const { error } = await supabase
      .from('whitelist_emails')
      .delete()
      .eq('email', email.toLowerCase())
    
    if (error) {
      logger.error('Ошибка удаления email из белого списка:', error)
      throw error
    }
  } catch (error) {
    logger.error('Ошибка удаления email из белого списка:', error)
    throw error
  }
}
