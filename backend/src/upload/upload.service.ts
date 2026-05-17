import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
	Injectable,
	InternalServerErrorException,
	Logger,
} from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";

export interface UploadResult {
	url: string;
}

@Injectable()
export class UploadService {
	private readonly logger = new Logger(UploadService.name);
	private readonly provider: "local" | "s3";
	private readonly s3Client: S3Client | null = null;
	private readonly s3Bucket: string;
	private readonly s3PublicUrlPrefix: string;

	constructor() {
		const rawProvider = process.env.UPLOAD_PROVIDER || "local";
		this.provider = rawProvider === "s3" ? "s3" : "local";

		if (this.provider === "s3") {
			const region = process.env.AWS_REGION || "us-east-1";
			const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
			const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
			this.s3Bucket = process.env.S3_BUCKET_NAME || "";
			this.s3PublicUrlPrefix =
				process.env.S3_PUBLIC_URL_PREFIX ||
				`https://${this.s3Bucket}.s3.${region}.amazonaws.com`;

			if (!accessKeyId || !secretAccessKey || !this.s3Bucket) {
				throw new Error(
					"UPLOAD_PROVIDER=s3 but AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, or S3_BUCKET_NAME is missing",
				);
			}

			this.s3Client = new S3Client({
				region,
				credentials: { accessKeyId, secretAccessKey },
			});
		}
	}

	async upload(buffer: Buffer, filename: string, subDir: string): Promise<UploadResult> {
		if (this.provider === "s3") {
			return this.uploadToS3(buffer, filename, subDir);
		}
		return this.uploadToLocalDisk(buffer, filename, subDir);
	}

	private async uploadToLocalDisk(
		buffer: Buffer,
		filename: string,
		subDir: string,
	): Promise<UploadResult> {
		const uploadsDir = path.join(process.cwd(), "uploads", subDir);
		if (!fs.existsSync(uploadsDir)) {
			fs.mkdirSync(uploadsDir, { recursive: true });
		}
		const filePath = path.join(uploadsDir, filename);
		fs.writeFileSync(filePath, buffer);
		const url = `/uploads/${subDir}/${filename}`;
		return { url };
	}

	private async uploadToS3(
		buffer: Buffer,
		filename: string,
		subDir: string,
	): Promise<UploadResult> {
		const key = `${subDir}/${filename}`;
		try {
			await this.s3Client!.send(
				new PutObjectCommand({
					Bucket: this.s3Bucket,
					Key: key,
					Body: buffer,
				}),
			);
			const url = `${this.s3PublicUrlPrefix.replace(/\/$/, "")}/${key}`;
			return { url };
		} catch (error) {
			this.logger.error(`S3 upload failed for key ${key}: ${error.message}`);
			throw new InternalServerErrorException(
				`File upload failed: ${error.message}`,
			);
		}
	}
}
