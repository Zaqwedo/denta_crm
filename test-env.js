// test-env.js - Проверка загрузки переменных окружения

console.log('🔍 Проверка переменных окружения...\n')

console.log('NEXT_PUBLIC_EMAILJS_SERVICE_ID:', process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || '❌ НЕ ЗАГРУЖЕН')
console.log('NEXT_PUBLIC_EMAILJS_TEMPLATE_ID:', process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || '❌ НЕ ЗАГРУЖЕН')
console.log('NEXT_PUBLIC_EMAILJS_USER_ID:', process.env.NEXT_PUBLIC_EMAILJS_USER_ID || '❌ НЕ ЗАГРУЖЕН')

console.log('\n📁 Проверяем файлы конфигурации...')

import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

const envLocalPath = join(process.cwd(), '.env.local')
const envConfigPath = join(process.cwd(), 'env-config.txt')

console.log('Файл .env.local существует:', existsSync(envLocalPath))
console.log('Файл env-config.txt существует:', existsSync(envConfigPath))

if (existsSync(envConfigPath)) {
  console.log('\n📄 Содержимое env-config.txt:')
  try {
    const content = readFileSync(envConfigPath, 'utf8')
    console.log(content)
  } catch (e) {
    console.log('❌ Ошибка чтения файла:', e.message)
  }
}

if (existsSync(envLocalPath)) {
  console.log('\n📄 Содержимое .env.local:')
  try {
    const content = readFileSync(envLocalPath, 'utf8')
    console.log(content)
  } catch (e) {
    console.log('❌ Ошибка чтения файла:', e.message)
  }
}

console.log('\n💡 Рекомендации:')
console.log('1. Создайте файл .env.local в корне проекта')
console.log('2. Скопируйте содержимое из env-config.txt')
console.log('3. Перезагрузите приложение (npm run dev)')