import { ChatOpenAI } from "@langchain/openai";
import { Injectable } from "@nestjs/common";
import { Observable } from "rxjs";
import { ResearcherDto, SearchMode } from "./dtos/researcher.dto";
import { StreamingService } from "./streaming.service";

interface ChatMessage {
	role: string;
	content: string;
}

interface Document {
	chunk_id: string | number;
	content: string;
	score?: number;
	document: {
		id: string | number;
		title: string;
		document_type: string;
		metadata: Record<string, any>;
	};
	source?: string;
}

@Injectable()
export class ResearcherService {
	/**
	 * Main researcher agent workflow
	 * Workflow: reformulate_query -> fetch_documents -> qna_workflow -> generate_follow_up_questions
	 */
	streamResearcher(researcherDto: ResearcherDto): Observable<string> {
		return new Observable((subscriber) => {
			(async () => {
				const streamingService = new StreamingService();
				streamingService.resetState();

				try {
					const {
						user_query,
						connectors_to_search,
						user_id,
						search_space_id,
						search_mode,
						document_ids_to_add_in_context = [],
						language,
						thread_id,
						chat_history = [],
					} = researcherDto;

					// Step 1: Reformulate user query based on chat history
					subscriber.next(
						streamingService.formatTerminalInfoDelta(
							"🔄 Reformulating query based on chat history...",
						),
					);

					const reformulatedQuery = await this.reformulateQuery(
						user_query,
						chat_history,
					);

					subscriber.next(
						streamingService.formatTerminalInfoDelta(
							`🧠 Reformulated query: "${reformulatedQuery.substring(0, 100)}..."`,
						),
					);

					// Step 2: Handle QNA workflow
					subscriber.next(
						streamingService.formatTerminalInfoDelta(
							"🤔 Starting Q&A research workflow...",
						),
					);

					subscriber.next(
						streamingService.formatTerminalInfoDelta(
							`🔍 Researching: "${user_query.substring(0, 100)}..."`,
						),
					);

					// Step 2a: Fetch user-selected documents
					let userSelectedDocuments: Document[] = [];
					let userSelectedSources: any[] = [];

					if (document_ids_to_add_in_context.length > 0) {
						subscriber.next(
							streamingService.formatTerminalInfoDelta(
								`📋 Including ${document_ids_to_add_in_context.length} user-selected documents...`,
							),
						);

						// TODO: Implement fetch_documents_by_ids
						// For now, this is a placeholder
						userSelectedDocuments = [];
						userSelectedSources = [];

						if (userSelectedDocuments.length > 0) {
							subscriber.next(
								streamingService.formatTerminalInfoDelta(
									`✅ Successfully added ${userSelectedDocuments.length} user-selected documents to context`,
								),
							);
						}
					}

					// Step 2b: Fetch relevant documents from connectors
					subscriber.next(
						streamingService.formatTerminalInfoDelta(
							"🔍 Searching for relevant information across all connectors...",
						),
					);

					const topK = search_mode === SearchMode.DOCUMENTS ? 5 : 20;

					// Stream connector search status
					if (connectors_to_search.length === 0) {
						subscriber.next(
							streamingService.formatTerminalInfoDelta(
								"📹 No data sources selected. Research will be generated using general knowledge and any user-selected documents.",
							),
						);
					} else {
						const connectorNames = connectors_to_search
							.map((c) => this.getConnectorFriendlyName(c))
							.join(", ");

						subscriber.next(
							streamingService.formatTerminalInfoDelta(
								`🔎 Starting research using ${connectorNames} data sources`,
							),
						);
					}

					// TODO: Implement actual document fetching from connectors
					// For now, use a placeholder
					const relevantDocuments: Document[] = [];
					const allSources: any[] = [...userSelectedSources];

					// Combine documents
					const allDocuments = [
						...userSelectedDocuments,
						...relevantDocuments,
					];

					subscriber.next(
						streamingService.formatTerminalInfoDelta(
							`📚 Collected ${allDocuments.length} total sources`,
						),
					);

					// Step 2c: Extract and stream sources
					if (allDocuments.length > 0) {
						const sourcesToStream =
							this.extractSourcesFromDocuments(allDocuments);
						subscriber.next(streamingService.formatSourcesDelta(sourcesToStream));
					}

					// Step 2d: Generate answer using QNA agent
					subscriber.next(
						streamingService.formatTerminalInfoDelta(
							`🧠 Generating comprehensive answer using ${allDocuments.length} total sources...`,
						),
					);

					subscriber.next(
						streamingService.formatTerminalInfoDelta(
							"✍️ Writing comprehensive answer with citations...",
						),
					);

					// Call QNA agent with streaming
					const { answer, rerankedDocuments } = await this.qnaWorkflow(
						user_query,
						reformulatedQuery,
						allDocuments,
						chat_history,
						language,
						subscriber,
						streamingService,
					);

					subscriber.next(
						streamingService.formatTerminalInfoDelta(
							"🎉 Q&A answer generated successfully!",
						),
					);

					// Step 3: Generate follow-up questions
					subscriber.next(
						streamingService.formatTerminalInfoDelta(
							"🤔 Generating follow-up questions...",
						),
					);

					const followUpQuestions = await this.generateFollowUpQuestions(
						user_query,
						chat_history,
						rerankedDocuments,
					);

					subscriber.next(
						streamingService.formatTerminalInfoDelta(
							`✅ Generated ${followUpQuestions.length} contextual follow-up questions!`,
						),
					);

					subscriber.next(
						streamingService.formatFurtherQuestionsDelta(followUpQuestions),
					);

					// Complete
					subscriber.next(
						streamingService.formatTerminalInfoDelta(
							"✅ Research complete!",
						),
					);

					subscriber.complete();
				} catch (error) {
					console.error("Researcher error:", error);
					subscriber.next(
						streamingService.formatError(`Error: ${error.message}`),
					);
					subscriber.error(error);
				}
			})();
		});
	}

