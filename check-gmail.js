// check-gmail.js - Проверка настройки Gmail SMTP
// Запустите: node check-gmail.js

import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Функция для чтения переменных окружения
function loadEnv() {
  const env = {}

  try {
    const envPath = join(__dirname, '.env.local')
    const envContent = readFileSync(envPath, 'utf8')
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=')
      if (key && (key.startsWith('GMAIL_') || key.startsWith('NEXT_PUBLIC_EMAILJS_'))) {
        env[key.trim()] = valueParts.join('=').trim()
      }
    })
  } catch {
    try {
      const configPath = join(__dirname, 'env-config.txt')
      const configContent = readFileSync(configPath, 'utf8')
      configContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=')
        if (key && (key.startsWith('GMAIL_') || key.startsWith('NEXT_PUBLIC_EMAILJS_'))) {
          env[key.trim()] = valueParts.join('=').trim()
        }
      })
    } catch {
      // Файлы не найдены
    }
  }

  return env
}

// Функция проверки
function checkGmail() {
  const env = loadEnv()

  // Gmail настройки
  const gmailUser = env.GMAIL_USER
  const gmailAppPassword = env.GMAIL_APP_PASSWORD

  // EmailJS настройки
  const serviceId = env.NEXT_PUBLIC_EMAILJS_SERVICE_ID
  const templateId = env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID
  const userId = env.NEXT_PUBLIC_EMAILJS_USER_ID

  console.log('🔍 Проверка настройки отправки email...\n')

  // Проверяем Gmail
  console.log('📧 Gmail SMTP настройки:')
  console.log(`   Gmail User: ${gmailUser ? '✅ Настроен' : '❌ Не настроен'} (${gmailUser || 'пусто'})`)
  console.log(`   App Password: ${gmailAppPassword ? '✅ Настроен' : '❌ Не настроен'} (${gmailAppPassword ? '***' + gmailAppPassword.slice(-4) : 'пусто'})`)

  // Проверяем EmailJS
  console.log('\n📧 EmailJS настройки (резервный вариант):')
  console.log(`   Service ID: ${serviceId ? '✅ Настроен' : '❌ Не настроен'} (${serviceId || 'пусто'})`)
  console.log(`   Template ID: ${templateId ? '✅ Настроен' : '❌ Не настроен'} (${templateId || 'пусто'})`)
  console.log(`   User ID: ${userId ? '✅ Настроен' : '❌ Не настроен'} (${userId || 'пусто'})`)

  console.log('\n📊 Статус:')

  const gmailReady = gmailUser && gmailAppPassword
  const emailjsReady = serviceId && templateId && userId

  if (gmailReady) {
    console.log('   ✅ Gmail SMTP настроен - лучший вариант!')
    console.log('   📧 Коды подтверждения будут отправляться на email через Gmail')
  } else if (emailjsReady) {
    console.log('   ⚠️  Gmail не настроен, но EmailJS готов')
    console.log('   📧 Коды будут отправляться через EmailJS')
  } else {
    console.log('   ⚠️  Ни Gmail, ни EmailJS не настроены')
    console.log('   🚀 Будет использоваться демо режим (коды в alert)')
  }

  console.log('\n🔧 Рекомендуемая настройка:')

  if (!gmailReady) {
    console.log('   📖 Gmail SMTP (рекомендуется): GMAIL_SETUP.md')
  }

  if (!emailjsReady) {
    console.log('   📖 EmailJS (альтернатива): EMAILJS_SETUP.md')
  }

  console.log('\n🧪 Тестирование:')
  console.log('   1. Запустите: npm run dev')
  console.log('   2. Перейдите: http://localhost:3000/login')
  console.log('   3. Попробуйте войти по email')
}

// Запуск проверки
checkGmail()
