import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma, SubscriptionPlan } from "@prisma/client";
import Stripe from "stripe";
import { Cron } from "@nestjs/schedule";

export class CreditsExceededError extends BadRequestException {
	public readonly creditsUsed: number;
	public readonly monthlyCreditLimit: number;
	public readonly creditsRequested: number;

	constructor(
		message: string = "Credit limit exceeded. Please upgrade your plan for more credits.",
		creditsUsed: number = 0,
		monthlyCreditLimit: number = 0,
		creditsRequested: number = 0,
	) {
		super(message);
		this.creditsUsed = creditsUsed;
		this.monthlyCreditLimit = monthlyCreditLimit;
		this.creditsRequested = creditsRequested;
		this.name = "CreditsExceededError";
	}
}

@Injectable()
export class SubscriptionService {
	private readonly logger = new Logger(SubscriptionService.name);
	private readonly stripe: InstanceType<typeof Stripe>;

	constructor(
		private readonly prisma: PrismaService,
		private readonly configService: ConfigService,
	) {
		const secretKey = this.configService.get<string>("stripe.secretKey");
		this.stripe = new Stripe(secretKey || "");
	}

	async getSubscription(userId: string) {
		const subscription = await this.ensureSubscription(userId);

		return {
			plan: subscription.plan,
			status: subscription.status,
			credits_used: subscription.creditsUsed,
			monthly_credit_limit: subscription.monthlyCreditLimit,
			current_period_start: subscription.currentPeriodStart,
			current_period_end: subscription.currentPeriodEnd,
			stripe_customer_id: subscription.stripeCustomerId,
			stripe_subscription_id: subscription.stripeSubscriptionId,
		};
	}

	async checkCredits(userId: string, estimatedCredits: number = 1): Promise<boolean> {
		const subscription = await this.ensureSubscription(userId);

		if (subscription.creditsUsed + estimatedCredits > subscription.monthlyCreditLimit) {
			throw new CreditsExceededError(
				`Credit limit exceeded. Used: ${subscription.creditsUsed}/${subscription.monthlyCreditLimit}. ` +
					`Requested: ${estimatedCredits} credits. Please upgrade your plan.`,
				subscription.creditsUsed,
				subscription.monthlyCreditLimit,
				estimatedCredits,
			);
		}

		return true;
	}

	async deductCredits(
		userId: string,
		credits: number,
		metadata: {
			searchSpaceId: number;
			operationType: string;
			tokensIn?: number;
			tokensOut?: number;
			modelUsed?: string;
			billedToUserKey?: boolean;
		},
	): Promise<void> {
		await this.prisma.$transaction(async (tx) => {
			const subscription = await this.ensureSubscription(userId, tx);

			if (subscription.creditsUsed + credits > subscription.monthlyCreditLimit) {
				throw new CreditsExceededError(
					`Credit limit exceeded. Used: ${subscription.creditsUsed}/${subscription.monthlyCreditLimit}.`,
					subscription.creditsUsed,
					subscription.monthlyCreditLimit,
					credits,
				);
			}

			await tx.subscription.update({
				where: { userId },
				data: { creditsUsed: { increment: credits } },
			});

			await tx.usageRecord.create({
				data: {
					userId,
					searchSpaceId: metadata.searchSpaceId,
					operationType: metadata.operationType,
					credits,
					tokensIn: metadata.tokensIn,
					tokensOut: metadata.tokensOut,
					modelUsed: metadata.modelUsed,
					billedToUserKey: metadata.billedToUserKey ?? false,
				},
			});
		});
	}

	async isUserKeyBilled(userId: string, searchSpaceId: number): Promise<boolean> {
		const userPreferences = await this.prisma.userSearchSpacePreference.findUnique({
			where: {
				uq_user_searchspace: { userId, searchSpaceId },
			},
			include: {
				longContextLlm: { select: { isPlatformKey: true, userProviderKeyId: true } },
				fastLlm: { select: { isPlatformKey: true, userProviderKeyId: true } },
				strategicLlm: { select: { isPlatformKey: true, userProviderKeyId: true } },
			},
		});

		if (!userPreferences) return false;

		const llmConfigs = [
			userPreferences.longContextLlm,
			userPreferences.fastLlm,
			userPreferences.strategicLlm,
		].filter(Boolean);

		return llmConfigs.some(
			(config) => !config.isPlatformKey,
		);
	}

