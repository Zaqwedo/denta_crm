// import-glide-kva.js
// Скрипт для импорта данных из Glide_KVA.csv в Supabase
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import { parse } from 'csv-parse/sync'

// Загружаем переменные окружения из .env.local
function loadEnvFile() {
  try {
    const envContent = fs.readFileSync('.env.local', 'utf-8')
    const envLines = envContent.split('\n')
    
    for (const line of envLines) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '')
          process.env[key.trim()] = value.trim()
        }
      }
    }
  } catch (error) {
    console.warn('⚠️  Не удалось загрузить .env.local:', error.message)
  }
}

loadEnvFile()

// Настройки
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const CSV_FILE_PATH = './Glide_KVA.csv' // Путь к CSV файлу (экспортированному из Numbers)

// Функция для нормализации названий колонок
function normalizeColumnName(name) {
  if (!name) return ''
  return name.trim().replace(/^[🔒🔐🔑📋📊✅❌⚠️\s]+/, '').trim()
}

// Функция для разделения даты и времени
function parseDateTime(dateTimeString) {
  if (!dateTimeString || dateTimeString.trim() === '') {
    return { date: null, time: null }
  }
  
  let cleaned = dateTimeString.trim().replace(/^["']|["']$/g, '')
  
  // Формат: "28.10.2024, 11:00:00" или "28.10.2024, 8:47" или "28.10.2024"
  const parts = cleaned.split(',')
  if (parts.length >= 2) {
    const date = parts[0].trim()
    const timePart = parts[1].trim()
    const time = timePart.substring(0, 5) // Берем только HH:MM
    return { date, time }
  }
  
  // Если только дата
  if (cleaned.match(/^\d{1,2}\.\d{1,2}\.\d{4}$/)) {
    return { date: cleaned, time: null }
  }
  
  return { date: cleaned, time: null }
}

// Функция для очистки данных
function cleanValue(value) {
  if (!value || value === null || value === undefined) return null
  const cleaned = String(value).trim()
  if (cleaned === '' || cleaned === 'null' || cleaned === 'NULL') return null
  return cleaned
}

// Функция для конвертации даты из DD.MM.YYYY в YYYY-MM-DD (ISO формат для DATE)
function convertBirthDateToISO(dateString) {
  if (!dateString || dateString.trim() === '') {
    return null
  }
  
  // Убираем лишние пробелы
  let cleaned = dateString.trim().replace(/\s+/g, '')
  
  // Формат DD.MM.YYYY -> YYYY-MM-DD
  const ddmmyyyy = cleaned.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy
    const dayNum = parseInt(day, 10)
    const monthNum = parseInt(month, 10)
    const yearNum = parseInt(year, 10)
    
    // Проверяем валидность даты
    if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum >= 1900 && yearNum <= 2100) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }
  }
  
  // Если уже в формате YYYY-MM-DD, возвращаем как есть
  if (cleaned.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return cleaned
  }
  
  // Невалидный формат
  console.warn(`⚠️  Невалидный формат даты рождения: ${dateString}`)
  return null
}

