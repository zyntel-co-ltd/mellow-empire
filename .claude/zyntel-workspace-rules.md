# Zyntel workspace rules (all Zyntel repositories)

<!-- Synced copy. Do not edit it in this repository: the source is `.claude/zyntel-workspace-rules.md` in the
     knowledge repository (github.com/zyntel-co-ltd/knowledge). Change it there, then run
     `bash scripts/sync-workspace-rules.sh --push` from the knowledge repository to update every repository. -->

These rules apply to every Zyntel repository and to anyone working in it: staff, contractors and AI coding agents
(Claude Code, Codex, Cursor or any other). The repository's own `CLAUDE.md` adds product-specific rules on top. Where
the two disagree, the stricter rule wins; ask if it is unclear.

"The knowledge repo" below means `github.com/zyntel-co-ltd/knowledge`; "the playbook" is its `zyntel-playbook/`
folder. If you only cloned this repository, clone the knowledge repo next to it to follow the links.

## 1. Plane is the work tracker: no unscheduled work

All work is tracked in **Plane** (workspace `zyntel`). Projects: `ENG` (engineering across products), `OPS`
(operations), `FORMS` (ZyntForms), `KANTA` (KantaHub), `5S` (Five S property management), `FATUR` (Faturamento),
`GRCR` (GreatCare), `NATAL` (Natalis), `MAZRA` (Mazra), `NHLFB` (Nakasero feedback), `ZSITE` (zyntel.net website).
Plane's word for a ticket is **work item**. Working agreement: playbook `07-tools/plane.md`.

1. **No work without a Plane work item.** Before changing code, schema, docs, infrastructure or configuration, find
   the matching work item in the product's project, or create one first (name, short description, link to the
   doc/ADR it comes from, priority). Questions, reading and research that change nothing do not need one.
2. **New asks become work items immediately**, even mid-session, before you start them. If you are asked for
   something unscheduled, create the item, then do it.
3. **Keep state honest:** `Todo` when queued, `In Progress` while working, `Done` only when verified (build, smoke
   test or browser check, as the product requires). Put blockers and decisions in the item, not only in chat.
4. **Reference the item** in commit messages and in the project's `PROJECT_STATUS` or docs (e.g. `NATAL-16`).
5. **If something was done without an item** (emergency fix), create the item in the same session and mark it Done
   with a note of what was done and why.
6. **Labels and modules:** pass label and state IDs, not names. Modules are not enabled on every project; prefix
   names with a phase tag (e.g. `[B]`) instead.
7. **Tool access:** AI agents use the Plane MCP server (tools `workitem`, `project`, `state`, `label`, `module`). If
   you have no Plane access, stop and ask the person who gave you the task for an item ID; do not skip the rule.
   Never put secrets in work items.
8. At the end of a session, make sure every item you touched reflects reality, and leave a pickup note in the
   product's docs (pattern: `natalis/docs/NEXT_SESSION.md`).

## 2. Never print secret values

When showing `.env` files, connection strings, API keys, tokens, passwords or any other credential, in terminal
output, chat or files you write, show only the variable name, never the value: `KEY=<redacted>`. This holds even
when the value is only needed to confirm a variable exists, when someone pastes a secret into chat (do not echo it
back), and when the value is already visible elsewhere.

To *use* a secret (connect to a database, call an API), read it and pass it to the tool directly; do not print it.
When a command would print a secret (`cat .env`, `printenv`), pipe it through a redaction step such as
`sed 's/=.*/=<redacted>/'`.

## 3. Record what you learn and the tools you use

Each session leaves the next one better off. Record what is worth keeping in the same session, before finishing:

- **Interesting finds** (a technique, a competitor move, a security finding, a decision and its reason): a dated entry
  in the right playbook place: security in `14-cybersecurity/log.md`, strategy and competitors in `01-strategy`,
  growth ideas in `07-growth`, product detail in the product's `PROJECT_STATUS`. Name the source. Mark claims you did
  not verify as "as stated, not verified".
- **Tools and procedures** (how a file type was read, a CLI that worked, a command that failed and why, an install
  location): the playbook's tool pages (`07-tools/`) and the project's `docs/workflows.md` where it has one. State
  what is verified and what is not. Start from those pages before inventing a method.
- **Gotchas as they happen:** add a gotcha to the docs when you hit it, not at the end of the work.
- **Never record secrets:** variable names and where they live, never values.
- **Videos, articles and other media shared with you: learn from them, do not summarise them.** Write the reusable
  knowledge into topic pages organised by how we would apply it, and add one line per batch to the media ledger.
  Method: playbook `07-tools/video-and-media-analysis.md`.
- **Downloads need the owner's explicit yes** (state file name, source and size first), even for a model or package.

## 4. Working practices

- **Verify before saying done.** Run the build, the tests and the product's smoke or browser check, and say what
  was and was not checked. Repository docs can lag behind the code: check the code before trusting a doc.
- **Write docs for the whole team.** Neutral voice, no prior knowledge assumed, never addressed to one person. For a
  shipped screen, explain what it means and what normal and broken look like.
- **Stay on the product you were asked about.** A problem you notice in another product gets one line in your report
  (and a work item in its project), not a chain of unrequested work.
- **Ask before anything billed** (paid services, upgrades, purchases) or anything hard to undo in production.
