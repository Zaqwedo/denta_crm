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
    const cleanPatient = {
      id: found.id || 'без id',
      name: found.ФИО || 'Без имени',
      phone: found.Телефон || '',
      date: found['Дата записи'] || '',
      time: found['Время записи'] || '',
      doctor: found.Доктор || '',
      status: found.Статус || '',
      comments: found.Комментарии || '',
      birthDate: found['Дата рождения пациента'] || '',
      teeth: found.Зубы || '',
      nurse: found.Медсестра || '',
    }

    return <PatientViewClient patient={cleanPatient} error={null} />
  } catch (err) {
    return <PatientViewClient patient={null} error="Ошибка при загрузке данных пациента" />
  }
}
