import { Injectable, Logger } from "@nestjs/common";
import { Resend } from "resend";

@Injectable()
export class MailService {
	private readonly logger = new Logger(MailService.name);
	private readonly resend: Resend | null = null;
	private readonly fromEmail: string;
	private readonly frontendUrl: string;
	private readonly isEnabled: boolean;

	constructor() {
		const apiKey = process.env.RESEND_API_KEY;
		this.fromEmail = process.env.RESEND_FROM_EMAIL ?? "noreply@example.com";
		this.frontendUrl = process.env.NEXT_FRONTEND_URL ?? "http://localhost:3000";
		this.isEnabled = !!apiKey;

		if (this.isEnabled) {
			this.resend = new Resend(apiKey);
		} else {
			this.logger.warn(
				"RESEND_API_KEY not configured. Emails will be logged but not sent.",
			);
		}
	}

	async sendPasswordResetEmail(to: string, token: string): Promise<void> {
		const resetUrl = `${this.frontendUrl}/auth/reset-password?token=${token}`;

		if (!this.isEnabled) {
			this.logger.log(`[MOCK EMAIL] Password reset for ${to}: ${resetUrl}`);
			return;
		}

		try {
			await this.resend?.emails.send({
				from: this.fromEmail,
				to,
				subject: "Reset your password",
				html: this.buildPasswordResetHtml(resetUrl),
			});

			this.logger.log(`Password reset email sent to ${to}`);
		} catch (error) {
			this.logger.error("Failed to send password reset email:", error);
			throw error;
		}
	}

	private buildPasswordResetHtml(resetUrl: string): string {
		return `
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="utf-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Reset Your Password</title>
		</head>
		<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#f5f5f5;">
			<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 0;">
				<tr>
					<td align="center">
						<table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
							<tr>
								<td style="padding:40px 32px 24px;">
									<h1 style="margin:0;font-size:22px;font-weight:600;color:#111827;">Reset your password</h1>
									<p style="margin:12px 0 0;font-size:15px;line-height:1.6;color:#4b5563;">
										You requested to reset your password. Click the button below to set a new one. This link will expire in 1 hour.
									</p>
								</td>
							</tr>
							<tr>
								<td style="padding:0 32px 32px;">
									<a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background-color:#111827;color:#ffffff;text-decoration:none;border-radius:6px;font-size:15px;font-weight:500;">Reset Password</a>
								</td>
							</tr>
							<tr>
								<td style="padding:0 32px 40px;">
									<p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5;">
										If the button does not work, copy and paste this link into your browser:<br>
										<a href="${resetUrl}" style="color:#3b82f6;word-break:break-all;">${resetUrl}</a>
									</p>
									<p style="margin:16px 0 0;font-size:13px;color:#9ca3af;">
										If you did not request this, you can safely ignore this email.
									</p>
								</td>
							</tr>
						</table>
					</td>
				</tr>
			</table>
		</body>
		</html>
		`;
	}
}