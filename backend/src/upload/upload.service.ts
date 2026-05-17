import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
	Injectable,
	InternalServerErrorException,
	Logger,
} from "@nestjs/common";

export interface UploadResult {
	url: string;
}

@Injectable()
export class UploadService {
	private readonly logger = new Logger(UploadService.name);
	private readonly s3Client: S3Client;
	private readonly s3Bucket: string;
	private readonly s3PublicUrlPrefix: string;

	constructor() {
		const region = process.env.AWS_REGION || "us-east-1";
		const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
		const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
		this.s3Bucket = process.env.S3_BUCKET_NAME || "";
		this.s3PublicUrlPrefix =
			process.env.S3_PUBLIC_URL_PREFIX ||
			`https://${this.s3Bucket}.s3.${region}.amazonaws.com`;

		if (!accessKeyId || !secretAccessKey || !this.s3Bucket) {
			throw new Error(
				"AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and S3_BUCKET_NAME are required",
			);
		}

		this.s3Client = new S3Client({
			region,
			credentials: { accessKeyId, secretAccessKey },
		});
	}

	async upload(buffer: Buffer, filename: string, subDir: string, mimetype?: string): Promise<UploadResult> {
		const key = `${subDir}/${filename}`;
		try {
			await this.s3Client.send(
				new PutObjectCommand({
					Bucket: this.s3Bucket,
					Key: key,
					Body: buffer,
					ContentType: mimetype,
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
