#!/usr/bin/env python3
"""Validate packages/zerosmtp-mcp/server.json against what the MCP registry enforces.

Same class of failure as tools/check-action.py, found the same way. The registry
schema this file names in its own `$schema` caps `description` at 100 characters.
Nothing said so anywhere a person would read: on 2026-08-31 the field was 179
characters and had been since the package was published, so the entry was invalid
against the schema it declared and nobody would have found out until the registry
refused it.

The length is only half of it. server.json and package.json carry a description
each, and npm shows one while the registry shows the other. When they drift, the
project describes itself two different ways on the two surfaces an AI-assistant
user actually sees - which is the thing this repository already refuses to do for
its documentation pages via tools/check-facts.py.

So both are checked here, where it costs nothing to find out.

    python tools/check-mcp-server.py
"""

import json
import pathlib
import sys

KORZEN = pathlib.Path(__file__).resolve().parent.parent
PAKIET = KORZEN / "packages" / "zerosmtp-mcp"
SERWER = PAKIET / "server.json"
NPM = PAKIET / "package.json"

# static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json,
# definitions.ServerDetail.properties.description: {"maxLength": 100}.
# Read off the schema on 2026-08-31, not guessed.
MAX_OPISU = 100

# The one sentence, in the words the reader already uses. A description that
# lists only the tools describes a diagnostic library and hides the offer -
# which is what both files did until 2026-08-31.
SLOWA_OFERTY = ("relay", "password")


def main() -> int:
    for p in (SERWER, NPM):
        if not p.exists():
            print(f"{p.relative_to(KORZEN)} is missing", file=sys.stderr)
            return 1

    serwer = json.loads(SERWER.read_text(encoding="utf-8"))
    npm = json.loads(NPM.read_text(encoding="utf-8"))
    bledy = []

    opis = serwer.get("description", "")
    if not opis:
        bledy.append("description: missing")
    elif len(opis) > MAX_OPISU:
        bledy.append(
            f"description: {len(opis)} characters, and the registry schema caps it "
            f"at {MAX_OPISU}. Trim it here rather than finding out at the registry.")

    # A version in server.json that npm does not have is an entry pointing at
    # nothing. Both places in server.json name it, and both have to agree.
    wersje = {
        "server.json version": serwer.get("version"),
        "package.json version": npm.get("version"),
    }
    for i, p in enumerate(serwer.get("packages") or []):
        wersje[f"server.json packages[{i}].version"] = p.get("version")
    if len(set(wersje.values())) > 1:
        bledy.append("version: " + ", ".join(f"{k}={v!r}" for k, v in wersje.items())
                     + " - these must all be the same version")

    if serwer.get("name") != npm.get("mcpName"):
        bledy.append(f"name: server.json {serwer.get('name')!r} but package.json "
                     f"mcpName {npm.get('mcpName')!r}")

    # Both descriptions are read by a person deciding in seconds whether to add
    # this to their config. Neither may describe only the tools.
    for etykieta, tekst in (("server.json", opis), ("package.json", npm.get("description", ""))):
        brak = [w for w in SLOWA_OFERTY if w not in tekst.lower()]
        if brak:
            bledy.append(
                f"{etykieta} description: says nothing about {' or '.join(brak)}. "
                f"A reader on a directory shelf learns there are tools and never "
                f"learns there is a free relay behind them.")

    if bledy:
        for b in bledy:
            print(f"::error file=packages/zerosmtp-mcp/server.json::{b}", file=sys.stderr)
        return 1

    print(f"server.json is publishable - description {len(opis)}/{MAX_OPISU} "
          f"characters, version {serwer.get('version')}, and both descriptions "
          f"name the relay")
    return 0


if __name__ == "__main__":
    sys.exit(main())
