/**
 * java-zerosmtp.java
 * Java 21+ Jakarta Mail 2.1 - ZeroSMTP mx.msgwing.com:465 SSL/TLS
 * Production-ready | Let's Encrypt | Virtual threads, records, pattern matching
 */

import jakarta.mail.*;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeBodyPart;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.internet.MimeMultipart;
import java.io.UnsupportedEncodingException;
import java.util.Properties;

// NOTE: not `public` on purpose — a public top-level class must live in a
// file of the same name (ZeroSMTPMailer.java), which conflicts with this
// repo's <language>-zerosmtp.<ext> naming convention. A package-private
// class works identically here since main() itself is still public.
final class ZeroSMTPMailer {

    public record EmailConfig(
        String username,
        String password,
        String from,
        String to,
        String subject
    ) {}

    public static void main(String[] args) {
        // NOTE: variable names are prefixed with ZEROSMTP_ to avoid colliding with
        // reserved/OS-level variables (e.g. USERNAME is auto-set on Windows).
        // Fail-fast: missing env vars exit with a clear error instead of silently
        // using placeholder credentials that could leak into production.
        String[] required = {"ZEROSMTP_USERNAME", "ZEROSMTP_PASSWORD", "ZEROSMTP_FROM", "ZEROSMTP_TO"};
        StringBuilder missing = new StringBuilder();
        for (String v : required) {
            String value = System.getenv(v);
            if (value == null || value.isEmpty()) {
                if (missing.length() > 0) missing.append(", ");
                missing.append(v);
            }
        }
        if (missing.length() > 0) {
            System.err.println("ERROR: missing required environment variables: " + missing);
            System.exit(1);
        }
        EmailConfig config = new EmailConfig(
            System.getenv("ZEROSMTP_USERNAME"),
            System.getenv("ZEROSMTP_PASSWORD"),
            System.getenv("ZEROSMTP_FROM"),
            System.getenv("ZEROSMTP_TO"),
            System.getenv("ZEROSMTP_SUBJECT") != null ? System.getenv("ZEROSMTP_SUBJECT") : "Test Email from ZeroSMTP"
        );
        Thread thread = Thread.ofVirtual().start(() -> {
            try {
                if (sendEmailViaZeroSMTP(config)) {
                    System.out.println("Email sent successfully");
                    System.exit(0);
                } else {
                    System.err.println("Email sending failed");
                    System.exit(1);
                }
            } catch (MessagingException e) {
                System.err.println("Messaging error: " + e.getMessage());
                System.exit(1);
            }
        });
        try {
            thread.join();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            System.err.println("Interrupted while waiting for the send to complete");
            System.exit(1);
        }
    }

    private static boolean sendEmailViaZeroSMTP(EmailConfig config) throws MessagingException {
        Properties props = new Properties();
        props.put("mail.smtp.host", "mx.msgwing.com");
        props.put("mail.smtp.port", "465");
        props.put("mail.smtp.ssl.enable", "true");
        props.put("mail.smtp.ssl.protocols", "TLSv1.2 TLSv1.3");
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.connectiontimeout", "10000");
        props.put("mail.smtp.timeout", "10000");

        Session session = Session.getInstance(props, new Authenticator() {
            @Override
            protected PasswordAuthentication getPasswordAuthentication() {
                return new PasswordAuthentication(config.username(), config.password());
            }
        });

        try {
            MimeMessage message = new MimeMessage(session);
            message.setFrom(new InternetAddress(config.from(), "ZeroSMTP User"));
            message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(config.to()));
            message.setSubject(config.subject());

            MimeMultipart multipart = new MimeMultipart("alternative");
            MimeBodyPart textPart = new MimeBodyPart();
            textPart.setText("Hello from ZeroSMTP! This is plain text.", "utf-8");
            multipart.addBodyPart(textPart);

            MimeBodyPart htmlPart = new MimeBodyPart();
            htmlPart.setContent(
                "<html><body><h1>Hello from ZeroSMTP!</h1><p>This is an HTML email sent via mx.msgwing.com:465</p></body></html>",
                "text/html; charset=utf-8"
            );
            multipart.addBodyPart(htmlPart);
            message.setContent(multipart);
            Transport.send(message);
            return true;
        } catch (MessagingException e) {
            return switch (e) {
                case AuthenticationFailedException afe -> {
                    System.err.println("Authentication failed: " + afe.getMessage());
                    yield false;
                }
                case SendFailedException sfe -> {
                    System.err.println("Send failed: " + sfe.getMessage());
                    yield false;
                }
                default -> {
                    System.err.println("Messaging exception: " + e.getMessage());
                    yield false;
                }
            };
        } catch (UnsupportedEncodingException e) {
            System.err.println("Invalid sender name encoding: " + e.getMessage());
            return false;
        }
    }
}
