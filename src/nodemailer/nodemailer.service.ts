import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transporter, createTransport } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { Env } from 'src/env';

interface SendMail {
	body: string;
	mailSender: string;
	mailReceiver: string;
	subject: string;
}

@Injectable()
export class NodemailerService {
	transport: Transporter<SMTPTransport.SentMessageInfo>;

	constructor(private configService: ConfigService<Env, true>) {
		const smtpHost = this.configService.get('SMTP_HOST', {
			infer: true,
		});
		const smtpUser = this.configService.get('SMTP_USER', {
			infer: true,
		});
		const smtpPass = this.configService.get('SMTP_PASS', {
			infer: true,
		});

		this.transport = createTransport({
			host: smtpHost,
			secure: true,
			auth: {
				user: smtpUser,
				pass: smtpPass,
			},
		});
	}

	async sendMail({ body, subject, mailSender, mailReceiver }: SendMail) {
		await this.transport.sendMail({
			from: mailSender,
			to: mailReceiver,
			subject,
			html: body,
		});
	}
}
