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

// Создаем клиент
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
)