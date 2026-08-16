/**
 * kotlin-zerosmtp.kt
 * Kotlin 2.0+ Jakarta Mail 2.1 - ZeroSMTP mx.msgwing.com:465 SSL/TLS
 * Production-ready | Let's Encrypt | Sealed interfaces, Result<>
 */

// Explicit JVM facade class name: the default derivation from the file name
// would try to produce "Kotlin-zerosmtpKt", which contains an invalid
// hyphen — Gradle's `application { mainClass }` needs a real class name.
@file:JvmName("KotlinZerosmtp")

import jakarta.mail.*
import jakarta.mail.internet.InternetAddress
import jakarta.mail.internet.MimeBodyPart
import jakarta.mail.internet.MimeMessage
import jakarta.mail.internet.MimeMultipart
import java.util.*

sealed interface MailResult {
    data class Success(val messageId: String) : MailResult
    data class Failure(val error: String) : MailResult
}

data class EmailConfig(
    val username: String,
    val password: String,
    val from: String,
    val to: String,
    val subject: String,
)

// Typed as MimeMessage (not the base Message) because sendEmailViaZeroSMTP
// below reads .messageID, which only MimeMessage exposes.
fun createMultipartMessage(session: Session, config: EmailConfig): MimeMessage = MimeMessage(session).apply {
    setFrom(InternetAddress(config.from, "ZeroSMTP User"))
    setRecipients(Message.RecipientType.TO, InternetAddress.parse(config.to))
    subject = config.subject

    val multipart = MimeMultipart("alternative")

    // Plain text part
    multipart.addBodyPart(MimeBodyPart().apply {
        setText("Hello from ZeroSMTP! This is plain text.", "utf-8")
    })

    // HTML part
    multipart.addBodyPart(MimeBodyPart().apply {
        setContent(
            "<html><body><h1>Hello from ZeroSMTP!</h1>" +
            "<p>This is an HTML email sent via mx.msgwing.com:465</p></body></html>",
            "text/html; charset=utf-8"
        )
    })
    setContent(multipart)
}

suspend fun sendEmailViaZeroSMTP(config: EmailConfig): MailResult = runCatching {
    val props = Properties().apply {
        put("mail.smtp.host", "mx.msgwing.com")
        put("mail.smtp.port", "465")
        put("mail.smtp.ssl.enable", "true")
        put("mail.smtp.ssl.protocols", "TLSv1.2 TLSv1.3")
        put("mail.smtp.auth", "true")
        put("mail.smtp.connectiontimeout", "10000")
        put("mail.smtp.timeout", "10000")
    }

    val authenticator = object : Authenticator() {
        override fun getPasswordAuthentication() =
            PasswordAuthentication(config.username, config.password)
    }

    val session = Session.getInstance(props, authenticator)
    val message = createMultipartMessage(session, config)
    Transport.send(message)
    MailResult.Success(message.messageID ?: "sent")
}.fold(
    onSuccess = { it },
    onFailure = { e ->
        when (e) {
            is AuthenticationFailedException -> MailResult.Failure("Authentication failed: ${e.message}")
            is SendFailedException -> MailResult.Failure("Send failed: ${e.message}")
            else -> MailResult.Failure("Error: ${e.message}")
        }
    }
)

suspend fun main() {
    // NOTE: variable names are prefixed with ZEROSMTP_ to avoid colliding with
    // reserved/OS-level variables (e.g. USERNAME is auto-set on Windows).
    // Fail-fast: missing env vars exit with a clear error instead of silently
    // using placeholder credentials that could leak into production.
    val required = listOf("ZEROSMTP_USERNAME", "ZEROSMTP_PASSWORD", "ZEROSMTP_FROM", "ZEROSMTP_TO")
    val missing = required.filter { System.getenv(it).isNullOrEmpty() }
    if (missing.isNotEmpty()) {
        System.err.println("ERROR: missing required environment variables: ${missing.joinToString(", ")}")
        System.exit(1)
    }
    val config = EmailConfig(
        username = System.getenv("ZEROSMTP_USERNAME")!!,
        password = System.getenv("ZEROSMTP_PASSWORD")!!,
        from     = System.getenv("ZEROSMTP_FROM")!!,
        to       = System.getenv("ZEROSMTP_TO")!!,
        subject  = System.getenv("ZEROSMTP_SUBJECT") ?: "Test Email from ZeroSMTP",
    )

    when (val result = sendEmailViaZeroSMTP(config)) {
        is MailResult.Success -> {
            println("Email sent: ${result.messageId}")
            System.exit(0)
        }
        is MailResult.Failure -> {
            System.err.println(result.error)
            System.exit(1)
        }
    }
}
