// rust-zerosmtp.rs
/**
 * Rust 1.81+ lettre 0.11 - ZeroSMTP mx.msgwing.com:465 SSL/TLS
 * Production-ready | Let's Encrypt | native-tls/rustls, anyhow::Result
 * NO dangerous_accept_invalid_certs()
 */

use lettre::{
    transport::smtp::{authentication::Credentials, SmtpTransport},
    Message, Transport,
};
use lettre::message::MultiPart;
use anyhow::{Context, Result};
use std::env;
use std::time::Duration;

const ZEROSMTP_HOST: &str = "mx.msgwing.com";
const ZEROSMTP_PORT: u16 = 465;

struct EmailConfig {
    username: String,
    password: String,
    from: String,
    to: String,
    subject: String,
}

fn get_config() -> Result<EmailConfig> {
    // NOTE: variable names are prefixed with ZEROSMTP_ to avoid colliding with
    // reserved/OS-level variables (e.g. USERNAME is auto-set on Windows).
    // Fail-fast: missing env vars return an error instead of silently using
    // placeholder credentials that could leak into production.
    let required = ["ZEROSMTP_USERNAME", "ZEROSMTP_PASSWORD", "ZEROSMTP_FROM", "ZEROSMTP_TO"];
    let missing: Vec<&str> = required
        .iter()
        .filter(|v| env::var(v).is_err())
        .copied()
        .collect();
    if !missing.is_empty() {
        return Err(anyhow::anyhow!(
            "missing required environment variables: {}",
            missing.join(", ")
        ));
    }
    Ok(EmailConfig {
        username: env::var("ZEROSMTP_USERNAME")?,
        password: env::var("ZEROSMTP_PASSWORD")?,
        from: env::var("ZEROSMTP_FROM")?,
        to: env::var("ZEROSMTP_TO")?,
        subject: env::var("ZEROSMTP_SUBJECT").unwrap_or_else(|_| "Test Email from ZeroSMTP".to_string()),
    })
}

fn send_email_via_zerosmtp(config: EmailConfig) -> Result<()> {
    // Create credentials
    let credentials = Credentials::new(
        config.username.clone().into(),
        config.password.clone().into(),
    );

    // Build SMTP transport with full certificate verification
    let mailer = SmtpTransport::relay(ZEROSMTP_HOST)
        .context("Failed to create SMTP transport")?
        .port(ZEROSMTP_PORT)
        .credentials(credentials)
        .timeout(Some(Duration::from_secs(30)))
        .build();

    // Create message with multipart body
    let plain_text = "Hello from ZeroSMTP! This is plain text.";
    let html_body = "<html><body><h1>Hello from ZeroSMTP!</h1><p>This is an HTML email sent via mx.msgwing.com:465</p></body></html>";

    let multipart = MultiPart::alternative()
        .singlepart(lettre::message::SinglePart::plain(plain_text.to_string()))
        .singlepart(lettre::message::SinglePart::html(html_body.to_string()));

    let message = Message::builder()
        .from(config.from.parse().context("Invalid from address")?)
        .to(config.to.parse().context("Invalid to address")?)
        .subject(config.subject)
        .multipart(multipart)
        .context("Failed to build message")?;

    // Send email
    mailer
        .send(&message)
        .context("Failed to send email")?;

    println!("Email sent successfully via ZeroSMTP");
    Ok(())
}

fn main() -> Result<()> {
    let config = get_config()?;
    send_email_via_zerosmtp(config)?;
    Ok(())
}
