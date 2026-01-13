# 📧 Email Авторизация

## Как использовать

### В демо режиме (текущее состояние):
1. **Откройте приложение** в браузере
2. **Перейдите на страницу входа** `/login`
3. **Нажмите кнопку** "📧 Войти по Email"
4. **Введите любой email** (например: `test@example.com`)
5. **Нажмите "Отправить код"**
6. **Скопируйте код** из всплывающего окна alert
7. **Введите код** в поле подтверждения
8. **Нажмите "Подтвердить"**

### ✅ Готово!
Вы войдете в систему и сможете использовать все функции приложения.

## 🔒 Безопасность

- **Демо режим:** Принимает любой email
- **Код подтверждения:** Показывается пользователю (не отправляется на email)
- **Session:** Сохраняется 7 дней

## 🚀 Для продакшена (реальная отправка email)

### Вариант 1: EmailJS (бесплатно)
```bash
npm install emailjs-com
```

Настройка в `lib/email.ts`:
```javascript
import emailjs from 'emailjs-com'

// Добавить в .env.local:
NEXT_PUBLIC_EMAILJS_SERVICE_ID=your_service_id
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=your_template_id
NEXT_PUBLIC_EMAILJS_USER_ID=your_user_id
```

### Вариант 2: SendGrid
```bash
npm install @sendgrid/mail
```

### Вариант 3: Resend
```bash
npm install resend
```

### Настройка whitelist
В `app/contexts/AuthContext.tsx`:
```typescript
const ALLOWED_EMAILS = [
  'admin@denta-crm.com',
  'doctor@clinic.ru'
]
```

## 📧 Пример реального email

```
Тема: Код подтверждения - Denta CRM

Здравствуйте!

Вы запросили вход в систему Denta CRM.

Ваш код подтверждения: 123456

Код действителен 10 минут.

Если вы не запрашивали этот код, игнорируйте это сообщение.
```

## ⚙️ API для отправки email

Создайте `pages/api/send-email.ts`:
```typescript
import { NextApiRequest, NextApiResponse } from 'next'
import nodemailer from 'nodemailer'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).end()
  }

  const { to, subject, text, html } = req.body

  // Настройка SMTP
  const transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      text,
      html,
    })

    res.status(200).json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to send email' })
  }
}
```

## 🔐 Переменные окружения

Создайте `.env.local`:
```
# EmailJS (для бесплатного варианта)
NEXT_PUBLIC_EMAILJS_SERVICE_ID=your_service_id
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=your_template_id
NEXT_PUBLIC_EMAILJS_USER_ID=your_user_id

# SMTP (для продакшена)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@denta-crm.com
```