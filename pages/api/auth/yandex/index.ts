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
  })
  
  // Scope можно указать через переменную окружения YANDEX_OAUTH_SCOPE
  // Если scope не указан, Yandex использует те, что настроены при регистрации приложения
  // ВАЖНО: Если в настройках приложения scope включены, лучше НЕ указывать их явно в запросе
  // Это позволит Yandex использовать scope из настроек приложения автоматически
  const requestedScope = process.env.YANDEX_OAUTH_SCOPE
  
  if (requestedScope && requestedScope.trim() !== '') {
    // Если scope указан явно, используем его (формат: "login:email login:info" через пробел)
    params.append('scope', requestedScope.trim())
    console.log('  - scope (явно указан):', requestedScope)
  } else {
    // НЕ указываем scope - Yandex автоматически использует те, что настроены в приложении
    // Это правильный подход, если scope правильно настроены в Yandex OAuth
    console.log('  - scope: не указан (Yandex использует scope из настроек приложения)')
    console.log('  - Это нормально, если scope правильно настроены в Yandex OAuth')
  }

  const authUrl = `https://oauth.yandex.com/authorize?${params.toString()}`
  return res.redirect(authUrl)
}