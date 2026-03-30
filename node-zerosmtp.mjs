// node-zerosmtp.mjs
/**
 * Node.js 22+ nodemailer 6.9.15 - ZeroSMTP mx.msgwing.com:465 SSL/TLS
 * Production-ready | Let's Encrypt | ESM async/await
 */

import nodemailer from 'nodemailer';

const config = {
  username: process.env.USERNAME || 'your-username',
  password: process.env.PASSWORD || 'your-password',
  from: process.env.FROM || 'sender@example.com',
  to: process.env.TO || 'recipient@example.com',
  subject: process.env.SUBJECT || 'Test Email from ZeroSMTP',
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
