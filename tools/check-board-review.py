#!/usr/bin/env python3
"""Refuse a pull request in a reviewed class that carries no board verdict.

Why this exists, 2026-09-01. Six pull requests reached `main` on 2026-08-31
and 2026-09-01 - #390, #394, #396, #397, #399, #405 - and every one of them
returned `0` from:

    gh api repos/msgwing/ZeroSMTP/pulls/<n>/reviews

Among them: a pull request from a fork by somebody outside this project, a new
CI job, two new gates, a version bump that leads to a permanent npm publish,
and a page about a 56,410-star project whose central claim rested on one line
of somebody else's C#. Merges land on `--squash --auto`, so checks are the only
gate, and no check asked whether anybody had decided anything.

Requiring a review on every pull request is the wrong repair: this repository
merges on checks by design, and most of what ships is a docs page a later
commit can correct in minutes. So this refuses a narrow, named list instead -
changes whose cost, when they are wrong, is not paid by a later commit.

    python tools/check-board-review.py

What it cannot do, said plainly rather than discovered later: every agent here
authenticates with the same account, so nothing stops an author writing their
own BOARD line. This gate does not prove a review happened. It makes the
absence of one a red check and a permanent line in the pull request body,
which is what `auditor` reads and what the six did not have.
"""

import fnmatch
import os
import re
import subprocess
import sys

# Each entry: the class, why it is in the class, and the paths that name it.
# A path is here only if being wrong about it costs more than a follow-up
# commit. Everything not matched merges on checks, which is the default and
# is meant to stay the default.
KLASY = [
    ("irreversible outside this repository",
     "A published npm version cannot be unpublished and a registry entry cannot "
     "be recalled. The decision is made here or it is not made.",
     ["packages/*/package.json", "packages/*/server.json", "action.yml"]),

    ("the merge path itself",
     "A weakened or deleted check is invisible until the day it would have "
     "caught something.",
     [".github/workflows/*", ".github/check-workflows.py"]),

    ("a claim about somebody else's product",
     "A wrong port or a wrong field name sends a stranger's mail nowhere, and "
     "the page is the reason they trusted us. These are read off the vendor's "
     "own source or they are not written.",
     ["data/apps.json", "data/devices.json", "data/clients.json",
      "data/platforms.json", "docs/ALTERNATIVES.md"]),
]

WERDYKTY = ("MERGE WITH FOLLOW-UP", "MERGE", "REJECT", "ESCALATE")
WERDYKT = re.compile(r"^BOARD:\s*(" + "|".join(re.escape(w) for w in WERDYKTY) +
                     r")\s*[-\u2014]\s*\S.*$", re.M)
DOWOD = re.compile(r"^EVIDENCE:\s*\S.*$", re.M)


def zmienione(baza: str, glowa: str):
    wynik = subprocess.run(["git", "diff", "--name-only", baza, glowa],
                           capture_output=True, text=True, check=True)
    return [w for w in wynik.stdout.splitlines() if w]


def dopasowane(pliki):
    trafienia = []
    for nazwa, powod, wzorce in KLASY:
        p = sorted({f for f in pliki for w in wzorce if fnmatch.fnmatch(f, w)})
        if p:
            trafienia.append((nazwa, powod, p))
    return trafienia


def main() -> int:
    baza = os.environ.get("BAZA_SHA", "")
    glowa = os.environ.get("GLOWA_SHA", "HEAD")
    tresc = os.environ.get("TRESC_PR", "")
    fork = os.environ.get("Z_FORKA", "") == "true"

    if not baza:
        print("Not a pull request - nothing to decide.")
        return 0

    pliki = zmienione(baza, glowa)
    trafienia = dopasowane(pliki)
    if fork:
        trafienia.append((
            "a pull request from a fork",
            "The author cannot read this project's doctrine, so the only place "
            "its conventions get applied is the review. #390 shipped correct "
            "code and left the site without the page the CLI now references.",
            [f"head repository is not msgwing/ZeroSMTP"]))

    if not trafienia:
        print(f"{len(pliki)} changed file(s), none in a reviewed class - "
              f"checks are the gate here, as intended.")
        return 0

    ma_werdykt = bool(WERDYKT.search(tresc))
    ma_dowod = bool(DOWOD.search(tresc))
    if ma_werdykt and ma_dowod:
        print("Board verdict present:")
        print("  " + WERDYKT.search(tresc).group(0).strip())
        print("  " + DOWOD.search(tresc).group(0).strip())
        return 0

    print("::error::This pull request is in a class that does not merge on "
          "checks alone, and its body carries no board verdict.", file=sys.stderr)
    for nazwa, powod, p in trafienia:
        print(f"\n  {nazwa}", file=sys.stderr)
        print(f"    {powod}", file=sys.stderr)
        for f in p:
            print(f"    - {f}", file=sys.stderr)
    print("\n  Add two lines to the pull request body. change-board writes "
          "them after answering the four questions in "
          ".claude/agents/change-board.md:", file=sys.stderr)
    print("\n    BOARD: MERGE - <what it earns>", file=sys.stderr)
    print("    EVIDENCE: <the command that was run, and what it printed>",
          file=sys.stderr)
    if not ma_werdykt:
        print(f"\n  No line matched BOARD: <{' | '.join(WERDYKTY)}> - <reason>.",
              file=sys.stderr)
    if not ma_dowod:
        print("  No line matched EVIDENCE: <what was run>. A verdict with "
              "nothing behind it is the thing this gate exists to stop.",
              file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
