import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { Document } from "@langchain/core/documents";
import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

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

export const addYTVideoToVectorStore = async (videoData) => {
	const { transcript, video_id, title, url } = videoData;

	const vectorStore = await getVectorStore();

	const docs = [
		new Document({
			pageContent: transcript,
			metadata: { video_id, video_title: title, video_url: url },
		}),
	];

	const splitter = new RecursiveCharacterTextSplitter({
		chunkSize: 1000,
		chunkOverlap: 200,
	});

	const chunks = await splitter.splitDocuments(docs);

	await vectorStore.addDocuments(chunks);
};
