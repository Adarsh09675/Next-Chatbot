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
    console.log('>>> [AUTH ACTION] Login request received');
    const supabase = await createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const result = loginSchema.safeParse(data)
    if (!result.success) {
        console.log('>>> [AUTH ACTION] Validation failed:', result.error.format());
        return { error: 'Invalid email or password format' }
    }

    console.log('>>> [AUTH ACTION] Attempting sign in for:', data.email);
    const { data: authData, error } = await supabase.auth.signInWithPassword(data)

    if (error) {
        console.error('>>> [AUTH ACTION] Login Error:', error.message)
        return { error: error.message }
    }

    console.log('>>> [AUTH ACTION] Login successful for:', authData.user?.email)

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}

export async function signup(prevState: unknown, formData: FormData) {
    console.log('>>> [AUTH ACTION] Signup request received');
    const supabase = await createClient()

    const data = {
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const result = signupSchema.safeParse(data)
    if (!result.success) {
        console.log('>>> [AUTH ACTION] Validation failed:', result.error.format());
        return { error: 'Invalid input' }
    }

    console.log('>>> [AUTH ACTION] Attempting sign up for:', data.email);
    const { data: authData, error } = await supabase.auth.signUp({
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
        console.error('>>> [AUTH ACTION] Signup Error:', error.message)
        return { error: error.message }
    }

    // Check if email confirmation is required (session will be null)
    if (!authData.session) {
        console.log('>>> [AUTH ACTION] Signup successful, but email confirmation required for:', data.email);
        return { error: 'Please check your email to confirm your account before logging in.' }
    }

    console.log('>>> [AUTH ACTION] Signup successful for:', data.email);

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}
