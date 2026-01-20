import { createClient } from '@/utils/supabase/server'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function Home() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    return redirect('/dashboard')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted p-4 text-center">
      <div className="max-w-xl space-y-8">
        <h1 className="text-5xl font-extrabold tracking-tight lg:text-6xl">
          My Chatbot App
        </h1>
        <p className="text-xl text-muted-foreground">
          A powerful chatbot application integrated with Supabase and Next.js.
          Login to get started.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/login">
            <Button size="lg">Login</Button>
          </Link>
          <Link href="/signup">
            <Button size="lg" variant="outline">
              Sign Up
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
