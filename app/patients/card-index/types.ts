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
