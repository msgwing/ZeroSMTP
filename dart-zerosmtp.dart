import 'dart:io';

import 'package:mailer/mailer.dart';
import 'package:mailer/smtp_server.dart';

/// ZeroSMTP example for Dart.
///
/// Run with: `dart run dart-zerosmtp.dart`
/// Reads the same ZEROSMTP_* environment variables as the other examples.
Future<void> main() async {
  final username = Platform.environment['ZEROSMTP_USERNAME'] ?? 'your-username';
  final password = Platform.environment['ZEROSMTP_PASSWORD'] ?? 'your-password';
  final from = Platform.environment['ZEROSMTP_FROM'] ?? 'sender@example.com';
  final to = Platform.environment['ZEROSMTP_TO'] ?? 'recipient@example.com';
  final subject =
      Platform.environment['ZEROSMTP_SUBJECT'] ?? 'Test Email from ZeroSMTP';

  final smtpServer = smtpServerSSL(
    'mx.msgwing.com',
    465,
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
  } on SmtpException catch (error) {
    stderr.writeln('SMTP error: ${error.message}');
    exitCode = 1;
  } catch (error) {
    stderr.writeln('Error: $error');
    exitCode = 1;
  }
}
