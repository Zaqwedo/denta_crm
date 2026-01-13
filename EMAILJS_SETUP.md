# 🚀 Настройка EmailJS для отправки email

## 📦 Установка пакета

### В обычном терминале (не в Cursor):
```bash
cd /Users/vladislavabramov/Documents/denta-crm
npm install emailjs-com
```

## 🔑 Настройка EmailJS аккаунта

### Шаг 1: Регистрация
1. Перейдите: **https://www.emailjs.com/**
2. Нажмите **"Sign up"**
3. Зарегистрируйтесь (можно через Google/GitHub)

### Шаг 2: Настройка email сервиса
1. В панели управления нажмите **"Email Services"**
2. Выберите провайдера (Gmail, Outlook, Yahoo, etc.)
3. Подключите ваш email аккаунт
4. Скопируйте **Service ID**

### Шаг 3: Создание шаблона email
1. Перейдите в **"Email Templates"**
2. Нажмите **"Create New Template"**
3. Заполните шаблон:

**Subject (Тема):**
```
Код подтверждения - Denta CRM
```

**Template (HTML версия):**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Код подтверждения</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
    <h1 style="margin: 0; font-size: 28px;">Denta CRM</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">Код подтверждения</p>
  </div>

  <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
    <h2 style="color: #333; margin-top: 0;">Здравствуйте!</h2>
    <p style="color: #666; margin-bottom: 30px;">Вы запросили вход в систему Denta CRM.</p>

      <div style="background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; display: inline-block; margin-bottom: 30px; max-width: 100%; box-sizing: border-box;">
        <p style="color: #666; margin: 0 0 10px 0; font-size: 14px;">Ваш код подтверждения:</p>
        <div style="font-size: 24px; font-weight: bold; color: #667eea; letter-spacing: 4px; word-break: break-all; text-align: center;">{{verification_code}}</div>
      </div>

    <p style="color: #666; font-size: 14px; margin-bottom: 20px;">
      Код действителен <strong>10 минут</strong>.
    </p>
  </div>

  <div style="text-align: center; color: #999; font-size: 12px;">
    <p>Если вы не запрашивали этот код, просто игнорируйте это сообщение.</p>
    <p>© 2024 Denta CRM. Все права защищены.</p>
  </div>
  <style>
    @media only screen and (max-width: 480px) {
      div[style*="font-size: 24px"] { font-size: 20px !important; }
      div[style*="padding: 30px"] { padding: 20px !important; }
      div[style*="font-size: 28px"] { font-size: 24px !important; }
    }
  </style>
</body>
</html>
```

**Template (Text версия):**
```
Код подтверждения - Denta CRM

Здравствуйте!

Вы запросили вход в систему Denta CRM.

Ваш код подтверждения: {{verification_code}}

Код действителен 10 минут.

Если вы не запрашивали этот код, просто игнорируйте это сообщение.

© 2024 Denta CRM
```

4. В разделе **"Settings"** настройте получателя:
   - **To Email:** `{{to_email}}` (или укажите фиксированный email)
   - Добавьте переменную:
     - **Name:** `verification_code`
     - **Required:** ✅ Yes
   - Добавьте переменную:
     - **Name:** `to_email`
     - **Required:** ✅ Yes

5. Сохраните шаблон и скопируйте **Template ID**

### Шаг 4: Получение User ID
1. Перейдите в **"Account"**
2. Скопируйте **"Public Key"** - это ваш User ID

## ⚙️ Настройка переменных окружения

### Создайте файл `.env.local` в корне проекта:
```bash
# Создайте файл
touch .env.local
```

### Содержимое файла:
```env
# EmailJS Configuration
NEXT_PUBLIC_EMAILJS_SERVICE_ID=service_your_id_here
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=template_your_id_here
NEXT_PUBLIC_EMAILJS_USER_ID=user_your_public_key_here
```

### Пример заполненных данных:
```env
NEXT_PUBLIC_EMAILJS_SERVICE_ID=service_abc123def
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=template_xyz789
NEXT_PUBLIC_EMAILJS_USER_ID=user_public_key_456
```

## 🧪 Тестирование

### Запустите приложение:
```bash
npm run dev
```

### Протестируйте отправку:
1. Откройте `http://localhost:3000/login`
2. Нажмите **"📧 Войти по Email"**
3. Введите ваш email
4. Код должен прийти на email (а не в alert)

## 📊 Лимиты EmailJS

- **Бесплатный план:** 200 email/месяц
- **Премиум:** от $5/месяц (до 50,000 email)

## 🔧 Устранение неполадок

### Email не приходит:
1. Проверьте папку **"Спам"**
2. Убедитесь, что email сервис настроен правильно
3. Проверьте переменные окружения

### Ошибка в консоли:
```
EmailJS user ID is required!
```
- Проверьте `.env.local` файл
- Перезагрузите приложение

### Template error:
- Проверьте, что переменная `{{verification_code}}` добавлена в шаблоне

## 🎉 Готово!

После настройки EmailJS коды подтверждения будут отправляться на email пользователей! 🚀