// node-zerosmtp.mjs
/**
 * Node.js 22+ nodemailer 9.x - ZeroSMTP mx.msgwing.com:465 SSL/TLS
 * Production-ready | Let's Encrypt | ESM async/await
 */

import nodemailer from 'nodemailer';

// NOTE: variable names are prefixed with ZEROSMTP_ to avoid colliding with
// reserved/OS-level variables (e.g. USERNAME is auto-set on Windows).
// Fail-fast: missing env vars exit with a clear error instead of silently
// using placeholder credentials that could leak into production.
const requiredVars = ['ZEROSMTP_USERNAME', 'ZEROSMTP_PASSWORD', 'ZEROSMTP_FROM', 'ZEROSMTP_TO'];
const missing = requiredVars.filter((v) => !process.env[v]);
if (missing.length > 0) {
  console.error(`ERROR: missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}
const config = {
  username: process.env.ZEROSMTP_USERNAME,
  password: process.env.ZEROSMTP_PASSWORD,
  from: process.env.ZEROSMTP_FROM,
  to: process.env.ZEROSMTP_TO,
  subject: process.env.ZEROSMTP_SUBJECT || 'Test Email from ZeroSMTP',
};

async function sendEmailViaZeroSMTP() {
  const transporter = nodemailer.createTransport({
    host: 'mx.msgwing.com',
    port: 465,
    secure: true,
    auth: {
      user: config.username,
      pass: config.password,
    },
    tls: {
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2',
    },
  });

  const htmlBody = `<html><body><h1>Hello from ZeroSMTP!</h1><p>This is an HTML email sent via mx.msgwing.com:465</p></body></html>`;
  const textBody = 'Hello from ZeroSMTP! This is plain text.';

  try {
    const info = await transporter.sendMail({
      from: config.from,
      to: config.to,
      subject: config.subject,
      text: textBody,
      html: htmlBody,
    });
    console.log('Email sent:', info.messageId);
    return true;
  } catch (error) {
    if (error.code === 'EAUTH') {
      console.error('Authentication failed:', error.message);
    } else if (error.code === 'EHOSTUNREACH') {
      console.error('Host unreachable:', error.message);
    } else if (error.message.includes('certificate')) {
      console.error('Certificate verification failed:', error.message);
    } else {
      console.error('Email sending failed:', error.message);
    }
    return false;
  }
}

process.exit(await sendEmailViaZeroSMTP() ? 0 : 1);