	async createCheckoutSession(userId: string, plan: string) {
		const subscription = await this.ensureSubscription(userId);

		let customerId = subscription.stripeCustomerId;

		if (!customerId) {
			const user = await this.prisma.user.findUnique({ where: { id: userId } });
			const customer = await this.stripe.customers.create({
				email: user?.email ?? undefined,
				metadata: { userId },
			});
			customerId = customer.id;

			await this.prisma.subscription.update({
				where: { userId },
				data: { stripeCustomerId: customerId },
			});
		}

		const frontendUrl = this.configService.get<string>("frontend.url") || "http://localhost:3000";

		const priceId = this.getPriceIdForPlan(plan);
		if (!priceId) {
			throw new BadRequestException(`No price ID configured for plan: ${plan}`);
		}

		const session = await this.stripe.checkout.sessions.create({
			customer: customerId,
			payment_method_types: ["card"],
			line_items: [{ price: priceId, quantity: 1 }],
			mode: "subscription",
			success_url: `${frontendUrl}/dashboard/settings?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${frontendUrl}/dashboard/settings`,
		});

		return { url: session.url };
	}

	async createCustomerPortalSession(userId: string) {
		const subscription = await this.prisma.subscription.findUnique({
			where: { userId },
		});

		if (!subscription?.stripeCustomerId) {
			throw new BadRequestException("No Stripe customer ID found. Please create a subscription first.");
		}

		const frontendUrl = this.configService.get<string>("frontend.url") || "http://localhost:3000";

		const session = await this.stripe.billingPortal.sessions.create({
			customer: subscription.stripeCustomerId,
			return_url: `${frontendUrl}/dashboard/settings`,
		});

		return { url: session.url };
	}

	async handleStripeWebhook(signature: string, rawBody: Buffer) {
		const webhookSecret = this.configService.get<string>("stripe.webhookSecret");
		if (!webhookSecret) {
			throw new BadRequestException("Stripe webhook secret not configured");
		}

		let event: ReturnType<InstanceType<typeof Stripe>["webhooks"]["constructEvent"]>;
		try {
			event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
		} catch (err) {
			this.logger.error(`Webhook signature verification failed: ${err.message}`);
			throw new BadRequestException(`Webhook Error: ${err.message}`);
		}

		switch (event.type) {
			case "checkout.session.completed": {
				const session = event.data.object as Record<string, unknown>;
				await this.handleCheckoutSessionCompleted(session);
				break;
			}
			case "customer.subscription.updated": {
				const stripeSubscription = event.data.object as Record<string, unknown>;
				await this.handleSubscriptionUpdated(stripeSubscription);
				break;
			}
			case "customer.subscription.deleted": {
				const stripeSubscription = event.data.object as Record<string, unknown>;
				await this.handleSubscriptionDeleted(stripeSubscription);
				break;
			}
			case "invoice.payment_succeeded": {
				const invoice = event.data.object as Record<string, unknown>;
				await this.handleInvoicePaymentSucceeded(invoice, event.id);
				break;
			}
			default:
				this.logger.log(`Unhandled event type: ${event.type}`);
		}

		return { received: true };
	}

	private async handleCheckoutSessionCompleted(session: Record<string, unknown>) {
		const customerId = session.customer as string;
		const subscriptionId = session.subscription as string;

		const subscription = await this.prisma.subscription.findFirst({
			where: { stripeCustomerId: customerId },
		});

		if (!subscription) return;

		const stripeSubscription = await this.stripe.subscriptions.retrieve(subscriptionId);
		const priceId = stripeSubscription.items.data[0]?.price.id;

		const plan = this.getPlanFromPriceId(priceId);

		await this.prisma.subscription.update({
			where: { id: subscription.id },
			data: {
				plan: plan as SubscriptionPlan,
				status: "active",
				stripeSubscriptionId: subscriptionId,
				stripePriceId: priceId,
				monthlyCreditLimit: this.getCreditLimitForPlan(plan),
				currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
				currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
			},
		});
	}

