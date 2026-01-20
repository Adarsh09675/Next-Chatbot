'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
})

const signupSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email(),
    password: z.string().min(6),
})

export async function signout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/')
}

export async function login(prevState: unknown, formData: FormData) {
    const supabase = await createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const result = loginSchema.safeParse(data)
    if (!result.success) {
        return { error: 'Invalid input' }
    }

    const { data: authData, error } = await supabase.auth.signInWithPassword(data)

    if (error) {
        return { error: error.message }
    }

    // Check if this user belongs to this application
    const appName = authData.user?.user_metadata?.app_name
    if (appName !== 'my-chatbot') {
        // Valid login but wrong app -> Sign them out immediately
        await supabase.auth.signOut()
        return { error: 'Account not authorized for this application.' }
    }

    revalidatePath('/', 'layout')
    redirect('/')
}

export async function signup(prevState: unknown, formData: FormData) {
    const supabase = await createClient()

    const data = {
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const result = signupSchema.safeParse(data)
    if (!result.success) {
        return { error: 'Invalid input' }
    }

    const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
            data: {
                full_name: data.name,
                app_name: 'my-chatbot',
            },
        },
    })

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/', 'layout')
    redirect('/')
}
