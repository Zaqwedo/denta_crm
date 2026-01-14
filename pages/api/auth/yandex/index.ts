import { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Проверяем наличие YANDEX_CLIENT_ID
  if (!process.env.YANDEX_CLIENT_ID) {
    console.error('YANDEX_CLIENT_ID is not set')
    return res.redirect('/login?error=yandex_oauth_not_configured')
  }

  // Определяем базовый URL (как в Google)
  let baseUrl = process.env.APP_URL || process.env.VERCEL_URL
  if (!baseUrl && req.headers.host) {
    const protocol = req.headers['x-forwarded-proto'] || (req.headers.host.includes('localhost') ? 'http' : 'https')
    baseUrl = `${protocol}://${req.headers.host}`
  }
  if (!baseUrl) baseUrl = 'http://localhost:3000'
  baseUrl = baseUrl.replace(/\/$/, '')

  const redirectUri = `${baseUrl}/api/auth/yandex/callback`

  console.log('🔍 Yandex OAuth Debug:')
  console.log('  - YANDEX_CLIENT_ID:', process.env.YANDEX_CLIENT_ID ? 'set' : 'NOT SET')
  console.log('  - redirectUri:', redirectUri)

  const params = new URLSearchParams({
    client_id: process.env.YANDEX_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'login:email login:info',
  })

  const authUrl = `https://oauth.yandex.com/authorize?${params.toString()}`
  return res.redirect(authUrl)
}