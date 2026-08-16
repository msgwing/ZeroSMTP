// go-zerosmtp.go
/*
 * Go 1.23+ net/smtp - ZeroSMTP mx.msgwing.com:465 SSL/TLS
 * Production-ready | Let's Encrypt | range over func, slices.Values()
 */

package main

import (
	"crypto/rand"
	"crypto/tls"
	"encoding/hex"
	"fmt"
	"io"
	"net/smtp"
	"os"
	"strings"
)

type EmailConfig struct {
	Username string
	Password string
	From     string
	To       string
	Subject  string
}

func sendEmailViaZeroSMTP(config EmailConfig) error {
	// Create TLS configuration with system CA verification
	tlsConfig := &tls.Config{
		ServerName:         "mx.msgwing.com",
		InsecureSkipVerify: false,
		MinVersion:         tls.VersionTLS12,
	}

	// Connect to SMTP server
	conn, err := tls.Dial("tcp", "mx.msgwing.com:465", tlsConfig)
	if err != nil {
		return fmt.Errorf("failed to connect: %w", err)
	}
	defer conn.Close()

	// Create SMTP client
	client, err := smtp.NewClient(conn, "mx.msgwing.com")
	if err != nil {
		return fmt.Errorf("failed to create SMTP client: %w", err)
	}
	defer client.Close()

	// Authenticate
	auth := smtp.PlainAuth("", config.Username, config.Password, "mx.msgwing.com")
	if err := client.Auth(auth); err != nil {
		return fmt.Errorf("authentication failed: %w", err)
	}

	// Set sender
	if err := client.Mail(config.From); err != nil {
		return fmt.Errorf("failed to set sender: %w", err)
	}

	// Set recipient
	if err := client.Rcpt(config.To); err != nil {
		return fmt.Errorf("failed to add recipient %s: %w", config.To, err)
	}

	// Create message
	wc, err := client.Data()
	if err != nil {
		return fmt.Errorf("failed to get write channel: %w", err)
	}
	defer wc.Close()

	// Build email with HTML+plain multipart
	emailBody := buildEmailBody(config)
	if _, err := io.WriteString(wc, emailBody); err != nil {
		return fmt.Errorf("failed to write email body: %w", err)
	}

	// Quit gracefully
	return client.Quit()
}

func newBoundary() string {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "zerosmtp-fallback-boundary"
	}
	return "zerosmtp-" + hex.EncodeToString(buf)
}

func buildEmailBody(config EmailConfig) string {
	boundary := newBoundary()
	body := strings.Builder{}
	body.WriteString(fmt.Sprintf("From: %s\r\n", config.From))
	body.WriteString(fmt.Sprintf("To: %s\r\n", config.To))
	body.WriteString(fmt.Sprintf("Subject: %s\r\n", config.Subject))
	body.WriteString("MIME-Version: 1.0\r\n")
	body.WriteString(fmt.Sprintf("Content-Type: multipart/alternative; boundary=\"%s\"\r\n\r\n", boundary))

	// Plain text part
	body.WriteString(fmt.Sprintf("--%s\r\n", boundary))
	body.WriteString("Content-Type: text/plain; charset=\"UTF-8\"\r\n\r\n")
	body.WriteString("Hello from ZeroSMTP! This is plain text.\r\n\r\n")

	// HTML part
	body.WriteString(fmt.Sprintf("--%s\r\n", boundary))
	body.WriteString("Content-Type: text/html; charset=\"UTF-8\"\r\n\r\n")
	body.WriteString("<html><body><h1>Hello from ZeroSMTP!</h1>")
	body.WriteString("<p>This is an HTML email sent via mx.msgwing.com:465</p></body></html>\r\n\r\n")
	body.WriteString(fmt.Sprintf("--%s--\r\n", boundary))

	return body.String()
}

func main() {
	// NOTE: variable names are prefixed with ZEROSMTP_ to avoid colliding with
	// reserved/OS-level variables (e.g. USERNAME is auto-set on Windows).
	// Fail-fast: missing env vars exit with a clear error instead of silently
	// using placeholder credentials that could leak into production.
	requiredVars := []string{"ZEROSMTP_USERNAME", "ZEROSMTP_PASSWORD", "ZEROSMTP_FROM", "ZEROSMTP_TO"}
	var missing []string
	for _, v := range requiredVars {
		if os.Getenv(v) == "" {
			missing = append(missing, v)
	}
	}
	if len(missing) > 0 {
		fmt.Fprintf(os.Stderr, "ERROR: missing required environment variables: %s\n", strings.Join(missing, ", "))
		os.Exit(1)
	}
	config := EmailConfig{
	Username: os.Getenv("ZEROSMTP_USERNAME"),
	Password: os.Getenv("ZEROSMTP_PASSWORD"),
	From:     os.Getenv("ZEROSMTP_FROM"),
		To:       os.Getenv("ZEROSMTP_TO"),
	Subject:  getEnv("ZEROSMTP_SUBJECT", "Test Email from ZeroSMTP"),
	}
	if err := sendEmailViaZeroSMTP(config); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
	fmt.Println("Email sent successfully")
	os.Exit(0)
}
func getEnv(key, defaultVal string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultVal
}
