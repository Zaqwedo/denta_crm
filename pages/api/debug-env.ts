import { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const envVars = {
    YANDEX_CLIENT_ID: process.env.YANDEX_CLIENT_ID ? '✅ Установлен' : '❌ Отсутствует',
    YANDEX_CLIENT_SECRET: process.env.YANDEX_CLIENT_SECRET ? '✅ Установлен' : '❌ Отсутствует',
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? '✅ Установлен' : '❌ Отсутствует',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? '✅ Установлен' : '❌ Отсутствует',
    NODE_ENV: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  }

  res.status(200).json({
    message: 'Проверка переменных окружения',
    variables: envVars,
    instructions: 'Если YANDEX переменные отсутствуют, проверьте файл .env.local'
  })
}