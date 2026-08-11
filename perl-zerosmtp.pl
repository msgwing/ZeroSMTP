#!/usr/bin/env perl

# perl-zerosmtp.pl
# Perl 5 Net::SMTP + IO::Socket::SSL - ZeroSMTP mx.msgwing.com:465 SSL/TLS
# Production-ready | Let's Encrypt | Certificate verification on
#
# Net::SMTP and IO::Socket::SSL ship with most distributions' Perl. The auth
# step additionally needs Authen::SASL, which does not come with core Perl:
#
#   Debian/Ubuntu   apt install libnet-smtp-ssl-perl libauthen-sasl-perl
#   RHEL/Fedora     dnf install perl-Authen-SASL perl-IO-Socket-SSL
#   any platform    cpanm Authen::SASL IO::Socket::SSL

use strict;
use warnings;

use Net::SMTP;
use IO::Socket::SSL qw(SSL_VERIFY_PEER);

my %config = (
    username => $ENV{ZEROSMTP_USERNAME} // 'your-username',
    password => $ENV{ZEROSMTP_PASSWORD} // 'your-password',
    from     => $ENV{ZEROSMTP_FROM}     // 'sender@example.com',
    to       => $ENV{ZEROSMTP_TO}       // 'recipient@example.com',
    subject  => $ENV{ZEROSMTP_SUBJECT}  // 'Test Email from ZeroSMTP',
);

# A multipart/alternative body, so clients that cannot render HTML still show
# something readable. SMTP wants CRLF line endings; Net::SMTP's datasend
# handles the conversion, so plain "\n" here is correct.
sub build_message {
    my ($boundary) = @_;

    return <<"MAIL";
From: $config{from}
To: $config{to}
Subject: $config{subject}
MIME-Version: 1.0
Content-Type: multipart/alternative; boundary="$boundary"

--$boundary
Content-Type: text/plain; charset="UTF-8"

Hello from ZeroSMTP! This is plain text.

--$boundary
Content-Type: text/html; charset="UTF-8"

<html><body><h1>Hello from ZeroSMTP!</h1><p>This is an HTML email sent via mx.msgwing.com:465</p></body></html>

--$boundary--
MAIL
}

sub send_email {
    # SSL => 1 means implicit TLS on port 465, negotiated before the SMTP
    # greeting. Use Port => 587 with SSL => 0, Starttls => 1 if you prefer
    # STARTTLS - both are accepted.
    my $smtp = Net::SMTP->new(
        'mx.msgwing.com',
        Port            => 465,
        SSL             => 1,
        SSL_verify_mode => SSL_VERIFY_PEER,
        Timeout         => 30,
    );

    unless ($smtp) {
        # $IO::Socket::SSL::SSL_ERROR carries the reason when the failure was
        # in the TLS handshake rather than the TCP connection - without it a
        # certificate problem is indistinguishable from an unreachable host.
        warn "Connection failed: $@\n";
        warn "TLS error: $IO::Socket::SSL::SSL_ERROR\n"
            if $IO::Socket::SSL::SSL_ERROR;
        return 0;
    }

    unless ($smtp->auth($config{username}, $config{password})) {
        warn "Authentication failed: ", $smtp->message, "\n";
        $smtp->quit;
        return 0;
    }

    my $boundary = 'boundary_zerosmtp_' . time;
    my $ok =
           $smtp->mail($config{from})
        && $smtp->to($config{to})
        && $smtp->data
        && $smtp->datasend(build_message($boundary))
        && $smtp->dataend;

    unless ($ok) {
        warn "SMTP error: ", $smtp->message, "\n";
        $smtp->quit;
        return 0;
    }

    $smtp->quit;
    print "Email sent to $config{to}\n";
    return 1;
}

exit(send_email() ? 0 : 1);
