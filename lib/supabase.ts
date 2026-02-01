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
let isAuthDisabled = false

export async function ensureAnonymousSession(): Promise<void> {
  if (isAuthDisabled) return

  // Проверяем наличие переменных окружения перед попыткой установить сессию
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'https://placeholder.supabase.co') {
    // Не пытаемся устанавливать сессию, если переменные не настроены
    // Это может произойти во время build time или если переменные не установлены в Vercel
    return
  }

  // Если сессия уже устанавливается, ждем её
  if (anonymousSessionPromise) {
    return anonymousSessionPromise
  }

  // Устанавливаем анонимную сессию
  anonymousSessionPromise = (async () => {
    try {
      // Создаем контроллер для таймаута, чтобы не ждать 10 секунд
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 2000)

      const { data, error } = await supabase.auth.signInAnonymously()
      clearTimeout(timeoutId)

      if (error) {
        // Если анонимная аутентификация отключена
        if (error.message?.includes('Anonymous sign-ins are disabled') || (error as any)?.status === 422) {
          isAuthDisabled = true // Запоминаем, что это не работает
          console.warn('⚠️  Анонимная аутентификация отключена. Это нормально, если RLS настроен иначе.')
          return
        }
        throw error
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Анонимная сессия Supabase установлена для RLS')
      }
    } catch (error: any) {
      isAuthDisabled = true // При любой ошибке (таймаут, сеть) больше не пытаемся
      if (error.name === 'AbortError') {
        console.warn('⚠️  Auth disabled or unreachable, continuing without anonymous session (Timeout)')
      } else {
        console.warn('⚠️  Auth disabled or unreachable, continuing without anonymous session (Error:', error.message || error, ')')
      }
    } finally {
      anonymousSessionPromise = null
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

/**
 * Создает клиент Supabase с анонимным ключом и заголовком email пользователя
 * Используется для работы RLS на основе email
 * Email кодируется в base64 для поддержки кириллицы в HTTP заголовках
 */
export function getSupabaseUser(userEmail?: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabase
  }

  if (!userEmail) {
    return supabase
  }

  // Кодируем email в base64 для передачи в HTTP заголовке
  // Это необходимо для поддержки кириллических email
  const emailBase64 = Buffer.from(userEmail.toLowerCase().trim()).toString('base64')

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        'x-denta-user-email-b64': emailBase64,
      },
    },
  })
}