	private async handleSubscriptionUpdated(stripeSubscriptionData: Record<string, unknown>) {
		const subscriptionId = stripeSubscriptionData.id as string;
		const subscription = await this.prisma.subscription.findFirst({
			where: { stripeSubscriptionId: subscriptionId },
		});

		if (!subscription) return;

		const stripeSubscription = await this.stripe.subscriptions.retrieve(subscriptionId);
		const priceId = stripeSubscription.items.data[0]?.price.id;
		const plan = this.getPlanFromPriceId(priceId);

		await this.prisma.subscription.update({
			where: { id: subscription.id },
			data: {
				plan: plan as SubscriptionPlan,
				status: stripeSubscription.status === "active" ? "active" : stripeSubscription.status,
				stripePriceId: priceId,
				monthlyCreditLimit: this.getCreditLimitForPlan(plan),
				currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
				currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
			},
		});
	}

	private async handleSubscriptionDeleted(stripeSubscriptionData: Record<string, unknown>) {
		const subscriptionId = stripeSubscriptionData.id as string;
		const subscription = await this.prisma.subscription.findFirst({
			where: { stripeSubscriptionId: subscriptionId },
		});

		if (!subscription) return;

		await this.prisma.subscription.update({
			where: { id: subscription.id },
			data: {
				plan: SubscriptionPlan.FREE,
				status: "canceled",
				stripeSubscriptionId: null,
				stripePriceId: null,
				monthlyCreditLimit: this.getCreditLimitForPlan("FREE"),
			},
		});
	}

	private async handleInvoicePaymentSucceeded(
		invoice: Record<string, unknown>,
		eventId: string,
	) {
		const customerId = invoice.customer as string;

		const subscription = await this.prisma.subscription.findFirst({
			where: { stripeCustomerId: customerId },
		});

		if (!subscription) return;

		if (subscription.lastProcessedInvoiceId === eventId) {
			this.logger.log("Duplicate invoice.payment_succeeded event, skipping");
			return;
		}

		const invoicePeriodStart = new Date((invoice.period_start as number) * 1000);

		await this.prisma.subscription.update({
			where: { id: subscription.id },
			data: {
				creditsUsed: 0,
				currentPeriodStart: invoicePeriodStart,
				currentPeriodEnd: new Date((invoice.period_end as number) * 1000),
				lastProcessedInvoiceId: eventId,
			},
		});
	}

	private async ensureSubscription(
		userId: string,
		client: Prisma.TransactionClient | PrismaService = this.prisma,
	) {
		const now = new Date();
		const periodEnd = new Date(now);
		periodEnd.setMonth(periodEnd.getMonth() + 1);

		return client.subscription.upsert({
			where: { userId },
			update: {},
			create: {
				userId,
				plan: SubscriptionPlan.FREE,
				status: "active",
				monthlyCreditLimit: this.getCreditLimitForPlan("FREE"),
				creditsUsed: 0,
				currentPeriodStart: now,
				currentPeriodEnd: periodEnd,
			},
		});
	}

	@Cron("0 0 1 * *")
	async resetMonthlyCredits() {
		this.logger.log("Resetting monthly credits for all subscriptions");

		const now = new Date();
		const periodEnd = new Date(now);
		periodEnd.setMonth(periodEnd.getMonth() + 1);

		const result = await this.prisma.subscription.updateMany({
			where: {
				currentPeriodEnd: { lte: now },
			},
			data: {
				creditsUsed: 0,
				currentPeriodStart: now,
				currentPeriodEnd: periodEnd,
			},
		});

		this.logger.log(`Reset credits for ${result.count} subscriptions`);
	}

	private getPlanFromPriceId(priceId: string | undefined): string {
		if (!priceId) return "FREE";
		const proPriceId = this.configService.get<string>("stripe.prices.pro");
		const businessPriceId = this.configService.get<string>("stripe.prices.business");

		if (priceId === proPriceId) return "PRO";
		if (priceId === businessPriceId) return "BUSINESS";
		return "FREE";
	}

	private getPriceIdForPlan(plan: string): string | undefined {
		if (plan === "PRO") return this.configService.get<string>("stripe.prices.pro");
		if (plan === "BUSINESS") return this.configService.get<string>("stripe.prices.business");
		return undefined;
	}

	private getCreditLimitForPlan(plan: string): number {
		const limits: Record<string, number> = {
			FREE: 1000,
			PRO: 10000,
			BUSINESS: 100000,
		};
		return limits[plan] || 1000;
	}
}
