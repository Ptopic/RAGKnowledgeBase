import {
	BadRequestException,
	GoneException,
	Injectable,
	InternalServerErrorException,
	NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateShareLinkDto, ShareLinkDto, SharedChatDto } from "./dtos/share-link.dto";

@Injectable()
export class ChatShareService {
	constructor(private prisma: PrismaService) {}

	private generateSlug(): string {
		const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
		let slug = '';
		for (let i = 0; i < 8; i++) {
			slug += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		return slug;
	}

	async createShareLink(chatId: number, userId: string, createDto: CreateShareLinkDto): Promise<ShareLinkDto> {
		try {
			const chat = await this.prisma.chat.findFirst({
				where: { id: chatId, searchSpace: { userId } },
			});
			if (!chat) {
				throw new NotFoundException("Chat not found or you do not have permission to access it");
			}

			let slug = this.generateSlug();
			let existing = await this.prisma.chatShareLink.findUnique({ where: { slug } });
			while (existing) {
				slug = this.generateSlug();
				existing = await this.prisma.chatShareLink.findUnique({ where: { slug } });
			}

			let expiresAt: Date | null = null;
			if (createDto.expiresInDays) {
				if (createDto.expiresInDays < 1 || createDto.expiresInDays > 365) {
					throw new BadRequestException("expiresInDays must be between 1 and 365");
				}
				expiresAt = new Date();
				expiresAt.setDate(expiresAt.getDate() + createDto.expiresInDays);
			}

			const shareLink = await this.prisma.chatShareLink.create({
				data: {
					chatId,
					slug,
					expiresAt,
					isActive: true,
				},
			});

			return this.toDto(shareLink);
		} catch (error) {
			if (error instanceof NotFoundException || error instanceof BadRequestException) {
				throw error;
			}
			throw new InternalServerErrorException(`Failed to create share link: ${error.message}`);
		}
	}

	async getSharedChat(slug: string): Promise<SharedChatDto> {
		try {
			const shareLink = await this.prisma.chatShareLink.findUnique({
				where: { slug },
				include: { chat: true },
			});

			if (!shareLink) {
				throw new NotFoundException("Share link not found");
			}

			if (!shareLink.isActive) {
				throw new NotFoundException("Share link has been deactivated");
			}

			if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
				throw new GoneException("Share link has expired");
			}

			return {
				id: shareLink.chat.id,
				type: shareLink.chat.type,
				title: shareLink.chat.title,
				messages: shareLink.chat.messages,
				createdAt: shareLink.chat.createdAt,
			};
		} catch (error) {
			if (error instanceof NotFoundException || error instanceof GoneException) {
				throw error;
			}
			throw new InternalServerErrorException(`Failed to fetch shared chat: ${error.message}`);
		}
	}

	async deactivateAllLinks(chatId: number, userId: string): Promise<{ message: string }> {
		try {
			const chat = await this.prisma.chat.findFirst({
				where: { id: chatId, searchSpace: { userId } },
			});
			if (!chat) {
				throw new NotFoundException("Chat not found or you do not have permission to access it");
			}

			await this.prisma.chatShareLink.updateMany({
				where: { chatId, isActive: true },
				data: { isActive: false },
			});

			return { message: "All share links deactivated successfully" };
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw error;
			}
			throw new InternalServerErrorException(`Failed to deactivate share links: ${error.message}`);
		}
	}

	async deactivateLink(chatId: number, linkId: string, userId: string): Promise<{ message: string }> {
		try {
			const chat = await this.prisma.chat.findFirst({
				where: { id: chatId, searchSpace: { userId } },
			});
			if (!chat) {
				throw new NotFoundException("Chat not found or you do not have permission to access it");
			}

			const shareLink = await this.prisma.chatShareLink.findFirst({
				where: { id: linkId, chatId },
			});
			if (!shareLink) {
				throw new NotFoundException("Share link not found");
			}

			await this.prisma.chatShareLink.update({
				where: { id: linkId },
				data: { isActive: false },
			});

			return { message: "Share link deactivated successfully" };
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw error;
			}
			throw new InternalServerErrorException(`Failed to deactivate share link: ${error.message}`);
		}
	}

	async getChatShareLinks(chatId: number, userId: string): Promise<ShareLinkDto[]> {
		try {
			const chat = await this.prisma.chat.findFirst({
				where: { id: chatId, searchSpace: { userId } },
			});
			if (!chat) {
				throw new NotFoundException("Chat not found or you do not have permission to access it");
			}

			const shareLinks = await this.prisma.chatShareLink.findMany({
				where: { chatId },
				orderBy: { createdAt: "desc" },
			});

			return shareLinks.map((link) => this.toDto(link));
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw error;
			}
			throw new InternalServerErrorException(`Failed to fetch share links: ${error.message}`);
		}
	}

	private toDto(link: any): ShareLinkDto {
		return {
			id: link.id,
			slug: link.slug,
			url: `/s/${link.slug}`,
			expiresAt: link.expiresAt,
			isActive: link.isActive,
			createdAt: link.createdAt,
		};
	}
}
