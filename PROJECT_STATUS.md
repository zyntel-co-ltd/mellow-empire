# Mellow Empire — Project Status

**Last updated:** 24 March 2026  
**Updated by:** Cursor  
**Repo:** https://github.com/zyntel-co-ltd/mellow-empire

---

## Repo map (high-signal)

Generated from a `repomix --no-files` snapshot (paths only). **No secrets or file contents** are included here.

### Top-level

```text
.github/
images/
```

### Key entrypoints

```text
index.html
PROJECT_STATUS.md
```

## What This Project Is

Static marketing / landing site for the Mellow Empire client. Single-page `index.html`, brand assets under `images/`. Deployed as a lightweight static site (hosting TBD — often Vercel/Netlify/Cloudflare Pages for Zyntel client work).

---

## Current State

**Status:** Maintenance / content updates as needed  
**Phase:** v1 static

### What is built

- [x] Responsive landing (`index.html`)
- [x] Logo assets (`images/logo/`)
- [x] GitHub Action `pulse-sync.yml` — Cursor rules sync from Pulse (if connected)

### Planned / optional

- [ ] Confirm production hostname and hosting target in this file when live

---

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | Static HTML + CSS/JS inline or linked |
| Assets | SVG logos |

---

## Branch state

| Branch | Purpose |
|--------|---------|
| `main` | Production source |

---

## Cursor context

- **Linear team:** Engineering (ENG) — agency client project.
- **Do not commit** `repomix-output.xml` (gitignored).
