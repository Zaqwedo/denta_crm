# Настройка авторизации для Production (Vercel)

Для работы входа через Google и Yandex на продакшене, необходимо добавить ваш продакшн домен в настройки OAuth провайдеров.

## 1. Ваш Production домен

В инструкциях ниже замените `https://YOUR_DOMAIN.vercel.app` на ваш реальный URL приложения в Vercel.

## 2. Настройка Google OAuth

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Выберите ваш проект.
3. Откройте созданный **OAuth 2.0 Client ID**.
4. Найдите секцию **Authorized redirect URIs**.
5. Добавьте URL:
   ```
   https://YOUR_DOMAIN.vercel.app/api/auth/google/callback
   ```
   *(Убедитесь, что `http://localhost:3000/api/auth/google/callback` также есть в списке для локальной разработки)*
6. Нажмите **Save**.

## 3. Настройка Yandex OAuth

1. Перейдите в [Yandex OAuth Console](https://oauth.yandex.ru/).
2. Выберите ваше приложение.
3. Найдите поле **Callback URI**.
4. Добавьте новый URI (или измените существующий, если это отдельное приложение для прода):
   ```
   https://YOUR_DOMAIN.vercel.app/api/auth/yandex/callback
   ```
   *(Для локальной разработки оставьте или добавьте `http://localhost:3000/api/auth/yandex/callback`)*
5. Нажмите **Сохранить**.

## 4. Переменные окружения в Vercel

В проекте на Vercel (Settings -> Environment Variables) убедитесь, что установлены следующие переменные:

| Переменная | Значение | Описание |
|------------|----------|----------|
| `APP_URL` | `https://YOUR_DOMAIN.vercel.app` | **Опционально**, но рекомендуется. Укажите ваш основной домен (с https://). Если не указано, код попытается определить его через заголовки или `VERCEL_URL`. |
| `GOOGLE_CLIENT_ID` | `...` | Ваш Google Client ID |
| `GOOGLE_CLIENT_SECRET` | `...` | Ваш Google Client Secret |
| `YANDEX_CLIENT_ID` | `...` | Ваш Yandex Client ID |
| `YANDEX_CLIENT_SECRET` | `...` | Ваш Yandex Client Secret |

## 5. Важные замечания

*   **HTTPS**: На продакшене обязательно должен использоваться HTTPS. Код автоматически определяет протокол `https`, если приложение запущено не на localhost.
*   **Redirect URI Mismatch**: Если вы получаете ошибку `redirect_uri_mismatch` (Google) или `invalid_request` (Yandex), это на 99% означает, что URL, который приложение отправило провайдеру, не совпадает (до символа!) с тем, что вы прописали в настройках консоли.

### Как приложение определяет Redirect URI:
Приложение вычисляет URI динамически:
`{PROTOCOL}://{HOST}/api/auth/{PROVIDER}/callback`

Например: `https://denta-crm.vercel.app/api/auth/google/callback`
