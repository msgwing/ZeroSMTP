<?php
/**
 * php-zerosmtp.php
 * PHP 8.3+ PHPMailer 6.9.5 - ZeroSMTP mx.msgwing.com:465 SSL/TLS
 * Production-ready | Let's Encrypt | No deprecated APIs
 */

declare(strict_types=1);

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/vendor/autoload.php';

readonly class ZeroSMTPConfig {
    public function __construct(
        public string $username,
        public string $password,
        public string $from,
        public string $to,
        public string $subject,
    ) {}
}

function sendEmailViaZeroSMTP(ZeroSMTPConfig $config): bool {
    $mailer = new PHPMailer(exceptions: true);
    try {
        $mailer->isSMTP();
        $mailer->Host = 'mx.msgwing.com';
        $mailer->Port = 465;
        $mailer->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
        $mailer->SMTPAuth = true;
        $mailer->Username = $config->username;
        $mailer->Password = $config->password;
        $mailer->SMTPOptions = [
            'ssl' => [
                'verify_peer' => true,
                'verify_peer_name' => true,
                'allow_self_signed' => false,
            ],
        ];
        $mailer->setFrom($config->from, 'ZeroSMTP User');
        $mailer->addAddress($config->to);
        $mailer->Subject = $config->subject;
        $mailer->isHTML(true);
        $mailer->Body = '<html><body><h1>Hello from ZeroSMTP!</h1><p>This is an HTML email sent via mx.msgwing.com:465</p></body></html>';
        $mailer->AltBody = 'Hello from ZeroSMTP! This is a plain text version.';
        return $mailer->send();
    } catch (Exception $e) {
        fprintf(STDERR, "Email sending failed: %s\n", $e->getMessage());
        return false;
    }
}

// NOTE: variable names are prefixed with ZEROSMTP_ to avoid colliding with
// reserved/OS-level variables (e.g. USERNAME is auto-set on Windows).
// Fail-fast: missing env vars exit with a clear error instead of silently
// using placeholder credentials that could leak into production.
$required = ['ZEROSMTP_USERNAME', 'ZEROSMTP_PASSWORD', 'ZEROSMTP_FROM', 'ZEROSMTP_TO'];
$missing = array_filter($required, fn($v) => getenv($v) === false || getenv($v) === '');
if (!empty($missing)) {
    fwrite(STDERR, "ERROR: missing required environment variables: " . implode(', ', $missing) . "\n");
    exit(1);
}
$config = new ZeroSMTPConfig(
    username: getenv('ZEROSMTP_USERNAME'),
    password: getenv('ZEROSMTP_PASSWORD'),
    from: getenv('ZEROSMTP_FROM'),
    to: getenv('ZEROSMTP_TO'),
    subject: getenv('ZEROSMTP_SUBJECT') ?: 'Test Email from ZeroSMTP',
);

exit(sendEmailViaZeroSMTP($config) ? 0 : 1);
