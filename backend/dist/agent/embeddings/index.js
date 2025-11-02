"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addYTVideoToVectorStore = exports.getVectorStore = void 0;
const pgvector_1 = require("@langchain/community/vectorstores/pgvector");
const documents_1 = require("@langchain/core/documents");
const openai_1 = require("@langchain/openai");
const textsplitters_1 = require("@langchain/textsplitters");
const embeddings = new openai_1.OpenAIEmbeddings({
    model: 'text-embedding-3-large',
    dimensions: 1536,
});
let vectorStoreInstance = null;
const getVectorStore = async () => {
    if (!vectorStoreInstance) {
        vectorStoreInstance = await pgvector_1.PGVectorStore.initialize(embeddings, {
            postgresConnectionOptions: {
                connectionString: process.env.DATABASE_URL,
            },
            tableName: 'transcripts',
            columns: {
                idColumnName: 'id',
                vectorColumnName: 'vector',
                contentColumnName: 'content',
                metadataColumnName: 'metadata',
            },
            distanceStrategy: 'cosine',
        });
    }
    return vectorStoreInstance;
};
exports.getVectorStore = getVectorStore;
const addYTVideoToVectorStore = async (videoData) => {
    const { transcript, video_id, title, url } = videoData;
    const vectorStore = await (0, exports.getVectorStore)();
    const docs = [
        new documents_1.Document({
            pageContent: transcript,
            metadata: { video_id, video_title: title, video_url: url },
        }),
    ];
    const splitter = new textsplitters_1.RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
    });
    const chunks = await splitter.splitDocuments(docs);
    await vectorStore.addDocuments(chunks);
};
exports.addYTVideoToVectorStore = addYTVideoToVectorStore;
//# sourceMappingURL=index.js.map