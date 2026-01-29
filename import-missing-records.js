// Импорт только пропущенных записей
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

// Загружаем переменные окружения
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

// Функция для преобразования даты из формата "28.10.2024" в ISO формат "2024-10-28"
function convertDateToISO(dateString) {
  if (!dateString || dateString.trim() === '') {
    return null
  }
  
  const parts = dateString.trim().split('.')
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0')
    const month = parts[1].padStart(2, '0')
    const year = parts[2]
    return `${year}-${month}-${day}`
  }
  
  return null
}

async function importMissingRecords() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Ошибка: Установите NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY')
    process.exit(1)
  }
  
  if (!fs.existsSync('missing-records.json')) {
    console.error('❌ Файл missing-records.json не найден. Сначала запустите find-missing-records.js')
    process.exit(1)
  }
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  
  try {
    await supabase.auth.signInAnonymously()
    console.log('✅ Анонимная сессия установлена')
  } catch (error) {
    console.warn('⚠️  Не удалось установить анонимную сессию:', error.message)
  }
  
  // Читаем пропущенные записи
  const missingData = JSON.parse(fs.readFileSync('missing-records.json', 'utf-8'))
  console.log(`📊 Найдено ${missingData.length} пропущенных записей для импорта`)
  
  let imported = 0
  let errors = 0
  const errorDetails = []
  
  for (let i = 0; i < missingData.length; i++) {
    const record = missingData[i]
    const { csvIndex, _appointmentDate, ...patient } = record
    
    // Очищаем данные
    const cleanedPatient = {}
    let appointmentDate = _appointmentDate
    
    Object.keys(patient).forEach(key => {
      if (patient[key] !== null && patient[key] !== undefined) {
        let value = String(patient[key]).trim()
        value = value.replace(/^["']|["']$/g, '')
        
        // Специальная обработка для "Дата рождения пациента"
        // Убираем время из даты рождения (формат "11.03.1981, 0:00:00" -> "11.03.1981")
        if (key === 'Дата рождения пациента' && value) {
          const dateParts = value.split(',')
          if (dateParts.length > 0) {
            value = dateParts[0].trim()
          }
        }
        
        if (value !== '' && value !== 'null' && value !== 'NULL') {
          cleanedPatient[key] = value
        }
      }
    })
    
    // Убеждаемся, что обязательное поле ФИО есть
    if (!cleanedPatient['ФИО'] || cleanedPatient['ФИО'].trim() === '') {
      errors++
      errorDetails.push({ csvIndex, error: 'Отсутствует ФИО' })
      continue
    }
    
    // Показываем прогресс
    if ((i + 1) % 50 === 0 || i === 0) {
      console.log(`📤 Импортирую запись ${i + 1}/${missingData.length}...`)
    }
    
    // Вставляем данные
    const { data: insertedData, error: insertError } = await supabase
      .from('patients')
      .insert([cleanedPatient])
      .select('id')
    
    if (insertError) {
      console.error(`❌ Ошибка в записи ${csvIndex}:`, insertError.message)
      errorDetails.push({ csvIndex, error: insertError.message, data: cleanedPatient })
      errors++
    } else {
      imported++
      
      // Обновляем created_at на основе даты записи
      if (insertedData && insertedData.length > 0) {
        const patientId = insertedData[0].id
        
        let createdDate = '2025-12-31'
        if (appointmentDate) {
          const isoDate = convertDateToISO(appointmentDate)
          if (isoDate) {
            createdDate = isoDate
          }
        }
        
        try {
          const { error: updateError } = await supabase
            .from('patients')
            .update({ created_at: `${createdDate}T00:00:00.000Z` })
            .eq('id', patientId)
          
          if (updateError) {
            console.warn(`⚠️  Не удалось обновить created_at для записи ${csvIndex}:`, updateError.message)
          }
        } catch (updateErr) {
          console.warn(`⚠️  Ошибка при обновлении created_at для записи ${csvIndex}:`, updateErr.message)
        }
      }
    }
  }
  
  console.log('\n📊 Итоги импорта:')
  console.log(`✅ Успешно импортировано: ${imported}`)
  console.log(`❌ Ошибок: ${errors}`)
  console.log(`📋 Всего обработано: ${missingData.length}`)
  
  if (errorDetails.length > 0) {
    console.log('\n❌ Детали ошибок:')
    errorDetails.slice(0, 10).forEach(({ csvIndex, error }) => {
      console.log(`   Запись ${csvIndex}: ${error}`)
    })
    if (errorDetails.length > 10) {
      console.log(`   ... и еще ${errorDetails.length - 10} ошибок`)
    }
  }
}

importMissingRecords().catch(console.error)
