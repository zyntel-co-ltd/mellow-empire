# Claude Code Rules

> These rules apply to every session in this project.

## Secrets and Credentials

Never print secret values — `.env` contents, connection strings, API keys, tokens, passwords, or any other credential — in terminal output, chat, or files written to disk. Show only the variable name, using `KEY=<redacted>` instead of the real value, even when it's just to confirm a variable exists or was just added.

If a secret needs to be *used* (connecting to a database, calling an API), read it and use it directly in the tool call — just don't print it to the transcript. When a command would naturally print a secret to stdout (`cat .env`, `printenv`), pipe it through a redaction step (e.g. `sed 's/=.*/=<redacted>/'`) instead of printing raw.
