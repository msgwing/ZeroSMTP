import 'dart:io';

import 'package:mailer/mailer.dart';
import 'package:mailer/smtp_server.dart';

/// ZeroSMTP example for Dart.
///
/// Run with: `dart run dart-zerosmtp.dart`
/// Reads the same ZEROSMTP_* environment variables as the other examples.
Future<void> main() async {
  // Fail-fast: missing env vars exit with a clear error instead of silently
  // using placeholder credentials that could leak into production.
  const requiredVars = [
    'ZEROSMTP_USERNAME',
    'ZEROSMTP_PASSWORD',
    'ZEROSMTP_FROM',
    'ZEROSMTP_TO',
  ];
  final missing = requiredVars
      .where((v) => (Platform.environment[v] ?? '').isEmpty)
      .toList();
  if (missing.isNotEmpty) {
    stderr.writeln('ERROR: missing required environment variables: ${missing.join(', ')}');
    exitCode = 1;
    return;
  }
  final username = Platform.environment['ZEROSMTP_USERNAME']!;
  final password = Platform.environment['ZEROSMTP_PASSWORD']!;
  final from = Platform.environment['ZEROSMTP_FROM']!;
  final to = Platform.environment['ZEROSMTP_TO']!;
  final subject =
      Platform.environment['ZEROSMTP_SUBJECT'] ?? 'Test Email from ZeroSMTP';

  // Port 465 with ssl: true is implicit TLS. The package defaults to 587
  // with STARTTLS, which this relay also accepts.
  final smtpServer = SmtpServer(
    'mx.msgwing.com',
    port: 465,
    ssl: true,
    username: username,
    password: password,
  );

  final message = Message()
    ..from = Address(from, 'ZeroSMTP User')
    ..recipients.add(to)
    ..subject = subject
    ..text = 'Hello from ZeroSMTP! This is plain text.'
    ..html = '<html><body><h1>Hello from ZeroSMTP!</h1>'
        '<p>This is an HTML email sent via mx.msgwing.com:465</p>'
        '</body></html>';

  try {
    final report = await send(message, smtpServer);
    stdout.writeln('Email sent: ${report.toString()}');
  } on MailerException catch (error) {
    stderr.writeln('SMTP error: ${error.message}');
    exitCode = 1;
  } catch (error) {
    stderr.writeln('Error: $error');
    exitCode = 1;
  }
}
