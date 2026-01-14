// pages/api/send-email.ts
// API для отправки email (демо режим)

import { NextApiRequest, NextApiResponse } from 'next'
import { checkAuthPagesRouter } from '@/lib/auth-check'

interface EmailRequest {
  to: string
  subject: string
  text: string
  html?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Проверка авторизации
  if (!checkAuthPagesRouter(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { to, subject, text, html }: EmailRequest = req.body

  // Валидация
  if (!to || !subject || !text) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    console.log('📧 Email API запрос:', {
      to,
      subject,
      text: text.substring(0, 100) + '...',
      html: html ? 'HTML версия включена' : 'Только текст'
    })

    // Для демо режима просто логируем
    // В продакшене здесь можно добавить nodemailer или другой SMTP сервис

    res.status(200).json({
      success: true,
      message: 'Email обработан (демо режим)',
      demo: true
    })

  } catch (error) {
    console.error('❌ Ошибка в email API:', error)
    res.status(500).json({
      error: 'Failed to process email',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    })
  }
}