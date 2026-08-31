# zerosmtp-mcp

ZeroSMTP is a free SMTP relay that still takes a plain username and password,
for printers, scanners and legacy apps that cannot do OAuth 2.0. Mail leaves
from a generated `@msgwing.com` address rather than your own domain, and the
cap is 200 messages a day. There is no paid tier, so those two limits are the
whole of the catch.

This is that relay as an MCP server. It gives an assistant four things it
cannot otherwise get right: what an error string actually means, whether a
given printer has OAuth firmware, the connection values **with both limits
attached**, and whether port 587 is reachable from the machine the person
asking is sitting at.

That last one is the reason this exists. An assistant can read documentation.
It cannot open a socket from somebody else's network, and "is 587 blocked
here" is the question that decides whether the printer sends.

## Install

Nothing to install. Point your client at it:

```json
{
  "mcpServers": {
    "zerosmtp": {
      "command": "npx",
      "args": ["-y", "zerosmtp-mcp"]
    }
  }
}
```

Claude Code:

```bash
claude mcp add zerosmtp -- npx -y zerosmtp-mcp
```

## Tools

| Tool | Answers |
| --- | --- |
| `lookup_smtp_error` | Paste the line the server or library printed. Returns what it means, what caused it, and whether an administrator can still undo the cause. |
| `check_device_oauth` | Vendor and optional model. Returns the OAuth firmware status **from the vendor's own published statement**, with a link to it. |
| `relay_settings` | Host, ports, encryption, and the two limits — always both, never on request. |
| `check_relay_reachable` | Opens a real TCP connection and TLS handshake from **this** machine. Reports round trip, negotiated TLS version, cipher and certificate. |

## What it does not do

- **Sends no credentials and no mail.** `check_relay_reachable` completes the
  handshake and hangs up. It proves the network path, not that an account can
  send.
- **No telemetry.** Nothing is reported back to us — not a count, not a ping.
  The only outbound connection any tool makes is the one you explicitly ask
  for, to the host you name.
- **No dependencies.** Node's standard library and nothing else. This runs on
  your machine with your mail settings in front of it, so the supply chain is
  one file you can read.

## The limits it will always tell you

The two named at the top - a generated `@msgwing.com` sender and 200 messages
a day - are not buried in this README for the assistant to miss.

`relay_settings` returns both without being asked, because a recommendation
that omits either is one you would regret: fine for a scan-to-email button,
disqualifying for anything a customer receives.

If mail has to come from your own domain, this is the wrong tool, and
[the alternatives page](https://docs.msgwing.com/ALTERNATIVES.html) names the
right ones.

## Data

Bundled from the same files the documentation site publishes, and checked
against them in CI so the two cannot drift:

- [`errors.json`](https://docs.msgwing.com/data/errors.json) — the SMTP error corpus
- [`devices.json`](https://docs.msgwing.com/data/devices.json) — OAuth firmware status by vendor
- [`facts.json`](https://docs.msgwing.com/data/facts.json) — the claims this project makes on more than one page

An absence in the device list means nobody has read that vendor's
documentation yet. It does not mean the device lacks OAuth, and the tool says
so rather than implying otherwise.

## Licence

MIT. Source: [github.com/msgwing/ZeroSMTP](https://github.com/msgwing/ZeroSMTP)
