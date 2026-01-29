// Поиск пропущенных записей при импорте
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const CSV_FILE_PATH = './old-patients.csv'

// Функции из import-csv-to-supabase.js
function normalizeColumnName(oldName) {
  let trimmed = oldName.trim()
  trimmed = trimmed.replace(/^[🔒🔐🔑📋📊✅❌⚠️\s]+/, '').trim()
  
  const COLUMN_MAPPING = {
    'ФИО': 'ФИО',
    'Телефон': 'Телефон',
    'Комментарии': 'Комментарии',
    'Доктор': 'Доктор',
    'Зубы': 'Зубы',
    'Медсестра': 'Медсестра',
    'Дата рождения': 'Дата рождения пациента',
    'Следующя запись': 'Следующя запись',
  }
  
  if (COLUMN_MAPPING[trimmed]) {
    return COLUMN_MAPPING[trimmed]
  }
  
  return trimmed
}

function parseDateTime(dateTimeString) {
  if (!dateTimeString || dateTimeString.trim() === '') {
    return { date: null, time: null }
  }
  
  let cleaned = dateTimeString.trim().replace(/^["']|["']$/g, '')
  const parts = cleaned.split(',')
  if (parts.length >= 2) {
    const date = parts[0].trim()
    const timePart = parts[1].trim()
    const time = timePart.substring(0, 5)
    return { date, time }
  }
  
  return { date: cleaned, time: null }
}

function convertRowToPatientData(row, headers) {
  const patientData = {}
  let appointmentDate = null
  
  headers.forEach((oldHeader, index) => {
    const normalizedHeader = oldHeader.replace(/^[🔒🔐🔑📋📊✅❌⚠️\s]+/, '').trim()
    
    if (normalizedHeader === 'Row ID' || normalizedHeader === 'Implant' || normalizedHeader === 'Type_implant') {
      return
    }
    
    const newColumnName = normalizeColumnName(oldHeader)
    
    if (!newColumnName || newColumnName === 'Row ID' || newColumnName === 'Implant' || newColumnName === 'Type_implant') {
      return
    }
    
    const value = row[index]?.trim() || null
    
    if (newColumnName === 'Следующя запись' && value) {
      const { date, time } = parseDateTime(value)
      if (date) {
        patientData['Дата записи'] = date
        appointmentDate = date
      }
      if (time) {
        patientData['Время записи'] = time
      }
      return
    }
    
    if (value && value !== '' && value !== 'null' && value !== 'NULL') {
      patientData[newColumnName] = value
    }
  })
  
  if (!patientData['ФИО'] || patientData['ФИО'].trim() === '') {
    return null
  }
  
  patientData['Статус'] = 'Завершен'
  patientData._appointmentDate = appointmentDate
  
  return patientData
}

async function findMissingRecords() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Ошибка: Установите NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY')
    process.exit(1)
  }
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  
  try {
    await supabase.auth.signInAnonymously()
    console.log('✅ Анонимная сессия установлена')
  } catch (error) {
    console.warn('⚠️  Не удалось установить анонимную сессию:', error.message)
  }
  
  // Читаем CSV
  console.log(`📖 Читаю файл: ${CSV_FILE_PATH}`)
  const fileContent = fs.readFileSync(CSV_FILE_PATH, 'utf-8')
  const records = parse(fileContent, {
    columns: false,
    skip_empty_lines: true,
    trim: true,
    encoding: 'utf8'
  })
  
  const headers = records[0]
  const dataRows = records.slice(1)
  console.log(`📊 Найдено ${dataRows.length} записей в CSV`)
  
  // Получаем все записи из базы
  const { data: dbPatients, error: dbError } = await supabase
    .from('patients')
    .select('*')
  
  if (dbError) {
    console.error('❌ Ошибка при получении данных из базы:', dbError)
    process.exit(1)
  }
  
  console.log(`📊 Найдено ${dbPatients.length} записей в базе данных`)
  
  // Преобразуем CSV записи
  const csvPatients = []
  for (const row of dataRows) {
    const patientData = convertRowToPatientData(row, headers)
    if (patientData) {
      csvPatients.push(patientData)
    }
  }
  
  console.log(`✅ Подготовлено ${csvPatients.length} записей из CSV`)
  
  // Создаем ключи для сравнения (все поля кроме id, created_at, updated_at, _appointmentDate)
  function createKey(patient) {
    const key = {
      ФИО: (patient['ФИО'] || '').trim(),
      Телефон: (patient['Телефон'] || '').trim(),
      Комментарии: (patient['Комментарии'] || '').trim(),
      'Дата записи': (patient['Дата записи'] || '').trim(),
      'Время записи': (patient['Время записи'] || '').trim(),
      Доктор: (patient['Доктор'] || '').trim(),
      Зубы: (patient['Зубы'] || '').trim(),
      Медсестра: (patient['Медсестра'] || '').trim(),
      'Дата рождения пациента': (patient['Дата рождения пациента'] || '').trim(),
      created_by_email: (patient['created_by_email'] || '').trim(),
    }
    return JSON.stringify(key)
  }
  
  // Создаем множество ключей из базы данных
  const dbKeys = new Set()
  dbPatients.forEach(patient => {
    dbKeys.add(createKey(patient))
  })
  
  // Находим пропущенные записи
  const missingRecords = []
  csvPatients.forEach((patient, index) => {
    const key = createKey(patient)
    if (!dbKeys.has(key)) {
      missingRecords.push({
        csvIndex: index + 1,
        patient: patient,
        reason: 'Не найдено в базе данных'
      })
    }
  })
  
  console.log(`\n📊 РЕЗУЛЬТАТЫ ПРОВЕРКИ:`)
  console.log(`   Всего записей в CSV: ${csvPatients.length}`)
  console.log(`   Записей в базе: ${dbPatients.length}`)
  console.log(`   Пропущено записей: ${missingRecords.length}`)
  
  if (missingRecords.length > 0) {
    console.log(`\n❌ ПРОПУЩЕННЫЕ ЗАПИСИ:`)
    console.log(`\nПервые 20 пропущенных записей:`)
    
    missingRecords.slice(0, 20).forEach(({ csvIndex, patient }) => {
      console.log(`\n  Запись #${csvIndex}:`)
      console.log(`    ФИО: ${patient['ФИО']}`)
      console.log(`    Телефон: ${patient['Телефон'] || '(нет)'}`)
      console.log(`    Дата рождения: ${patient['Дата рождения пациента'] || '(нет)'}`)
      console.log(`    Дата записи: ${patient['Дата записи'] || '(нет)'}`)
    })
    
    if (missingRecords.length > 20) {
      console.log(`\n  ... и еще ${missingRecords.length - 20} записей`)
    }
    
    // Сохраняем пропущенные записи в файл
    const missingData = missingRecords.map(({ csvIndex, patient }) => ({
      csvIndex,
      ...patient
    }))
    
    fs.writeFileSync('missing-records.json', JSON.stringify(missingData, null, 2))
    console.log(`\n💾 Пропущенные записи сохранены в missing-records.json`)
    
    // Анализ причин
    console.log(`\n📋 АНАЛИЗ ПРИЧИН:`)
    const withBirthDate = missingRecords.filter(r => r.patient['Дата рождения пациента']).length
    const withoutBirthDate = missingRecords.length - withBirthDate
    console.log(`   С датой рождения: ${withBirthDate}`)
    console.log(`   Без даты рождения: ${withoutBirthDate}`)
    
    // Проверяем формат дат рождения
    const problematicDates = missingRecords.filter(r => {
      const birthDate = r.patient['Дата рождения пациента']
      if (!birthDate) return false
      // Проверяем формат "DD.MM.YY" или "DD.MM.YYYY"
      const parts = birthDate.split('.')
      return parts.length === 3 && (parts[2].length === 2 || parts[2].length === 4)
    })
    
    if (problematicDates.length > 0) {
      console.log(`   Проблемных дат рождения (формат DD.MM.YY или DD.MM.YYYY): ${problematicDates.length}`)
      console.log(`\n   Примеры проблемных дат:`)
      problematicDates.slice(0, 5).forEach(({ csvIndex, patient }) => {
        console.log(`     Запись #${csvIndex}: "${patient['Дата рождения пациента']}"`)
      })
    }
  } else {
    console.log(`\n✅ Все записи успешно импортированы!`)
  }
}

findMissingRecords().catch(console.error)
