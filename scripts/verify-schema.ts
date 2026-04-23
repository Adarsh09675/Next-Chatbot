
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function verifySchema() {
    console.log('Checking for chatbot_profiles table...')
    // Try to select 0 rows
    const { data, error } = await supabase.from('chatbot_profiles').select('id').limit(1)

    if (error) {
        console.error('Error accessing chatbot_profiles:', error.message)
        console.error('Details:', error)
        if (error.code === '42P01') {
            console.error('CONCLUSION: The table "chatbot_profiles" DOES NOT EXIST. Please run the contents of supabase_setup.sql in your Supabase SQL Editor.')
        } else {
            console.error('CONCLUSION: The table exists but might have permission issues or other errors.')
        }
    } else {
        console.log('Success: chatbot_profiles table exists and is accessible.')
    }
}

verifySchema().catch(console.error)
