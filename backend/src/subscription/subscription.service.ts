import {
	BadRequestException,
	forwardRef,
	Inject,
	Injectable,
	Logger,
	Optional,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";
import { Prisma, SubscriptionPlan } from "@prisma/client";
import Stripe from "stripe";
import { PrismaService } from "../prisma/prisma.service";
import { QueueService } from "../queue/queue.service";
import type { UsageOperationType } from "./credit-cost";

export interface PlanInfo {
	plan: string;
	name: string;
	description: string | null;
	credits: number;
	price_id: string;
	amount: number;
	currency: string;
	interval: string;
}

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

const PLANS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

@Injectable()
export class SubscriptionService {
	private readonly logger = new Logger(SubscriptionService.name);
	private readonly stripe: InstanceType<typeof Stripe>;
	private plansCache: PlanInfo[] | null = null;
	private plansCacheExpiry = 0;

	constructor(
		private readonly prisma: PrismaService,
		private readonly configService: ConfigService,
		@Optional()
		@Inject(forwardRef(() => QueueService))
		private readonly queueService?: QueueService,
	) {
		const secretKey = this.configService.get<string>("stripe.secretKey");
		const webhookSecret = this.configService.get<string>("stripe.webhookSecret");
		const isProduction = process.env.NODE_ENV === "production";

		if (!secretKey) {
			if (isProduction) {
				throw new Error(
					"STRIPE_SECRET_KEY is required in production. Refusing to start.",
				);
			}
			this.logger.warn(
				"STRIPE_SECRET_KEY is not configured. Stripe features will be disabled.",
			);
		}
		if (!webhookSecret) {
			if (isProduction) {
				throw new Error(
					"STRIPE_WEBHOOK_SECRET is required in production. Refusing to start.",
				);
			}
			this.logger.warn(
				"STRIPE_WEBHOOK_SECRET is not configured. /subscription/webhook will reject all events.",
			);
		}

		// Use a clearly non-functional placeholder when no key is set so
		// it never appears in stack traces as a real-looking key.
		this.stripe = new Stripe(secretKey || "stripe-not-configured");
	}

	/**
	 * Fetch available subscription plans from Stripe.
	 * Products must have metadata.plan and metadata.credits set in the Stripe Dashboard.
	 * Results are cached for 1 hour.
	 */
	async getPlans(): Promise<PlanInfo[]> {
		if (this.plansCache && Date.now() < this.plansCacheExpiry) {
			return this.plansCache;
		}

		const secretKey = this.configService.get<string>("stripe.secretKey");
		if (!secretKey) {
			this.logger.warn("Cannot fetch plans: STRIPE_SECRET_KEY not configured");
			return [];
		}

		try {
			const products = await this.stripe.products.list({
				active: true,
				expand: ["data.default_price"],
			});

			this.logger.log(
				`Fetched ${products.data.length} active products from Stripe`,
			);

			const plans: PlanInfo[] = products.data
				.filter((p) => p.metadata.plan)
				.map((product) => {
					const price =
						typeof product.default_price === "object"
							? (product.default_price as Stripe.Price)
							: null;

					if (!price) {
						this.logger.warn(
							`Product "${product.name}" (${product.id}) has no default_price`,
						);
					}

					return {
						plan: product.metadata.plan,
						name: product.name,
						description: product.description,
						credits: parseInt(product.metadata.credits || "0", 10),
						price_id: price?.id ?? "",
						amount: price?.unit_amount ?? 0,
						currency: price?.currency ?? "usd",
						interval: price?.recurring?.interval ?? "month",
					};
				});

			this.logger.log(`Mapped ${plans.length} plans from Stripe products`);

			this.plansCache = plans;
			this.plansCacheExpiry = Date.now() + PLANS_CACHE_TTL_MS;

			return plans;
		} catch (error) {
			this.logger.error(`Failed to fetch plans from Stripe: ${error.message}`);
			return this.plansCache ?? [];
		}
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
			cancel_at: subscription.cancelAt,
		};
	}

	async checkCredits(
		userId: string,
		estimatedCredits: number = 1,
	): Promise<boolean> {
		const subscription = await this.ensureSubscription(userId);

		if (
			subscription.creditsUsed + estimatedCredits >
			subscription.monthlyCreditLimit
		) {
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
		},
	): Promise<void> {
		if (credits === 0) return;

		const absCredits = Math.abs(Math.trunc(credits));
		if (absCredits === 0) return;

		await this.prisma.$transaction(async (tx) => {
			const subscription = await this.ensureSubscription(userId, tx);

			if (credits > 0) {
				const result = await tx.subscription.updateMany({
					where: {
						userId,
						creditsUsed: {
							lte: subscription.monthlyCreditLimit - credits,
						},
					},
					data: { creditsUsed: { increment: credits } },
				});
				if (result.count === 0) {
					throw new CreditsExceededError(
						`Credit limit exceeded. Used: ${subscription.creditsUsed}/${subscription.monthlyCreditLimit}.`,
						subscription.creditsUsed,
						subscription.monthlyCreditLimit,
						credits,
					);
				}
			} else {
				const result = await tx.subscription.updateMany({
					where: {
						userId,
						creditsUsed: { gte: absCredits },
					},
					data: { creditsUsed: { decrement: absCredits } },
				});
				if (result.count === 0) {
					this.logger.warn(
						`Refund skipped for user ${userId}: creditsUsed (${subscription.creditsUsed}) < refund amount (${absCredits})`,
					);
					return;
				}
				// Refund path: do NOT write a UsageRecord. The
				// over-collected ledger entry that the refund is
				// offsetting is the positive UsageRecord from the
				// pre-deduct; an additional negative row would
				// double-count in SUM(credits) audit queries.
				return;
			}

			await tx.usageRecord.create({
				data: {
					userId,
					searchSpaceId: metadata.searchSpaceId,
					operationType: metadata.operationType,
					credits,
					tokensIn: metadata.tokensIn,
					tokensOut: metadata.tokensOut,
					modelUsed: metadata.modelUsed,
					billedToUserKey: false,
				},
			});
		});
	}

	/**
	 * Superusers (admins) are exempt from credit charges across all
	 * operations — chat, document processing, connector indexing, page
	 * reconciliation, the lot. This is the single source of truth for
	 * that policy; callers should `if (await isSuperuserBypass(uid))
	 * return;` before any `checkCredits` / `deductForIndexedPages` /
	 * `adjustCreditsForIndexedPages` / `enqueueDeduction` call.
	 */
	async isSuperuserBypass(userId: string): Promise<boolean> {
		if (!userId) return false;
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: { isSuperuser: true },
		});
		return user?.isSuperuser ?? false;
	}

	/**
	 * Enqueue a durable credit deduction via the Bull queue. Used after
	 * a streaming AI call finishes so we don't block the HTTP response on
	 * the DB write, but the deduction survives a process crash (it lives
	 * in Redis until a worker picks it up).
	 *
	 * Errors during enqueue are logged but not re-thrown — the user has
	 * already received the response, and we don't want to surface
	 * credit-tracking failures as 500s. The pre-check is the user-facing
	 * gate; this is the accounting step.
	 *
	 * Two bypasses are enforced *before* enqueue:
	 *  - superusers are never billed
	 *  - calls that ran on a platform-provided API key (the user has
	 *    no LLM config of their own) are billed to the platform, not
	 *    the user — the caller passes `billedToUserKey: true` only
	 *    when the user's own LLM was used
	 */
	async enqueueDeduction(args: {
		userId: string;
		searchSpaceId: number;
		operationType: UsageOperationType | string;
		tokensIn?: number;
		tokensOut?: number;
		modelName?: string | null;
		billedToUserKey?: boolean;
	}): Promise<void> {
		if (await this.isSuperuserBypass(args.userId)) {
			return;
		}

		// Platform-key fallback: the LLM ran on the platform's API key,
		// so the platform eats the cost — the user is not billed.
		if (args.billedToUserKey === false) {
			return;
		}

		if (!this.queueService) {
			this.logger.error(
				`QueueService unavailable; skipping credit deduction for user ${args.userId} ` +
					`(${args.operationType}). Configure QueueModule to enable durable billing.`,
			);
			return;
		}

		await this.queueService.enqueueCreditDeduction({
			userId: args.userId,
			searchSpaceId: args.searchSpaceId,
			operationType: args.operationType,
			tokensIn: args.tokensIn,
			tokensOut: args.tokensOut,
			modelName: args.modelName,
		});
	}

	/**
	 * Deduct credits for a document indexing operation. One credit per
	 * page, per the Jira spec.
	 */
	async deductForIndexedPages(
		userId: string,
		searchSpaceId: number,
		pageCount: number,
	): Promise<void> {
		if (pageCount <= 0) return;
		await this.deductCredits(userId, pageCount, {
			searchSpaceId,
			operationType: "INDEX_PAGE",
		});
	}

	/**
	 * Reconcile a previously-pre-deducted page count with the actual
	 * count reported by the document processor.
	 *
	 * The upload flow charges an *estimated* page count up front (file
	 * size heuristic) and the async docling/llamacloud job reports the
	 * real count once it finishes. This method applies the delta:
	 *  - actual > estimated: charge the extra
	 *  - actual < estimated: refund the overage
	 *  - actual == estimated: no-op
	 *
	 * Records a UsageRecord with operationType="INDEX_PAGE_RECONCILE" so
	 * the audit trail shows the adjustment.
	 */
	async adjustCreditsForIndexedPages(
		userId: string,
		searchSpaceId: number,
		actualPages: number,
		estimatedPages: number,
	): Promise<void> {
		const actual = Math.max(0, Math.floor(actualPages));
		const estimated = Math.max(0, Math.floor(estimatedPages));
		const delta = actual - estimated;
		if (delta === 0) return;

		if (delta < 0) {
			await this.refundCreditsForIndexedPages(
				userId,
				searchSpaceId,
				Math.abs(delta),
				estimated,
				actual,
			);
			return;
		}

		await this.deductCredits(userId, delta, {
			searchSpaceId,
			operationType: "INDEX_PAGE_RECONCILE",
		});
		this.logger.log(
			`Reconciled page credits for user ${userId}: ` +
				`estimated=${estimated}, actual=${actual}, delta=${delta}`,
		);
	}

	/**
	 * Refund credits for an over-estimated pre-deduct. The UsageRecord
	 * is intentionally written with a negative `credits` value so the
	 * refund is visible in the audit ledger (do not Math.abs this).
	 */
	private async refundCreditsForIndexedPages(
		userId: string,
		searchSpaceId: number,
		refundAmount: number,
		estimated: number,
		actual: number,
	): Promise<void> {
		await this.deductCredits(userId, -refundAmount, {
			searchSpaceId,
			operationType: "INDEX_PAGE_RECONCILE",
		});
		this.logger.log(
			`Refunded ${refundAmount} page credits to user ${userId}: ` +
				`estimated=${estimated}, actual=${actual}`,
		);
	}

	async createCheckoutSession(userId: string, plan: string) {
		if (!this.configService.get<string>("stripe.secretKey")) {
			throw new BadRequestException(
				"Stripe is not configured. Please set STRIPE_SECRET_KEY.",
			);
		}

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

		const frontendUrl =
			this.configService.get<string>("frontend.url") || "http://localhost:3000";

		const priceId = await this.getPriceIdForPlan(plan);
		if (!priceId) {
			throw new BadRequestException(`No price ID found for plan: ${plan}`);
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
		if (!this.configService.get<string>("stripe.secretKey")) {
			throw new BadRequestException(
				"Stripe is not configured. Please set STRIPE_SECRET_KEY.",
			);
		}

		const subscription = await this.prisma.subscription.findUnique({
			where: { userId },
		});

		if (!subscription?.stripeCustomerId) {
			throw new BadRequestException(
				"No Stripe customer ID found. Please create a subscription first.",
			);
		}

		const frontendUrl =
			this.configService.get<string>("frontend.url") || "http://localhost:3000";

		const session = await this.stripe.billingPortal.sessions.create({
			customer: subscription.stripeCustomerId,
			return_url: `${frontendUrl}/dashboard/settings`,
		});

		return { url: session.url };
	}

	async resumeSubscription(userId: string) {
		if (!this.configService.get<string>("stripe.secretKey")) {
			throw new BadRequestException(
				"Stripe is not configured. Please set STRIPE_SECRET_KEY.",
			);
		}

		const subscription = await this.prisma.subscription.findUnique({
			where: { userId },
		});

		if (!subscription?.stripeSubscriptionId) {
			throw new BadRequestException("No active subscription to resume.");
		}

		if (!subscription.cancelAt) {
			throw new BadRequestException(
				"Subscription is not scheduled for cancellation.",
			);
		}

		await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
			cancel_at_period_end: false,
		});

		await this.prisma.subscription.update({
			where: { id: subscription.id },
			data: { cancelAt: null },
		});

		this.logger.log(
			`Subscription resumed: ${subscription.stripeSubscriptionId}`,
		);

		return { message: "Subscription resumed successfully." };
	}

	async cancelSubscription(userId: string) {
		if (!this.configService.get<string>("stripe.secretKey")) {
			throw new BadRequestException(
				"Stripe is not configured. Please set STRIPE_SECRET_KEY.",
			);
		}

		const subscription = await this.prisma.subscription.findUnique({
			where: { userId },
		});

		if (!subscription?.stripeSubscriptionId) {
			throw new BadRequestException("No active Stripe subscription to cancel.");
		}

		if (subscription.cancelAt) {
			throw new BadRequestException(
				"Subscription is already scheduled for cancellation.",
			);
		}

		if (subscription.plan === SubscriptionPlan.FREE) {
			throw new BadRequestException("No active paid subscription to cancel.");
		}

		const updated = await this.stripe.subscriptions.update(
			subscription.stripeSubscriptionId,
			{ cancel_at_period_end: true },
		);

		this.logger.log(
			`Subscription scheduled for cancellation at period end: ${subscription.stripeSubscriptionId}`,
		);

		const periodEndUnix = (
			updated as unknown as { current_period_end?: number }
		).current_period_end;
		const cancelAt =
			typeof periodEndUnix === "number"
				? new Date(periodEndUnix * 1000).toISOString()
				: subscription.currentPeriodEnd.toISOString();

		return {
			message: "Subscription scheduled for cancellation.",
			cancel_at: cancelAt,
		};
	}

	async handleStripeWebhook(signature: string, rawBody: Buffer) {
		const webhookSecret = this.configService.get<string>(
			"stripe.webhookSecret",
		);
		if (!webhookSecret) {
			throw new BadRequestException("Stripe webhook secret not configured");
		}

		let event: ReturnType<
			InstanceType<typeof Stripe>["webhooks"]["constructEvent"]
		>;
		try {
			event = this.stripe.webhooks.constructEvent(
				rawBody,
				signature,
				webhookSecret,
			);
		} catch (err) {
			this.logger.error(
				`Webhook signature verification failed: ${err.message}`,
			);
			throw new BadRequestException(`Webhook Error: ${err.message}`);
		}

		this.logger.log(`Stripe webhook received: ${event.type} (id=${event.id})`);

		// Idempotency: Stripe guarantees at-least-once delivery, so we
		// record each processed event id and skip duplicates. The unique
		// constraint on event_id makes the check + insert atomic.
		const acquired = await this.tryAcquireWebhookEvent(event.id, event.type);
		if (!acquired) {
			this.logger.log(
				`Skipping already-processed webhook event ${event.id} (${event.type})`,
			);
			return { received: true, deduped: true };
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

	/**
	 * Atomically claim a Stripe event id. Returns true on first call,
	 * false on any subsequent call with the same id. Uses the unique
	 * constraint on ProcessedWebhookEvent.event_id for the race-safe
	 * check-and-insert.
	 */
	private async tryAcquireWebhookEvent(
		eventId: string,
		eventType: string,
	): Promise<boolean> {
		try {
			await this.prisma.processedWebhookEvent.create({
				data: { eventId, eventType },
			});
			return true;
		} catch (err) {
			// Unique-constraint violation on eventId — duplicate.
			const code = (err as { code?: string }).code;
			if (code === "P2002") return false;
			throw err;
		}
	}

	private async handleCheckoutSessionCompleted(
		session: Record<string, unknown>,
	) {
		const customerId = session.customer as string;
		const subscriptionId = session.subscription as string;

		this.logger.log(
			`Checkout completed: customer=${customerId}, subscription=${subscriptionId}`,
		);

		// Prefer lookup by stripeCustomerId; fall back to the customer
		// metadata's userId if the local row's customer id is stale.
		let subscription = await this.prisma.subscription.findFirst({
			where: { stripeCustomerId: customerId },
		});

		if (!subscription) {
			try {
				const customer = await this.stripe.customers.retrieve(customerId);
				if (!customer.deleted) {
					const userId = customer.metadata?.userId;
					if (userId) {
						subscription = await this.prisma.subscription.findUnique({
							where: { userId },
						});
					}
				}
			} catch (err) {
				this.logger.warn(
					`Failed to fetch Stripe customer ${customerId} for fallback lookup: ${(err as Error).message}`,
				);
			}
		}

		if (!subscription) {
			this.logger.warn(
				`No subscription found for Stripe customer ${customerId} — checkout session ignored`,
			);
			return;
		}

		const stripeSubscription =
			await this.stripe.subscriptions.retrieve(subscriptionId);
		const priceId = stripeSubscription.items.data[0]?.price.id;

		const plan = await this.getPlanFromPriceId(priceId);

		const periodStart = new Date(stripeSubscription.start_date * 1000);
		const periodEnd = this.derivePeriodEnd(stripeSubscription);

		await this.prisma.subscription.update({
			where: { id: subscription.id },
			data: {
				plan: plan as SubscriptionPlan,
				status: "active",
				stripeSubscriptionId: subscriptionId,
				stripePriceId: priceId,
				monthlyCreditLimit: await this.getCreditLimitForPlan(plan),
				currentPeriodStart: periodStart,
				currentPeriodEnd: periodEnd,
				cancelAt: null,
			},
		});

		this.logger.log(`Subscription updated to ${plan} via checkout`);
	}

	private async handleSubscriptionUpdated(
		stripeSubscriptionData: Record<string, unknown>,
	) {
		const subscriptionId = stripeSubscriptionData.id as string;

		this.logger.log(`Subscription updated: ${subscriptionId}`);

		const subscription = await this.prisma.subscription.findFirst({
			where: { stripeSubscriptionId: subscriptionId },
		});

		if (!subscription) {
			this.logger.warn(
				`No subscription found for Stripe subscription ${subscriptionId} — update ignored`,
			);
			return;
		}

		const stripeSubscription =
			await this.stripe.subscriptions.retrieve(subscriptionId);
		const priceId = stripeSubscription.items.data[0]?.price.id;
		const plan = await this.getPlanFromPriceId(priceId);

		const periodStart = new Date(stripeSubscription.start_date * 1000);
		const periodEnd = this.derivePeriodEnd(stripeSubscription);
		const cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end === true;

		await this.prisma.subscription.update({
			where: { id: subscription.id },
			data: {
				plan: plan as SubscriptionPlan,
				status:
					stripeSubscription.status === "active"
						? "active"
						: stripeSubscription.status,
				stripePriceId: priceId,
				monthlyCreditLimit: await this.getCreditLimitForPlan(plan),
				currentPeriodStart: periodStart,
				currentPeriodEnd: periodEnd,
				cancelAt: cancelAtPeriodEnd ? periodEnd : null,
			},
		});

		if (cancelAtPeriodEnd) {
			this.logger.log(
				`Subscription scheduled for cancellation at period end: ${subscriptionId}`,
			);
		}
	}

	private async handleSubscriptionDeleted(
		stripeSubscriptionData: Record<string, unknown>,
	) {
		const subscriptionId = stripeSubscriptionData.id as string;

		this.logger.log(`Subscription deleted: ${subscriptionId}`);

		const subscription = await this.prisma.subscription.findFirst({
			where: { stripeSubscriptionId: subscriptionId },
		});

		if (!subscription) {
			this.logger.warn(
				`No subscription found for Stripe subscription ${subscriptionId} — delete ignored`,
			);
			return;
		}

		const now = new Date();
		const newPeriodEnd = new Date(now);
		newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

		await this.prisma.subscription.update({
			where: { id: subscription.id },
			data: {
				plan: SubscriptionPlan.FREE,
				status: "canceled",
				stripeSubscriptionId: null,
				stripePriceId: null,
				monthlyCreditLimit: await this.getOrSeedPlanDefinition(SubscriptionPlan.FREE),
				cancelAt: null,
				creditsUsed: 0,
				currentPeriodStart: now,
				currentPeriodEnd: newPeriodEnd,
			},
		});
	}

	private async handleInvoicePaymentSucceeded(
		invoice: Record<string, unknown>,
		eventId: string,
	) {
		const customerId = invoice.customer as string;
		const rawSubscriptionId =
			(invoice.subscription ??
			(invoice as Record<string, unknown>).subscription_details)
				? ((invoice as Record<string, Record<string, unknown>>)
						.subscription_details?.subscription as string | undefined)
				: undefined;
		const subscriptionId =
			typeof rawSubscriptionId === "string" ? rawSubscriptionId : undefined;

		this.logger.log(
			`Invoice payment succeeded: customer=${customerId}, subscription=${subscriptionId}`,
		);

		const subscription = await this.prisma.subscription.findFirst({
			where: { stripeCustomerId: customerId },
		});

		if (!subscription) {
			this.logger.warn(
				`No subscription found for Stripe customer ${customerId} — invoice ignored`,
			);
			return;
		}

		if (subscription.lastProcessedInvoiceId === eventId) {
			this.logger.log("Duplicate invoice.payment_succeeded event, skipping");
			return;
		}

		const periodStart = this.parseStripeDate(
			invoice.period_start as number | string,
		);
		const periodEnd = this.parseStripeDate(
			invoice.period_end as number | string,
		);

		if (subscriptionId) {
			await this.prisma.subscription.update({
				where: { id: subscription.id },
				data: {
					stripeSubscriptionId: subscriptionId,
					creditsUsed: 0,
					currentPeriodStart: periodStart,
					currentPeriodEnd: periodEnd,
					lastProcessedInvoiceId: eventId,
				},
			});
		} else {
			await this.prisma.subscription.update({
				where: { id: subscription.id },
				data: {
					creditsUsed: 0,
					currentPeriodStart: periodStart,
					currentPeriodEnd: periodEnd,
					lastProcessedInvoiceId: eventId,
				},
			});
		}

		this.logger.log(`Invoice processed: credits reset, period updated`);
	}

	async ensureSubscription(
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
				monthlyCreditLimit: await this.getOrSeedPlanDefinition(
					SubscriptionPlan.FREE,
					client,
				),
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

	private async getPlanFromPriceId(
		priceId: string | undefined,
	): Promise<string> {
		if (!priceId) return "FREE";
		const plans = await this.getPlans();
		const match = plans.find((p) => p.price_id === priceId);
		return match?.plan ?? "FREE";
	}

	private async getPriceIdForPlan(plan: string): Promise<string | undefined> {
		const plans = await this.getPlans();
		const match = plans.find((p) => p.plan === plan);
		return match?.price_id;
	}

	async getCreditLimitForPlan(plan: string): Promise<number> {
		return this.getOrSeedPlanDefinition(plan as SubscriptionPlan);
	}

	private async getOrSeedPlanDefinition(
		plan: SubscriptionPlan,
		client: Prisma.TransactionClient | PrismaService = this.prisma,
	): Promise<number> {
		const existing = await client.planDefinition.findUnique({
			where: { plan },
		});
		if (existing) {
			return existing.monthlyCreditLimit;
		}
		this.logger.warn(
			`PlanDefinition row for ${plan} was missing — auto-seeding with default 1000 credits. ` +
				`If this is unexpected, verify the migration 'add_plan_definition' has run.`,
		);
		const seeded = await client.planDefinition.upsert({
			where: { plan },
			update: {},
			create: { plan, monthlyCreditLimit: 1000 },
		});
		return seeded.monthlyCreditLimit;
	}

	/**
	 * Parse Stripe date fields which may be Unix timestamps (number)
	 * or ISO 8601 strings (newer API versions).
	 */
	private parseStripeDate(value: number | string): Date {
		if (typeof value === "number") {
			return new Date(value * 1000);
		}
		return new Date(value);
	}

	private derivePeriodEnd(stripeSubscription: Record<string, unknown>): Date {
		const price = (
			stripeSubscription.items as Record<
				string,
				{ data: Array<{ price: Record<string, unknown> }> }
			>
		)?.data?.[0]?.price;
		const interval = price?.recurring?.interval as string | undefined;
		const startDate = new Date(
			(stripeSubscription.start_date as number) * 1000,
		);
		const periodEnd = new Date(startDate);
		if (interval === "year") {
			periodEnd.setFullYear(periodEnd.getFullYear() + 1);
		} else {
			periodEnd.setMonth(periodEnd.getMonth() + 1);
		}
		return periodEnd;
	}
}
