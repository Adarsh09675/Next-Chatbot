import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { streamText, embed } from 'ai'
import { Pinecone } from '@pinecone-database/pinecone'

const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY || '',
})

const pinecone = process.env.PINECONE_API_KEY
    ? new Pinecone({ apiKey: process.env.PINECONE_API_KEY })
    : null;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { messages, chatId, useRAG = true } = body

        if (!messages || messages.length === 0) {
            return NextResponse.json({ error: 'No messages' }, { status: 400 })
        }

        const lastMessage = messages[messages.length - 1]
        const query = lastMessage.content

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // 1. Chat/Session Management
        let currentChatId = chatId
        if (!currentChatId) {
            const { data: newChat, error: createError } = await supabase
                .from('chats')
                .insert({
                    user_id: user.id,
                    title: query.substring(0, 50)
                })
                .select().single()
            if (createError) throw createError
            currentChatId = newChat.id
        }

        // Save User Message
        await supabase.from('messages').insert({
            chat_id: currentChatId,
            role: 'user',
            content: query
        })

        // 2. RAG Context
        let systemContext = 'You are a helpful AI assistant.'
        if (useRAG && pinecone) {
            try {
                const { embedding } = await embed({
                    model: google.textEmbeddingModel('text-embedding-004'),
                    value: query,
                })
                const index = pinecone.index(process.env.PINECONE_INDEX_NAME!)
                const queryResponse = await index.query({
                    vector: embedding,
                    topK: 5,
                    includeMetadata: true,
                    filter: { userId: { '$eq': user.id } }
                })
                if (queryResponse.matches?.length) {
                    const ctx = queryResponse.matches.map((m: any) => m.metadata?.text || '').join('\n\n')
                    systemContext = `Use this context to answer: ${ctx}`
                }
            } catch (e) {
                console.error('RAG Search Error:', e)
            }
        }

        // 3. Gemini Sanitization (Mandatory)
        // Gemini fails if roles don't strictly alternate (user, assistant, user, assistant...)
        const raw = messages.filter((m: any) => ['user', 'assistant'].includes(m.role) && m.content?.trim());
        const cleaned: any[] = [];
        for (const m of raw) {
            if (cleaned.length > 0 && cleaned[cleaned.length - 1].role === m.role) {
                cleaned[cleaned.length - 1].content += '\n\n' + m.content;
            } else {
                cleaned.push({ role: m.role, content: m.content });
            }
        }
        // Must start with user
        while (cleaned.length > 0 && cleaned[0].role !== 'user') cleaned.shift();
        if (cleaned.length === 0) cleaned.push({ role: 'user', content: query });

        // 4. AI Stream
        const result = await streamText({
            model: google('gemini-2.5-flash'), // Switch to stable model
            system: systemContext,
            messages: cleaned,
            onFinish: async ({ text }) => {
                // Silently save to DB to avoid stream corruption
                if (text) {
                    try {
                        await supabase.from('messages').insert({
                            chat_id: currentChatId,
                            role: 'assistant',
                            content: text
                        })
                    } catch (e) {
                        // Suppress error
                    }
                }
            }
        })

        // Return pure stream response with error forwarding enabled
        // Cast to any to bypass type mismatch with older SDK version
        return (result as any).toDataStreamResponse({
            headers: {
                'X-Chat-Id': currentChatId,
                'Cache-Control': 'no-cache',
            },
            getErrorMessage: (error: any) => {
                // IMPORTANT: Forward the actual error message to the frontend
                return (error?.message) || 'Unknown stream error';
            }
        })

    } catch (error: any) {
        // Only log critical errors to terminal, do not return JSON if stream started
        console.error('Chat API Fatal:', error.message)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
