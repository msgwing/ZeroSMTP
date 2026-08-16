// zig-zerosmtp.zig
// Zig 0.14 + libcurl - ZeroSMTP mx.msgwing.com:465 SSL/TLS
// Production-ready | Let's Encrypt | Certificate verification on
//
// Tested against Zig 0.14.1. The language is still moving; an unpinned
// example goes stale quietly, so the CI job pins the same version.
//
// libcurl rather than std.crypto.tls: Zig's standard library has a TLS
// client but no SMTP client, so the protocol would have to be written by
// hand here - and a hand-rolled SMTP conversation in an example is how
// somebody ends up shipping one. The C example makes the same call for
// the same reason.
//
//   Debian/Ubuntu   apt install libcurl4-openssl-dev
//   RHEL/Fedora     dnf install libcurl-devel
//   Alpine          apk add curl-dev
//
// Build:  zig build-exe zig-zerosmtp.zig -lc -lcurl

const std = @import("std");

const c = @cImport({
    @cInclude("curl/curl.h");
});

const SMTP_URL = "smtps://mx.msgwing.com:465";

/// libcurl asks for the message in chunks, so hand back whatever fits and
/// remember how far we got. Returning 0 signals end of data.
const Upload = struct {
    data: []const u8,
    offset: usize = 0,
};

fn payloadSource(
    ptr: [*c]u8,
    size: usize,
    nitems: usize,
    userdata: ?*anyopaque,
) callconv(.C) usize {
    const upload: *Upload = @ptrCast(@alignCast(userdata orelse return 0));
    const room = size * nitems;
    const remaining = upload.data.len - upload.offset;
    if (room == 0 or remaining == 0) return 0;

    const chunk = @min(room, remaining);
    @memcpy(ptr[0..chunk], upload.data[upload.offset..][0..chunk]);
    upload.offset += chunk;
    return chunk;
}

/// std.posix.getenv returns a NUL-terminated slice, which is what the C
/// API needs - no copy, no allocator.
fn envOr(name: [:0]const u8, fallback: [:0]const u8) [:0]const u8 {
    const value = std.posix.getenv(name) orelse return fallback;
    if (value.len == 0) return fallback;
    // getenv gives [:0]const u8 on POSIX, so the sentinel is already there.
    return @ptrCast(value);
}

pub fn main() !u8 {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    const username = envOr("ZEROSMTP_USERNAME", "your-username");
    const password = envOr("ZEROSMTP_PASSWORD", "your-password");
    const from = envOr("ZEROSMTP_FROM", "sender@example.com");
    const to = envOr("ZEROSMTP_TO", "recipient@example.com");
    const subject = envOr("ZEROSMTP_SUBJECT", "Test Email from ZeroSMTP");

    // SMTP wants CRLF line endings, not the bare LF a multiline string
    // literal produces - some servers reject or mangle LF-only headers.
    const boundary = "boundary_zerosmtp_zig";
    const message = try std.fmt.allocPrint(allocator,
        "From: {s}\r\n" ++
        "To: {s}\r\n" ++
        "Subject: {s}\r\n" ++
        "MIME-Version: 1.0\r\n" ++
        "Content-Type: multipart/alternative; boundary=\"{s}\"\r\n" ++
        "\r\n" ++
        "--{s}\r\n" ++
        "Content-Type: text/plain; charset=\"UTF-8\"\r\n" ++
        "\r\n" ++
        "Hello from ZeroSMTP! This is plain text.\r\n" ++
        "\r\n" ++
        "--{s}\r\n" ++
        "Content-Type: text/html; charset=\"UTF-8\"\r\n" ++
        "\r\n" ++
        "<html><body><h1>Hello from ZeroSMTP!</h1>" ++
        "<p>This is an HTML email sent via mx.msgwing.com:465</p>" ++
        "</body></html>\r\n" ++
        "\r\n" ++
        "--{s}--\r\n",
        .{ from, to, subject, boundary, boundary, boundary, boundary });
    defer allocator.free(message);

    // The envelope addresses go in angle brackets, unlike the header ones.
    const envelope_from = try std.fmt.allocPrintZ(allocator, "<{s}>", .{from});
    defer allocator.free(envelope_from);
    const envelope_to = try std.fmt.allocPrintZ(allocator, "<{s}>", .{to});
    defer allocator.free(envelope_to);

    _ = c.curl_global_init(c.CURL_GLOBAL_DEFAULT);
    defer c.curl_global_cleanup();

    const curl = c.curl_easy_init() orelse {
        std.debug.print("Could not initialise libcurl\n", .{});
        return 1;
    };
    defer c.curl_easy_cleanup(curl);

    const recipients = c.curl_slist_append(null, envelope_to.ptr) orelse {
        std.debug.print("Out of memory building the recipient list\n", .{});
        return 1;
    };
    defer c.curl_slist_free_all(recipients);

    var upload = Upload{ .data = message };

    _ = c.curl_easy_setopt(curl, c.CURLOPT_URL, SMTP_URL);
    _ = c.curl_easy_setopt(curl, c.CURLOPT_USERNAME, username.ptr);
    _ = c.curl_easy_setopt(curl, c.CURLOPT_PASSWORD, password.ptr);
    _ = c.curl_easy_setopt(curl, c.CURLOPT_MAIL_FROM, envelope_from.ptr);
    _ = c.curl_easy_setopt(curl, c.CURLOPT_MAIL_RCPT, recipients);
    _ = c.curl_easy_setopt(curl, c.CURLOPT_READFUNCTION, payloadSource);
    _ = c.curl_easy_setopt(curl, c.CURLOPT_READDATA, &upload);
    _ = c.curl_easy_setopt(curl, c.CURLOPT_UPLOAD, @as(c_long, 1));
    _ = c.curl_easy_setopt(curl, c.CURLOPT_TIMEOUT, @as(c_long, 30));

    // On by default, set explicitly so nobody "fixes" a certificate error
    // later by flipping these to 0. A failure here means the machine's CA
    // store cannot validate the server, not that the server is wrong.
    _ = c.curl_easy_setopt(curl, c.CURLOPT_SSL_VERIFYPEER, @as(c_long, 1));
    _ = c.curl_easy_setopt(curl, c.CURLOPT_SSL_VERIFYHOST, @as(c_long, 2));

    const result = c.curl_easy_perform(curl);
    if (result != c.CURLE_OK) {
        std.debug.print("SMTP error: {s}\n", .{c.curl_easy_strerror(result)});
        if (result == c.CURLE_PEER_FAILED_VERIFICATION) {
            std.debug.print(
                "The machine's CA store could not validate the server certificate.\n",
                .{});
        }
        return 1;
    }

    std.debug.print("Email sent to {s}\n", .{to});
    return 0;
}
