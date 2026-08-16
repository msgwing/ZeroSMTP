// ts-zerosmtp.ts
/**
 * TypeScript 7.x nodemailer 9.x - ZeroSMTP mx.msgwing.com:465 SSL/TLS
 * Production-ready | Let's Encrypt | Branded types, satisfies operator
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

// Branded types for type safety
type Username = string & { readonly __brand: 'Username' };
type Password = string & { readonly __brand: 'Password' };
type EmailAddress = string & { readonly __brand: 'EmailAddress' };

const createUsername = (u: string): Username => u as Username;
const createPassword = (p: string): Password => p as Password;
const createEmailAddress = (e: string): EmailAddress => e as EmailAddress;

interface ZeroSMTPConfig {
  username: Username;
  password: Password;
  from: EmailAddress;
  to: EmailAddress;
  subject: string;
}

// NOTE: variable names are prefixed with ZEROSMTP_ to avoid colliding with
// reserved/OS-level variables (e.g. USERNAME is auto-set on Windows).
// Fail-fast: missing env vars exit with a clear error instead of silently
// using placeholder credentials that could leak into production.
const requiredVars = ['ZEROSMTP_USERNAME', 'ZEROSMTP_PASSWORD', 'ZEROSMTP_FROM', 'ZEROSMTP_TO'] as const;
const missing = requiredVars.filter((v) => !process.env[v]);
if (missing.length > 0) {
  console.error(`ERROR: missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}
const config = {
  username: createUsername(process.env.ZEROSMTP_USERNAME!),
  password: createPassword(process.env.ZEROSMTP_PASSWORD!),
  from: createEmailAddress(process.env.ZEROSMTP_FROM!),
  to: createEmailAddress(process.env.ZEROSMTP_TO!),
  subject: process.env.ZEROSMTP_SUBJECT || 'Test Email from ZeroSMTP',
} satisfies ZeroSMTPConfig;

async function sendEmailViaZeroSMTP(cfg: ZeroSMTPConfig): Promise<boolean> {
  const transporter: Transporter = nodemailer.createTransport({
    host: 'mx.msgwing.com',
    port: 465,
    secure: true,
    auth: {
      user: cfg.username,
      pass: cfg.password,
    },
    tls: {
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2',
    },
  });

  const htmlBody: string = `<html><body><h1>Hello from ZeroSMTP!</h1><p>This is an HTML email sent via mx.msgwing.com:465</p></body></html>`;
  const textBody: string = 'Hello from ZeroSMTP! This is plain text.';

  try {
    const info = await transporter.sendMail({
      from: cfg.from,
      to: cfg.to,
      subject: cfg.subject,
      text: textBody,
      html: htmlBody,
    });
    console.log('Email sent:', info.messageId);
    return true;
  } catch (error) {
    const err = error as Error & { code?: string };
    if (err.code === 'EAUTH') {
      console.error('Authentication failed:', err.message);
    } else if (err.code === 'EHOSTUNREACH') {
      console.error('Host unreachable:', err.message);
    } else {
      console.error('Email sending failed:', err.message);
    }
    return false;
  }
}

process.exit(await sendEmailViaZeroSMTP(config) ? 0 : 1);
