import { SetMetadata } from "@nestjs/common";
import { MemberRole } from "@prisma/client";

export const SEARCH_SPACE_ROLES_KEY = "searchSpaceRoles";

export const RequireSearchSpaceRole = (...roles: MemberRole[]) =>
	SetMetadata(SEARCH_SPACE_ROLES_KEY, roles);
