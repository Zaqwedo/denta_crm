'use client'

import { useState, useEffect } from 'react'
import { DOCTORS, NURSES, PATIENT_STATUSES } from '@/lib/constants'

export function useConstants() {
  const [doctors, setDoctors] = useState<string[]>(DOCTORS)
  const [nurses, setNurses] = useState<string[]>(NURSES)
  const [statuses] = useState<string[]>(PATIENT_STATUSES)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [doctorsRes, nursesRes] = await Promise.all([
          fetch('/api/doctors'),
          fetch('/api/nurses'),
        ])

        if (doctorsRes.ok) {
          const data = await doctorsRes.json()
          if (data.doctors && data.doctors.length > 0) {
            setDoctors(data.doctors)
          }
        }

        if (nursesRes.ok) {
          const data = await nursesRes.json()
          if (data.nurses && data.nurses.length > 0) {
            setNurses(data.nurses)
          }
        }
      } catch (error) {
        console.error('Error loading constants:', error)
        // Используем fallback к статическим константам
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  return { doctors, nurses, statuses, isLoading }
}
