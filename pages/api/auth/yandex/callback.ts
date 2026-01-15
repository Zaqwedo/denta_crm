import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { code, error } = req.query

  console.log('--- Yandex Callback ---')
  console.log('Query params:', JSON.stringify(req.query))

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (error) {
    console.error('Yandex OAuth error:', error)
    return res.redirect(`/login?error=${encodeURIComponent('Ошибка авторизации через Яндекс')}`)
  }

  if (!code) {
    return res.redirect('/login?error=missing_code_yandex')
  }

  try {
    // Определяем redirect URI (должен точно совпадать с настройками в Яндекс OAuth)
    let redirectUri: string

    if (process.env.NODE_ENV === 'production') {
      // В продакшене используем фиксированный URL из переменной окружения
      redirectUri = process.env.YANDEX_REDIRECT_URI || 'https://your-domain.vercel.app/api/auth/yandex/callback'
    } else {
      // В разработке используем localhost
      redirectUri = 'http://localhost:3000/api/auth/yandex/callback'
    }

    console.log('🔍 Yandex OAuth Callback Debug:')
    console.log('  - YANDEX_CLIENT_ID:', process.env.YANDEX_CLIENT_ID ? 'set' : 'NOT SET')
    console.log('  - YANDEX_CLIENT_SECRET:', process.env.YANDEX_CLIENT_SECRET ? 'set' : 'NOT SET')
    console.log('  - redirectUri:', redirectUri)

    // Проверяем наличие необходимых переменных
    if (!process.env.YANDEX_CLIENT_ID || !process.env.YANDEX_CLIENT_SECRET) {
      console.error('Yandex OAuth credentials not configured')
      return res.redirect('/login?error=yandex_oauth_not_configured')
    }

    // Обмениваем код на токен
    const tokenRequestBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code as string,
      client_id: process.env.YANDEX_CLIENT_ID,
      client_secret: process.env.YANDEX_CLIENT_SECRET,
    })

    console.log('📤 Yandex Token exchange request:')
    console.log('  - grant_type: authorization_code')
    console.log('  - client_id:', process.env.YANDEX_CLIENT_ID)
    console.log('  - redirect_uri:', redirectUri)
    console.log('  - code length:', (code as string)?.length || 0)

    const tokenResponse = await fetch('https://oauth.yandex.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenRequestBody,
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      console.error('Yandex token exchange error:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: tokenData
      })
      console.error('❌ Yandex Token exchange failed:')
      console.error('  - Status:', tokenResponse.status, tokenResponse.statusText)
      console.error('  - Error:', tokenData)

      let errorMessage = 'yandex_token_exchange_failed'
      if (tokenData.error === 'invalid_grant') {
        errorMessage = 'Код авторизации истек или уже использован. Попробуйте войти снова.'
      } else if (tokenData.error === 'invalid_client') {
        errorMessage = 'Неверные учетные данные Yandex OAuth. Проверьте YANDEX_CLIENT_ID и YANDEX_CLIENT_SECRET.'
      } else if (tokenData.error) {
        errorMessage = `Ошибка Yandex OAuth: ${tokenData.error}. ${tokenData.error_description || ''}`
      }

      return res.redirect(`/login?error=${encodeURIComponent(errorMessage)}`)
    }

    console.log('✅ Yandex Token received:', {
      access_token: tokenData.access_token ? 'present' : 'missing',
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in
    })

    // Получаем информацию о пользователе
    const userResponse = await fetch('https://login.yandex.ru/info', {
      headers: {
        Authorization: `OAuth ${tokenData.access_token}`,
      },
    })

    const userData = await userResponse.json()

    if (!userResponse.ok) {
      console.error('Yandex user info error:', userData)
      console.error('❌ Yandex User info failed:')
      console.error('  - Status:', userResponse.status, userResponse.statusText)
      console.error('  - Response:', userData)
      return res.redirect('/login?error=yandex_user_info_failed')
    }

    console.log('✅ Yandex User data received:', {
      id: userData.id,
      login: userData.login,
      first_name: userData.first_name,
      last_name: userData.last_name,
      default_email: userData.default_email,
      default_avatar_id: userData.default_avatar_id ? 'present' : 'missing'
    })

    // Устанавливаем HttpOnly cookie (как в Google)
    const COOKIE_MAX_AGE_DAYS = 30
    const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60

    let cookieValue = `denta_auth=valid; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=lax`
    if (process.env.NODE_ENV === 'production') {
      cookieValue += '; Secure'
    }

    res.setHeader('Set-Cookie', cookieValue)

    // Перенаправляем с данными пользователя
    const userInfo = {
      id: userData.id || userData.login || Date.now(),
      first_name: userData.first_name || userData.real_name || 'User',
      last_name: userData.last_name || '',
      username: userData.login || userData.default_email || '',
      photo_url: userData.default_avatar_id ? `https://avatars.yandex.net/get-yapic/${userData.default_avatar_id}/islands-200` : '',
    }

    // Определяем URL для редиректа (не обязательно должен совпадать с OAuth redirect URI)
    let redirectBaseUrl = process.env.APP_URL || process.env.VERCEL_URL
    if (!redirectBaseUrl && req.headers.host) {
      const protocol = req.headers['x-forwarded-proto'] || (req.headers.host.includes('localhost') ? 'http' : 'https')
      redirectBaseUrl = `${protocol}://${req.headers.host}`
    }
    if (!redirectBaseUrl) redirectBaseUrl = 'http://localhost:3000'
    redirectBaseUrl = redirectBaseUrl.replace(/\/$/, '')

    const redirectUrl = `${redirectBaseUrl}/patients?yandex_auth=success&user=${encodeURIComponent(JSON.stringify(userInfo))}`
    console.log('🔄 Redirecting to:', redirectUrl)

    return res.redirect(redirectUrl)

  } catch (error) {
    console.error('Yandex OAuth callback error:', error)
    return res.redirect('/login?error=yandex_oauth_error')
  }
}