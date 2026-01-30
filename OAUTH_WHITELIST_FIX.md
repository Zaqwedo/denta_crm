# 🔐 РЕШЕНИЕ ПРОБЛЕМЫ OAUTH

**Проблема**: После успешной авторизации через Google/Yandex вас выбрасывает обратно на страницу логина.

**Причина**: Ваш email не находится в whitelist разрешенных пользователей.

---

## 📋 ТЕКУЩИЙ WHITELIST

### Email авторизация:
- `kirqip@rambler.ru`
- `vbrmv@icloud.com`
- `zheleznovanadr@mail.ru`

### Google OAuth:
- `bor1vel61@gmail.com`
- `kapitancrumpled@gmail.com`
- `vitaliksport79@gmail.com`

### Yandex OAuth:
- *(пусто)*

---

## ✅ РЕШЕНИЕ

### Вариант 1: Добавить ваш email в whitelist

**Шаг 1**: Узнайте, какой email вы используете для входа через Google/Yandex

**Шаг 2**: Добавьте его в whitelist с помощью скрипта:

```bash
# Для Google
node scripts/add-email-to-whitelist.mjs your-email@gmail.com google

# Для Yandex
node scripts/add-email-to-whitelist.mjs your-email@yandex.ru yandex

# Для обычного email/пароль
node scripts/add-email-to-whitelist.mjs your-email@example.com email
```

**Шаг 3**: Попробуйте войти снова

---

### Вариант 2: Отключить whitelist (НЕ РЕКОМЕНДУЕТСЯ для production)

Если вы хотите разрешить вход ВСЕМ пользователям (только для тестирования!):

1. Откройте `app/contexts/AuthContext.tsx`
2. Найдите строку с проверкой whitelist
3. Закомментируйте проверку

**⚠️ ВНИМАНИЕ**: Это небезопасно для production! Любой человек с Google/Yandex аккаунтом сможет войти.

---

## 🧪 ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ СКРИПТА

### Посмотреть текущий whitelist:
```bash
node scripts/add-email-to-whitelist.mjs --list
```

### Добавить Google email:
```bash
node scripts/add-email-to-whitelist.mjs myemail@gmail.com google
```

### Добавить Yandex email:
```bash
node scripts/add-email-to-whitelist.mjs myemail@yandex.ru yandex
```

### Добавить обычный email:
```bash
node scripts/add-email-to-whitelist.mjs myemail@example.com email
```

---

## 🔍 КАК УЗНАТЬ СВОЙ EMAIL

### Google:
1. Войдите в Google аккаунт
2. Откройте https://myaccount.google.com/
3. Посмотрите основной email

### Yandex:
1. Войдите в Яндекс
2. Откройте https://passport.yandex.ru/
3. Посмотрите ваш логин (это и есть email)

---

## 📝 ПОСЛЕ ДОБАВЛЕНИЯ EMAIL

1. **Перезагрузите страницу логина**
2. **Нажмите "Войти через Google" или "Войти через Яндекс"**
3. **Выберите аккаунт с добавленным email**
4. **Вы должны попасть на страницу `/patients`**

---

## ⚠️ ВАЖНО ДЛЯ PRODUCTION

Для production (Vercel) нужно добавить email через Supabase Dashboard:

1. Откройте https://supabase.com/dashboard
2. Выберите ваш проект
3. Table Editor → `whitelist_emails`
4. Insert → New row:
   - `email`: ваш email
   - `provider`: `google` или `yandex` или `email`
5. Save

---

**Теперь OAuth должен работать!** 🎉
