import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { OpenAIEmbeddings } from "@langchain/openai";

const embeddings = new OpenAIEmbeddings({
	model: "text-embedding-3-large",
	dimensions: 1536,
});

let vectorStoreInstance: PGVectorStore | null = null;

export const getVectorStore = async (): Promise<PGVectorStore> => {
	if (!vectorStoreInstance) {
		vectorStoreInstance = await PGVectorStore.initialize(embeddings, {
			postgresConnectionOptions: {
				connectionString: process.env.DATABASE_URL,
			},
			tableName: "transcripts",
			columns: {
				idColumnName: "id",
				vectorColumnName: "vector",
				contentColumnName: "content",
				metadataColumnName: "metadata",
			},
			distanceStrategy: "cosine",
		});
	}
	return vectorStoreInstance;
};
