// Force rebuild 2026-01-14 02:22
import { NextApiRequest, NextApiResponse } from 'next'
import { checkAuthPagesRouter } from '@/lib/auth-check'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Проверка авторизации
  if (!checkAuthPagesRouter(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const baseUrl = process.env.APP_URL || process.env.VERCEL_URL || (req.headers.host ? `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}` : 'http://localhost:3000')
  const redirectUri = `${baseUrl.replace(/\/$/, '')}/api/auth/google/callback`
  
  res.status(200).json({
    APP_URL: process.env.APP_URL,
    VERCEL_URL: process.env.VERCEL_URL,
    host: req.headers.host,
    protocol: req.headers['x-forwarded-proto'],
    calculatedBaseUrl: baseUrl.replace(/\/$/, ''),
    redirectUri: redirectUri,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'set' : 'NOT SET',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'set' : 'NOT SET',
  })
}
