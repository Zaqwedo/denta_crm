// test-emailjs-direct.js - Прямой тест EmailJS
// Запустите: node test-emailjs-direct.js

import emailjs from 'emailjs-com'

// Импортируем переменные окружения
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
      if (key && key.startsWith('NEXT_PUBLIC_EMAILJS_')) {
        env[key.trim()] = valueParts.join('=').trim()
      }
    })
  } catch (e) {
    try {
      const envPath = join(__dirname, 'env-config.txt')
      const envContent = readFileSync(envPath, 'utf8')
      envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=')
        if (key && key.startsWith('NEXT_PUBLIC_EMAILJS_')) {
          env[key.trim()] = valueParts.join('=').trim()
        }
      })
    } catch (e2) {
      console.error('❌ Не найден файл с переменными окружения')
      process.exit(1)
    }
  }

  return env
}

async function testEmailJSDirect() {
  const env = loadEnv()

  const serviceId = env.NEXT_PUBLIC_EMAILJS_SERVICE_ID
  const templateId = env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID
  const userId = env.NEXT_PUBLIC_EMAILJS_USER_ID

  console.log('🧪 Прямой тест EmailJS...\n')

  console.log('📋 Настройки:')
  console.log(`   Service ID: ${serviceId}`)
  console.log(`   Template ID: ${templateId}`)
  console.log(`   User ID: ${userId}`)
  console.log(`   EmailJS loaded: ${!!emailjs}\n`)

  if (!serviceId || !templateId || !userId) {
    console.error('❌ Отсутствуют переменные окружения')
    process.exit(1)
  }

  if (!emailjs) {
    console.error('❌ EmailJS не загружен')
    process.exit(1)
  }

  try {
    console.log('📧 Отправка тестового email на test@example.com...')

    // Тестовые параметры
    const templateParams = {
      to_email: 'test@example.com',
      verification_code: '123456'
    }

    console.log('📧 Параметры:', templateParams)

    const result = await emailjs.send(
      serviceId,
      templateId,
      templateParams,
      userId
    )

    console.log('✅ Успех:', result)
    console.log('🎉 EmailJS работает! Проверьте email test@example.com')

  } catch (error) {
    console.error('❌ Ошибка:', error.message)
    console.error('📋 Детали ошибки:')
    console.error('   Status:', error.status)
    console.error('   Text:', error.text)

    console.log('\n🔧 Возможные причины:')
    console.log('   1. Неправильный Service ID')
    console.log('   2. Неправильный Template ID')
    console.log('   3. Неправильный User ID (Public Key)')
    console.log('   4. В шаблоне нет переменных {{verification_code}} и {{to_email}}')
    console.log('   5. Email сервис не настроен в EmailJS')
    console.log('   6. Превышен лимит EmailJS (бесплатный план: 200 email/месяц)')
    console.log('   7. CORS политика блокирует запросы')

    console.log('\n📖 Проверьте настройки в https://www.emailjs.com/')
  }
}

testEmailJSDirect().catch(console.error)