import { NextApiRequest, NextApiResponse } from 'next'
import { rateLimiter, getClientIp } from '@/lib/rate-limit'

const isDevelopment = process.env.NODE_ENV === 'development'
const log = isDevelopment ? console.log : () => {}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Rate limiting: максимум 5 попыток входа за 15 минут
  const clientIp = getClientIp(req)
  const isAllowed = rateLimiter.check(clientIp, 5, 15 * 60 * 1000)

  if (!isAllowed) {
    const resetTime = Math.ceil(rateLimiter.getResetTime(clientIp) / 1000 / 60)
    log(`Rate limit exceeded for IP: ${clientIp}`)
    return res.status(429).json({ 
      error: `Слишком много попыток входа. Попробуйте через ${resetTime} минут.` 
    })
  }

  const { password } = req.body

  // Проверяем пароль
  const adminPassword = process.env.ADMIN_PASSWORD
  const devPassword = process.env.DEV_PASSWORD // Опциональный пароль для разработки

  if (!adminPassword) {
    return res.status(500).json({ error: 'Административный пароль не настроен' })
  }

  // Проверяем основной пароль или опциональный dev пароль
  const isValidPassword = password === adminPassword || (devPassword && password === devPassword && process.env.NODE_ENV === 'development')

  if (!isValidPassword) {
    return res.status(401).json({ error: 'Неверный пароль' })
  }

  // Устанавливаем HttpOnly cookie на 30 дней
  const COOKIE_MAX_AGE_DAYS = 30
  const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60 // 30 дней в секундах

  let cookieValue = `denta_auth=valid; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=strict`
  if (process.env.NODE_ENV === 'production') {
    cookieValue += `; Secure`
  }

  res.setHeader('Set-Cookie', cookieValue)
  res.status(200).json({ success: true })
  
  log(`Successful login from IP: ${clientIp}`)
}
