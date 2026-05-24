import {
	BadRequestException,
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { MemberRole } from "@prisma/client";
import { Request } from "express";
import { SEARCH_SPACE_CONTEXT_KEY } from "../decorators/require-search-space-context.decorator";
import { SEARCH_SPACE_ROLES_KEY } from "../decorators/require-search-space-role.decorator";
import { PermissionsService } from "../permissions.service";

const ROLE_RANK: Record<MemberRole, number> = {
	OWNER: 3,
	EDITOR: 2,
	VIEWER: 1,
};

export interface SearchSpaceMembershipAttachment {
	id: string;
	role: MemberRole;
	searchSpaceId: number;
	userId: string;
	invitedById: string;
	createdAt: Date;
}

export interface SearchSpaceContext {
	searchSpaceId: number;
	membership?: SearchSpaceMembershipAttachment;
}

declare module "express" {
	interface Request {
		searchSpaceMembership?: SearchSpaceMembershipAttachment;
		searchSpaceContext?: SearchSpaceContext;
	}
}

@Injectable()
export class SearchSpaceAccessGuard implements CanActivate {
	constructor(
		private reflector: Reflector,
		private permissionsService: PermissionsService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const requiresContext = this.reflector.getAllAndOverride<boolean>(
			SEARCH_SPACE_CONTEXT_KEY,
			[context.getHandler(), context.getClass()],
		);

		const requiredRoles = this.reflector.getAllAndOverride<MemberRole[]>(
			SEARCH_SPACE_ROLES_KEY,
			[context.getHandler(), context.getClass()],
		);

		const hasContext = requiresContext === true;
		const hasRoles = requiredRoles && requiredRoles.length > 0;

		if (!hasContext && !hasRoles) {
			return true;
		}

		const request = context
			.switchToHttp()
			.getRequest<Request & { user?: { id: string } }>();

		const userId = request.user?.id;
		if (!userId) {
			throw new ForbiddenException("Authentication required");
		}

		const searchSpaceId = this.extractSearchSpaceId(request);

		if (searchSpaceId === null) {
			throw new BadRequestException(
				"search_space_id is required for this endpoint",
			);
		}

		let membership: SearchSpaceMembershipAttachment | null = null;

		if (hasRoles) {
			membership = await this.permissionsService.getMembership(
				searchSpaceId,
				userId,
			);

			if (!membership) {
				throw new NotFoundException(
					"Search space not found or you do not have permission to access it",
				);
			}

			const minimumRole = this.getMinimumRole(requiredRoles);
			if (ROLE_RANK[membership.role] < ROLE_RANK[minimumRole]) {
				throw new ForbiddenException(
					"You do not have permission to perform this action",
				);
			}

			request.searchSpaceMembership = membership;
		}

		request.searchSpaceContext = {
			searchSpaceId,
			membership: membership ?? undefined,
		};

		return true;
	}

	private extractSearchSpaceId(request: Request): number | null {
		const explicitParamCandidates = [
			request.params?.searchSpaceId,
			request.params?.search_space_id,
		];

		for (const candidate of explicitParamCandidates) {
			if (candidate !== undefined && candidate !== null) {
				const parsed = parseInt(candidate as string, 10);
				if (!isNaN(parsed)) return parsed;
			}
		}

		const body = request.body as Record<string, unknown> | undefined;

		const bodyCandidate = body?.search_space_id;
		if (
			bodyCandidate !== undefined &&
			bodyCandidate !== null
		) {
			const parsed = parseInt(bodyCandidate as string, 10);
			if (!isNaN(parsed)) return parsed;
		}

		const nestedDataCandidate = (body?.data as Record<string, unknown>)
			?.search_space_id;
		if (
			nestedDataCandidate !== undefined &&
			nestedDataCandidate !== null
		) {
			const parsed = parseInt(nestedDataCandidate as string, 10);
			if (!isNaN(parsed)) return parsed;
		}

		const queryCandidate = (request.query as Record<string, unknown>)
			?.search_space_id;
		if (
			queryCandidate !== undefined &&
			queryCandidate !== null
		) {
			const parsed = parseInt(queryCandidate as string, 10);
			if (!isNaN(parsed)) return parsed;
		}

		const fallbackCandidate = request.params?.id;
		if (fallbackCandidate !== undefined && fallbackCandidate !== null) {
			const parsed = parseInt(fallbackCandidate as string, 10);
			if (!isNaN(parsed)) return parsed;
		}

		return null;
	}

	private getMinimumRole(roles: MemberRole[]): MemberRole {
		const minRank = Math.min(...roles.map((r) => ROLE_RANK[r]));
		return (Object.entries(ROLE_RANK) as [MemberRole, number][]).find(
			([, rank]) => rank === minRank,
		)![0];
	}
}
