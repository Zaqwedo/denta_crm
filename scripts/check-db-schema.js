
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase env variables')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkColumns() {
    const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'users' })

    if (error) {
        // If RPC doesn't exist, try a direct query to information_schema if possible, 
        // but usually we can just try to select the column.
        const { data: selectData, error: selectError } = await supabase
            .from('users')
            .select('pin_code_hash')
            .limit(1)

        if (selectError) {
            console.error('Error selecting pin_code_hash:', selectError.message)
        } else {
            console.log('Column pin_code_hash exists!')
        }
    } else {
        console.log('Columns:', data)
    }
}

checkColumns()
