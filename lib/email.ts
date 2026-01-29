// lib/email.ts - Сервис для отправки email
// Для продакшена замените на реальный SMTP сервис

// Импорт EmailJS (убедитесь, что пакет установлен: npm install @emailjs/browser)
let emailjs: any = null
if (typeof window !== 'undefined') {
  try {
    emailjs = require('@emailjs/browser')
  } catch (e) {
    console.warn('EmailJS not available, using demo mode')
  }
}

export interface EmailOptions {
  to: string
  subject: string
  text: string
  html?: string
}

export class EmailService {
  private static instance: EmailService

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService()
    }
    return EmailService.instance
  }

  /**
   * Отправка email с кодом подтверждения
   * В демо режиме показывает alert, в продакшене отправляет реальный email
   */
  async sendVerificationCode(email: string, code: string): Promise<boolean> {
    try {
      // Проверяем, настроен ли EmailJS
      const isEmailJSConfigured = emailjs && process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID && process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID && process.env.NEXT_PUBLIC_EMAILJS_USER_ID

      console.log('📧 EmailJS debug:', {
        emailjs: !!emailjs,
        serviceId: process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID,
        templateId: process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID,
        userId: process.env.NEXT_PUBLIC_EMAILJS_USER_ID,
        isConfigured: isEmailJSConfigured
      })

      if (isEmailJSConfigured) {
        // EmailJS настроен - пытаемся отправить реальный email
        console.log('📧 EmailJS настроен, отправляем код на email...')
        const emailOptions: EmailOptions = {
          to: email,
          subject: 'Код подтверждения - Denta CRM',
          text: `Ваш код подтверждения: ${code}\n\nКод действителен 10 минут.`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center;">
                <h1 style="margin: 0; font-size: 28px;">Denta CRM</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Код подтверждения</p>
              </div>

              <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center; margin: 20px 0;">
                <h2 style="color: #333; margin-top: 0;">Здравствуйте!</h2>
                <p style="color: #666;">Вы запросили вход в систему Denta CRM.</p>

                <div style="background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; display: inline-block; margin: 20px 0; max-width: 100%; box-sizing: border-box;">
                  <p style="color: #666; margin: 0 0 10px 0; font-size: 14px;">Ваш код подтверждения:</p>
                  <div style="font-size: 24px; font-weight: bold; color: #667eea; letter-spacing: 4px; word-break: break-all; text-align: center;">${code}</div>
                </div>

                <p style="color: #666; font-size: 14px;">
                  Код действителен <strong>10 минут</strong>.
                </p>
              </div>

              <div style="text-align: center; color: #999; font-size: 12px;">
                <p>Если вы не запрашивали этот код, игнорируйте это сообщение.</p>
              </div>
            </div>
            <style>
              @media only screen and (max-width: 480px) {
                div[style*="font-size: 24px"] { font-size: 20px !important; }
                div[style*="padding: 30px"] { padding: 20px !important; }
                div[style*="font-size: 28px"] { font-size: 24px !important; }
              }
            </style>
          `
        }

        const sent = await this.sendEmail(emailOptions)
        if (sent) {
          alert(`✅ Код отправлен на email: ${email}\n\n📧 Проверьте папку "Входящие" и "Спам"`)
          return true
        } else {
          // EmailJS не сработал - переходим к демо режиму
          console.log('⚠️ EmailJS не сработал, переходим к демо режиму')
          alert(`🚀 Код подтверждения: ${code}\n\n📧 Email не отправлен, используется демо режим\n💡 Для настройки Gmail SMTP смотрите GMAIL_SETUP.md`)
          return true
        }
      } else {
        // EmailJS не настроен - демо режим
        alert(`🚀 Код подтверждения: ${code}\n\n📧 В продакшене код будет отправлен на email\n💡 Для настройки EmailJS смотрите EMAILJS_SETUP.md`)
        return true
      }

    } catch (error) {
      console.error('Error sending verification code:', error)
      alert(`❌ Ошибка отправки кода: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
      return false
    }
  }

  /**
   * Универсальный метод отправки email
   * Автоматически выбирает лучший способ отправки
   */
  private async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // Вариант 1: Собственный API с Gmail SMTP (рекомендуется)
      if (typeof window !== 'undefined') {
        console.log('📧 Попытка отправки через Gmail API...')
        try {
          const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(options),
          })

          if (response.ok) {
            const result = await response.json()
            if (result.success && !result.demo) {
              console.log('✅ Email отправлен через Gmail SMTP')
              return true
            }
          }

          console.log('⚠️ Gmail API вернул демо режим или ошибку')
        } catch (apiError) {
          console.warn('⚠️ Gmail API не доступен:', apiError instanceof Error ? apiError.message : String(apiError))
        }
      }

      // Вариант 2: EmailJS (если настроен и доступен)
      if (emailjs && process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID && process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID && process.env.NEXT_PUBLIC_EMAILJS_USER_ID) {
        console.log('📧 Отправка через EmailJS...')
        console.log('📧 Данные для отправки:', {
          serviceId: process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID,
          templateId: process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID,
          userId: process.env.NEXT_PUBLIC_EMAILJS_USER_ID,
          to: options.to,
          code: options.text.match(/(\d{6})/)?.[1] || '000000'
        })

        try {
          console.log('📧 Отправка EmailJS с параметрами:', {
            service: process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID,
            template: process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID,
            user: process.env.NEXT_PUBLIC_EMAILJS_USER_ID,
            params: {
              verification_code: options.text.match(/(\d{6})/)?.[1] || '000000'
            },
            to: options.to
          })

          // Отправляем email через EmailJS
          // Выберите один из вариантов:

          // ВАРИАНТ 1: Динамический получатель (рекомендуется)
          const templateParams = {
            to_email: options.to, // Требует {{to_email}} в поле "To Email" шаблона
            verification_code: options.text.match(/(\d{6})/)?.[1] || '000000'
          }

          // ВАРИАНТ 2: Фиксированный получатель (для тестирования)
          // const templateParams = {
          //   verification_code: options.text.match(/(\d{6})/)?.[1] || '000000'
          //   // Получатель настраивается напрямую в шаблоне EmailJS
          // }

          const result = await emailjs.send(
            process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID!,
            process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID!,
            templateParams,
            {
              publicKey: process.env.NEXT_PUBLIC_EMAILJS_USER_ID!
            }
          )

          // Проверяем результат
          if (result && result.status === 200) {
            console.log('✅ EmailJS отправил успешно')
            return true
          } else {
            console.warn('⚠️ EmailJS вернул неожиданный результат:', result)
            return false
          }
        } catch (emailjsError) {
          console.error('❌ EmailJS ошибка:', emailjsError)
          console.error('❌ Детали ошибки:', {
            message: emailjsError instanceof Error ? emailjsError.message : String(emailjsError),
            status: emailjsError && typeof emailjsError === 'object' && 'status' in emailjsError ? emailjsError.status : 'unknown',
            text: emailjsError && typeof emailjsError === 'object' && 'text' in emailjsError ? emailjsError.text : 'unknown'
          })
          return false // Вернем false, чтобы перейти к демо режиму
        }
      }

      // Вариант 3: Демо режим
      console.log('📧 Используем демо режим')
      return false // Вернет false, чтобы показать код в alert

    } catch (error) {
      console.error('❌ Error sending email:', error)
      return false
    }
  }

  /**
   * Генерация кода подтверждения
   */
  generateVerificationCode(): string {
    return Math.random().toString().slice(2, 8) // 6-значный код
  }

  /**
   * Валидация email
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }
}

// Экспорт синглтона
export const emailService = EmailService.getInstance()