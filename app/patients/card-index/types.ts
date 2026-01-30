import { PatientData } from '@/lib/supabase-db'

export interface ClientInfo {
    name: string
    birthDate: string | null
    phones: string[]
    emoji: string | null
    notes: string | null
    ignoredIds: string[]
    records: PatientData[]
}

export interface NewRecord {
    date: string
    time: string
    doctor: string
    nurse: string
    teeth: string
    notes: string
    status: string
}
