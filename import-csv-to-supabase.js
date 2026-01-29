// import-csv-to-supabase.js
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
          const value = valueParts.join('=').replace(/^["']|["']$/g, '') // Убираем кавычки
          process.env[key.trim()] = value.trim()
        }
      }
    }
  } catch (error) {
    console.warn('⚠️  Не удалось загрузить .env.local:', error.message)
  }
}

// Загружаем переменные окружения
loadEnvFile()

// Настройки
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const CSV_FILE_PATH = './old-patients.csv' // Путь к вашему CSV файлу

// Маппинг старых названий колонок на новые
const COLUMN_MAPPING = {
  'ФИО': 'ФИО',
  'Телефон': 'Телефон',
  'Комментарии': 'Комментарии',
  'Доктор': 'Доктор',
  'Зубы': 'Зубы',
  'Медсестра': 'Медсестра',
  'Дата рождения': 'Дата рождения пациента',
  'Следующя запись': 'Следующя запись', // Специальная обработка - содержит дату и время
  // Пропускаем: Row ID, Implant, Type_implant
}

// Функция для нормализации названий колонок
function normalizeColumnName(oldName) {
  // Убираем пробелы в начале и конце, приводим к единому виду
  let trimmed = oldName.trim()
  
  // Убираем эмодзи и специальные символы в начале
  trimmed = trimmed.replace(/^[🔒🔐🔑📋📊✅❌⚠️\s]+/, '').trim()
  
  // Проверяем маппинг
  if (COLUMN_MAPPING[trimmed]) {
    return COLUMN_MAPPING[trimmed]
  }
  
  // Если нет в маппинге, возвращаем как есть (может быть уже правильное название)
  return trimmed
}

