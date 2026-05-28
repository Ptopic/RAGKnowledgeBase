"use client";

import type {
	AttachmentAdapter,
	CompleteAttachment,
	PendingAttachment,
} from "@assistant-ui/react";
import { config } from "@/shared/config/config";
import { getChatAcceptString } from "@/lib/accepted-file-types";

const DOCUMENT_ACCEPT = getChatAcceptString().replace("image/*,", "").replace("image/*", "");

interface ChatFileUploadResult {
	filePath: string;
	fileName: string;
	mimetype: string;
	size: number;
}

export class SimpleFileAttachmentAdapter implements AttachmentAdapter {
	accept = DOCUMENT_ACCEPT;
	private token: string | undefined;
	private searchSpaceId: string | undefined;

	constructor(opts?: { token?: string; searchSpaceId?: string }) {
		this.token = opts?.token;
		this.searchSpaceId = opts?.searchSpaceId;
	}

	async add(state: { file: File }): Promise<PendingAttachment> {
		return {
			id: `${Date.now()}_${state.file.name}`,
			type: "document",
			name: state.file.name,
			contentType: state.file.type,
			file: state.file,
			status: { type: "requires-action", reason: "composer-send" },
		};
	}

	async send(attachment: PendingAttachment): Promise<CompleteAttachment> {
		const file = attachment.file;
		if (!file) {
			return {
				...attachment,
				status: { type: "complete" },
				content: [
					{
						type: "text",
						text: `[Document: ${attachment.name}]`,
					},
				],
			};
		}

		try {
			const formData = new FormData();
			formData.append("file", file);

			const apiUrl = config.apiUrl;
			const headers: Record<string, string> = {};
			if (this.token) {
				headers["Authorization"] = `Bearer ${this.token}`;
			}

			const params = new URLSearchParams();
			if (this.searchSpaceId) {
				params.set("search_space_id", this.searchSpaceId);
			}
			const query = params.toString();
			const url = `${apiUrl}/agent/upload-chat-file${query ? `?${query}` : ""}`;

			const response = await fetch(url, {
				method: "POST",
				headers,
				body: formData,
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.error("Chat file upload failed:", errorText);
				return {
					...attachment,
					status: { type: "complete" },
					content: [
						{
							type: "text",
							text: `[Document upload failed: ${attachment.name}]`,
						},
					],
				};
			}

			const result: ChatFileUploadResult = await response.json();

			const metadata = JSON.stringify({
				filePath: result.filePath,
				fileName: result.fileName,
			});

			return {
				...attachment,
				status: { type: "complete" },
				content: [
					{
						type: "text",
						text: `[uploaded_document: ${metadata}]`,
					},
				],
			};
		} catch (error) {
			console.error("Chat file upload error:", error);
			return {
				...attachment,
				status: { type: "complete" },
				content: [
					{
						type: "text",
						text: `[Document upload failed: ${attachment.name}]`,
					},
				],
			};
		}
	}

	async remove(): Promise<void> {}
}
