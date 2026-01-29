// check-email.js - Проверка настройки отправки email
// Запустите: node check-email.js

import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Простая функция для чтения .env.local или env-config.txt
function loadEnv() {
  const env = {}

  // Сначала пытаемся прочитать .env.local
  try {
    const envPath = join(__dirname, '.env.local')
    const envContent = readFileSync(envPath, 'utf8')
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=')
      if (key && key.startsWith('NEXT_PUBLIC_EMAILJS_')) {
        env[key.trim()] = valueParts.join('=').trim()
      }
    })
  } catch (e) {
    // Если .env.local не найден, пробуем env-config.txt
    try {
      const configPath = join(__dirname, 'env-config.txt')
      const configContent = readFileSync(configPath, 'utf8')
      configContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=')
        if (key && key.startsWith('NEXT_PUBLIC_EMAILJS_')) {
          env[key.trim()] = valueParts.join('=').trim()
        }
      })
    } catch (e2) {
      // Файлы не найдены
    }
  }

  return env
}

// Асинхронная функция проверки
async function checkEmailJS() {
  const env = loadEnv()

  console.log('🔍 Проверка настройки EmailJS...\n')

  // Проверяем переменные окружения
  const serviceId = env.NEXT_PUBLIC_EMAILJS_SERVICE_ID
  const templateId = env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID
  const userId = env.NEXT_PUBLIC_EMAILJS_USER_ID

  console.log('📋 Переменные окружения:')
  console.log(`   Service ID: ${serviceId ? '✅ Настроен' : '❌ Не настроен'} (${serviceId || 'пусто'})`)
  console.log(`   Template ID: ${templateId ? '✅ Настроен' : '❌ Не настроен'} (${templateId || 'пусто'})`)
  console.log(`   User ID: ${userId ? '✅ Настроен' : '❌ Не настроен'} (${userId || 'пусто'})`)

  // Проверяем пакет emailjs-com
  let emailjsAvailable = false
  try {
    await import('emailjs-com')
    emailjsAvailable = true
  } catch (e) {
    // Пакет не установлен
  }

  console.log(`   EmailJS пакет: ${emailjsAvailable ? '✅ Установлен' : '❌ Не установлен'}`)

  console.log('\n📊 Статус:')
  if (serviceId && templateId && userId && emailjsAvailable) {
    console.log('   ✅ EmailJS полностью настроен!')
    console.log('   📧 Коды подтверждения будут отправляться на email')
  } else {
    console.log('   ⚠️  EmailJS не настроен, используется демо режим')
    console.log('   🚀 Коды будут показываться в alert окнах')
  }

  if (!emailjsAvailable) {
    console.log('\n💡 Установка пакета:')
    console.log('   npm install emailjs-com')
  }

  if (!serviceId || !templateId || !userId) {
    console.log('\n🔧 Настройка переменных:')
    console.log('   1. Зарегистрируйтесь: https://www.emailjs.com/')
    console.log('   2. Создайте .env.local файл')
    console.log('   3. Добавьте переменные из EMAILJS_SETUP.md')
  }

  console.log('\n📖 Подробная инструкция: EMAILJS_SETUP.md')
}

// Запуск проверки
checkEmailJS().catch(console.error)