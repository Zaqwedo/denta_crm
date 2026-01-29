# Стандарты кодирования Denta CRM

Этот документ содержит примеры правильного и неправильного кода для проекта Denta CRM. Используйте его как справочник при написании кода.

## 📋 Содержание

1. [Использование утилит (DRY)](#использование-утилит-dry)
2. [Разделение слоев (SRP)](#разделение-слоев-srp)
3. [Использование констант](#использование-констант)
4. [API маршруты](#api-маршруты)
5. [Аутентификация и авторизация](#аутентификация-и-авторизация)
6. [Работа с базой данных](#работа-с-базой-данных)
7. [Валидация данных](#валидация-данных)
8. [Обработка ошибок](#обработка-ошибок)
9. [TypeScript типизация](#typescript-типизация)
10. [Server Actions](#server-actions)

---

## Использование утилит (DRY)

### ✅ Правильно: Использование утилит из lib/utils.ts

```typescript
// lib/utils.ts
export function formatTime(time: string | null | undefined): string {
  if (!time) return '';
  if (time.match(/^\d{1,2}:\d{2}$/)) return time;
  if (time.match(/^\d{1,2}:\d{2}:\d{2}$/)) return time.substring(0, 5);
  const parts = time.split(':');
  if (parts.length >= 2) {
    const hours = parts[0].padStart(2, '0');
    const minutes = parts[1].padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  return time;
}

// app/patients/PatientForm.tsx
import { formatTime } from '@/lib/utils';

function PatientForm() {
  const formattedTime = formatTime(patient['Время записи']);
  // ...
}
```

### ❌ Неправильно: Дублирование кода

```typescript
// app/patients/PatientForm.tsx
function formatTime(time: string | null | undefined): string {
  // та же реализация - ДУБЛИРОВАНИЕ!
  if (!time) return '';
  // ...
}

// app/patients/NewPatientForm.tsx
function formatTime(time: string | null | undefined): string {
  // та же реализация - ДУБЛИРОВАНИЕ!
  if (!time) return '';
  // ...
}
```

### ✅ Правильно: Единая валидация email

```typescript
// lib/utils.ts
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

// app/api/auth/register/route.ts
import { validateEmail, normalizeEmail } from '@/lib/utils';

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  
  if (!validateEmail(email)) {
    return NextResponse.json(
      { error: 'Неверный формат email' },
      { status: 400 }
    );
  }
  
  const normalizedEmail = normalizeEmail(email);
  // ...
}
```

### ❌ Неправильно: Дублирование валидации

```typescript
// app/api/auth/register/route.ts
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) { /* ... */ }

// app/api/admin/whitelist/route.ts
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // ДУБЛИРОВАНИЕ!
if (!emailRegex.test(email)) { /* ... */ }
```

---

## Разделение слоев (SRP)

### ✅ Правильно: Четкое разделение слоев

```typescript
// lib/supabase-db.ts (Repository - ТОЛЬКО работа с БД)
export async function getPatientsFromDB(): Promise<PatientData[]> {
  await safeEnsureAnonymousSession();
  const { data, error } = await supabase
    .from('patients')
    .select('*');
  
  if (error) throw error;
  return data || [];
}

// lib/patient-service.ts (Service - бизнес-логика)
import { getPatientsFromDB } from './supabase-db';
import { getDoctorsForEmailByEmail } from './admin-db';
import { checkAdminAuth } from './auth-check';

export async function getFilteredPatients(userEmail?: string): Promise<PatientData[]> {
  const allPatients = await getPatientsFromDB();
  const isAdmin = await checkAdminAuth();
  
  if (isAdmin) {
    return allPatients; // Админ видит всех
  }
  
  // Бизнес-логика фильтрации
  const normalizedEmail = userEmail?.toLowerCase().trim();
  if (!normalizedEmail) {
    return [];
  }
  
  const allowedDoctors = await getDoctorsForEmailByEmail(normalizedEmail);
  return allPatients.filter(patient => 
    allowedDoctors.includes(patient.Доктор || '')
  );
}

// app/patients/page.tsx (Component - ТОЛЬКО UI)
import { getFilteredPatients } from '@/lib/patient-service';

export default async function PatientsPage() {
  const patients = await getFilteredPatients();
  return <PatientsList patients={patients} />;
}
```

### ❌ Неправильно: Смешивание слоев

```typescript
// lib/supabase-db.ts - НЕПРАВИЛЬНО: бизнес-логика в Repository
export async function getPatients(userEmail?: string): Promise<PatientData[]> {
  await safeEnsureAnonymousSession();
  
  // ❌ Бизнес-логика в Repository!
  const isAdmin = await checkAdminAuth();
  const allowedDoctors = await getDoctorsForEmailByEmail(normalizedEmail);
  
  let query = supabase.from('patients').select('*');
  if (!isAdmin) {
    query = query.in('Доктор', allowedDoctors); // Бизнес-логика!
  }
  
  return data;
}

// app/patients/PatientForm.tsx - НЕПРАВИЛЬНО: бизнес-логика в компоненте
function PatientForm() {
  // ❌ Бизнес-логика в компоненте!
  function formatPhone(value: string): string {
    // форматирование телефона
  }
  
  function validateEmail(email: string): boolean {
    // валидация email
  }
  
  // ...
}
```

---

## Использование констант

### ✅ Правильно: Использование констант из lib/constants.ts

```typescript
// lib/constants.ts
export const DOCTORS = [
  "Карнаухов В.А.",
  "Абасова Т.М.",
];

export const PATIENT_STATUSES = [
  "Ожидает",
  "Подтвержден",
  "Отменен",
  "Завершен",
];

// app/patients/PatientForm.tsx
import { DOCTORS, PATIENT_STATUSES, NURSES } from '@/lib/constants';

function PatientForm() {
  const doctorOptions = DOCTORS.map(doctor => ({
    value: doctor,
    label: doctor
  }));
  
  const statusOptions = PATIENT_STATUSES.map(status => ({
    value: status,
    label: status
  }));
  
  // ...
}
```

### ❌ Неправильно: Хардкод значений

```typescript
// app/patients/PatientForm.tsx
function PatientForm() {
  // ❌ Хардкод!
  const doctors = ["Карнаухов В.А.", "Абасова Т.М."];
  const statuses = ["Ожидает", "Подтвержден", "Отменен", "Завершен"];
  
  // ...
}
```

---

## API маршруты

### ✅ Правильно: App Router с валидацией и обработкой ошибок

```typescript
// app/api/patients/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { checkAuthAppRouter, unauthorizedResponse } from '@/lib/auth-check';
import { logger } from '@/lib/logger';
import { getFilteredPatients } from '@/lib/patient-service';

export async function GET(req: NextRequest) {
  try {
    // 1. Проверка аутентификации
    const isAuthenticated = await checkAuthAppRouter();
    if (!isAuthenticated) {
      return unauthorizedResponse();
    }

    // 2. Получение данных через Service слой
    const patients = await getFilteredPatients();

    // 3. Возврат результата
    return NextResponse.json({ patients });
  } catch (error) {
    logger.error('Error fetching patients', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Проверка аутентификации
    const isAuthenticated = await checkAuthAppRouter();
    if (!isAuthenticated) {
      return unauthorizedResponse();
    }

    // 2. Валидация данных
    const body = await req.json();
    if (!body.ФИО || body.ФИО.trim() === '') {
      return NextResponse.json(
        { error: 'ФИО обязательно для заполнения' },
        { status: 400 }
      );
    }

    // 3. Бизнес-логика через Service
    // ...

    // 4. Возврат результата
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    logger.error('Error creating patient', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### ❌ Неправильно: Pages Router, отсутствие валидации

```typescript
// pages/api/patients.ts - НЕПРАВИЛЬНО: Pages Router
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // ❌ Pages Router вместо App Router
  // ❌ Нет проверки аутентификации
  // ❌ Нет валидации данных
  // ❌ Нет обработки ошибок
  
  const patients = await getPatients();
  res.status(200).json({ patients });
}
```

---

## Аутентификация и авторизация

### ✅ Правильно: Использование функций из lib/auth-check.ts

```typescript
// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth, unauthorizedResponse } from '@/lib/auth-check';

export async function GET(req: NextRequest) {
  try {
    // Проверка админских прав
    const isAdmin = await checkAdminAuth();
    if (!isAdmin) {
      return unauthorizedResponse();
    }

    // Логика для админа
    // ...
  } catch (error) {
    // ...
  }
}
```

### ❌ Неправильно: Хардкод проверки админа

```typescript
// app/api/admin/users/route.ts - НЕПРАВИЛЬНО
export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get('admin_auth');
  
  // ❌ Дублирование логики проверки админа
  if (adminCookie?.value !== 'valid') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // ❌ Или еще хуже - хардкод
  const user = await getUser();
  if (user.username !== 'admin') { // ❌ Хардкод!
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // ...
}
```

### ✅ Правильно: Нормализация email

```typescript
import { normalizeEmail } from '@/lib/utils';

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  
  // ✅ Всегда нормализуем email
  const normalizedEmail = normalizeEmail(email);
  
  // ...
}
```

### ❌ Неправильно: Email без нормализации

```typescript
export async function POST(req: NextRequest) {
  const { email } = await req.json();
  
  // ❌ Email не нормализован - может быть "User@Example.COM"
  const user = await findUserByEmail(email);
  
  // ...
}
```

---

## Работа с базой данных

### ✅ Правильно: Использование Repository слоя

```typescript
// lib/supabase-db.ts (Repository)
export async function createPatient(patientData: PatientData): Promise<PatientData> {
  await safeEnsureAnonymousSession();
  
  const { data, error } = await supabase
    .from('patients')
    .insert({
      ...patientData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// app/api/patients/route.ts
import { createPatient } from '@/lib/supabase-db';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const patient = await createPatient(body);
  return NextResponse.json({ patient }, { status: 201 });
}
```

### ❌ Неправильно: Прямые запросы к БД в API маршрутах

```typescript
// app/api/patients/route.ts - НЕПРАВИЛЬНО
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  // ❌ Прямой запрос к БД в API маршруте
  const { data, error } = await supabase
    .from('patients')
    .insert(body)
    .select()
    .single();
  
  // ❌ Нет установки анонимной сессии
  // ❌ Нет установки created_by_email
  // ❌ Нет обновления updated_at
  
  return NextResponse.json({ data });
}
```

### ✅ Правильно: Установка метаданных

```typescript
// lib/supabase-db.ts
export async function createPatient(
  patientData: PatientData,
  userEmail?: string
): Promise<PatientData> {
  await safeEnsureAnonymousSession();
  
  const cookieStore = await cookies();
  const emailCookie = cookieStore.get('denta_user_email');
  const creatorEmail = userEmail || emailCookie?.value;
  
  const { data, error } = await supabase
    .from('patients')
    .insert({
      ...patientData,
      created_by_email: creatorEmail,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}
```

---

## Валидация данных

### ✅ Правильно: Валидация на API уровне

```typescript
// app/api/patients/route.ts
import { validateEmail } from '@/lib/utils';
import { DOCTORS, PATIENT_STATUSES } from '@/lib/constants';

export async function POST(req: NextRequest) {
  const body = await req.json();
  
  // Валидация обязательных полей
  if (!body.ФИО || body.ФИО.trim() === '') {
    return NextResponse.json(
      { error: 'ФИО обязательно для заполнения' },
      { status: 400 }
    );
  }
  
  // Валидация формата email (если есть)
  if (body.email && !validateEmail(body.email)) {
    return NextResponse.json(
      { error: 'Неверный формат email' },
      { status: 400 }
    );
  }
  
  // Валидация значений из констант
  if (body.Доктор && !DOCTORS.includes(body.Доктор)) {
    return NextResponse.json(
      { error: 'Неверный доктор' },
      { status: 400 }
    );
  }
  
  if (body.Статус && !PATIENT_STATUSES.includes(body.Статус)) {
    return NextResponse.json(
      { error: 'Неверный статус' },
      { status: 400 }
    );
  }
  
  // ...
}
```

### ❌ Неправильно: Отсутствие валидации

```typescript
// app/api/patients/route.ts - НЕПРАВИЛЬНО
export async function POST(req: NextRequest) {
  const body = await req.json();
  
  // ❌ Нет валидации - может быть пустое ФИО
  // ❌ Нет проверки формата email
  // ❌ Нет проверки значений из констант
  
  const patient = await createPatient(body);
  return NextResponse.json({ patient });
}
```

---

## Обработка ошибок

### ✅ Правильно: Полная обработка ошибок

```typescript
// app/api/patients/route.ts
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    // Валидация
    const body = await req.json();
    if (!body.ФИО) {
      return NextResponse.json(
        { error: 'ФИО обязательно' },
        { status: 400 }
      );
    }
    
    // Бизнес-логика
    const patient = await createPatient(body);
    
    return NextResponse.json({ patient }, { status: 201 });
  } catch (error: any) {
    // Логирование ошибки
    logger.error('Error creating patient', {
      error: error.message,
      stack: error.stack,
    });
    
    // Возврат понятной ошибки
    return NextResponse.json(
      { error: 'Не удалось создать пациента' },
      { status: 500 }
    );
  }
}
```

### ❌ Неправильно: Отсутствие обработки ошибок

```typescript
// app/api/patients/route.ts - НЕПРАВИЛЬНО
export async function POST(req: NextRequest) {
  // ❌ Нет try-catch
  // ❌ Нет логирования ошибок
  // ❌ Ошибки не обрабатываются
  
  const body = await req.json();
  const patient = await createPatient(body);
  return NextResponse.json({ patient });
}
```

---

## TypeScript типизация

### ✅ Правильно: Строгая типизация

```typescript
// lib/supabase-db.ts
export interface PatientData {
  id?: string;
  ФИО: string;
  Телефон?: string;
  // ...
}

export async function createPatient(
  patientData: PatientData
): Promise<PatientData> {
  // Типизированный код
}

// app/api/patients/route.ts
import { PatientData } from '@/lib/supabase-db';

export async function POST(req: NextRequest) {
  const body = await req.json() as Partial<PatientData>;
  
  // Валидация перед использованием
  if (!body.ФИО) {
    return NextResponse.json(
      { error: 'ФИО обязательно' },
      { status: 400 }
    );
  }
  
  const patientData: PatientData = {
    ФИО: body.ФИО,
    Телефон: body.Телефон,
    // ...
  };
  
  const patient = await createPatient(patientData);
  return NextResponse.json({ patient });
}
```

### ❌ Неправильно: Слабая типизация с `as`

```typescript
// app/api/patients/route.ts - НЕПРАВИЛЬНО
export async function POST(req: NextRequest) {
  const body = await req.json();
  
  // ❌ Использование `as` без валидации
  const name = body.name as string;
  const phone = body.phone as string;
  
  // ❌ Может быть undefined, но используется как string
  const patient = await createPatient({
    ФИО: name, // может быть undefined!
    Телефон: phone,
  });
  
  return NextResponse.json({ patient });
}
```

---

## Server Actions

### ✅ Правильно: Server Action с валидацией и revalidation

```typescript
// app/patients/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { createPatient } from '@/lib/supabase-db';
import { PatientData } from '@/lib/supabase-db';

export async function createPatientAction(formData: FormData) {
  try {
    // Валидация
    const fio = formData.get('ФИО') as string;
    if (!fio || fio.trim() === '') {
      return { error: 'ФИО обязательно для заполнения' };
    }
    
    // Создание объекта PatientData
    const patientData: PatientData = {
      ФИО: fio,
      Телефон: formData.get('Телефон') as string | undefined,
      // ...
    };
    
    // Создание через Repository
    const patient = await createPatient(patientData);
    
    // Revalidation кеша
    revalidatePath('/patients');
    
    return { success: true, patient };
  } catch (error) {
    return { error: 'Не удалось создать пациента' };
  }
}
```

### ❌ Неправильно: Server Action без валидации

```typescript
// app/patients/actions.ts - НЕПРАВИЛЬНО
'use server';

export async function createPatientAction(formData: FormData) {
  // ❌ Нет валидации
  // ❌ Нет обработки ошибок
  // ❌ Нет revalidation
  
  const patient = await createPatient({
    ФИО: formData.get('ФИО') as string, // может быть null!
  });
  
  return { patient };
}
```

---

## 📝 Резюме

### Всегда делайте:
- ✅ Используйте утилиты из `lib/utils.ts`
- ✅ Разделяйте слои (Repository → Service → Component)
- ✅ Используйте константы из `lib/constants.ts`
- ✅ Используйте функции из `lib/auth-check.ts`
- ✅ Валидируйте все входные данные
- ✅ Обрабатывайте ошибки
- ✅ Используйте строгую типизацию TypeScript
- ✅ Используйте App Router для API маршрутов
- ✅ Нормализуйте email: `email.toLowerCase().trim()`

### Никогда не делайте:
- ❌ Не дублируйте код
- ❌ Не смешивайте слои
- ❌ Не хардкодите значения
- ❌ Не используйте `as` без валидации
- ❌ Не используйте Pages Router для новых API
- ❌ Не забывайте про валидацию и обработку ошибок
