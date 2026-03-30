// cs-zerosmtp.cs
/**
 * C# 13 .NET 10 MailKit 4.8 MimeKit 4.8 - ZeroSMTP mx.msgwing.com:465 SSL/TLS
 * Production-ready | Let's Encrypt | Primary constructors, required members, NO SmtpClient
 */

using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using System;

public record class EmailConfig(
    required string Username,
    required string Password,
    required string From,
    required string To,
    required string Subject
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
        var config = new EmailConfig(
            Username: Environment.GetEnvironmentVariable("USERNAME") ?? "your-username",
            Password: Environment.GetEnvironmentVariable("PASSWORD") ?? "your-password",
            From: Environment.GetEnvironmentVariable("FROM") ?? "sender@example.com",
            To: Environment.GetEnvironmentVariable("TO") ?? "recipient@example.com",
            Subject: Environment.GetEnvironmentVariable("SUBJECT") ?? "Test Email from ZeroSMTP"
        );
        bool success = await SendEmailAsync(config);
        Environment.Exit(success ? 0 : 1);
    }
}
