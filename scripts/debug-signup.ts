
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

async function testSignup() {
    const email = `test_${Date.now()}@example.com`
    const password = 'password123' // valid length
    const name = 'Debug Test User'

    console.log(`Attempting signup for ${email}...`)

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: name,
                app_name: 'my-chatbot',
            },
        },
    })

    if (error) {
        console.error('Signup failed with error:', error)
        if (error.code) console.error('Error code:', error.code)
        if (error.message) console.error('Error message:', error.message)
    } else {
        console.log('Signup call successful.')
        console.log('User ID:', data.user?.id)
        console.log('User Identity ID:', data.user?.identities?.[0]?.id)
        console.log('Session properties:', data.session ? 'Session created' : 'No session returned (confirm email likely enabled)')

        // Warn if user is created but possibly not in the profile table (we can't verify easily without service role but this is a start)
        if (!data.session) {
            console.warn('WARNING: No session returned. If "Confirm Email" is enabled in Supabase, the user cannot login until verified.')
        }
    }
}

testSignup().catch(err => console.error('Script execution error:', err))
