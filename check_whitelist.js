
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials')
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
}

checkWhitelist()
