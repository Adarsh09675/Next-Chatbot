'use client'

export const dynamic = 'force-dynamic'

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
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    Menu,
    Plus,
    MessageSquare,
    Settings,
    LogOut,
    Trash2,
    Files,
    Loader2,
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface ChatHistory {
    id: string
    title: string
    created_at: string
}

const SidebarContent = ({
    userEmail,
    handleSignOut,
    chats,
    handleNewChat,
    handleDeleteChat
}: {
    userEmail: string
    handleSignOut: () => void
    chats: ChatHistory[]
    handleNewChat: () => void
    handleDeleteChat: (id: string, e: React.MouseEvent) => void
}) => (
    <div className="flex h-full flex-col gap-4">
        <div className="flex h-[60px] items-center px-6">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                <MessageSquare className="h-6 w-6" />
                <span>My Chatbot</span>
            </Link>
        </div>
        <div className="flex-1 overflow-auto px-4">
            <div className="pb-4 space-y-1">
                <Link href="/dashboard/documents">
                    <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground">
                        <Files className="h-4 w-4" />
                        Documents
                    </Button>
                </Link>
            </div>
            <Button
                variant="secondary"
                className="mb-4 w-full justify-start gap-2"
                onClick={handleNewChat}
            >
                <Plus className="h-4 w-4" />
                New chat
            </Button>
            <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-muted-foreground px-2">History</span>
                {chats.length === 0 && (
                    <span className="text-xs text-muted-foreground px-2">No chats yet</span>
                )}
                {chats.map((chat) => (
                    <div key={chat.id} className="group relative">
                        <Link href={`/dashboard?chatId=${chat.id}`}>
                            <Button
                                variant="ghost"
                                className="w-full justify-start gap-2 overflow-hidden text-ellipsis whitespace-nowrap pr-8"
                            >
                                <MessageSquare className="h-4 w-4 shrink-0" />
                                <span className="truncate">{chat.title}</span>
                            </Button>
                        </Link>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-9 w-9 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => handleDeleteChat(chat.id, e)}
                        >
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                            <span className="sr-only">Delete chat</span>
                        </Button>
                    </div>
                ))}
            </div>
        </div>
        <div className="p-4 mt-auto border-t">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="w-full justify-start gap-2 px-2">
                        <Avatar className="h-6 w-6">
                            <AvatarFallback>{userEmail?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                        </Avatar>
                        <span className="truncate text-sm font-medium">{userEmail}</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />

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
    return (
        <React.Suspense fallback={<div className="flex min-h-screen w-full items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
            <DashboardLayoutContent>{children}</DashboardLayoutContent>
        </React.Suspense>
    )
}

function DashboardLayoutContent({
    children,
}: {
    children: React.ReactNode
}) {
    const [mounted, setMounted] = React.useState(false)
    const router = useRouter()
    const supabase = createClient()
    const [userEmail, setUserEmail] = React.useState<string>('')
    const [chats, setChats] = React.useState<ChatHistory[]>([])
    const searchParams = useSearchParams()
    const currentChatId = searchParams.get('chatId')

    const fetchChats = React.useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            setUserEmail(user.email || '')
            const { data, error } = await supabase
                .from('chats')
                .select('id, title, created_at')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })

            if (!error && data) {
                setChats(data)
            }
        }
    }, [supabase])

    React.useEffect(() => {
        setMounted(true)
        fetchChats()
    }, [fetchChats, currentChatId])

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    const handleNewChat = () => {
        router.push('/dashboard')
    }

    const handleDeleteChat = async (id: string, e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        const { error } = await supabase.from('chats').delete().eq('id', id)
        if (!error) {
            setChats(chats.filter(c => c.id !== id))
            if (currentChatId === id) {
                router.push('/dashboard')
            }
        }
    }

    if (!mounted) {
        return (
            <div className="flex min-h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="grid min-h-screen w-full md:grid-cols-[260px_1fr]">
            {/* Desktop Sidebar */}
            <div className="hidden border-r bg-muted/40 md:block">
                <SidebarContent
                    userEmail={userEmail}
                    handleSignOut={handleSignOut}
                    chats={chats}
                    handleNewChat={handleNewChat}
                    handleDeleteChat={handleDeleteChat}
                />
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
                            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                            <SheetDescription className="sr-only">
                                Access your chat history and application documents.
                            </SheetDescription>
                            <SidebarContent
                                userEmail={userEmail}
                                handleSignOut={handleSignOut}
                                chats={chats}
                                handleNewChat={handleNewChat}
                                handleDeleteChat={handleDeleteChat}
                            />
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
