import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { Pinecone } from '@pinecone-database/pinecone'

const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY || ''
})

export async function POST(request: NextRequest) {
    try {
        const { documentId, filename } = await request.json()

        if (!documentId || !filename) {
            return NextResponse.json({ error: 'Missing documentId or filename' }, { status: 400 })
        }

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 1. Delete from Supabase
        const { error: dbError } = await supabase
            .from('documents')
            .delete()
            .match({ id: documentId, user_id: user.id })

        if (dbError) {
            console.error('Supabase Delete Error:', dbError)
            return NextResponse.json({ error: 'Failed to delete from database' }, { status: 500 })
        }

        // 2. Delete from Pinecone
        try {
            const indexName = process.env.PINECONE_INDEX_NAME!
            const index = pinecone.index(indexName)

            // Delete vectors with matching documentId (Primary method for new uploads)
            await index.deleteMany({
                documentId: { '$eq': documentId },
                userId: { '$eq': user.id }
            })

            // OPTIONAL: Fallback for legacy documents (uploaded before this change)
            // If you want to ensure old docs are also deleted, keep the filename check, 
            // but be aware it might delete duplicates if filenames aren't unique.
            // For now, we prioritize safety and only delete by strict ID if possible.
            // To enable legacy cleanup, uncomment the following:
            /*
            await index.deleteMany({
                 filename: { '$eq': filename },
                 userId: { '$eq': user.id }
            })
            */

            console.log(`Deleted vectors for document: ${documentId} (User: ${user.id})`)
        } catch (pineconeError) {
            console.error('Pinecone Delete Error:', pineconeError)
            // Note: We don't fail the request if Pinecone cleanup fails, 
            // but we log it. It's better to maintain DB consistency.
            // You might want to implement a retry mechanism or a background job for robust cleanup.
        }

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('Delete API Error:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
