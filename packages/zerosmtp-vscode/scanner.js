'use strict';

// Heuristic scan for SMTP configuration that authenticates to Microsoft 365
// with a plain username and password (Basic Auth) rather than OAuth2. Basic
// Auth for SMTP AUTH is being retired for Exchange Online in December 2026 -
// see https://docs.msgwing.com/EXCHANGE-ONLINE-SMTP-AUTH.html
//
// This is a text search, not a parser for any specific config format - it has
// to work the same way against a .env file, appsettings.json, web.config, and
// a literal string in a C# or Python file. It looks for the Microsoft 365
// SMTP hostnames, then looks at the surrounding lines for words that suggest
// a password on one hand or an OAuth2 flow on the other.
//
// This has no `vscode` dependency on purpose: it is the part that can be
// unit-tested with `node --test`, without the Extension Development Host.

const HOST_PATTERN = /\b(?:smtp\.office365\.com|outlook\.office365\.com)\b/gi;

const CREDENTIAL_HINT =
  /\b(?:password|passwd|pwd|networkcredential|smtp_pass|smtppass|mail_password|basicauth)\b/i;

const OAUTH_HINT =
  /\b(?:oauth2?|xoauth2|client[_-]?secret|access[_-]?token|refresh[_-]?token|tenant[_-]?id|clientid|msal)\b/i;

// How many lines around a host match to read before deciding whether a
// password or an OAuth2 flow is what's actually configured. Credentials and
// host are rarely on the same line (e.g. appsettings.json, web.config), so
// looking only at the matched line would miss almost everything.
const CONTEXT_LINES = 10;

const DOC_LINK = 'https://docs.msgwing.com/EXCHANGE-ONLINE-SMTP-AUTH.html';

/**
 * @param {string} text file contents
 * @returns {Array<{line: number, column: number, length: number, severity: 'warning'|'information', message: string}>}
 */
function scanText(text) {
  const lines = text.split(/\r\n|\r|\n/);
  const findings = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    HOST_PATTERN.lastIndex = 0;
    let match;
    while ((match = HOST_PATTERN.exec(line)) !== null) {
      const from = Math.max(0, i - CONTEXT_LINES);
      const to = Math.min(lines.length, i + CONTEXT_LINES + 1);
      const window = lines.slice(from, to).join('\n');

      const hasCredential = CREDENTIAL_HINT.test(window);
      const hasOAuth = OAUTH_HINT.test(window);

      let severity;
      let message;
      if (hasCredential && !hasOAuth) {
        severity = 'warning';
        message =
          `Looks like Basic Auth SMTP to Microsoft 365 (${match[0]}). Basic Auth for SMTP AUTH is being ` +
          `retired in December 2026 - this will stop sending mail. ${DOC_LINK}`;
      } else if (hasCredential && hasOAuth) {
        severity = 'information';
        message =
          `Microsoft 365 SMTP host (${match[0]}) referenced near both a password-looking setting and an ` +
          `OAuth-looking setting. Confirm which one is actually used before December 2026. ${DOC_LINK}`;
      } else {
        severity = 'information';
        message =
          `Microsoft 365 SMTP host (${match[0]}) referenced here. If this authenticates with a plain ` +
          `username and password, it will stop working in December 2026. ${DOC_LINK}`;
      }

      findings.push({
        line: i,
        column: match.index,
        length: match[0].length,
        severity,
        message,
      });
    }
  }

  return findings;
}

module.exports = { scanText, HOST_PATTERN, CREDENTIAL_HINT, OAUTH_HINT, DOC_LINK, CONTEXT_LINES };
