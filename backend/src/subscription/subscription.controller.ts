import {
	BadRequestException,
	Controller,
	Get,
	Post,
	Body,
	Req,
	RawBodyRequest,
} from "@nestjs/common";
import { Request } from "express";
import { SubscriptionService } from "./subscription.service";
import { JwtAuth } from "../auth/decorators/jwt-auth.decorator";
import { CreateCheckoutSessionDto } from "./dtos/subscription.dto";

@Controller("subscription")
export class SubscriptionController {
	constructor(private readonly subscriptionService: SubscriptionService) {}

	@Get("plans")
	@JwtAuth()
	async getPlans() {
		return this.subscriptionService.getPlans();
	}

	@Get()
	@JwtAuth()
	async getSubscription(@Req() req: Request) {
		return this.subscriptionService.getSubscription(req.user.id);
	}

	@Post("checkout")
	@JwtAuth()
	async createCheckoutSession(
		@Req() req: Request,
		@Body() body: CreateCheckoutSessionDto,
	) {
		return this.subscriptionService.createCheckoutSession(
			req.user.id,
			body.plan,
		);
	}

	@Post("portal")
	@JwtAuth()
	async createCustomerPortalSession(@Req() req: Request) {
		return this.subscriptionService.createCustomerPortalSession(req.user.id);
	}

	@Post("resume")
	@JwtAuth()
	async resumeSubscription(@Req() req: Request) {
		return this.subscriptionService.resumeSubscription(req.user.id);
	}

	@Post("cancel")
	@JwtAuth()
	async cancelSubscription(@Req() req: Request) {
		return this.subscriptionService.cancelSubscription(req.user.id);
	}

	@Post("webhook")
	async handleStripeWebhook(@Req() req: RawBodyRequest<Request>) {
		const signature = req.headers["stripe-signature"] as string;
		if (!signature) {
			throw new BadRequestException("Missing stripe-signature header");
		}

		// Stripe signature verification requires the original bytes
		// preserved verbatim. bodyParser.raw (configured in main.ts)
		// keeps the body as a Buffer on req.body.
		const rawBody: Buffer | undefined = Buffer.isBuffer(req.body)
			? (req.body as Buffer)
			: (req.rawBody as Buffer | undefined);
		if (!rawBody || rawBody.length === 0) {
			throw new BadRequestException("Missing raw body for webhook verification");
		}

		return this.subscriptionService.handleStripeWebhook(signature, rawBody);
	}
}
