// go-zerosmtp.go
/*
 * Go 1.23+ net/smtp - ZeroSMTP mx.msgwing.com:465 SSL/TLS
 * Production-ready | Let's Encrypt | range over func, slices.Values()
 */

package main

import (
	"crypto/tls"
	"fmt"
	"io"
	"net/smtp"
	"os"
	"slices"
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

	// Set recipient(s) - handle multiple with range over func
	recipients := slices.Values([]string{config.To})
	for recipient := range recipients {
		if err := client.Rcpt(recipient); err != nil {
			return fmt.Errorf("failed to add recipient %s: %w", recipient, err)
		}
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

func buildEmailBody(config EmailConfig) string {
	boundary := "boundary123"
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
	config := EmailConfig{
		Username: getEnv("USERNAME", "your-username"),
		Password: getEnv("PASSWORD", "your-password"),
		From:     getEnv("FROM", "sender@example.com"),
		To:       getEnv("TO", "recipient@example.com"),
		Subject:  getEnv("SUBJECT", "Test Email from ZeroSMTP"),
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
