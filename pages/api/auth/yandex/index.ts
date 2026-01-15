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

  // Определяем redirect URI (должен точно совпадать с настройками в Яндекс OAuth)
  let redirectUri: string

  if (process.env.NODE_ENV === 'production') {
    // В продакшене используем фиксированный URL из переменной окружения
    redirectUri = process.env.YANDEX_REDIRECT_URI || 'https://your-domain.vercel.app/api/auth/yandex/callback'
  } else {
    // В разработке используем localhost
    redirectUri = 'http://localhost:3000/api/auth/yandex/callback'
  }

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