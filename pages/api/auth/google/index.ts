import { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Проверяем наличие GOOGLE_CLIENT_ID
  if (!process.env.GOOGLE_CLIENT_ID) {
    console.error('GOOGLE_CLIENT_ID is not set')
    return res.redirect('/login?error=google_oauth_not_configured')
  }

  // Определяем базовый URL
  let baseUrl = process.env.APP_URL || process.env.VERCEL_URL
  
  // Если нет в переменных, используем заголовки запроса
  if (!baseUrl && req.headers.host) {
    const protocol = req.headers['x-forwarded-proto'] || (req.headers.host.includes('localhost') ? 'http' : 'https')
    baseUrl = `${protocol}://${req.headers.host}`
  }
  
  // Если всё ещё нет, используем localhost
  if (!baseUrl) {
    baseUrl = 'http://localhost:3000'
  }
  
  // Убираем слеш в конце, если есть
  baseUrl = baseUrl.replace(/\/$/, '')
  
  const redirectUri = `${baseUrl}/api/auth/google/callback`
  
  // Логируем для отладки (всегда, чтобы видеть что отправляется)
  console.log('🔍 Google OAuth Debug:')
  console.log('  - APP_URL:', process.env.APP_URL)
  console.log('  - VERCEL_URL:', process.env.VERCEL_URL)
  console.log('  - req.headers.host:', req.headers.host)
  console.log('  - req.headers[x-forwarded-proto]:', req.headers['x-forwarded-proto'])
  console.log('  - Calculated baseUrl:', baseUrl)
  console.log('  - Final redirectUri:', redirectUri)

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  })

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

  return res.redirect(authUrl)
}
