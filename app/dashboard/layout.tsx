'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    Menu,
    Plus,
    MessageSquare,
    Settings,
    LogOut,
    User,
    PanelLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface ChatHistory {
    id: string
    title: string
    date: string
}

// Mock data for chat history
const history: ChatHistory[] = [
    { id: '1', title: 'Previous Chat 1', date: 'Today' },
    { id: '2', title: 'React Help', date: 'Yesterday' },
    { id: '3', title: 'Code Refactoring', date: 'Previous 7 Days' },
]

const SidebarContent = ({
    userEmail,
    handleSignOut,
}: {
    userEmail: string
    handleSignOut: () => void
}) => (
    <div className="flex h-full flex-col gap-4">
        <div className="flex h-[60px] items-center px-6">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                <MessageSquare className="h-6 w-6" />
                <span>My Chatbot</span>
            </Link>
        </div>
        <div className="flex-1 overflow-auto px-4">
            <Button
                variant="secondary"
                className="mb-4 w-full justify-start gap-2"
                onClick={() => console.log('New chat')}
            >
                <Plus className="h-4 w-4" />
                New chat
            </Button>
            <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-muted-foreground px-2">Recent</span>
                {history.map((chat) => (
                    <Button
                        key={chat.id}
                        variant="ghost"
                        className="justify-start gap-2 overflow-hidden text-ellipsis whitespace-nowrap"
                    >
                        <MessageSquare className="h-4 w-4" />
                        {chat.title}
                    </Button>
                ))}
            </div>
        </div>
        <div className="p-4 mt-auto border-t">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="w-full justify-start gap-2 px-2">
                        <Avatar className="h-6 w-6">
                            <AvatarImage src="" />
                            <AvatarFallback>{userEmail?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                        </Avatar>
                        <span className="truncate text-sm font-medium">{userEmail}</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSignOut}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Log out
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    </div>
)

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter()
    const supabase = createClient()
    const [userEmail, setUserEmail] = React.useState<string>('')

    React.useEffect(() => {
        async function getUser() {
            const { data: { user } } = await supabase.auth.getUser()
            if (user?.email) {
                setUserEmail(user.email)
            }
        }
        getUser()
    }, [supabase])

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    return (
        <div className="grid min-h-screen w-full md:grid-cols-[260px_1fr]">
            {/* Desktop Sidebar */}
            <div className="hidden border-r bg-muted/40 md:block">
                <SidebarContent userEmail={userEmail} handleSignOut={handleSignOut} />
            </div>

            {/* Main Content Area */}
            <div className="flex flex-col">
                {/* Mobile Header */}
                <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 md:hidden">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="shrink-0 md:hidden">
                                <Menu className="h-5 w-5" />
                                <span className="sr-only">Toggle navigation menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="flex flex-col p-0 w-[260px]">
                            <SidebarContent userEmail={userEmail} handleSignOut={handleSignOut} />
                        </SheetContent>
                    </Sheet>
                    <div className="flex-1 font-semibold">My Chatbot</div>
                </header>

                <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6 overflow-hidden max-h-[calc(100vh-theme(spacing.14))] md:max-h-screen">
                    {children}
                </main>
            </div>
        </div>
    )
}
