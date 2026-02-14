import { getPatients } from '@/lib/supabase-db'
import { PatientViewClient } from './PatientViewClient'

export default async function PatientViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const patientId = id

  try {
    const patients = await getPatients()
    const found = patients.find(p => String(p.id) === String(patientId))
    
    if (!found) {
      return <PatientViewClient patient={null} error="Пациент не найден" />
    }

    // Преобразуем данные в формат, который ожидает форма
    // Используем case-insensitive поиск полей для надежности
    const getFieldValue = (obj: Record<string, any>, fieldName: string): string => {
      // Сначала пробуем прямое обращение (самый надежный способ)
      if (obj[fieldName] !== undefined && obj[fieldName] !== null && obj[fieldName] !== '') {
        const value = String(obj[fieldName]).trim()
        if (value) return value
      }
      
      // Затем пробуем case-insensitive поиск
      const key = Object.keys(obj).find(
        k => k.toLowerCase() === fieldName.toLowerCase()
      )
      if (key && obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
        const value = String(obj[key]).trim()
        if (value) return value
      }
      
      return ''
    }

    const cleanPatient = {
      id: found.id || 'без id',
      name: getFieldValue(found, 'ФИО') || 'Без имени',
      phone: getFieldValue(found, 'Телефон'),
      date: getFieldValue(found, 'Дата записи'),
      time: getFieldValue(found, 'Время записи'),
      doctor: getFieldValue(found, 'Доктор'),
      status: getFieldValue(found, 'Статус'),
      comments: getFieldValue(found, 'Комментарии'),
      birthDate: getFieldValue(found, 'Дата рождения пациента'),
      teeth: getFieldValue(found, 'Зубы'),
      nurse: getFieldValue(found, 'Медсестра'),
    }

    // Отладочное логирование (только в development)
    if (process.env.NODE_ENV === 'development') {
      const doctorFields = Object.entries(found).reduce((acc, [key, value]) => {
        if (key.toLowerCase().includes('доктор') || key.toLowerCase().includes('врач')) {
          acc[key] = {
            value: value,
            type: typeof value,
            isNull: value === null,
            isUndefined: value === undefined,
            isEmpty: value === '',
            stringValue: String(value || '')
          }
        }
        return acc
      }, {} as Record<string, any>)

      console.log('🔍 PatientViewPage: Найден пациент:', {
        id: cleanPatient.id,
        name: cleanPatient.name,
        date: cleanPatient.date,
        doctor: cleanPatient.doctor,
        'doctor isEmpty': cleanPatient.doctor === '',
        'doctor length': cleanPatient.doctor?.length,
        nurse: cleanPatient.nurse,
        time: cleanPatient.time,
        'Исходные данные из БД (прямое обращение)': {
          'ФИО': found.ФИО,
          'Дата записи': found['Дата записи'],
          'Доктор': found.Доктор,
          'Доктор type': typeof found.Доктор,
          'Доктор isNull': found.Доктор === null,
          'Доктор isUndefined': found.Доктор === undefined,
          'Медсестра': found.Медсестра,
          'Время записи': found['Время записи'],
        },
        'Все ключи объекта found': Object.keys(found),
        'Поля связанные с врачом': doctorFields,
        'Все поля объекта found': found
      })
    }

    return <PatientViewClient patient={cleanPatient} error={null} />
  } catch {
    return <PatientViewClient patient={null} error="Ошибка при загрузке данных пациента" />
  }
}
