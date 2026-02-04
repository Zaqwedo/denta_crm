'use server'

import { revalidatePath } from 'next/cache'
import { addEvent as dbAddEvent, updateEvent as dbUpdateEvent, deleteEvent as dbDeleteEvent, getEvents as dbGetEvents, EventData } from '@/lib/events-db'
import { logger } from '@/lib/logger'

export async function handleAddEvent(formData: FormData) {
    try {
        const title = formData.get('title') as string
        const date = formData.get('date') as string
        const time = formData.get('time') as string
        const location = formData.get('location') as string
        const description = formData.get('description') as string
        const userEmail = formData.get('userEmail') as string

        if (!title || !date || !userEmail) {
            return { success: false, error: 'Название, дата и email автора обязательны' }
        }

        const eventData: EventData = {
            title,
            date,
            time: time || undefined,
            location: location || undefined,
            description: description || undefined,
            created_by_email: userEmail
        }

        const result = await dbAddEvent(eventData)

        if (result.success) {
            revalidatePath('/events')
            revalidatePath('/calendar')
            return { success: true }
        } else {
            return { success: false, error: result.error }
        }
    } catch (error) {
        logger.error('Ошибка в handleAddEvent action:', error)
        return { success: false, error: 'Произошла внутренняя ошибка' }
    }
}

export async function handleUpdateEvent(eventId: string, formData: FormData) {
    try {
        const title = formData.get('title') as string
        const date = formData.get('date') as string
        const time = formData.get('time') as string
        const location = formData.get('location') as string
        const description = formData.get('description') as string
        const userEmail = formData.get('userEmail') as string

        if (!eventId || !userEmail) {
            return { success: false, error: 'ID события и email автора обязательны' }
        }

        const eventData: Partial<EventData> = {
            title: title || undefined,
            date: date || undefined,
            time: time || undefined,
            location: location || undefined,
            description: description || undefined,
        }

        const result = await dbUpdateEvent(eventId, eventData, userEmail)

        if (result.success) {
            revalidatePath('/events')
            revalidatePath('/calendar')
            return { success: true }
        } else {
            return { success: false, error: result.error }
        }
    } catch (error) {
        logger.error('Ошибка в handleUpdateEvent action:', error)
        return { success: false, error: 'Произошла внутренняя ошибка' }
    }
}

export async function handleDeleteEvent(eventId: string, userEmail: string) {
    try {
        const result = await dbDeleteEvent(eventId, userEmail)

        if (result.success) {
            revalidatePath('/events')
            revalidatePath('/calendar')
            return { success: true }
        } else {
            return { success: false, error: result.error }
        }
    } catch (error) {
        logger.error('Ошибка в handleDeleteEvent action:', error)
        return { success: false, error: 'Произошла внутренняя ошибка' }
    }
}

export async function handleGetEvents(userEmail: string) {
    return await dbGetEvents(userEmail)
}
