#!/bin/bash
# bash-curl-zerosmtp.sh
# Bash curl 8.10+ - ZeroSMTP mx.msgwing.com:465 SSL/TLS
# Production-ready | Let's Encrypt | POSIX heredoc

set -euo pipefail

error_exit() {
  printf 'ERROR: %s\n' "$1" >&2
  exit 1
}

trap 'error_exit "Script interrupted"' INT TERM

# Configuration from environment variables
USERNAME="${USERNAME:-your-username}"
PASSWORD="${PASSWORD:-your-password}"
FROM="${FROM:-sender@example.com}"
TO="${TO:-recipient@example.com}"
SUBJECT="${SUBJECT:-Test Email from ZeroSMTP}"

# Validate inputs
[[ -z "$USERNAME" ]] && error_exit "USERNAME not set"
[[ -z "$PASSWORD" ]] && error_exit "PASSWORD not set"
[[ -z "$FROM" ]] && error_exit "FROM not set"
[[ -z "$TO" ]] && error_exit "TO not set"

# Build email body
EMAIL_BODY="From: $FROM\r\nTo: $TO\r\nSubject: $SUBJECT\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\nHello from ZeroSMTP! This is plain text sent via mx.msgwing.com:465"

# Send via curl with system CA verification
if curl \
  --url "smtps://mx.msgwing.com:465" \
  --user "$USERNAME:$PASSWORD" \
  --mail-from "$FROM" \
  --mail-rcpt "$TO" \
  --upload-file <(printf '%b' "$EMAIL_BODY") \
  --ssl-reqd \
  --tlsv1.2 \
  --cacert /etc/ssl/certs/ca-certificates.crt \
  --connect-timeout 10 \
  --max-time 30 \
  --silent \
  --show-error; then
  printf 'Email sent successfully via ZeroSMTP\n'
  exit 0
else
  error_exit "Failed to send email via ZeroSMTP"
fi
