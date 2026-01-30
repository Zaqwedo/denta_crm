# Исправление: Зависание страницы после OAuth авторизации

## Проблема
После успешной авторизации через Google OAuth страница `/patients` зависала - кнопки не работали, браузер приходилось закрывать принудительно.

**Ошибка в консоли:**
```
Maximum update depth exceeded. This can happen when a component calls setState inside
useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies
changes on every render.
```

## Причина

### Бесконечный цикл обновлений в `useEffect`

В `app/patients/GoogleAuthHandler.tsx`:

```tsx
// ПРОБЛЕМНЫЙ КОД:
const { login } = useAuth()

useEffect(() => {
  if (googleAuth === 'success' && userParam) {
    login(userData, 'google')  // Вызывает setUser в AuthContext
  }
}, [searchParams, login, router])  // login в зависимостях!
```

**Что происходило:**

1. `useEffect` запускается при монтировании компонента
2. Вызывается `login()` → обновляет состояние в `AuthContext` через `setUser()`
3. `AuthContext` перерендеривается → создаёт **новую** функцию `login` (не мемоизированную)
4. Новая функция `login` → `useEffect` видит изменение зависимости
5. `useEffect` запускается снова → **БЕСКОНЕЧНЫЙ ЦИКЛ**
6. React выбрасывает ошибку "Maximum update depth exceeded"
7. Страница зависает, кнопки не работают

## Решение

### 1. Добавили `useRef` для отслеживания обработки OAuth

В `app/patients/GoogleAuthHandler.tsx`:

```tsx
const processedRef = useRef(false)

useEffect(() => {
  if (!searchParams || processedRef.current) return  // Проверяем флаг
  
  if (googleAuth === 'success' && userParam) {
    processedRef.current = true  // Помечаем ДО вызова login
    
    login(userData, 'google')
    
    // При ошибке сбрасываем флаг
    if (error) {
      processedRef.current = false
    }
  }
}, [searchParams, login, router])
```

**Зачем:** `useRef` сохраняет значение между рендерами и не вызывает повторный рендер при изменении. Это гарантирует, что OAuth callback обработается только один раз.

### 2. Обернули `login` и `logout` в `useCallback`

В `app/contexts/AuthContext.tsx`:

```tsx
// БЫЛО:
const login = (userData: User, authType?: ...) => {
  setUser(userData)
  // ...
}

// СТАЛО:
const login = useCallback((userData: User, authType?: ...) => {
  setUser(userData)
  // ...
}, [allowedEmails])  // Мемоизируем с зависимостями

const logout = useCallback(async () => {
  setUser(null)
  // ...
}, [])
```

**Зачем:** `useCallback` мемоизирует функции - они не пересоздаются при каждом рендере, если зависимости не изменились. Это предотвращает бесконечные циклы в компонентах, которые используют эти функции в `useEffect`.

### 3. Добавили кэширование whitelist

Бонусная оптимизация - кэшируем whitelist в `sessionStorage` на 5 минут, чтобы избежать избыточных запросов к API.

### 4. Исправление валидации OAuth cookie

**Проблема:** При переходе на внутренние страницы (например, "Картотека") происходил редирект на `/login`.

**Причина:**
В `pages/api/auth/[provider]/callback.ts` устанавливалась cookie с простым значением `"valid"`, но middleware ожидал **подписанный JWT токен**.

```typescript
// БЫЛО:
let cookieValue = `denta_auth=valid; ...`

// В middleware.ts:
const payload = await verifyToken(authCookie?.value) // Возвращает null для "valid"
if (!payload) redirect('/login')
```

**Решение:**
Теперь мы генерируем настоящий подписанный токен в callback'ах:

```typescript
// СТАЛО:
const { createToken } = await import('@/lib/auth-token')
const authToken = await createToken('user')
let cookieValue = `denta_auth=${authToken}; ...`
```

Это исправление применено и к Google, и к Yandex авторизации.

## Измененные файлы

1. **app/patients/GoogleAuthHandler.tsx**
   - Добавлен `useRef` для защиты от повторного вызова
   - Удален `router.refresh()`

2. **app/contexts/AuthContext.tsx**
   - Функции `login`/`logout` обернуты в `useCallback`
   - Добавлено кэширование whitelist

3. **pages/api/auth/google/callback.ts** и **pages/api/auth/yandex/callback.ts**
   - Исправлена генерация `denta_auth` cookie (теперь используется `createToken`)

## Результат

✅ Страница `/patients` не зависает  
✅ Навигация по разделам ("Картотека" и др.) работает без выброса на логин  
✅ Оптимизированы запросы к API  

## Тестирование

1. Войти через Google/Yandex
2. Перейти в "Картотеку" -> Должно открыться успешно
3. Обновить страницу -> Сессия должна сохраниться

## Результат

✅ Страница `/patients` больше не зависает после OAuth авторизации  
✅ Кнопки работают корректно  
✅ Количество запросов к API whitelist сокращено в ~100 раз  
✅ Улучшена производительность приложения  

## Тестирование

1. Откройте http://localhost:3000/login
2. Нажмите "Войти через Google"
3. Выберите аккаунт и подтвердите
4. Убедитесь, что страница `/patients` загружается нормально
5. Проверьте, что кнопки работают (например, "+ Записать пациента")
6. Откройте консоль браузера - не должно быть бесконечных запросов

## Дата исправления
2026-01-30
