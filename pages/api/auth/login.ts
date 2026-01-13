import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { password } = req.body

  // Проверяем пароль
  const adminPassword = process.env.ADMIN_PASSWORD

  // Разрешаем тестовый пароль 'test' для разработки
  const isValidPassword = password === adminPassword || (password === 'test' && process.env.NODE_ENV === 'development')

  if (!isValidPassword) {
    return res.status(401).json({ error: 'Неверный пароль' })
  }

  // Устанавливаем HttpOnly cookie на 30 дней
  const maxAge = 30 * 24 * 60 * 60 // 30 дней в секундах

  let cookieValue = `denta_auth=valid; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=strict`
  if (process.env.NODE_ENV === 'production') {
    cookieValue += `; Secure`
  }

  res.setHeader('Set-Cookie', cookieValue)
  res.status(200).json({ success: true })
}