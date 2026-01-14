import { NextApiRequest, NextApiResponse } from 'next'
import { checkAuthPagesRouter } from '@/lib/auth-check'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Проверка авторизации
  if (!checkAuthPagesRouter(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  res.status(200).json({
    timestamp: new Date().toISOString(),
    APP_URL: process.env.APP_URL || 'NOT SET',
    VERCEL_URL: process.env.VERCEL_URL || 'NOT SET',
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'set' : 'NOT SET',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'set' : 'NOT SET',
    host: req.headers.host,
    protocol: req.headers['x-forwarded-proto'] || 'http',
    env_keys: Object.keys(process.env).filter(key => key.includes('GOOGLE') || key.includes('URL'))
  })
}
