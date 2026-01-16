'use server';

import { supabase, ensureAnonymousSession, getSupabaseAdmin } from './supabase'
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
    
    logger.info('getDoctorsForEmail: начало', {
      whitelistEmailId
    })
    
    const { data, error } = await supabase
      .from('whitelist_email_doctors')
      .select('doctor_name, id')
      .eq('whitelist_email_id', whitelistEmailId)
    
    if (error) {
      logger.error('getDoctorsForEmail: ошибка при получении врачей', {
        whitelistEmailId,
        error
      })
      return []
    }
    
    const doctors = data?.map(d => d.doctor_name) || []
    
    logger.info('getDoctorsForEmail: врачи получены', {
      whitelistEmailId,
      doctors,
      doctorsCount: doctors.length,
      rawData: data
    })
    
    return doctors
  } catch (error) {
    logger.error('Ошибка получения врачей для email:', error)
    return []
  }
}

// Получить врачей для email по самому email
export async function getDoctorsForEmailByEmail(email: string): Promise<string[]> {
  try {
    await safeEnsureAnonymousSession()
    
    const normalizedEmail = email.toLowerCase().trim()
    
    logger.info('getDoctorsForEmailByEmail: начало', { email: normalizedEmail })
    
    // Сначала находим ID email в whitelist_emails
    // Используем maybeSingle() чтобы не выбрасывать ошибку если не найдено
    const { data: emailData, error: emailError } = await supabase
      .from('whitelist_emails')
      .select('id, email, provider')
      .eq('email', normalizedEmail)
      .maybeSingle()
    
    if (emailError) {
      logger.error('getDoctorsForEmailByEmail: ошибка при поиске email', {
        email: normalizedEmail,
        error: emailError
      })
      return []
    }
    
    if (!emailData) {
      logger.info('getDoctorsForEmailByEmail: email не найден в whitelist', {
        email: normalizedEmail
      })
      return []
    }
    
    logger.info('getDoctorsForEmailByEmail: email найден', {
      email: normalizedEmail,
      whitelistId: emailData.id,
      provider: emailData.provider
    })
    
    const doctors = await getDoctorsForEmail(emailData.id)
    
    logger.info('getDoctorsForEmailByEmail: врачи получены', {
      email: normalizedEmail,
      doctors,
      doctorsCount: doctors.length
    })
    
    return doctors
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
      const doctorLinks = doctorNames
        .filter(d => d && typeof d === 'string' && d.trim())
        .map(doctorName => ({
          whitelist_email_id: emailData.id,
          doctor_name: doctorName.trim()
        }))
      
      logger.info('addWhitelistEmail: добавляем связи с врачами', {
        email: email.trim().toLowerCase(),
        whitelistId: emailData.id,
        doctorLinks,
        linksCount: doctorLinks.length
      })
      
      const { data: insertedData, error: doctorsError } = await supabase
        .from('whitelist_email_doctors')
        .insert(doctorLinks)
        .select()
      
      if (doctorsError) {
        logger.error('addWhitelistEmail: ошибка добавления врачей', {
          email: email.trim().toLowerCase(),
          whitelistId: emailData.id,
          error: doctorsError,
          doctorLinks
        })
        // Не пробрасываем ошибку, так как email уже добавлен
      } else {
        logger.info('addWhitelistEmail: связи с врачами добавлены', {
          email: email.trim().toLowerCase(),
          insertedCount: insertedData?.length || 0
        })
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
    
    const normalizedEmail = email.toLowerCase().trim()
    
    logger.info('updateWhitelistEmailDoctors: начало', {
      email: normalizedEmail,
      doctorNames,
      doctorsCount: doctorNames.length
    })
    
    // Находим ID email (используем maybeSingle для безопасности)
    const { data: emailData, error: emailError } = await supabase
      .from('whitelist_emails')
      .select('id, email')
      .eq('email', normalizedEmail)
      .maybeSingle()
    
    if (emailError) {
      logger.error('updateWhitelistEmailDoctors: ошибка при поиске email', {
        email: normalizedEmail,
        error: emailError
      })
      throw emailError
    }
    
    if (!emailData) {
      logger.error('updateWhitelistEmailDoctors: email не найден', {
        email: normalizedEmail
      })
      throw new Error('Email not found')
    }
    
    logger.info('updateWhitelistEmailDoctors: email найден', {
      email: normalizedEmail,
      whitelistId: emailData.id
    })
    
    // Удаляем все существующие связи
    const { error: deleteError, count: deleteCount } = await supabase
      .from('whitelist_email_doctors')
      .delete()
      .eq('whitelist_email_id', emailData.id)
    
    if (deleteError) {
      logger.error('updateWhitelistEmailDoctors: ошибка удаления старых связей', {
        email: normalizedEmail,
        whitelistId: emailData.id,
        error: deleteError
      })
      throw deleteError
    }
    
    logger.info('updateWhitelistEmailDoctors: старые связи удалены', {
      email: normalizedEmail,
      deletedCount: deleteCount
    })
    
    // Добавляем новые связи
    if (doctorNames.length > 0) {
      const doctorLinks = doctorNames
        .filter(d => d && typeof d === 'string' && d.trim())
        .map(doctorName => ({
          whitelist_email_id: emailData.id,
          doctor_name: doctorName.trim()
        }))
      
      logger.info('updateWhitelistEmailDoctors: добавляем новые связи', {
        email: normalizedEmail,
        whitelistId: emailData.id,
        doctorLinks,
        linksCount: doctorLinks.length
      })
      
      const { data: insertedData, error: insertError } = await supabase
        .from('whitelist_email_doctors')
        .insert(doctorLinks)
        .select()
      
      if (insertError) {
        logger.error('updateWhitelistEmailDoctors: ошибка добавления новых связей', {
          email: normalizedEmail,
          whitelistId: emailData.id,
          error: insertError,
          doctorLinks
        })
        throw insertError
      }
      
      logger.info('updateWhitelistEmailDoctors: новые связи добавлены', {
        email: normalizedEmail,
        insertedCount: insertedData?.length || 0
      })
    } else {
      logger.info('updateWhitelistEmailDoctors: нет врачей для добавления', {
        email: normalizedEmail
      })
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

// ========== ПОЛЬЗОВАТЕЛИ ==========

export interface RegisteredUser {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  created_at: string
  updated_at: string
  password_hash: string | null // NULL если пароль сброшен
  password_status: 'установлен' | 'сброшен' // Вычисляемое поле
}

export async function getRegisteredUsers(): Promise<RegisteredUser[]> {
  try {
    await safeEnsureAnonymousSession()
    
    const { data, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, created_at, updated_at, password_hash')
      .order('created_at', { ascending: false })
    
    if (error) {
      logger.error('Ошибка получения зарегистрированных пользователей:', error)
      throw error
    }
    
    // Добавляем статус пароля
    // Пустая строка также считается как "сброшен" (временное решение до выполнения SQL скрипта)
    return (data || []).map(user => ({
      ...user,
      password_status: (user.password_hash && user.password_hash.trim() !== '') ? 'установлен' : 'сброшен'
    }))
  } catch (error) {
    logger.error('Ошибка получения зарегистрированных пользователей:', error)
    return []
  }
}

export async function deleteUser(email: string): Promise<void> {
  try {
    const normalizedEmail = email.toLowerCase().trim()
    
    logger.info('Сброс пароля: начало', { email: normalizedEmail })
    
    // Используем админский клиент для обхода RLS
    const adminSupabase = getSupabaseAdmin()
    
    // Проверяем, существует ли пользователь
    const { data: existingUser, error: checkError } = await adminSupabase
      .from('users')
      .select('id, password_hash')
      .eq('email', normalizedEmail)
      .maybeSingle()
    
    if (checkError) {
      logger.error('Сброс пароля: ошибка при проверке пользователя', {
        email: normalizedEmail,
        error: checkError
      })
      throw checkError
    }
    
    if (!existingUser) {
      logger.error('Сброс пароля: пользователь не найден', { email: normalizedEmail })
      throw new Error('Пользователь не найден')
    }
    
    logger.info('Сброс пароля: пользователь найден', {
      email: normalizedEmail,
      userId: existingUser.id,
      hasPassword: !!existingUser.password_hash
    })
    
    // Вместо удаления, устанавливаем password_hash в NULL (сброс пароля)
    // Используем админский клиент для обхода RLS
    // Сначала пробуем установить NULL
    let { data: updatedUser, error: updateError } = await adminSupabase
      .from('users')
      .update({ password_hash: null })
      .eq('email', normalizedEmail)
      .select()
    
    // Если ошибка связана с NOT NULL constraint, пробуем установить пустую строку как временное решение
    if (updateError && updateError.code === '23502' && updateError.message?.includes('password_hash')) {
      logger.warn('Сброс пароля: колонка password_hash имеет NOT NULL. Используем временное решение (пустая строка). Выполните SQL скрипт supabase-fix-password-hash-nullable.sql в Supabase.')
      
      // Пробуем установить пустую строку вместо NULL (временное решение)
      const tempResult = await adminSupabase
        .from('users')
        .update({ password_hash: '' })
        .eq('email', normalizedEmail)
        .select()
      
      if (tempResult.error) {
        logger.error('Сброс пароля: ошибка при обновлении (временное решение)', {
          email: normalizedEmail,
          userId: existingUser.id,
          error: tempResult.error
        })
        throw new Error('Колонка password_hash не может быть NULL. Выполните SQL скрипт supabase-fix-password-hash-nullable.sql в Supabase для исправления.')
      }
      
      updatedUser = tempResult.data
      updateError = null
    } else if (updateError) {
      logger.error('Сброс пароля: ошибка при обновлении', {
        email: normalizedEmail,
        userId: existingUser.id,
        error: updateError,
        errorCode: updateError.code,
        errorMessage: updateError.message,
        errorDetails: updateError.details,
        errorHint: updateError.hint
      })
      throw updateError
    }
    
    if (!updatedUser || updatedUser.length === 0) {
      logger.error('Сброс пароля: не удалось обновить пользователя', {
        email: normalizedEmail,
        userId: existingUser.id
      })
      
      // Пробуем обновить по ID
      let { data: retryUpdate, error: retryError } = await adminSupabase
        .from('users')
        .update({ password_hash: null })
        .eq('id', existingUser.id)
        .select()
      
      // Если ошибка связана с NOT NULL constraint, пробуем пустую строку
      if (retryError && retryError.code === '23502' && retryError.message?.includes('password_hash')) {
        logger.warn('Сброс пароля: колонка password_hash имеет NOT NULL. Используем временное решение (пустая строка) при обновлении по ID.')
        const tempRetry = await adminSupabase
          .from('users')
          .update({ password_hash: '' })
          .eq('id', existingUser.id)
          .select()
        
        if (tempRetry.error) {
          logger.error('Сброс пароля: не удалось обновить даже по ID (временное решение)', {
            userId: existingUser.id,
            error: tempRetry.error
          })
          throw new Error('Колонка password_hash не может быть NULL. Выполните SQL скрипт supabase-fix-password-hash-nullable.sql в Supabase для исправления.')
        }
        
        retryUpdate = tempRetry.data
        retryError = null
      }
      
      if (retryError || !retryUpdate || retryUpdate.length === 0) {
        logger.error('Сброс пароля: не удалось обновить даже по ID', {
          userId: existingUser.id,
          error: retryError
        })
        throw new Error('Не удалось обновить пароль пользователя. Проверьте настройки Supabase.')
      }
      
      logger.info('Сброс пароля: успешно обновлено по ID', {
        email: normalizedEmail,
        userId: existingUser.id
      })
      return
    }
    
    logger.info('Пароль успешно сброшен', {
      email: normalizedEmail,
      userId: existingUser.id,
      updatedRows: updatedUser.length
    })
  } catch (error) {
    logger.error('Ошибка сброса пароля пользователя:', error)
    throw error
  }
}

export async function resetUserPassword(email: string): Promise<void> {
  try {
    await safeEnsureAnonymousSession()
    
    // Проверяем, существует ли пользователь
    const { data: user, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single()
    
    if (checkError || !user) {
      logger.error('Пользователь не найден для сброса пароля:', checkError)
      throw new Error('Пользователь не найден')
    }
    
    // Удаляем пользователя - он сможет зарегистрироваться заново
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('email', email.toLowerCase().trim())
    
    if (error) {
      logger.error('Ошибка сброса пароля (удаления пользователя):', error)
      throw error
    }
  } catch (error) {
    logger.error('Ошибка сброса пароля:', error)
    throw error
  }
}
