'use client'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Bot, Paperclip, Mic, User } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Label } from '@/components/ui/label'
import React, { useState, useRef, useEffect } from 'react'

export default function DashboardPage() {
    const [messages, setMessages] = useState<{ id: string, role: string, content: string }[]>([])
    const [input, setInput] = useState('')
    const scrollAreaRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (scrollAreaRef.current) {
            const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollContainer) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }
        }
    }, [messages]);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value)
    }

    const handleSubmit = async () => {
        if (!input.trim()) return

        const userMessage = { id: Date.now().toString(), role: 'user', content: input }
        setMessages(prev => [...prev, userMessage])
        setInput('')

        // Simulate AI response for demo purposes since backend AI is removed
        setTimeout(() => {
            const botMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: "AI features have been disabled. This is a frontend-only demo." }
            setMessages(prev => [...prev, botMessage])
        }, 500)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit()
        }
    }

    return (
        <div className="flex flex-col h-full max-w-3xl mx-auto w-full">
            {/* Header */}
            <div className="flex justify-end p-2 gap-2 items-center">
                <Label className="text-sm text-muted-foreground">Standard Mode</Label>
            </div>

            {/* Chat Area */}
            <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center space-y-4">
                        <div className="bg-muted p-4 rounded-full">
                            <Bot className="w-10 h-10 text-muted-foreground" />
                        </div>
                        <h2 className="text-2xl font-semibold">How can I help you today?</h2>
                        <p className="text-sm text-muted-foreground max-w-sm">
                            AI features are currently disabled.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6 pb-4">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'
                                    }`}
                            >
                                {message.role === 'assistant' && (
                                    <Avatar className="w-8 h-8 border">
                                        <AvatarFallback>AI</AvatarFallback>
                                        <AvatarImage src="/bot-avatar.png" />
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
                                    <Avatar className="w-8 h-8 border">
                                        <AvatarFallback>You</AvatarFallback>
                                    </Avatar>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 pt-2">
                <div className="relative flex items-end gap-2 bg-muted/50 p-2 rounded-xl border focus-within:ring-1 focus-within:ring-ring">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground h-9 w-9 mb-1"
                        disabled={true}
                    >
                        <Paperclip className="w-5 h-5" />
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
                            <Button size="icon" onClick={() => handleSubmit()} className="h-9 w-9">
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
