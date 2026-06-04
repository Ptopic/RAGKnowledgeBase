import { Process, Processor } from "@nestjs/bull";
import { forwardRef, Inject, Logger } from "@nestjs/common";
import { Job } from "bull";
import { calculateCreditCost } from "src/subscription/credit-cost";
import { SubscriptionService } from "src/subscription/subscription.service";
import { QUEUE_NAMES } from "../queue.config";

export interface CreditDeductionJob {
	userId: string;
	searchSpaceId: number;
	operationType: string;
	tokensIn?: number;
	tokensOut?: number;
	modelName?: string | null;
}

/**
 * Processes durable credit deduction jobs.
 *
 * The HTTP handler enqueues a job after the streaming response has been
 * sent, so a process crash between response-sent and DB-write no longer
 * loses the deduction. The job is retried with exponential backoff.
 */
@Processor(QUEUE_NAMES.CREDIT_DEDUCTIONS)
export class CreditDeductionsProcessor {
	private readonly logger = new Logger(CreditDeductionsProcessor.name);

	constructor(
		@Inject(forwardRef(() => SubscriptionService))
		private readonly subscriptionService: SubscriptionService,
	) {}

	@Process("deduct-credits")
	async handle(job: Job<CreditDeductionJob>): Promise<void> {
		const { userId, searchSpaceId, operationType, tokensIn, tokensOut, modelName } =
			job.data;

		// Defense-in-depth: re-check the superuser bypass at process
		// time. A user promoted between enqueue and run must not be
		// billed.
		if (await this.subscriptionService.isSuperuserBypass(userId)) {
			this.logger.debug(
				`Skipping deduction — user ${userId} is a superuser`,
			);
			return;
		}

		const cost = calculateCreditCost(
			modelName ?? null,
			tokensIn ?? 0,
			tokensOut ?? 0,
		);
		if (cost <= 0) {
			this.logger.debug(
				`Skipping zero-cost deduction for user ${userId} (${operationType})`,
			);
			return;
		}

		try {
			await this.subscriptionService.deductCredits(userId, cost, {
				searchSpaceId,
				operationType,
				tokensIn,
				tokensOut,
				modelUsed: modelName ?? undefined,
			});
		} catch (err) {
			this.logger.error(
				`Credit deduction failed for user ${userId} ` +
					`(${operationType}, cost=${cost}, attempt=${job.attemptsMade + 1}): ` +
					`${(err as Error).message}`,
				(err as Error).stack,
			);
			throw err;
		}
	}
}
