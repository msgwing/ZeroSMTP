#!/bin/bash
# setup-postfix-relay.sh
# Turnkey Postfix satellite/smarthost setup for mx.msgwing.com, Debian/Ubuntu.
# Installs Postfix, points it at ZeroSMTP, and rewrites the envelope/From
# sender so mail doesn't bounce with "not owned by user" - the two steps
# docs/SYSTEM-MTA.md documents as separate manual sections, done together
# here. Needs only a ZeroSMTP username and password; everything else is
# derived or has a documented default. Run with sudo. Safe to re-run.
#
# Usage:
#   sudo ./setup-postfix-relay.sh
#   sudo ZEROSMTP_USERNAME=you@msgwing.com ZEROSMTP_PASSWORD=secret ./setup-postfix-relay.sh
#
# The password is never taken as a command-line argument (it would sit in
# shell history and `ps`) - pass it via the environment variable above for
# unattended runs, or let the script prompt for it.

set -euo pipefail

error_exit() {
  printf 'ERROR: %s\n' "$1" >&2
  exit 1
}

trap 'error_exit "Script interrupted"' INT TERM

[[ $EUID -eq 0 ]] || error_exit "Run this with sudo - it installs packages and writes to /etc/postfix."

[[ -r /etc/os-release ]] || error_exit "Cannot read /etc/os-release - this script targets Debian/Ubuntu only."
# shellcheck disable=SC1091
. /etc/os-release
case "${ID:-}:${ID_LIKE:-}" in
  debian:*|ubuntu:*|*:*debian*) ;;
  *) error_exit "Detected ID='${ID:-unknown}', not Debian or Ubuntu. See docs/SYSTEM-MTA.md for other systems." ;;
esac

ZEROSMTP_PORT="${ZEROSMTP_PORT:-587}"
case "$ZEROSMTP_PORT" in
  587|465) ;;
  *) error_exit "ZEROSMTP_PORT must be 587 (STARTTLS) or 465 (implicit TLS), got '$ZEROSMTP_PORT'." ;;
esac

USERNAME="${ZEROSMTP_USERNAME:-}"
if [[ -z "$USERNAME" ]]; then
  read -r -p "ZeroSMTP username (your-name@msgwing.com): " USERNAME
fi
[[ -z "$USERNAME" ]] && error_exit "No username given."
[[ "$USERNAME" == *@msgwing.com ]] || error_exit "Username should be the full address issued at msgwing.com (e.g. you@msgwing.com), got '$USERNAME'."

PASSWORD="${ZEROSMTP_PASSWORD:-}"
if [[ -z "$PASSWORD" ]]; then
  read -r -s -p "ZeroSMTP password: " PASSWORD
  echo
fi
[[ -z "$PASSWORD" ]] && error_exit "No password given."

echo "== Installing Postfix =="
# DEBIAN_FRONTEND=noninteractive alone still leaves postfix's own package
# with no chosen "general type" the first time it installs, which can stall
# the install waiting on a debconf prompt. Preseeding both questions before
# apt runs is what actually makes this non-interactive.
debconf-set-selections <<EOF
postfix postfix/main_mailer_type select Satellite system
postfix postfix/mailname string $(hostname -f 2>/dev/null || hostname)
postfix postfix/relayhost string [mx.msgwing.com]:$ZEROSMTP_PORT
EOF
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq postfix mailutils libsasl2-modules

echo "== Configuring relay ($USERNAME via mx.msgwing.com:$ZEROSMTP_PORT) =="
DB_TYPE="$(postconf -h default_database_type)"

printf '[mx.msgwing.com]:%s %s:%s\n' "$ZEROSMTP_PORT" "$USERNAME" "$PASSWORD" \
  > /etc/postfix/sasl_passwd
chmod 600 /etc/postfix/sasl_passwd
postmap /etc/postfix/sasl_passwd

# Envelope sender and the visible From: header are separate things, and the
# relay only checks the first one - both maps exist so mail from any local
# user (root, cron, the invoking user) leaves as the ZeroSMTP account
# instead of bouncing with "553 5.7.1 ... not owned by user".
printf '/.+/    %s\n' "$USERNAME" > /etc/postfix/sender_canonical
postmap /etc/postfix/sender_canonical
printf '/^From:.*/  REPLACE From: %s\n' "$USERNAME" > /etc/postfix/header_from
# header_from is deliberately not run through postmap - regexp:/pcre: tables
# are read as plain text and have no .db to build.

postconf -e "relayhost = [mx.msgwing.com]:$ZEROSMTP_PORT"
postconf -e "smtp_sasl_auth_enable = yes"
postconf -e "smtp_sasl_password_maps = ${DB_TYPE}:/etc/postfix/sasl_passwd"
postconf -e "smtp_sasl_security_options = noanonymous"
postconf -e "smtp_tls_security_level = encrypt"
postconf -e "smtp_tls_CAfile = /etc/ssl/certs/ca-certificates.crt"
postconf -e "sender_canonical_classes = envelope_sender, header_sender"
postconf -e "sender_canonical_maps = regexp:/etc/postfix/sender_canonical"
postconf -e "smtp_header_checks = regexp:/etc/postfix/header_from"

if [[ "$ZEROSMTP_PORT" == "465" ]]; then
  postconf -e "smtp_tls_wrappermode = yes"
else
  postconf -e "smtp_tls_wrappermode = no"
fi

echo "== Restarting Postfix =="
systemctl restart postfix

echo "== Sending a test message =="
read -r -p "Address to send a test email to (blank to skip): " TEST_TO
if [[ -n "$TEST_TO" ]]; then
  echo "Test from setup-postfix-relay.sh" | mail -s "ZeroSMTP relay test" "$TEST_TO"
  sleep 2
  LAST_SENDER="$(grep 'from=<' /var/log/mail.log 2>/dev/null | tail -1 || true)"
  echo "$LAST_SENDER"
  if [[ "$LAST_SENDER" == *"from=<$USERNAME>"* ]]; then
    echo "Sender rewrite confirmed: mail is leaving as $USERNAME."
  else
    echo "Could not confirm the rewrite from /var/log/mail.log yet - check it manually:"
    echo "  grep 'from=<' /var/log/mail.log | tail -1"
  fi
  echo "If $TEST_TO doesn't receive it, see docs/TROUBLESHOOTING.md."
else
  echo "Skipped. Test later with:"
  echo "  echo test | mail -s subject you@example.com"
fi

echo "Done. Full reference and other MTAs (msmtp, Exim4): docs/SYSTEM-MTA.md"
