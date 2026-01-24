import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { embedMany } from 'ai';
import { Pinecone } from '@pinecone-database/pinecone';
import pdf from 'pdf-parse';

// Allow streaming responses up to 5 minutes
export const maxDuration = 300;

const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY || '',
});

const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY || '',
});

async function getChunkedDocsFromPDF(fileBuffer: Buffer) {
    try {
        const data = await pdf(fileBuffer);
        const text = data.text;

        // Simple chunking strategy: split by roughly 1000 characters with some overlap
        const chunkSize = 1000;
        const overlap = 200;
        const chunks: string[] = [];

        for (let i = 0; i < text.length; i += (chunkSize - overlap)) {
            const chunk = text.slice(i, i + chunkSize).trim();
            if (chunk) chunks.push(chunk);
        }

        return chunks;
    } catch (e) {
        console.error("Error parsing PDF", e);
        throw new Error("Failed to parse PDF");
    }
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const chunks = await getChunkedDocsFromPDF(buffer);

        if (chunks.length === 0) {
            return NextResponse.json({ error: 'PDF is empty or could not be read' }, { status: 400 });
        }

        console.log(`>>> [UPLOAD] Saving metadata to Supabase...`);

        // 1. Record the upload in Supabase 'documents' table FIRST to get the ID
        const { data: dbDoc, error: dbError } = await supabase
            .from('documents')
            .insert({
                name: file.name,
                user_id: user.id
            })
            .select()
            .single();

        if (dbError) {
            console.error('>>> [UPLOAD] Supabase Insert Error:', dbError.message);
            return NextResponse.json({ error: 'Failed to save document metadata' }, { status: 500 });
        }

        const documentId = dbDoc.id;
        console.log(`>>> [UPLOAD] Document ID created: ${documentId}`);

        try {
            console.log(`>>> [UPLOAD] Embedding ${chunks.length} chunks...`);

            const { embeddings } = await embedMany({
                model: google.textEmbeddingModel('text-embedding-004'),
                values: chunks,
            });

            const indexName = process.env.PINECONE_INDEX_NAME!;
            const index = pinecone.index(indexName);

            // Prepare vectors for Pinecone with documentId in metadata
            const vectors = chunks.map((chunk, i) => ({
                id: `${documentId}-${i}`, // Use documentId in vector ID for consistency
                values: embeddings[i],
                metadata: {
                    text: chunk,
                    filename: file.name,
                    documentId: documentId, // Critical for robust deletion
                    userId: user.id
                }
            }));

            console.log(`>>> [UPLOAD] Upserting to Pinecone [${indexName}]...`);

            // Split into batches for Pinecone if many chunks
            const batchSize = 100;
            for (let i = 0; i < vectors.length; i += batchSize) {
                const batch = vectors.slice(i, i + batchSize);
                await index.upsert(batch);
            }

            return NextResponse.json({
                success: true,
                chunks: chunks.length,
                documentId: documentId
            });

        } catch (error: any) {
            console.error('>>> [UPLOAD] Vector Store Error:', error);
            // Rollback: Delete the Supabase record if vector operations fail
            await supabase.from('documents').delete().eq('id', documentId);
            throw new Error('Failed to process document vectors: ' + error.message);
        }

    } catch (error: any) {
        console.error('>>> [UPLOAD] CRITICAL ERROR:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
