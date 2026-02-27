import type { BaseCheckpointSaver } from "@langchain/langgraph";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import {
	Injectable,
	Logger,
	OnModuleDestroy,
	OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "src/config/config.service";

@Injectable()
export class CheckpointerService implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(CheckpointerService.name);
	private checkpointer: PostgresSaver | null = null;
	private isInitialized = false;

	constructor(private readonly configService: ConfigService) {}

	async onModuleInit() {
		try {
			const connectionString = this.getPostgresConnectionString();
			this.logger.log("Initializing PostgreSQL checkpointer...");

			this.checkpointer = await PostgresSaver.fromConnString(connectionString);
			await this.checkpointer.setup();
			this.isInitialized = true;
			this.logger.log("PostgreSQL checkpointer initialized successfully");
		} catch (error) {
			this.logger.error(`Failed to initialize checkpointer: ${error}`);
			throw error;
		}
	}

	async onModuleDestroy() {
		this.checkpointer = null;
		this.isInitialized = false;
		this.logger.log("PostgreSQL checkpointer connection closed");
	}

	getCheckpointer(): BaseCheckpointSaver {
		if (!this.checkpointer || !this.isInitialized) {
			throw new Error(
				"Checkpointer not initialized. Wait for module to initialize.",
			);
		}
		return this.checkpointer;
	}

	isReady(): boolean {
		return this.isInitialized && this.checkpointer !== null;
	}

	private getPostgresConnectionString(): string {
		const dbUrl = this.configService.database.url;

		if (dbUrl.startsWith("postgresql://")) {
			return dbUrl;
		}

		if (dbUrl.startsWith("postgresql+asyncpg://")) {
			return dbUrl.replace("postgresql+asyncpg://", "postgresql://");
		}

		if (dbUrl.includes("+asyncpg")) {
			return dbUrl.replace("+asyncpg", "");
		}

		return dbUrl;
	}
}