// Функция для разделения даты и времени из "Следующя запись"
function parseDateTime(dateTimeString) {
  if (!dateTimeString || dateTimeString.trim() === '') {
    return { date: null, time: null }
  }
  
  // Убираем кавычки если есть
  let cleaned = dateTimeString.trim().replace(/^["']|["']$/g, '')
  
  // Формат: "28.10.2024, 11:00:00" или "28.10.2024, 8:47"
  const parts = cleaned.split(',')
  if (parts.length >= 2) {
    const date = parts[0].trim() // "28.10.2024"
    const timePart = parts[1].trim() // "11:00:00" или "8:47"
    // Берем только часы и минуты (первые 5 символов)
    const time = timePart.substring(0, 5) // "11:00" или "8:47"
    return { date, time }
  }
  
  // Если формат другой, пытаемся распарсить
  return { date: cleaned, time: null }
}

// Функция для преобразования даты из формата "28.10.2024" в ISO формат "2024-10-28"
function convertDateToISO(dateString) {
  if (!dateString || dateString.trim() === '') {
    return null
  }
  
  // Формат: "28.10.2024" -> "2024-10-28"
  const parts = dateString.trim().split('.')
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0')
    const month = parts[1].padStart(2, '0')
    const year = parts[2]
    return `${year}-${month}-${day}`
  }
  
  return null
}

// Функция для преобразования строки CSV в объект для Supabase
function convertRowToPatientData(row, headers) {
  const patientData = {}
  let appointmentDate = null // Сохраняем дату записи для установки created_at
  
  headers.forEach((oldHeader, index) => {
    const normalizedHeader = oldHeader.replace(/^[🔒🔐🔑📋📊✅❌⚠️\s]+/, '').trim()
    
    // Пропускаем служебные колонки
    if (normalizedHeader === 'Row ID' || normalizedHeader === 'Implant' || normalizedHeader === 'Type_implant') {
      return
    }
    
    const newColumnName = normalizeColumnName(oldHeader)
    
    // Пропускаем, если колонка не нужна
    if (!newColumnName || newColumnName === 'Row ID' || newColumnName === 'Implant' || newColumnName === 'Type_implant') {
      return
    }
    
    const value = row[index]?.trim() || null
    
    // Специальная обработка для "Следующя запись"
    if (newColumnName === 'Следующя запись' && value) {
      const { date, time } = parseDateTime(value)
      if (date) {
        patientData['Дата записи'] = date
        appointmentDate = date // Сохраняем для установки created_at
      }
      if (time) {
        patientData['Время записи'] = time
      }
      return
    }
    
    // Пропускаем пустые значения
    if (value && value !== '' && value !== 'null' && value !== 'NULL') {
      patientData[newColumnName] = value
    }
  })
  
  // Проверяем обязательное поле ФИО
  if (!patientData['ФИО'] || patientData['ФИО'].trim() === '') {
    return null // Пропускаем записи без ФИО
  }
  
  // Устанавливаем статус "Завершен" для всех старых записей
  patientData['Статус'] = 'Завершен'
  
  // Сохраняем дату записи для последующего обновления created_at
  patientData._appointmentDate = appointmentDate
  
  return patientData
}

// Основная функция импорта
async function importCSV() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Ошибка: Установите NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY')
    process.exit(1)
  }
  
  if (!fs.existsSync(CSV_FILE_PATH)) {
    console.error(`❌ Ошибка: Файл ${CSV_FILE_PATH} не найден`)
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
  
  // Парсим CSV
  const records = parse(fileContent, {
    columns: false, // Не используем первую строку как заголовки автоматически
    skip_empty_lines: true,
    trim: true,
    encoding: 'utf8'
  })
  
  if (records.length === 0) {
    console.error('❌ CSV файл пуст или не содержит данных')
    process.exit(1)
  }
  
  // Первая строка - заголовки
  const headers = records[0]
  console.log('📋 Найденные колонки в CSV:', headers)
  
  // Остальные строки - данные
  const dataRows = records.slice(1)
  console.log(`📊 Найдено ${dataRows.length} записей для импорта`)
  
  // Преобразуем данные
  const patientsToImport = []
  let skipped = 0
  
  for (const row of dataRows) {
    const patientData = convertRowToPatientData(row, headers)
    if (patientData) {
      patientsToImport.push(patientData)
    } else {
      skipped++
    }
  }
  
  console.log(`✅ Подготовлено ${patientsToImport.length} записей для импорта`)
  if (skipped > 0) {
    console.log(`⚠️  Пропущено ${skipped} записей (без ФИО)`)
  }
  
  if (patientsToImport.length === 0) {
    console.error('❌ Нет данных для импорта')
    process.exit(1)
  }
  
  // Импортируем по одной записи (батчевый импорт вызывает проблемы с типами данных)
  let imported = 0
  let errors = 0
  let errorDetails = []
  
  console.log(`📤 Начинаю импорт ${patientsToImport.length} записей...`)
  
  for (let i = 0; i < patientsToImport.length; i++) {
    const patient = patientsToImport[i]
    
    // Очищаем данные - убеждаемся, что все значения - строки
    // Важно: все поля в таблице patients имеют тип TEXT, поэтому передаем как строки
    const cleanedPatient = {}
    let appointmentDate = null // Дата записи для установки created_at
    
    Object.keys(patient).forEach(key => {
      // Пропускаем служебное поле
      if (key === '_appointmentDate') {
        appointmentDate = patient[key]
        return
      }
      
      if (patient[key] !== null && patient[key] !== undefined) {
        let value = String(patient[key]).trim()
        // Убираем кавычки если есть
        value = value.replace(/^["']|["']$/g, '')
        
        // Специальная обработка для "Дата рождения пациента"
        // Убираем время из даты рождения (формат "11.03.1981, 0:00:00" -> "11.03.1981")
        if (key === 'Дата рождения пациента' && value) {
          const dateParts = value.split(',')
          if (dateParts.length > 0) {
            value = dateParts[0].trim()
          }
          // Убираем лишние пробелы в дате (формат "18.01. 1976" -> "18.01.1976")
          value = value.replace(/\s+/g, '')
          // Если значение пустое после обработки, не добавляем поле
          if (!value || value === '') {
            return
          }
        }
        
        // Пропускаем пустые строки
        if (value !== '' && value !== 'null' && value !== 'NULL') {
          // Для полей с датами просто сохраняем как строку (TEXT в БД)
          cleanedPatient[key] = value
        }
      }
    })
    
    // Убеждаемся, что обязательное поле ФИО есть
    if (!cleanedPatient['ФИО'] || cleanedPatient['ФИО'].trim() === '') {
      errors++
      errorDetails.push({ index: i + 1, error: 'Отсутствует ФИО', data: cleanedPatient })
      continue
    }
    
    // Показываем прогресс каждые 50 записей
    if ((i + 1) % 50 === 0 || i === 0) {
      console.log(`📤 Импортирую запись ${i + 1}/${patientsToImport.length}...`)
    }
    
    // Вставляем данные через прямой SQL запрос для обхода валидации типов
    // Используем RPC функцию или прямой SQL
    let insertedData = null
    let insertError = null
    
    try {
      // Пробуем использовать прямой SQL через supabase.rpc с функцией
      // Если функции нет, используем обычный insert, но с явным приведением типов
      const finalPatient = {}
      Object.keys(cleanedPatient).forEach(key => {
        const value = cleanedPatient[key]
        if (value !== null && value !== undefined) {
          // Для "Дата рождения пациента" явно указываем, что это текст
          if (key === 'Дата рождения пациента') {
            // Обертываем в кавычки и экранируем для SQL
            finalPatient[key] = String(value)
          } else {
            finalPatient[key] = String(value)
          }
        }
      })
      
      const { data, error } = await supabase
        .from('patients')
        .insert([finalPatient])
        .select('id')
      
      insertedData = data
      insertError = error
    } catch (err) {
      insertError = err
    }
    
    if (insertError) {
      // Если ошибка связана с датой рождения, пробуем вставить без этого поля
      if (insertError.message.includes('date/time') && cleanedPatient['Дата рождения пациента']) {
        console.warn(`⚠️  Ошибка с датой рождения в записи ${i + 1}, пробую вставить без даты рождения...`)
        const patientWithoutBirthDate = { ...cleanedPatient }
        delete patientWithoutBirthDate['Дата рождения пациента']
        
        const { data: retryData, error: retryError } = await supabase
          .from('patients')
          .insert([patientWithoutBirthDate])
          .select('id')
        
        if (retryError) {
          console.error(`❌ Ошибка в записи ${i + 1} (даже без даты рождения):`, retryError.message)
          errorDetails.push({ index: i + 1, error: retryError.message, data: cleanedPatient })
          errors++
        } else {
          console.log(`✅ Запись ${i + 1} импортирована без даты рождения`)
          imported++
          insertedData = retryData
        }
      } else {
        console.error(`❌ Ошибка в записи ${i + 1}:`, insertError.message)
        errorDetails.push({ index: i + 1, error: insertError.message, data: cleanedPatient })
        errors++
      }
    } else {
      imported++
      
      // Обновляем created_at на основе даты записи
      if (insertedData && insertedData.length > 0) {
        const patientId = insertedData[0].id
        
        // Преобразуем дату записи в ISO формат или используем дефолтную
        let createdDate = '2025-12-31' // Дефолтная дата
        if (appointmentDate) {
          const isoDate = convertDateToISO(appointmentDate)
          if (isoDate) {
            createdDate = isoDate
          }
        }
        
        // Обновляем created_at через UPDATE запрос
        try {
          const { error: updateError } = await supabase
            .from('patients')
            .update({ created_at: `${createdDate}T00:00:00.000Z` })
            .eq('id', patientId)
          
          if (updateError) {
            console.warn(`⚠️  Не удалось обновить created_at для записи ${i + 1}:`, updateError.message)
          }
        } catch (updateErr) {
          console.warn(`⚠️  Ошибка при обновлении created_at для записи ${i + 1}:`, updateErr.message)
        }
      }
    }
  }
  
  console.log('\n📊 Итоги импорта:')
  console.log(`✅ Успешно импортировано: ${imported}`)
  console.log(`❌ Ошибок: ${errors}`)
  console.log(`⚠️  Пропущено: ${skipped}`)
  console.log(`📋 Всего обработано: ${dataRows.length}`)
  
  if (errorDetails.length > 0) {
    console.log('\n❌ Детали ошибок:')
    errorDetails.slice(0, 5).forEach(({ index, error, data }) => {
      console.log(`   Запись ${index}: ${error}`)
    })
    if (errorDetails.length > 5) {
      console.log(`   ... и еще ${errorDetails.length - 5} ошибок`)
    }
  }
}

// Запускаем импорт
importCSV().catch(console.error)