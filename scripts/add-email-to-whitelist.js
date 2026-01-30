#!/usr/bin/env node

/**
 * Скрипт для добавления email в whitelist
 * 
 * Использование:
 *   node scripts/add-email-to-whitelist.js your-email@gmail.com google
 *   node scripts/add-email-to-whitelist.js your-email@yandex.ru yandex
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ ОШИБКА: Не найдены NEXT_PUBLIC_SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY в .env.local')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function addEmailToWhitelist(email, provider = 'email') {
    if (!email) {
        console.error('❌ ОШИБКА: Email не указан')
        console.log('\nИспользование:')
        console.log('  node scripts/add-email-to-whitelist.js your-email@gmail.com google')
        console.log('  node scripts/add-email-to-whitelist.js your-email@yandex.ru yandex')
        process.exit(1)
    }

    const normalizedEmail = email.toLowerCase().trim()
    const normalizedProvider = provider.toLowerCase()

    console.log(`\n📧 Добавление email в whitelist...`)
    console.log(`   Email: ${normalizedEmail}`)
    console.log(`   Provider: ${normalizedProvider}`)

    try {
        // Проверяем, существует ли уже такой email
        const { data: existing, error: checkError } = await supabase
            .from('whitelist_emails')
            .select('*')
            .eq('email', normalizedEmail)
            .eq('provider', normalizedProvider)
            .single()

        if (existing) {
            console.log(`\n⚠️  Email уже существует в whitelist:`)
            console.log(`   ID: ${existing.id}`)
            console.log(`   Email: ${existing.email}`)
            console.log(`   Provider: ${existing.provider}`)
            console.log(`   Создан: ${existing.created_at}`)
            return
        }

        // Добавляем новый email
        const { data, error } = await supabase
            .from('whitelist_emails')
            .insert([
                {
                    email: normalizedEmail,
                    provider: normalizedProvider,
                }
            ])
            .select()

        if (error) {
            console.error(`\n❌ ОШИБКА при добавлении:`, error.message)
            process.exit(1)
        }

        console.log(`\n✅ Email успешно добавлен в whitelist!`)
        if (data && data[0]) {
            console.log(`   ID: ${data[0].id}`)
            console.log(`   Email: ${data[0].email}`)
            console.log(`   Provider: ${data[0].provider}`)
            console.log(`   Создан: ${data[0].created_at}`)
        }

        console.log(`\n🎉 Теперь вы можете войти через ${normalizedProvider} с email: ${normalizedEmail}`)
    } catch (err) {
        console.error(`\n❌ ОШИБКА:`, err.message)
        process.exit(1)
    }
}

async function listWhitelist() {
    console.log(`\n📋 Текущий whitelist:\n`)

    try {
        const { data, error } = await supabase
            .from('whitelist_emails')
            .select('*')
            .order('provider', { ascending: true })
            .order('email', { ascending: true })

        if (error) {
            console.error(`❌ ОШИБКА:`, error.message)
            return
        }

        if (!data || data.length === 0) {
            console.log('   (пусто)')
            return
        }

        const grouped = data.reduce((acc, item) => {
            if (!acc[item.provider]) {
                acc[item.provider] = []
            }
            acc[item.provider].push(item)
            return acc
        }, {})

        Object.keys(grouped).forEach(provider => {
            console.log(`   ${provider.toUpperCase()}:`)
            grouped[provider].forEach(item => {
                console.log(`     - ${item.email} (ID: ${item.id})`)
            })
            console.log('')
        })
    } catch (err) {
        console.error(`❌ ОШИБКА:`, err.message)
    }
}

// Main
const args = process.argv.slice(2)

if (args.length === 0 || args[0] === '--list' || args[0] === '-l') {
    listWhitelist().then(() => process.exit(0))
} else {
    const email = args[0]
    const provider = args[1] || 'email'
    addEmailToWhitelist(email, provider).then(() => {
        return listWhitelist()
    }).then(() => {
        process.exit(0)
    })
}