// Основная функция импорта
async function importCSV() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Ошибка: Установите NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY')
    process.exit(1)
  }
  
  if (!fs.existsSync(CSV_FILE_PATH)) {
    console.error(`❌ Ошибка: Файл ${CSV_FILE_PATH} не найден`)
    console.error('📝 Пожалуйста, экспортируйте Glide_KVA.numbers в CSV формат через Numbers.app:')
    console.error('   1. Откройте Glide_KVA.numbers в Numbers')
    console.error('   2. File > Export To > CSV')
    console.error('   3. Сохраните как Glide_KVA.csv в корне проекта')
    process.exit(1)
  }
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  
  // Устанавливаем анонимную сессию для RLS
  try {
    await supabase.auth.signInAnonymously()
    console.log('✅ Анонимная сессия установлена')
  } catch (error) {
    console.warn('⚠️  Не удалось установить анонимную сессию (может быть отключена):', error.message)
  }
  
  // Читаем CSV файл
  console.log(`📖 Читаю файл: ${CSV_FILE_PATH}`)
  const fileContent = fs.readFileSync(CSV_FILE_PATH, 'utf-8')
  
  // Парсим CSV (используем точку с запятой как разделитель)
  const records = parse(fileContent, {
    columns: true, // Используем первую строку как заголовки
    skip_empty_lines: true,
    trim: true,
    encoding: 'utf8',
    relax_column_count: true,
    delimiter: ';' // Используем точку с запятой как разделитель
  })
  
  if (records.length === 0) {
    console.error('❌ CSV файл пуст или не содержит данных')
    process.exit(1)
  }
  
  console.log(`📊 Найдено ${records.length} записей для импорта`)
  console.log('📋 Найденные колонки:', Object.keys(records[0]))
  
  // Преобразуем данные
  const patientsToImport = []
  
  for (let i = 0; i < records.length; i++) {
    const record = records[i]
    
    // Нормализуем названия колонок
    const normalizedRecord = {}
    for (const [key, value] of Object.entries(record)) {
      const normalizedKey = normalizeColumnName(key)
      normalizedRecord[normalizedKey] = value
    }
    
    // Определяем поля
    const fio = cleanValue(normalizedRecord['ФИО']) || cleanValue(normalizedRecord['FIO']) || cleanValue(normalizedRecord['Имя'])
    if (!fio) {
      console.warn(`⚠️  Пропускаю запись ${i + 1}: нет ФИО`)
      continue
    }
    
    // Обрабатываем дату и время записи
    // В CSV файле дата и время в отдельных колонках
    let appointmentDate = null
    let appointmentTime = null
    
    // Сначала пробуем получить дату из отдельной колонки "Дата записи"
    const dateField = normalizedRecord['Дата записи'] || 
                      normalizedRecord['Дата']
    
    // Получаем время из отдельной колонки "Время записи"
    const timeField = normalizedRecord['Время записи'] || 
                      normalizedRecord['Время']
    
    if (dateField) {
      // Если дата в формате DD.MM.YYYY, конвертируем в YYYY-MM-DD для DATE типа
      if (dateField.match(/^\d{1,2}\.\d{1,2}\.\d{4}$/)) {
        const [day, month, year] = dateField.split('.')
        appointmentDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      } else if (dateField.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Уже в формате YYYY-MM-DD
        appointmentDate = dateField
      } else {
        // Пробуем распарсить как объединенное поле
        const { date, time } = parseDateTime(dateField)
        if (date && date.match(/^\d{1,2}\.\d{1,2}\.\d{4}$/)) {
          const [day, month, year] = date.split('.')
          appointmentDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        } else {
          appointmentDate = date
        }
        if (time && !appointmentTime) {
          appointmentTime = time
        }
      }
    }
    
    // Если время в отдельной колонке, обрабатываем его
    if (timeField) {
      // Формат может быть "8:47:00" или "11:00:00" - нормализуем в HH:MM:SS для TIME типа
      const timeCleaned = timeField.trim()
      if (timeCleaned.match(/^\d{1,2}:\d{2}$/)) {
        // Формат HH:MM -> HH:MM:SS
        appointmentTime = timeCleaned + ':00'
      } else if (timeCleaned.match(/^\d{1,2}:\d{2}:\d{2}$/)) {
        // Уже в формате HH:MM:SS
        appointmentTime = timeCleaned
      }
    }
    
    // Если дата и время в одном поле (старый формат)
    if (!appointmentDate) {
      const dateTimeField = normalizedRecord['Следующя запись'] || 
                            normalizedRecord['Дата и время']
      
      if (dateTimeField) {
        const { date, time } = parseDateTime(dateTimeField)
        if (date && date.match(/^\d{1,2}\.\d{1,2}\.\d{4}$/)) {
          const [day, month, year] = date.split('.')
          appointmentDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        } else {
          appointmentDate = date
        }
        if (time && !appointmentTime) {
          appointmentTime = time + ':00' // Добавляем секунды для TIME типа
        }
      }
    }
    
    // Обрабатываем дату рождения: конвертируем из DD.MM.YYYY в YYYY-MM-DD (ISO формат для DATE)
    const rawBirthDate = cleanValue(normalizedRecord['Дата рождения']) || cleanValue(normalizedRecord['Дата рождения пациента'])
    const birthDate = rawBirthDate ? convertBirthDateToISO(rawBirthDate) : null
    
    // Нормализуем имя врача: "Карнаухов В. А." -> "Карнаухов В.А."
    let doctor = cleanValue(normalizedRecord['Доктор']) || cleanValue(normalizedRecord['Врач'])
    if (doctor) {
      doctor = doctor.replace(/Карнаухов В\. А\./g, 'Карнаухов В.А.')
    }
    
    // Формируем объект пациента
    const patient = {
      ФИО: fio,
      Телефон: cleanValue(normalizedRecord['Телефон']) || cleanValue(normalizedRecord['Phone']),
      Комментарии: cleanValue(normalizedRecord['Комментарии']) || cleanValue(normalizedRecord['Комментарий']),
      'Дата записи': appointmentDate,
      'Время записи': appointmentTime,
      Статус: cleanValue(normalizedRecord['Статус']) || 'Ожидает',
      Доктор: doctor,
      Зубы: cleanValue(normalizedRecord['Зубы']),
      Медсестра: cleanValue(normalizedRecord['Медсестра']),
    }
    
    // Добавляем дату рождения только если она есть (в формате YYYY-MM-DD для DATE типа)
    if (birthDate) {
      patient['Дата рождения пациента'] = birthDate
    }
    
    // Удаляем пустые поля
    Object.keys(patient).forEach(key => {
      if (patient[key] === null || patient[key] === '') {
        delete patient[key]
      }
    })
    
    patientsToImport.push(patient)
  }
  
  console.log(`✅ Подготовлено ${patientsToImport.length} записей для импорта`)
  
  if (patientsToImport.length === 0) {
    console.error('❌ Нет записей для импорта')
    process.exit(1)
  }
  
  // Импортируем данные
  let imported = 0
  let errors = 0
  
  console.log(`📤 Начинаю импорт ${patientsToImport.length} записей...`)
  
  for (let i = 0; i < patientsToImport.length; i++) {
    const patient = patientsToImport[i]
    
    try {
      const { error } = await supabase
        .from('patients')
        .insert([patient])
      
      if (error) {
        console.error(`❌ Ошибка при импорте записи ${i + 1} (${patient.ФИО}):`, error.message)
        errors++
      } else {
        imported++
        if ((i + 1) % 10 === 0) {
          console.log(`📊 Импортировано: ${imported}/${patientsToImport.length}`)
        }
      }
    } catch (err) {
      console.error(`❌ Ошибка при импорте записи ${i + 1}:`, err.message)
      errors++
    }
  }
  
  console.log('\n✅ Импорт завершен!')
  console.log(`   Успешно импортировано: ${imported}`)
  console.log(`   Ошибок: ${errors}`)
}

// Запускаем импорт
importCSV().catch(console.error)
