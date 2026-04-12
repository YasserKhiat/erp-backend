import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';

export interface MailPayload {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly mode: 'log' | 'smtp';
  private readonly fromAddress: string;
  private readonly transporter?: Transporter;

  constructor(private readonly configService: ConfigService) {
    this.mode = (this.configService.get<string>('MAIL_MODE', 'log') === 'smtp')
      ? 'smtp'
      : 'log';
    this.fromAddress = this.configService.get<string>('MAIL_FROM', 'no-reply@erp.local');

    if (this.mode === 'smtp') {
      const host = this.configService.get<string>('SMTP_HOST');
      const port = Number(this.configService.get<string>('SMTP_PORT', '587'));
      const user = this.configService.get<string>('SMTP_USER');
      const pass = this.configService.get<string>('SMTP_PASS');
      const secure = this.configService.get<string>('SMTP_SECURE', 'false') === 'true';

      if (!host || !user || !pass) {
        this.logger.warn('SMTP mode selected but SMTP_HOST/SMTP_USER/SMTP_PASS are missing. Falling back to log mode.');
        this.mode = 'log';
        return;
      }

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass,
        },
      });
    }
  }

  async sendMail(payload: MailPayload) {
    if (this.mode === 'log' || !this.transporter) {
      this.logger.log(`[MAIL-LOG] to=${payload.to} subject=${payload.subject}`);
      this.logger.debug(payload.text);
      return { mode: 'log' as const };
    }

    await this.transporter.sendMail({
      from: this.fromAddress,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });

    return { mode: 'smtp' as const };
  }
}
