#!/usr/bin/env python3
"""
python-zerosmtp.py
Python 3.13+ smtplib.SMTP_SSL - ZeroSMTP mx.msgwing.com:465 SSL/TLS
Production-ready | Let's Encrypt | match/case error handling
"""

import os
import ssl
from email.message import EmailMessage
from smtplib import SMTP_SSL, SMTPException, SMTPAuthenticationError
from contextlib import contextmanager
from typing import Generator


@contextmanager
def zerosmtp_connection(
    username: str,
    password: str,
) -> Generator[SMTP_SSL, None, None]:
    """Context manager for ZeroSMTP SMTP_SSL connection."""
    context = ssl.create_default_context()
    smtp = SMTP_SSL('mx.msgwing.com', 465, context=context, timeout=10)
    try:
        smtp.login(username, password)
        yield smtp
    finally:
        smtp.quit()


def send_email_via_zerosmtp(
    username: str,
    password: str,
    from_addr: str,
    to_addr: str,
    subject: str,
) -> bool:
    """Send HTML+plain email via ZeroSMTP."""
    try:
        with zerosmtp_connection(username, password) as smtp:
            message = EmailMessage()
            message['Subject'] = subject
            message['From'] = from_addr
            message['To'] = to_addr
            message.set_content('Hello from ZeroSMTP! This is plain text.')
            message.add_alternative(
                '<html><body><h1>Hello from ZeroSMTP!</h1>'
                '<p>This is an HTML email sent via mx.msgwing.com:465</p></body></html>',
                subtype='html',
            )
            smtp.send_message(message)
            return True
    except SMTPAuthenticationError as e:
        print(f'Authentication failed: {e}', flush=True)
        return False
    except SMTPException as e:
        match type(e).__name__:
            case 'SMTPServerDisconnected':
                print(f'Server disconnected: {e}', flush=True)
            case 'SMTPNotSupportedError':
                print(f'SMTP feature not supported: {e}', flush=True)
            case _:
                print(f'SMTP error: {e}', flush=True)
        return False
    except Exception as e:
        print(f'Unexpected error: {type(e).__name__}: {e}', flush=True)
        return False


if __name__ == '__main__':
    # NOTE: variable names are prefixed with ZEROSMTP_ to avoid colliding with
    # reserved/OS-level variables (e.g. USERNAME is auto-set on Windows).
    # Fail-fast: missing env vars raise SystemExit instead of silently using
    # placeholder credentials that could leak into production.
    required_vars = ['ZEROSMTP_USERNAME', 'ZEROSMTP_PASSWORD',
                     'ZEROSMTP_FROM', 'ZEROSMTP_TO']
    missing = [v for v in required_vars if not os.getenv(v)]
    if missing:
        raise SystemExit(
            f'ERROR: missing required environment variables: {", ".join(missing)}'
        )
    config = {
        'username': os.environ['ZEROSMTP_USERNAME'],
        'password': os.environ['ZEROSMTP_PASSWORD'],
        'from_addr': os.environ['ZEROSMTP_FROM'],
        'to_addr': os.environ['ZEROSMTP_TO'],
        'subject': os.getenv('ZEROSMTP_SUBJECT', 'Test Email from ZeroSMTP'),
    }
    success = send_email_via_zerosmtp(**config)
    exit(0 if success else 1)
