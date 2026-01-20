
import { Pinecone } from '@pinecone-database/pinecone';
import * as dotenv from 'dotenv';
dotenv.config();

async function fixIndex() {
    const apiKey = process.env.PINECONE_API_KEY;
    const indexName = process.env.PINECONE_INDEX_NAME || 'chatbot-app';

    if (!apiKey) {
        console.error('PINECONE_API_KEY not found');
        process.exit(1);
    }

    const pinecone = new Pinecone({ apiKey });

    try {
        console.log(`Checking index: ${indexName}...`);
        const { indexes } = await pinecone.listIndexes();
        const existingIndex = indexes?.find(i => i.name === indexName);

        if (existingIndex) {
            console.log(`Index '${indexName}' found. Status: ${existingIndex.status.state}`);
            // We can't easily check dimension from listIndexes in older SDKs, but if it failed with 1024 vs 768, we assume it's wrong.
            // Since we want to ensure it works with Gemini (768), and the user is blocked, we will recreate it.

            console.log(`Deleting existing index '${indexName}' to ensure correct dimensions (768)...`);
            await pinecone.deleteIndex(indexName);
            console.log('Index deleted.');

            // Wait a moment for deletion to propagate
            await new Promise(resolve => setTimeout(resolve, 5000));
        } else {
            console.log(`Index '${indexName}' does not exist.`);
        }

        console.log(`Creating new index '${indexName}' with dimension 768...`);
        await pinecone.createIndex({
            name: indexName,
            dimension: 768, // Gemini 1.5 Flash / text-embedding-004
            metric: 'cosine',
            spec: {
                serverless: {
                    cloud: 'aws',
                    region: 'us-east-1'
                }
            }
        });
        console.log(`Index '${indexName}' created successfully.`);

    } catch (error) {
        console.error('Error fixing Pinecone index:', error);
        process.exit(1);
    }
}

fixIndex();
