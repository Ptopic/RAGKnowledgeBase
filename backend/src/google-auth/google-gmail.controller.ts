import {
	BadRequestException,
	ConflictException,
	Controller,
	Get,
	InternalServerErrorException,
	Query,
	Req,
	Res,
	UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SearchSourceConnectorType } from "@prisma/client";
import { Response } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt.guard";
import { PrismaService } from "../prisma/prisma.service";

@Controller("auth/google/gmail/connector")
export class GoogleGmailController {
	constructor(
		private readonly configService: ConfigService,
		private readonly prisma: PrismaService,
	) {}

	@Get("add")
	@UseGuards(JwtAuthGuard)
	async connectGmail(
		@Query("space_id") spaceId: string,
		// biome-ignore lint/suspicious/noExplicitAny: Request type from express contains user from JWT guard
		@Req() req: any,
	): Promise<{ auth_url: string }> {
		try {
			if (!spaceId) {
				throw new BadRequestException("space_id is required");
			}

			const searchSpaceId = parseInt(spaceId, 10);
			const userId = req.user.id;

			const clientId = this.configService.get<string>("google.oauth.clientId");
			const redirectUri = this.configService.get<string>(
				"google.gmail.redirectUri",
			);

			if (!clientId || !redirectUri) {
				throw new InternalServerErrorException(
					"Google OAuth configuration missing",
				);
			}

			const state = Buffer.from(
				JSON.stringify({ space_id: searchSpaceId, user_id: userId }),
			).toString("base64url");

			const scopes = [
				"https://www.googleapis.com/auth/gmail.readonly",
				"https://www.googleapis.com/auth/userinfo.email",
				"https://www.googleapis.com/auth/userinfo.profile",
				"openid",
			];

			const authUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes.join(" "))}&access_type=offline&prompt=consent&include_granted_scopes=true&state=${state}`;

			return { auth_url: authUrl };
		} catch (error) {
			if (
				error instanceof BadRequestException ||
				error instanceof InternalServerErrorException
			) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to initiate Google OAuth: ${error.message}`,
			);
		}
	}

	@Get("callback")
	async gmailCallback(
		@Query("code") code: string,
		@Query("state") state: string,
		@Res() res: Response,
	) {
		try {
			if (!code || !state) {
				throw new BadRequestException("Missing required parameters");
			}

			const decodedState = JSON.parse(
				Buffer.from(state, "base64url").toString(),
			);
			const userId = decodedState.user_id;
			const spaceId = decodedState.space_id;

			const clientId = this.configService.get<string>("google.oauth.clientId");
			const clientSecret = this.configService.get<string>(
				"google.oauth.clientSecret",
			);
			const redirectUri = this.configService.get<string>(
				"google.gmail.redirectUri",
			);

			const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
				method: "POST",
				headers: { "Content-Type": "application/x-www-form-urlencoded" },
				body: new URLSearchParams({
					code,
					client_id: clientId,
					client_secret: clientSecret,
					redirect_uri: redirectUri,
					grant_type: "authorization_code",
				}),
			});

			if (!tokenResponse.ok) {
				throw new InternalServerErrorException(
					"Failed to exchange code for tokens",
				);
			}

			const tokens = await tokenResponse.json();

			// Transform tokens to match the format expected by GoogleGmailConnector
			const connectorConfig = {
				client_id: clientId,
				client_secret: clientSecret,
				access_token: tokens.access_token,
				refresh_token: tokens.refresh_token,
				token_uri: "https://oauth2.googleapis.com/token",
				expiry_date: tokens.expires_in
					? Date.now() + tokens.expires_in * 1000
					: undefined,
				scopes: tokens.scope ? tokens.scope.split(" ") : [],
				token_type: tokens.token_type,
			};

			const existing = await this.prisma.searchSourceConnector.findFirst({
				where: {
					searchSpaceId: spaceId,
					userId,
					connectorType: SearchSourceConnectorType.GOOGLE_GMAIL_CONNECTOR,
				},
			});

			if (existing) {
				throw new ConflictException(
					"A GOOGLE_GMAIL_CONNECTOR connector already exists in this search space",
				);
			}

			await this.prisma.searchSourceConnector.create({
				data: {
					name: "Google Gmail Connector",
					connectorType: SearchSourceConnectorType.GOOGLE_GMAIL_CONNECTOR,
					config: connectorConfig,
					searchSpaceId: spaceId,
					userId,
					isIndexable: true,
				},
			});

			const frontendUrl = this.configService.get<string>("frontend.url");
			return res.redirect(
				`${frontendUrl}/dashboard/${spaceId}/connectors/add/google-gmail-connector?success=true`,
			);
		} catch (error) {
			if (
				error instanceof BadRequestException ||
				error instanceof ConflictException
			) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to complete Google OAuth: ${error.message}`,
			);
		}
	}
}
