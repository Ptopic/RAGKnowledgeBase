import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { MemberRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const ROLE_RANK: Record<MemberRole, number> = {
	OWNER: 3,
	EDITOR: 2,
	VIEWER: 1,
};

@Injectable()
export class PermissionsService {
	constructor(private prisma: PrismaService) {}

	async getMembership(
		searchSpaceId: number,
		userId: string,
	): Promise<{ id: string; role: MemberRole; searchSpaceId: number; userId: string; invitedById: string; createdAt: Date } | null> {
		return this.prisma.searchSpaceMember.findUnique({
			where: { searchSpaceId_userId: { searchSpaceId, userId } },
		});
	}

	async requireMembership(searchSpaceId: number, userId: string) {
		const membership = await this.getMembership(searchSpaceId, userId);
		if (!membership) {
			throw new NotFoundException(
				"Search space not found or you do not have permission to access it",
			);
		}
		return membership;
	}

	async requireRole(searchSpaceId: number, userId: string, minimumRole: MemberRole) {
		const membership = await this.requireMembership(searchSpaceId, userId);
		if (ROLE_RANK[membership.role] < ROLE_RANK[minimumRole]) {
			throw new ForbiddenException(
				`You need at least ${minimumRole} role to perform this action`,
			);
		}
		return membership;
	}

	async canRead(searchSpaceId: number, userId: string): Promise<boolean> {
		const membership = await this.getMembership(searchSpaceId, userId);
		return membership !== null;
	}

	async canWrite(searchSpaceId: number, userId: string): Promise<boolean> {
		const membership = await this.getMembership(searchSpaceId, userId);
		if (!membership) return false;
		return ROLE_RANK[membership.role] >= ROLE_RANK[MemberRole.EDITOR];
	}

	async isOwner(searchSpaceId: number, userId: string): Promise<boolean> {
		const membership = await this.getMembership(searchSpaceId, userId);
		if (!membership) return false;
		return membership.role === MemberRole.OWNER;
	}

	async requireRead(searchSpaceId: number, userId: string) {
		return this.requireMembership(searchSpaceId, userId);
	}

	async requireWrite(searchSpaceId: number, userId: string) {
		return this.requireRole(searchSpaceId, userId, MemberRole.EDITOR);
	}

	async requireOwner(searchSpaceId: number, userId: string) {
		return this.requireRole(searchSpaceId, userId, MemberRole.OWNER);
	}

	async getSearchSpacesForUser(userId: string): Promise<
		{ id: number; name: string; description: string | null; userId: string; role: MemberRole; is_owner: boolean; created_at: Date }[]
	> {
		const memberships = await this.prisma.searchSpaceMember.findMany({
			where: { userId },
			include: { searchSpace: true },
		});

		return memberships.map((m) => ({
			id: m.searchSpace.id,
			name: m.searchSpace.name,
			description: m.searchSpace.description,
			userId: m.searchSpace.userId,
			role: m.role,
			is_owner: m.role === MemberRole.OWNER,
			created_at: m.searchSpace.createdAt,
		}));
	}

	async getAccessibleSearchSpaceIds(userId: string): Promise<number[]> {
		const spaces = await this.getSearchSpacesForUser(userId);
		return spaces.map((s) => s.id);
	}
}