	/**
	 * Reformulate query based on chat history
	 */
	private async reformulateQuery(
		query: string,
		chatHistory: ChatMessage[],
	): Promise<string> {
		if (chatHistory.length === 0) {
			return query;
		}

		const llm = new ChatOpenAI({
			modelName: "gpt-4o-mini",
			temperature: 0,
		});

		const historyStr = this.chatHistoryToStr(chatHistory);

		const reformulationPrompt = `
Given the following chat history and current query, reformulate the query to be more specific and contextual.

Chat History:
${historyStr}

Current Query: ${query}

Reformulated Query (respond with only the reformulated query, nothing else):`;

		const response = await llm.invoke([
			{ role: "user", content: reformulationPrompt },
		]);

		return response.content.toString().trim();
	}

	/**
	 * QNA workflow - rerank documents and generate answer
	 */
	private async qnaWorkflow(
		userQuery: string,
		reformulatedQuery: string,
		documents: Document[],
		chatHistory: ChatMessage[],
		language: string | undefined,
		subscriber: any,
		streamingService: StreamingService,
	): Promise<{ answer: string; rerankedDocuments: Document[] }> {
		// Step 1: Rerank documents (simplified - in production, use a reranker service)
		const rerankedDocuments = documents; // TODO: Implement actual reranking

		// Step 2: Generate answer with streaming
		const llm = new ChatOpenAI({
			modelName: "gpt-4o-mini",
			streaming: true,
			callbacks: [
				{
					handleLLMNewToken(token: string) {
						subscriber.next(streamingService.formatTextChunk(token));
					},
				},
			],
		});

		const chatHistoryStr = this.chatHistoryToStr(chatHistory);
		const hasDocuments = documents.length > 0;

		// Build system prompt
		const systemPrompt = hasDocuments
			? this.getQnaCitationSystemPrompt(chatHistoryStr, language)
			: this.getQnaNoDocumentsSystemPrompt(chatHistoryStr, language);

		// Build documents section
		const documentsText = hasDocuments
			? this.formatDocumentsSection(
					documents,
					"Source material from your personal knowledge base",
				)
			: "";

		const instructionText = hasDocuments
			? "Please provide a detailed, comprehensive answer to the user's question using the information from their personal knowledge sources. Make sure to cite all information appropriately using [citation:source_id] format and engage in a conversational manner."
			: "Please provide a helpful answer to the user's question based on our conversation history and your general knowledge. Engage in a conversational manner.";

		const humanMessageContent = `
${documentsText}

User's question:
<user_query>
${userQuery}
</user_query>

${instructionText}
`;

		const response = await llm.invoke([
			{ role: "system", content: systemPrompt },
			{ role: "user", content: humanMessageContent },
		]);

		const answer = response.content.toString();

		return { answer, rerankedDocuments };
	}

