import { SetMetadata } from "@nestjs/common";

export const SEARCH_SPACE_CONTEXT_KEY = "searchSpaceContext";

export const RequireSearchSpaceContext = () =>
	SetMetadata(SEARCH_SPACE_CONTEXT_KEY, true);
