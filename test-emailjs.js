// test-emailjs.js - Простой тест EmailJS
// Запустите: node test-emailjs.js

// Импортируем EmailJS
import emailjs from 'emailjs-com'

// Загружаем переменные окружения
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
  } catch {
    try {
      const configPath = join(__dirname, 'env-config.txt')
      const configContent = readFileSync(configPath, 'utf8')
      configContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=')
        if (key && key.startsWith('NEXT_PUBLIC_EMAILJS_')) {
          env[key.trim()] = valueParts.join('=').trim()
        }
      })
    } catch {
      console.error('❌ Не найден файл с переменными окружения')
      process.exit(1)
    }
  }

  return env
}

async function testEmailJS() {
  const env = loadEnv()

  const serviceId = env.NEXT_PUBLIC_EMAILJS_SERVICE_ID
  const templateId = env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID
  const userId = env.NEXT_PUBLIC_EMAILJS_USER_ID

  console.log('🧪 Тестирование EmailJS...\n')

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
    console.log('📧 Отправка тестового email...')

    const result = await emailjs.send(
      serviceId,
      templateId,
      {
        to_email: 'test@example.com', // Замените на ваш реальный email для тестирования
        verification_code: '123456'
      },
      userId
    )

    console.log('✅ Успех:', result)

  } catch (error) {
    console.error('❌ Ошибка:', error)
    console.error('📋 Детали ошибки:')
    console.error('   Сообщение:', error.message)
    console.error('   Статус:', error.status)
    console.error('   Текст:', error.text)

    console.log('\n🔧 Возможные причины:')
    console.log('   1. Неправильный Service ID')
    console.log('   2. Неправильный Template ID')
    console.log('   3. Неправильный User ID (Public Key)')
    console.log('   4. В шаблоне нет переменной {{verification_code}}')
    console.log('   5. Email сервис не настроен в EmailJS')
    console.log('   6. CORS политика блокирует запросы')
  }
}

testEmailJS().catch(console.error)
