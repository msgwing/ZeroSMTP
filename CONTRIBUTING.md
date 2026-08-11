# Contributing to ZeroSMTP

Thanks for considering a contribution. This repo is mostly a collection of
self-contained code examples and setup docs, so most contributions fall into
one of the categories below.

## Reporting a bug

Check [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) and
[docs/FAQ.md](docs/FAQ.md) first — most first-run issues are a cloud
provider blocking outbound SMTP, not a bug in an example. If it's still a
bug, [open an issue](https://github.com/msgwing/ZeroSMTP/issues/new/choose)
with the file/example affected, the exact error, and your environment
(OS, language/runtime version, port used).

## Suggesting a feature or doc improvement

Open an issue describing the gap and who it'd help (a language not yet
covered, a platform/tool not documented, a confusing section). For anything
beyond a small fix, opening the issue first avoids a PR that doesn't match
what maintainers had in mind.

## Publishing Find-SmtpAuthExposure.ps1 to the PowerShell Gallery

The script carries a `<#PSScriptInfo#>` block so `Publish-Script` accepts it.
Sysadmins search the Gallery; a script they can install in one command is a
different proposition from a file they have to find and download.

Validate first — this catches missing metadata before the upload rather than
after:

```powershell
Test-ScriptFileInfo -Path .\Find-SmtpAuthExposure.ps1
```

Then publish, with an API key from your https://www.powershellgallery.com
account:

```powershell
Publish-Script -Path .\Find-SmtpAuthExposure.ps1 -NuGetApiKey <key>
```

**A version can never be replaced or deleted**, only superseded, so bump
`.VERSION` in the PSScriptInfo block for every publish. Keep `.GUID`
unchanged — it identifies the script across versions, and a new GUID creates
a second, competing listing.

Once it is live, users install it with:

```powershell
Install-Script Find-SmtpAuthExposure
```


## Adding a new language example

This is the highest-value kind of contribution. Each example is a single,
self-contained file named `<language>-zerosmtp.<ext>` that reads credentials
from the same four environment variables every other example uses:
`ZEROSMTP_USERNAME`, `ZEROSMTP_PASSWORD`, `ZEROSMTP_FROM`, `ZEROSMTP_TO`
(optionally `ZEROSMTP_SUBJECT`) — see any existing example
(e.g. [`python-zerosmtp.py`](python-zerosmtp.py)) as a template for the
shape and comments expected.

Checklist to fully wire in a new language:

1. Add `<language>-zerosmtp.<ext>` at the repo root, using the env vars
   above — never hardcode credentials.
2. If it needs a third-party library, add the matching manifest file
   (e.g. `package.json`, `composer.json`) rather than a global install step.
3. Add a syntax-check job for it to
   [`.github/workflows/lint.yml`](.github/workflows/lint.yml).
4. Add a row to the Code Examples table in both
   [README.md](README.md#code-examples) and [README.pl.md](README.pl.md).
5. Add the runtime to the [Dev Container](.devcontainer/devcontainer.json)
   (a `ghcr.io/devcontainers/features/*` entry, if one exists for it) and to
   the language table in [docs/LINUX.md](docs/LINUX.md).
6. If it introduces a new package ecosystem, add an entry to
   [`.github/dependabot.yml`](.github/dependabot.yml).
7. Add the file(s) to the matching group in
   [`.github/labeler.yml`](.github/labeler.yml) so PRs touching it get
   auto-labeled.

A PR that only does step 1 is still welcome — a maintainer can help with the
rest — but doing all of it makes for a much faster merge.

## Development setup

```bash
git clone https://github.com/msgwing/ZeroSMTP.git
cd ZeroSMTP
```

Every language runtime used by the examples comes preinstalled if you open
this repo in the included [Dev Container or a GitHub Codespace](.devcontainer/devcontainer.json) —
no local setup needed. Otherwise see [docs/LINUX.md](docs/LINUX.md) or
[docs/WINDOWS-SERVER.md](docs/WINDOWS-SERVER.md) for per-platform install
commands.

Copy [`.env.example`](.env.example) to `.env` and fill in a real
[msgwing.com](https://msgwing.com) account's credentials to actually send a
test message while you work.

## Pull request process

```bash
git checkout -b my-feature-branch
# make your changes
git commit -m "Add some feature"
git push origin my-feature-branch
```

Then open a PR against `main`. [`lint.yml`](.github/workflows/lint.yml)
syntax-checks every example on every PR — make sure it's green before
requesting review.

## Code style

- Match the existing style of the file you're editing.
- Use meaningful names; keep comments to the non-obvious "why", not the
  "what".
- Never commit real credentials — every example and doc uses placeholder
  values and reads real ones from environment variables.

Thanks for helping improve ZeroSMTP!
