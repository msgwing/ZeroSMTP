// cs-zerosmtp.cs
/**
 * C# 12+ .NET 8+ MailKit 4.8 MimeKit 4.8 - ZeroSMTP mx.msgwing.com:465 SSL/TLS
 * Production-ready | Let's Encrypt | Primary constructors, NO SmtpClient
 */

using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using System;

// Positional record parameters are already mandatory via the constructor,
// so no `required` modifier is needed (and isn't valid in this position).
public record class EmailConfig(
    string Username,
    string Password,
    string From,
    string To,
    string Subject
);

public static class ZeroSMTPMailer
{
    public static async Task<bool> SendEmailAsync(EmailConfig config)
    {
        using var client = new SmtpClient();
        try
        {
            // Connect with full Let's Encrypt verification
            await client.ConnectAsync(
                "mx.msgwing.com",
                465,
                SecureSocketOptions.SslOnConnect
            );

            // Authenticate
            await client.AuthenticateAsync(config.Username, config.Password);

            // Create message
            var message = new MimeMessage();
            message.From.Add(MailboxAddress.Parse(config.From));
            message.To.Add(MailboxAddress.Parse(config.To));
            message.Subject = config.Subject;

            // Create multipart body
            var bodyBuilder = new BodyBuilder
            {
                TextBody = "Hello from ZeroSMTP! This is plain text.",
                HtmlBody = "<html><body><h1>Hello from ZeroSMTP!</h1><p>This is an HTML email sent via mx.msgwing.com:465</p></body></html>"
            };
            message.Body = bodyBuilder.ToMessageBody();

            // Send
            await client.SendAsync(message);
            Console.WriteLine("Email sent successfully");

            await client.DisconnectAsync(true);
            return true;
        }
        catch (AuthenticationException ex)
        {
            Console.Error.WriteLine($"Authentication failed: {ex.Message}");
            return false;
        }
        catch (SmtpCommandException ex)
        {
            Console.Error.WriteLine($"SMTP command error: {ex.Message}");
            return false;
        }
        catch (SmtpProtocolException ex)
        {
            Console.Error.WriteLine($"SMTP protocol error: {ex.Message}");
            return false;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Unexpected error: {ex.Message}");
            return false;
        }
    }

    public static async Task Main(string[] args)
    {
        // NOTE: variable names are prefixed with ZEROSMTP_ to avoid colliding with
        // reserved/OS-level variables (e.g. USERNAME is auto-set on Windows).
        // Fail-fast: missing env vars exit with a clear error instead of silently
        // using placeholder credentials that could leak into production.
        string[] required = { "ZEROSMTP_USERNAME", "ZEROSMTP_PASSWORD", "ZEROSMTP_FROM", "ZEROSMTP_TO" };
        var missing = required.Where(v => string.IsNullOrEmpty(Environment.GetEnvironmentVariable(v))).ToList();
        if (missing.Count > 0)
        {
            Console.Error.WriteLine($"ERROR: missing required environment variables: {string.Join(", ", missing)}");
            Environment.Exit(1);
        }
        var config = new EmailConfig(
            Username: Environment.GetEnvironmentVariable("ZEROSMTP_USERNAME")!,
            Password: Environment.GetEnvironmentVariable("ZEROSMTP_PASSWORD")!,
            From: Environment.GetEnvironmentVariable("ZEROSMTP_FROM")!,
            To: Environment.GetEnvironmentVariable("ZEROSMTP_TO")!,
            Subject: Environment.GetEnvironmentVariable("ZEROSMTP_SUBJECT") ?? "Test Email from ZeroSMTP"
        );
        bool success = await SendEmailAsync(config);
        Environment.Exit(success ? 0 : 1);
    }
}