	/**
	 * Generate follow-up questions
	 */
	private async generateFollowUpQuestions(
		query: string,
		chatHistory: ChatMessage[],
		documents: Document[],
	): Promise<Array<{ id: number; question: string }>> {
		const llm = new ChatOpenAI({
			modelName: "gpt-4o-mini",
			temperature: 0.7,
		});

		const chatHistoryXml = this.formatChatHistoryXml(chatHistory);
		const documentsXml = this.formatDocumentsXml(documents);

		const humanMessageContent = `
${chatHistoryXml}

${documentsXml}

Based on the chat history and available documents above, generate 3-5 contextually relevant follow-up questions that would naturally extend the conversation and provide additional value to the user. Make sure the questions can be reasonably answered using the available documents or knowledge base.

Your response MUST be valid JSON in exactly this format:
{
  "further_questions": [
    {"id": 0, "question": "further qn 1"},
    {"id": 1, "question": "further qn 2"}
  ]
}

Do not include any other text or explanation. Only return the JSON.
`;

		const systemPrompt = this.getFurtherQuestionsSystemPrompt();

		try {
			const response = await llm.invoke([
				{ role: "system", content: systemPrompt },
				{ role: "user", content: humanMessageContent },
			]);

			const content = response.content.toString();
			const jsonMatch = content.match(/\{[\s\S]*\}/);

			if (jsonMatch) {
				const parsed = JSON.parse(jsonMatch[0]);
				return parsed.further_questions || [];
			}

			return [];
		} catch (error) {
			console.error("Error generating follow-up questions:", error);
			return [];
		}
	}

	// Helper methods

	private chatHistoryToStr(chatHistory: ChatMessage[]): string {
		return chatHistory
			.map((msg) => {
				if (msg.role === "user") return `<user>${msg.content}</user>`;
				if (msg.role === "assistant") return `<assistant>${msg.content}</assistant>`;
				return `<message>${msg.content}</message>`;
			})
			.join("\n");
	}

	private formatChatHistoryXml(chatHistory: ChatMessage[]): string {
		let xml = "<chat_history>\n";
		for (const message of chatHistory) {
			if (message.role === "user") {
				xml += `<user>${message.content}</user>\n`;
			} else if (message.role === "assistant") {
				xml += `<assistant>${message.content}</assistant>\n`;
			}
		}
		xml += "</chat_history>";
		return xml;
	}

	private formatDocumentsXml(documents: Document[]): string {
		let xml = "<documents>\n";
		for (let i = 0; i < documents.length; i++) {
			const doc = documents[i];
			const sourceId = doc.document?.id || `doc_${i}`;
			const sourceType = doc.document?.document_type || "UNKNOWN";
			const content = doc.content || "";

			xml += "<document>\n";
			xml += "<metadata>\n";
			xml += `<source_id>${sourceId}</source_id>\n`;
			xml += `<source_type>${sourceType}</source_type>\n`;
			xml += "</metadata>\n";
			xml += `<content>\n${content}</content>\n`;
			xml += "</document>\n";
		}
		xml += "</documents>";
		return xml;
	}

	private formatDocumentsSection(
		documents: Document[],
		sectionTitle: string,
	): string {
		if (!documents || documents.length === 0) return "";

		const formattedDocs = documents
			.map((doc) => this.formatDocumentForCitation(doc))
			.join("\n");

		return `${sectionTitle}:
<documents>
${formattedDocs}
</documents>`;
	}

	private formatDocumentForCitation(document: Document): string {
		const content = document.content || "";
		const docInfo = document.document || {};
		const documentId = document.chunk_id || "";
		const documentType = docInfo.document_type || "CRAWLED_URL";

		return `<document>
  <metadata>
    <source_id>${documentId}</source_id>
    <source_type>${documentType}</source_type>
  </metadata>
  <content>
    ${content}
  </content>
</document>`;
	}

