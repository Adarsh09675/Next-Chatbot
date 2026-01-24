import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { streamText, embed } from 'ai'
import { Pinecone } from '@pinecone-database/pinecone'
import { z } from 'zod'

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

        // 2. Gemini Sanitization (Mandatory)
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

        // 3. AI Stream with Tools
        console.log('>>> [BACKEND] Starting streamText. Model: gemini-1.5-flash, MaxSteps: 3');
        const result = await streamText({
            model: google('gemini-2.5-flash'),
            system: `You are a helpful AI assistant with access to the user's documents.
            
            GUIDELINES:
            1. ALWAYS check what documents are available using 'list_documents' if the user asks about their files or knowledge base.
            2. Use 'query_knowledge' to search for specific answers.
            3. After using a tool, synthesize the information and provide a clear, helpful response to the user.
            4. If no information is found, tell the user honestly.
            5. You can search multiple times if the first query doesn't yield results.`,
            messages: cleaned,
            maxSteps: 5, // Keep it efficient to stay within quota limits
            tools: {
                list_documents: {
                    description: 'List all documents uploaded by the user.',
                    parameters: z.object({
                        includeMetadata: z.boolean().optional().describe('Whether to include extra metadata')
                    }),
                    execute: async () => {
                        console.log('>>> [TOOL] list_documents execution started');
                        const { data, error } = await supabase
                            .from('documents')
                            .select('id, name')
                            .eq('user_id', user.id);
                        if (error) {
                            console.error('>>> [TOOL ERROR] list_documents:', error);
                            throw error;
                        }
                        console.log('>>> [TOOL] list_documents found:', data?.length || 0, 'docs');
                        return data || [];
                    }
                },
                query_knowledge: {
                    description: 'Search through uploaded documents for specific information.',
                    parameters: z.object({
                        query: z.string().describe('The search query for semantic search.'),
                    }),
                    execute: async ({ query: searchQuery }) => {
                        console.log('>>> [TOOL] query_knowledge calling Pinecone for:', searchQuery);
                        if (!pinecone) return "Vector search is not configured.";

                        try {
                            const { embedding } = await embed({
                                model: (google as any).textEmbeddingModel('text-embedding-004'),
                                value: searchQuery,
                            });

                            const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);
                            const queryResponse = await index.query({
                                vector: embedding,
                                topK: 7,
                                includeMetadata: true,
                                filter: { userId: { '$eq': user.id } }
                            });

                            if (!queryResponse.matches?.length) {
                                console.log('>>> [TOOL] query_knowledge: No matches found.');
                                return "No relevant information found in documents.";
                            }

                            console.log('>>> [TOOL] query_knowledge: Found', queryResponse.matches.length, 'matches');
                            return queryResponse.matches.map((m: any) =>
                                `[Source: ${m.metadata?.filename || 'Unknown'}] ${m.metadata?.text || ''}`
                            ).join('\n\n');

                        } catch (e: any) {
                            console.error('>>> [TOOL ERROR] query_knowledge:', e);
                            return `Error searching documents: ${e.message}`;
                        }
                    }
                }
            },
            onStepFinish: ({ text, toolCalls, toolResults, finishReason }) => {
                console.log(`>>> [STEP] Reason: ${finishReason}, Tools: ${toolCalls?.length || 0}, Res: ${toolResults?.length || 0}`);
                if (text) console.log(`>>> [STEP] Generated text length: ${text.length}`);
            },
            onFinish: async ({ text }) => {
                console.log('>>> [BACKEND] Stream finished completely. Final text length:', text?.length || 0);
                if (text) {
                    try {
                        await supabase.from('messages').insert({
                            chat_id: currentChatId,
                            role: 'assistant',
                            content: text
                        })
                    } catch (e) {
                        console.error('>>> [BACKEND ERROR] Message save:', e);
                    }
                }
            }
        })

        console.log('>>> [BACKEND] streamText successfully initiated');
        // Return pure stream response with error forwarding enabled
        return (result as any).toDataStreamResponse({
            headers: {
                'X-Chat-Id': currentChatId,
                'Cache-Control': 'no-cache',
            },
            getErrorMessage: (error: any) => {
                console.error('>>> [STREAM ERROR] Forwarded to frontend:', error);
                return (error?.message) || 'Unknown stream error';
            }
        })

    } catch (error: any) {
        console.error('>>> [FATAL ERROR] Chat API:', error);
        return NextResponse.json({
            error: error.message || 'Internal Server Error',
            details: error.stack
        }, { status: 500 })
    }
}
