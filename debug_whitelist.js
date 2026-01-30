
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

// Пытаемся загрузить .env.local вручную
if (fs.existsSync('.env.local')) {
    const envConfig = dotenv.parse(fs.readFileSync('.env.local'))
    for (const k in envConfig) {
        process.env[k] = envConfig[k]
    }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkWhitelist() {
    const email = 'kapitancrumpled@gmail.com'

    console.log(`Checking whitelist for email: ${email}`)

    const { data, error } = await supabase
        .from('whitelist_emails')
        .select('*')
        .eq('email', email)

    if (error) {
        console.error('Error fetching whitelist:', error)
        return
    }

    console.log('Found records:', data)

    const yandexRecord = data.find(r => r.provider === 'yandex')
    if (yandexRecord) {
        console.log('⚠️  User HAS Yandex access!')
    } else {
        console.log('✅ User does NOT have Yandex access.')
    }
}

checkWhitelist()