	private extractSourcesFromDocuments(documents: Document[]): any[] {
		const documentsByType: Record<string, Document[]> = {};

		for (const doc of documents) {
			const sourceType = doc.source || "UNKNOWN";
			const documentType = doc.document?.document_type || sourceType;
			const groupType = documentType !== "UNKNOWN" ? documentType : sourceType;

			if (!documentsByType[groupType]) {
				documentsByType[groupType] = [];
			}
			documentsByType[groupType].push(doc);
		}

		const sourceObjects: any[] = [];
		let sourceIdCounter = 1;

		for (const [docType, docs] of Object.entries(documentsByType)) {
			const sourcesList = docs.map((doc) => {
				const documentInfo = doc.document || {};
				const metadata = documentInfo.metadata || {};

				return {
					id: doc.chunk_id || sourceIdCounter++,
					title: documentInfo.title || "Untitled Document",
					description: (doc.content || "").trim(),
					url: metadata.url || metadata.page_url || "",
				};
			});

			const groupName = this.getConnectorFriendlyName(docType);

			sourceObjects.push({
				id: sourceObjects.length + 1,
				name: groupName,
				type: docType,
				sources: sourcesList,
			});
		}

		return sourceObjects;
	}

	private getConnectorFriendlyName(connectorName: string): string {
		const names: Record<string, string> = {
			YOUTUBE_VIDEO: "YouTube",
			EXTENSION: "Browser Extension",
			CRAWLED_URL: "Web Pages",
			FILE: "Files",
			SLACK_CONNECTOR: "Slack",
			NOTION_CONNECTOR: "Notion",
			GITHUB_CONNECTOR: "GitHub",
			LINEAR_CONNECTOR: "Linear",
			JIRA_CONNECTOR: "Jira",
			DISCORD_CONNECTOR: "Discord",
			TAVILY_API: "Web Search",
			GOOGLE_CALENDAR_CONNECTOR: "Google Calendar",
			AIRTABLE_CONNECTOR: "Airtable",
			LUMA_CONNECTOR: "Luma",
		};
		return names[connectorName] || connectorName;
	}

	private getQnaCitationSystemPrompt(
		chatHistory: string,
		language?: string,
	): string {
		const languageInstruction = language
			? `\n\nIMPORTANT: Please respond in ${language} language. All your responses, explanations, and analysis should be written in ${language}.`
			: "";

		return `You are a helpful AI research assistant. Your task is to answer questions based on the user's personal knowledge base.

${chatHistory ? `Previous conversation:\n${chatHistory}` : ""}

CITATION INSTRUCTIONS:
- You MUST cite sources using [citation:source_id] format immediately after making claims
- Use the source_id from the document metadata
- Multiple citations for the same claim: [citation:source_id1][citation:source_id2]
- Place citations at the end of sentences or claims
- Every factual claim should have at least one citation

ANSWER GUIDELINES:
- Provide comprehensive, well-structured answers
- Use markdown formatting for readability
- If sources conflict, mention different perspectives with citations
- If information is insufficient, acknowledge limitations
- Be conversational and helpful${languageInstruction}`;
	}

	private getQnaNoDocumentsSystemPrompt(
		chatHistory: string,
		language?: string,
	): string {
		const languageInstruction = language
			? `\n\nIMPORTANT: Please respond in ${language} language. All your responses, explanations, and analysis should be written in ${language}.`
			: "";

		return `You are a helpful AI assistant. Answer the user's question based on the conversation history and your general knowledge.

${chatHistory ? `Previous conversation:\n${chatHistory}` : ""}

ANSWER GUIDELINES:
- Provide comprehensive, well-structured answers
- Use markdown formatting for readability
- Be conversational and helpful
- If you're not certain, acknowledge limitations${languageInstruction}`;
	}

	private getFurtherQuestionsSystemPrompt(): string {
		return `You are an expert research assistant specializing in generating contextually relevant follow-up questions.

Your task is to analyze the chat history and available documents to suggest further questions that would naturally extend the conversation and provide additional value to the user.

Generate 3-5 questions that:
- Are directly related to the ongoing conversation but explore new angles
- Can be reasonably answered using the available documents or knowledge base
- Progress the conversation forward rather than repeating previous topics
- Are specific and actionable rather than overly broad`;
	}
}
