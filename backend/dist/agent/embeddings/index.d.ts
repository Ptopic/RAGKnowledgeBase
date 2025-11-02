import { PGVectorStore } from '@langchain/community/vectorstores/pgvector';
export declare const getVectorStore: () => Promise<PGVectorStore>;
export declare const addYTVideoToVectorStore: (videoData: any) => Promise<void>;
