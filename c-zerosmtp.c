/*
 * c-zerosmtp.c
 * C99 + libcurl - ZeroSMTP mx.msgwing.com:465 SSL/TLS
 * Production-ready | Let's Encrypt | Certificate verification on
 *
 * libcurl is used rather than a hand-rolled TLS client: it is present on
 * essentially every Linux system and every embedded toolchain that has
 * networking at all, and getting certificate validation right by hand is
 * how devices end up with verification switched off "temporarily".
 *
 *   Debian/Ubuntu   apt install libcurl4-openssl-dev
 *   RHEL/Fedora     dnf install libcurl-devel
 *   Alpine          apk add curl-dev
 *
 * Build:  cc -std=c99 -Wall -Wextra -o c-zerosmtp c-zerosmtp.c -lcurl
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#include <curl/curl.h>

#define SMTP_URL "smtps://mx.msgwing.com:465"

/* One buffer holds the whole message. Transactional mail of the kind this
 * relay is for is small; a device sending megabyte attachments wants a
 * streaming read callback over a file instead. */
#define MESSAGE_MAX 4096

struct upload_status {
    const char *payload;
    size_t offset;
};

/* libcurl asks for the message in chunks, so we hand back whatever fits and
 * remember how far we got. Returning 0 signals end of data. */
static size_t payload_source(char *buffer, size_t size, size_t nitems,
                             void *userdata)
{
    struct upload_status *upload = (struct upload_status *)userdata;
    size_t room = size * nitems;
    size_t remaining = strlen(upload->payload) - upload->offset;
    size_t chunk;

    if (room < 1 || remaining < 1) {
        return 0;
    }

    chunk = (remaining < room) ? remaining : room;
    memcpy(buffer, upload->payload + upload->offset, chunk);
    upload->offset += chunk;

    return chunk;
}

static const char *env_or(const char *name, const char *fallback)
{
    const char *value = getenv(name);
    return (value && *value) ? value : fallback;
}

/* SMTP requires CRLF line endings, not the bare LF a C string literal gets
 * from a newline - a message with LF-only headers is rejected or silently
 * mangled by some servers. */
static int build_message(char *out, size_t out_size,
                         const char *from, const char *to, const char *subject)
{
    char boundary[64];
    int written;

    snprintf(boundary, sizeof(boundary),
             "boundary_zerosmtp_%ld", (long)time(NULL));

    written = snprintf(out, out_size,
        "From: %s\r\n"
        "To: %s\r\n"
        "Subject: %s\r\n"
        "MIME-Version: 1.0\r\n"
        "Content-Type: multipart/alternative; boundary=\"%s\"\r\n"
        "\r\n"
        "--%s\r\n"
        "Content-Type: text/plain; charset=\"UTF-8\"\r\n"
        "\r\n"
        "Hello from ZeroSMTP! This is plain text.\r\n"
        "\r\n"
        "--%s\r\n"
        "Content-Type: text/html; charset=\"UTF-8\"\r\n"
        "\r\n"
        "<html><body><h1>Hello from ZeroSMTP!</h1>"
        "<p>This is an HTML email sent via mx.msgwing.com:465</p>"
        "</body></html>\r\n"
        "\r\n"
        "--%s--\r\n",
        from, to, subject, boundary, boundary, boundary, boundary);

    /* snprintf returns what it *would* have written, so a value at or past
     * the buffer size means the message was truncated - sending that would
     * produce a mail with a dangling MIME boundary. */
    if (written < 0 || (size_t)written >= out_size) {
        fprintf(stderr, "Message does not fit in %d bytes\n", (int)out_size);
        return 0;
    }

    return 1;
}

int main(void)
{
    /* Fail-fast: missing env vars exit with a clear error instead of silently
     * using placeholder credentials that could leak into production. */
    const char *required[] = {
        "ZEROSMTP_USERNAME", "ZEROSMTP_PASSWORD",
        "ZEROSMTP_FROM", "ZEROSMTP_TO", NULL
    };
    int missing_count = 0;
    for (int i = 0; required[i] != NULL; i++) {
        const char *v = getenv(required[i]);
        if (!v || !*v) {
            fprintf(stderr, "ERROR: missing required environment variable: %s\n", required[i]);
            missing_count++;
        }
    }
    if (missing_count > 0) {
        return 1;
    }
    const char *username = getenv("ZEROSMTP_USERNAME");
    const char *password = getenv("ZEROSMTP_PASSWORD");
    const char *from     = getenv("ZEROSMTP_FROM");
    const char *to       = getenv("ZEROSMTP_TO");
    const char *subject  = env_or("ZEROSMTP_SUBJECT", "Test Email from ZeroSMTP");

    char message[MESSAGE_MAX];
    char envelope_from[320];
    char envelope_to[320];
    struct upload_status upload = { message, 0 };
    struct curl_slist *recipients = NULL;
    CURL *curl;
    CURLcode result;
    int status = 1;

    if (!build_message(message, sizeof(message), from, to, subject)) {
        return 1;
    }

    /* The envelope addresses go in angle brackets, unlike the header ones. */
    snprintf(envelope_from, sizeof(envelope_from), "<%s>", from);
    snprintf(envelope_to, sizeof(envelope_to), "<%s>", to);

    curl_global_init(CURL_GLOBAL_DEFAULT);

    curl = curl_easy_init();
    if (!curl) {
        fprintf(stderr, "Could not initialise libcurl\n");
        curl_global_cleanup();
        return 1;
    }

    recipients = curl_slist_append(recipients, envelope_to);
    if (!recipients) {
        fprintf(stderr, "Out of memory building the recipient list\n");
        curl_easy_cleanup(curl);
        curl_global_cleanup();
        return 1;
    }

    curl_easy_setopt(curl, CURLOPT_URL, SMTP_URL);
    curl_easy_setopt(curl, CURLOPT_USERNAME, username);
    curl_easy_setopt(curl, CURLOPT_PASSWORD, password);
    curl_easy_setopt(curl, CURLOPT_MAIL_FROM, envelope_from);
    curl_easy_setopt(curl, CURLOPT_MAIL_RCPT, recipients);
    curl_easy_setopt(curl, CURLOPT_READFUNCTION, payload_source);
    curl_easy_setopt(curl, CURLOPT_READDATA, &upload);
    curl_easy_setopt(curl, CURLOPT_UPLOAD, 1L);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 30L);

    /* On by default, set explicitly so that nobody "fixes" a certificate
     * error later by flipping these to 0. If verification fails, the cause
     * is a missing CA bundle on the device, not the server. */
    curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 1L);
    curl_easy_setopt(curl, CURLOPT_SSL_VERIFYHOST, 2L);

    result = curl_easy_perform(curl);

    if (result == CURLE_OK) {
        printf("Email sent to %s\n", to);
        status = 0;
    } else {
        fprintf(stderr, "SMTP error: %s\n", curl_easy_strerror(result));
        if (result == CURLE_PEER_FAILED_VERIFICATION) {
            fprintf(stderr, "The device's CA store could not validate the "
                            "server certificate.\n");
        }
    }

    curl_slist_free_all(recipients);
    curl_easy_cleanup(curl);
    curl_global_cleanup();

    return status;
}
