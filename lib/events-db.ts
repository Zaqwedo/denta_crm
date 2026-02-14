'use server';

import { getSupabaseAdmin, getSupabaseUser } from './supabase'
import { logger } from './logger'
import { cookies } from 'next/headers'
import { checkAdminAuth } from './auth-check'

export interface EventData {
    id?: string;
    title: string;
    date: string;
    time?: string;
    location?: string;
    description?: string;
    created_by_email: string;
    created_at?: string;
    updated_at?: string;
}

/**
 * Получает события пользователя
 */
export async function getEvents(userEmail?: string): Promise<EventData[]> {
    try {
        let email = userEmail
        if (!email) {
            const cookieStore = await cookies()
            email = cookieStore.get('denta_user_email')?.value
        }

        if (!email) {
            logger.warn('getEvents: email не указан')
            return []
        }

        const isAdmin = await checkAdminAuth()
        const client = isAdmin ? getSupabaseAdmin() : getSupabaseUser(email)

        const { data, error } = await client
            .from('events')
            .select('*')
            .eq('created_by_email', email)
            .order('date', { ascending: true })
            .order('time', { ascending: true })

        if (error) {
            logger.error('Ошибка при получении событий:', error)
            throw error
        }

        return data as EventData[]
    } catch (error) {
        logger.error('Ошибка в getEvents:', error)
        return []
    }
}

/**
 * Добавляет новое событие
 */
export async function addEvent(event: EventData): Promise<{ success: boolean; data?: EventData; error?: string }> {
    try {
        const isAdmin = await checkAdminAuth()
        const client = isAdmin ? getSupabaseAdmin() : getSupabaseUser(event.created_by_email)

        const { data, error } = await client
            .from('events')
            .insert([event])
            .select()
            .single()

        if (error) {
            logger.error('Ошибка при добавлении события:', error)
            return { success: false, error: error.message }
        }

        return { success: true, data: data as EventData }
    } catch (error: any) {
        logger.error('Ошибка в addEvent:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Обновляет событие
 */
export async function updateEvent(eventId: string, event: Partial<EventData>, userEmail: string): Promise<{ success: boolean; error?: string }> {
    try {
        const isAdmin = await checkAdminAuth()
        const client = isAdmin ? getSupabaseAdmin() : getSupabaseUser(userEmail)

        const { error } = await client
            .from('events')
            .update(event)
            .eq('id', eventId)
            .eq('created_by_email', userEmail) // Дополнительная защита

        if (error) {
            logger.error('Ошибка при обновлении события:', error)
            return { success: false, error: error.message }
        }

        return { success: true }
    } catch (error: any) {
        logger.error('Ошибка в updateEvent:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Удаляет событие
 */
export async function deleteEvent(eventId: string, userEmail: string): Promise<{ success: boolean; error?: string }> {
    try {
        const isAdmin = await checkAdminAuth()
        const client = isAdmin ? getSupabaseAdmin() : getSupabaseUser(userEmail)

        const { error } = await client
            .from('events')
            .delete()
            .eq('id', eventId)
            .eq('created_by_email', userEmail)

        if (error) {
            logger.error('Ошибка при удалении события:', error)
            return { success: false, error: error.message }
        }

        return { success: true }
    } catch (error: any) {
        logger.error('Ошибка в deleteEvent:', error)
        return { success: false, error: error.message }
    }
}
