import { NextApiRequest, NextApiResponse } from 'next'
import { logger } from '@/lib/logger'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // v2: Move debug to the very top and add console logging
  const { code, error, debug } = req.query
  
  console.log('--- Google Callback v2 ---')
  console.log('Query params:', JSON.stringify(req.query))

  if (debug === 'true') {
    let baseUrl = process.env.APP_URL || process.env.VERCEL_URL
    if (!baseUrl && req.headers.host) {
      const protocol = req.headers['x-forwarded-proto'] || (req.headers.host.includes('localhost') ? 'http' : 'https')
      baseUrl = `${protocol}://${req.headers.host}`
    }
    const redirectUri = `${baseUrl?.replace(/\/$/, '')}/api/auth/google/callback`
    
    res.status(200).json({
      version: 'v2',
      APP_URL: process.env.APP_URL || 'NOT SET',
      VERCEL_URL: process.env.VERCEL_URL || 'NOT SET',
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'set' : 'NOT SET',
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'set' : 'NOT SET',
      calculatedRedirectUri: redirectUri,
      host: req.headers.host,
      protocol: req.headers['x-forwarded-proto'] || 'https'
    })
    return
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (error) {
    logger.error('Google OAuth error:', error)
    return res.redirect(`/login?error=${encodeURIComponent('Ошибка авторизации через Google')}`)
  }

  if (!code) {
    // v2: Change error name to verify if new code is running
    return res.redirect('/login?error=missing_code_v2')
  }

  try {
    // Определяем redirect URI (должен совпадать с тем, что в Google Console)
    let baseUrl = process.env.APP_URL || process.env.VERCEL_URL
    if (!baseUrl && req.headers.host) {
      const protocol = req.headers['x-forwarded-proto'] || (req.headers.host.includes('localhost') ? 'http' : 'https')
      baseUrl = `${protocol}://${req.headers.host}`
    }
    if (!baseUrl) baseUrl = 'http://localhost:3000'
    baseUrl = baseUrl.replace(/\/$/, '')
    const redirectUri = `${baseUrl}/api/auth/google/callback`
    
    // Логируем для отладки
    console.log('🔍 Google OAuth Callback Debug:')
    console.log('  - Code received:', code ? 'yes' : 'no')
    console.log('  - APP_URL:', process.env.APP_URL)
    console.log('  - VERCEL_URL:', process.env.VERCEL_URL)
    console.log('  - Calculated redirectUri:', redirectUri)
    console.log('  - GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'set' : 'NOT SET')
    console.log('  - GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'set' : 'NOT SET')
    
    // Проверяем наличие необходимых переменных
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      logger.error('Google OAuth credentials not configured')
      return res.redirect('/login?error=google_oauth_not_configured')
    }
    
    // Обмениваем код на токен
    const tokenRequestBody = new URLSearchParams({
      code: code as string,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    })
    
    console.log('📤 Token exchange request:')
    console.log('  - redirect_uri:', redirectUri)
    console.log('  - client_id:', process.env.GOOGLE_CLIENT_ID ? 'set' : 'NOT SET')
    console.log('  - client_secret:', process.env.GOOGLE_CLIENT_SECRET ? 'set' : 'NOT SET')
    console.log('  - code length:', (code as string)?.length || 0)
    
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenRequestBody,
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      logger.error('Token exchange error:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: tokenData,
        redirectUri: redirectUri
      })
      console.error('❌ Token exchange failed:')
      console.error('  - Status:', tokenResponse.status, tokenResponse.statusText)
      console.error('  - Error:', tokenData)
      console.error('  - Redirect URI used:', redirectUri)
      console.error('  - Request body:', tokenRequestBody.toString())
      
      // Более детальная ошибка для пользователя
      let errorMessage = 'token_exchange_failed'
      if (tokenData.error === 'invalid_grant') {
        errorMessage = 'Код авторизации истек или уже использован. Попробуйте войти снова.'
      } else if (tokenData.error === 'invalid_client') {
        errorMessage = 'Неверные учетные данные Google OAuth. Проверьте GOOGLE_CLIENT_ID и GOOGLE_CLIENT_SECRET в Vercel.'
      } else if (tokenData.error === 'redirect_uri_mismatch') {
        errorMessage = `Redirect URI не совпадает. Используется: ${redirectUri}. Проверьте настройки в Google Console.`
      } else if (tokenData.error) {
        errorMessage = `Ошибка Google OAuth: ${tokenData.error}. ${tokenData.error_description || ''}`
      }
      
      return res.redirect(`/login?error=${encodeURIComponent(errorMessage)}`)
    }

    // Получаем информацию о пользователе
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })

    const userData = await userResponse.json()

    if (!userResponse.ok) {
      logger.error('User info error:', userData)
      return res.redirect('/login?error=user_info_failed')
    }

    // Устанавливаем HttpOnly cookie
    const COOKIE_MAX_AGE_DAYS = 30
    const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60
    const userEmail = (userData.email || '').toLowerCase().trim()

    let cookieValue = `denta_auth=valid; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=lax`
    if (process.env.NODE_ENV === 'production') {
      cookieValue += '; Secure'
    }
    
    // Сохраняем email в cookie для фильтрации пациентов
    let emailCookieValue = `denta_user_email=${userEmail}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=lax`
    if (process.env.NODE_ENV === 'production') {
      emailCookieValue += '; Secure'
    }
    
    // Удаляем admin_auth cookie при входе через Google (если была установлена ранее)
    let adminAuthDeleteCookie = `admin_auth=; HttpOnly; Path=/; Max-Age=0; SameSite=lax`
    if (process.env.NODE_ENV === 'production') {
      adminAuthDeleteCookie += '; Secure'
    }

    res.setHeader('Set-Cookie', [cookieValue, emailCookieValue, adminAuthDeleteCookie])

    // Перенаправляем на страницу пациентов с данными пользователя
    const userInfo = {
      id: userData.id || userData.sub || Date.now(),
      first_name: userData.given_name || userData.name || 'User',
      last_name: userData.family_name || '',
      username: userData.email || '',
      photo_url: userData.picture || '',
    }

    // Сохраняем данные пользователя в query параметрах для клиента
    // Используем уже определенный baseUrl
    const redirectUrl = `${baseUrl}/patients?google_auth=success&user=${encodeURIComponent(JSON.stringify(userInfo))}`

    return res.redirect(redirectUrl)
  } catch (error) {
    logger.error('Google OAuth callback error:', error)
    return res.redirect('/login?error=oauth_error')
  }
}
