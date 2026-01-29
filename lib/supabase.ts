import { createClient } from '@supabase/supabase-js'

// Используем NEXT_PUBLIC_ префикс для доступа в клиентском коде
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Проверяем наличие переменных
if (!supabaseUrl || !supabaseAnonKey) {
  const errorMsg = '⚠️  Supabase не настроен: отсутствуют переменные окружения NEXT_PUBLIC_SUPABASE_URL или NEXT_PUBLIC_SUPABASE_ANON_KEY'
  
  if (typeof window === 'undefined') {
    // Server-side
    console.error(errorMsg)
    console.error('URL:', supabaseUrl ? '✅ установлен' : '❌ отсутствует')
    console.error('Key:', supabaseAnonKey ? '✅ установлен' : '❌ отсутствует')
  } else {
    // Client-side
    console.error(errorMsg)
  }
  
  // В production не падаем, но логируем ошибку
  if (process.env.NODE_ENV === 'production') {
    console.error('Приложение будет работать с ограниченной функциональностью')
  }
}

// Валидация URL
if (supabaseUrl && !supabaseUrl.startsWith('http')) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL должен начинаться с http:// или https://')
  console.error('Текущее значение:', supabaseUrl.substring(0, 20) + '...')
}

// Логируем информацию о конфигурации (только в development или при ошибках)
if (process.env.NODE_ENV === 'development' || !supabaseUrl || !supabaseAnonKey) {
  console.log('🔧 Supabase Configuration:')
  console.log('  URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : '❌ NOT SET')
  console.log('  Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : '❌ NOT SET')
  console.log('  Environment:', process.env.NODE_ENV)
}

// Создаем клиент
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    // Добавляем опции для лучшей обработки ошибок
    global: {
      headers: {
        'x-client-info': 'denta-crm@1.0.0',
      },
    },
  }
)

/**
 * Устанавливает анонимную сессию Supabase для RLS
 * Необходимо вызывать перед запросами к БД в server-side коде
 */
let anonymousSessionPromise: Promise<void> | null = null
let sessionChecked = false

export async function ensureAnonymousSession(): Promise<void> {
  // Проверяем наличие переменных окружения перед попыткой установить сессию
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'https://placeholder.supabase.co') {
    // Не пытаемся устанавливать сессию, если переменные не настроены
    // Это может произойти во время build time или если переменные не установлены в Vercel
    return Promise.resolve()
  }

  // Если сессия уже устанавливается, ждем её
  if (anonymousSessionPromise) {
    return anonymousSessionPromise
  }

  // Проверяем, есть ли уже активная сессия (только один раз)
  if (!sessionChecked) {
    sessionChecked = true
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      return Promise.resolve()
    }
  }

  // Устанавливаем анонимную сессию
  anonymousSessionPromise = (async () => {
    try {
      const { data, error } = await supabase.auth.signInAnonymously()
      
      if (error) {
        // Если анонимная аутентификация отключена, логируем и продолжаем без ошибки
        if (error.message?.includes('Anonymous sign-ins are disabled') || 
            (error as any)?.code === 'anonymous_provider_disabled' ||
            (error as any)?.status === 422) {
          console.warn('⚠️  Анонимная аутентификация отключена в Supabase')
          console.warn('📋 Инструкция: Включите в Supabase Dashboard → Authentication → Settings → Enable Anonymous Sign-ins')
          // Не бросаем ошибку, просто возвращаемся - возможно RLS политики разрешают доступ
          anonymousSessionPromise = null
          return
        }
        
        console.error('❌ Ошибка установки анонимной сессии Supabase:', error)
        // Сбрасываем promise при ошибке, чтобы можно было повторить
        anonymousSessionPromise = null
        throw error
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Анонимная сессия Supabase установлена для RLS')
      }
    } catch (error: any) {
      // Если это ошибка об отключенной анонимной аутентификации, просто продолжаем
      if (error?.message?.includes('Anonymous sign-ins are disabled') || 
          error?.code === 'anonymous_provider_disabled' ||
          error?.status === 422) {
        console.warn('⚠️  Анонимная аутентификация отключена в Supabase')
        console.warn('📋 Инструкция: Включите в Supabase Dashboard → Authentication → Settings → Enable Anonymous Sign-ins')
        anonymousSessionPromise = null
        return
      }
      
      console.error('❌ Критическая ошибка: не удалось установить анонимную сессию Supabase:', error)
      // Сбрасываем promise при ошибке
      anonymousSessionPromise = null
      throw error
    }
  })()

  return anonymousSessionPromise
}

/**
 * Создает клиент Supabase с сервисной ролью для обхода RLS
 * Используется только для админских операций на сервере
 */
export function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    // Если сервисная роль не настроена, используем обычный клиент
    // Это может привести к ошибкам RLS, но лучше чем падение приложения
    console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY не настроен. Админские операции могут не работать из-за RLS.')
    return supabase
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}