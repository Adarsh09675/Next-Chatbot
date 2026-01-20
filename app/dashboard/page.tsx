'use client'

// MEMO: This line is required for build! Do not remove.
export const dynamic = 'force-dynamic'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Bot, Paperclip, Mic, User, Loader2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Label } from '@/components/ui/label'
import React, { useState, useRef, useEffect } from 'react'
import { useChat, Message } from 'ai/react'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'
import { useSearchParams, useRouter } from 'next/navigation'

export default function DashboardPage() {
    const [isUploading, setIsUploading] = useState(false)
    const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const scrollAreaRef = useRef<HTMLDivElement>(null)
    const supabase = createClient()
    const searchParams = useSearchParams()
    const router = useRouter()

    // Get chatId from URL
    const chatId = searchParams.get('chatId')

    const {
        messages,
        input,
        handleInputChange,
        handleSubmit: baseHandleSubmit,
        isLoading,
        setMessages,
    } = useChat({
        api: '/api/chat',
        body: {
            chatId, // Send current Chat ID to backend
            useRAG: true
        },
        onFinish: (message: Message, { finishReason }: { finishReason: any }) => {
            console.log('>>> [FRONTEND] Chat Finished');
            console.log('>>> [FRONTEND] Finish Reason:', finishReason);
            console.log('>>> [FRONTEND] AI Message Content Length:', message.content.length);
            console.log('>>> [FRONTEND] AI Message Content Preview:', message.content.substring(0, 50));
        },
        onResponse: (response: Response) => {
            console.log('>>> [FRONTEND] API Response Received');
            console.log('>>> [FRONTEND] Status:', response.status);
            console.log('>>> [FRONTEND] Type:', response.type);
            console.log('>>> [FRONTEND] OK:', response.ok);

            const newChatId = response.headers.get('X-Chat-Id')
            if (newChatId && newChatId !== chatId) {
                console.log('>>> [FRONTEND] New Chat Created. ID:', newChatId);
                // Use history.replaceState to update URL without triggering a Next.js re-render
                // which can interrupt the active stream.
                const url = new URL(window.location.href);
                url.searchParams.set('chatId', newChatId);
                window.history.replaceState(null, '', url.toString());
            }
        },
        onError: (error: Error) => {
            console.error('>>> [FRONTEND] Chat API Error Detected');
            console.error('>>> [FRONTEND] Error Name:', error.name);
            console.error('>>> [FRONTEND] Error Message:', error.message);
            console.error('>>> [FRONTEND] Detailed Error Object:', error);
            try {
                console.error('>>> [FRONTEND] Stack Trace:', error.stack);
            } catch (e) { }

            toast.error('Chat error: ' + error.message);
        }
    })

    const handleSubmit = (e?: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>) => {
        if (e) e.preventDefault();

        // Pass the latest chatId to ensure backend knows the context
        baseHandleSubmit(e as any, {
            body: {
                chatId: searchParams.get('chatId'),
                useRAG: true
            }
        });
    }

    useEffect(() => {
        if (messages.length > 0) {
            console.log(`>>> [FRONTEND] Messages Updated. Count: ${messages.length}`);
            const lastMsg = messages[messages.length - 1];
            console.log(`>>> [FRONTEND] Last Message Role: ${lastMsg.role}, Content Length: ${lastMsg.content.length}`);
        }
    }, [messages]);

    useEffect(() => {
        console.log('--- Loading State Changed ---');
        console.log('Is Loading:', isLoading);
    }, [isLoading]);

    // Fetch messages when chatId changes
    useEffect(() => {
        async function fetchMessages() {
            if (!chatId) {
                setMessages([])
                return
            }

            // Don't fetch history if we are currently streaming a new message
            // or if the message we just sent would be overwritten
            if (isLoading) {
                console.log('>>> [FETCH] Streaming in progress, skipping history fetch to preserve current output');
                return
            }


            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('chat_id', chatId)
                .order('created_at', { ascending: true })

            if (error) {
                console.error('Error fetching messages:', error)
                toast.error('Failed to load chat history')
            } else if (data) {
                // Map Supabase messages to AI SDK format
                const formattedMessages = data.map(msg => ({
                    id: msg.id,
                    role: msg.role as 'user' | 'assistant' | 'system' | 'data',
                    content: msg.content
                }))
                setMessages(formattedMessages)
            }
        }

        fetchMessages()
    }, [chatId, supabase, setMessages])

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollAreaRef.current) {
            const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollContainer) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }
        }
    }, [messages]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        const formData = new FormData()
        formData.append('file', file)

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Upload failed')
            }

            toast.success(`File uploaded! Processed ${result.chunks} chunks.`)
            setUploadedFileName(file.name)

            // Add initial greeting from AI
            const greetingMessage: Message = {
                id: Date.now().toString(),
                role: 'assistant',
                content: 'How can I help you?',
            }
            setMessages((currentMessages: Message[]) => [...currentMessages, greetingMessage])
        } catch (error: any) {
            console.error('Upload Error:', error)
            toast.error(error.message || 'Failed to upload file')
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit(e as any)
        }
    }

    return (
        <div className="flex flex-col h-full min-h-0 max-w-3xl mx-auto w-full">
            {/* Header */}


            {uploadedFileName && (
                <div className="px-4 pb-2">
                    <div className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm flex items-center gap-2 border border-blue-100">
                        <Paperclip className="w-4 h-4" />
                        <span className="font-medium">Document Uploaded: {uploadedFileName}</span>
                    </div>
                </div>
            )}

            {/* Chat Area */}
            <ScrollArea className="flex-1 min-h-0" ref={scrollAreaRef}>
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center space-y-4 p-4">
                        <div className="bg-muted p-4 rounded-full">
                            <Bot className="w-10 h-10 text-muted-foreground" />
                        </div>
                        <h2 className="text-2xl font-semibold">How can I help you today?</h2>
                        <p className="text-sm text-muted-foreground max-w-sm">
                            Upload a document to ask questions about it, or just start chatting.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6 p-4 pb-4">
                        {messages.map((message: Message) => (
                            <div
                                key={message.id}
                                className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'
                                    }`}
                            >
                                {message.role === 'assistant' && (
                                    <Avatar className="w-8 h-8 border shrink-0">
                                        <AvatarFallback>AI</AvatarFallback>
                                    </Avatar>
                                )}
                                <div
                                    className={`rounded-2xl px-4 py-2 max-w-[80%] ${message.role === 'user'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted'
                                        }`}
                                >
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                                </div>
                                {message.role === 'user' && (
                                    <Avatar className="w-8 h-8 border shrink-0">
                                        <AvatarFallback>You</AvatarFallback>
                                    </Avatar>
                                )}
                            </div>
                        ))}
                    </div>
                )}
                {isLoading && (
                    <div className="flex justify-start gap-4 p-4 pt-0">
                        <Avatar className="w-8 h-8 border shrink-0">
                            <AvatarFallback>AI</AvatarFallback>
                        </Avatar>
                        <div className="bg-muted rounded-2xl px-4 py-2 flex items-center">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                    </div>
                )}
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 pt-2">
                <div className="relative flex items-end gap-2 bg-muted/50 p-2 rounded-xl border focus-within:ring-1 focus-within:ring-ring">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".pdf"
                        onChange={handleFileUpload}
                    />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground h-9 w-9 mb-1"
                        disabled={isUploading || isLoading}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                        <span className="sr-only">Attach file</span>
                    </Button>
                    <Textarea
                        placeholder={"Message My Chatbot..."}
                        className="min-h-[44px] max-h-[200px] border-0 bg-transparent resize-none focus-visible:ring-0 focus-visible:ring-offset-0 px-2 py-3"
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        rows={1}
                    />
                    <div className="flex flex-col mb-1">
                        {input.trim() ? (
                            <Button size="icon" onClick={() => handleSubmit()} className="h-9 w-9" disabled={isLoading}>
                                <Send className="w-4 h-4" />
                                <span className="sr-only">Send message</span>
                            </Button>
                        ) : (
                            <Button variant="ghost" size="icon" className="text-muted-foreground h-9 w-9">
                                <Mic className="w-5 h-5" />
                                <span className="sr-only">Voice input</span>
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
