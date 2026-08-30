# ZeroSMTP: Basic Auth SMTP Scanner (VS Code)

Basic Auth for SMTP AUTH against Exchange Online / Microsoft 365 is being
retired in December 2026. Anything that still logs in with a plain username
and password to `smtp.office365.com` or `outlook.office365.com` — a printer's
scan-to-email setup, an ASP.NET `appsettings.json`, a `.env` file, a script —
stops sending mail on that date, silently, until someone reads the log.

This extension looks for that configuration in your open workspace before it
becomes an incident, and decodes the error once it does.

## What it does today (v0.1.0, work in progress)

- **`ZeroSMTP: Scan workspace for Basic Auth SMTP config`** — a text search
  (not a parser for any one config format) across `.env` files,
  `appsettings*.json`, `web.config`/`*.config`, and common source files, for
  `smtp.office365.com` / `outlook.office365.com` alongside a password-looking
  setting. Reports each hit in the Problems panel with a link to
  [`docs.msgwing.com/EXCHANGE-ONLINE-SMTP-AUTH.html`](https://docs.msgwing.com/EXCHANGE-ONLINE-SMTP-AUTH.html).
  If OAuth2-looking settings (`clientSecret`, `tenantId`, `accessToken`, ...)
  are also nearby, the finding is downgraded from a warning to an
  informational note rather than assumed fixed — this is a heuristic, not a
  certainty, and says so in the message.
- **`ZeroSMTP: Explain this SMTP error`** — takes the current selection (or
  prompts for pasted text) and decodes it using the exact same error corpus
  and matching logic as
  [`zerosmtp-check --explain`](https://www.npmjs.com/package/zerosmtp-check):
  this extension imports `zerosmtp-check`'s `explain()` function rather than
  re-implementing the matching rules or duplicating `data/errors.json`.

## What is not done yet

This is real, working code, not a stub — both commands run and are tested —
but it is one working session into a multi-day task, and honest about the
gap:

- **Not on the Marketplace.** Publishing needs a Visual Studio Marketplace
  publisher agreement for a `msgwing` publisher id, which is a separate
  system from the GitHub Marketplace listing `send-email-action` already has
  (Azure DevOps / Personal Access Token, not a GitHub credential) — unverified
  whether one already exists, and creating one is not something this task can
  do on its own. `"private": true` is set so a stray `vsce publish` can't ship
  this by accident.
- ~~The `zerosmtp-check` dependency is `file:../zerosmtp-check`~~ — resolved
  2026-08-30: `zerosmtp-check@1.3.0` (with `explain`/`explainJson` exported)
  is now published, and the dependency is a real semver range (`^1.3.0`).
- **The scanner is a heuristic, deliberately.** It has no test against every
  config format in the wild (only `appsettings.json`, `web.config`, and
  `.env` shapes are covered by `test/scanner.test.js`), and it does not parse
  JSON/XML/YAML — it reads text, on purpose, so it works the same way
  regardless of the file format.
- **No icon, no `CHANGELOG.md` entries beyond this release, no
  `@vscode/vsce` packaging step wired up.**

## Free tier this points to

`zerosmtp-check` and the docs this extension links to describe MsgWing's free
relay: 200 messages a day, sent from a generated `@msgwing.com` address, not
the user's own domain. Stated here because the extension's own messages link
straight to that page.

## Development

```
cd packages/zerosmtp-vscode
npm install
npm test                 # scanner.test.js - no `vscode` module needed
```

To try the commands themselves, open this folder in VS Code and press F5 to
launch an Extension Development Host (requires `npm install` first, for the
`zerosmtp-check` dependency and the ambient `vscode` typings VS Code provides
at debug time).
