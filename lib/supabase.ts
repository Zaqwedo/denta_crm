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
        console.error('❌ Ошибка установки анонимной сессии Supabase:', error)
        // Сбрасываем promise при ошибке, чтобы можно было повторить
        anonymousSessionPromise = null
        throw error
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Анонимная сессия Supabase установлена для RLS')
      }
    } catch (error) {
      console.error('❌ Критическая ошибка: не удалось установить анонимную сессию Supabase')
      // Сбрасываем promise при ошибке
      anonymousSessionPromise = null
      throw error
    }
  })()

  return anonymousSessionPromise
}