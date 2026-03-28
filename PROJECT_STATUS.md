# Mellow Empire — Project Status & Functional Specification

**Last updated:** 2026-03-27  
**Updated by:** Cursor  
**Product type:** Client build — static marketing site  
**Production URL:** TBD (confirm hostname when live; often Vercel/Netlify/Cloudflare Pages)  
**Repo:** https://github.com/zyntel-co-ltd/mellow-empire  

This document follows **`knowledge` → `zyntel-playbook/05-infrastructure/project-status-file.md`** (13 sections).

---

## 1. What This Product Is

Static marketing / landing site for the **Mellow Empire** client. Single-page `index.html` with brand assets under `images/`. Same delivery pattern as other Zyntel agency static sites: minimal surface area, fast deploy, optional GitHub Action for Pulse → Cursor rules sync.

---

## 2. Current State

**Status:** Maintenance / content updates as needed  
**Phase:** v1 static  
**Paying clients:** Agency client

### Build summary

| Module / Area | State | Notes |
|---------------|-------|-------|
| Landing | ✅ Live | Responsive `index.html` |
| Assets | ✅ Live | `images/logo/` |
| CI / rules sync | ✅ Live | `.github/workflows/pulse-sync.yml` (if connected) |

### Planned

- [ ] Confirm production hostname and hosting target in this file when live

---

## 3. Stack & Infrastructure

| Layer | Technology | Provider | Environment | Notes |
|-------|------------|----------|-------------|-------|
| Frontend | Static HTML + CSS/JS | TBD | — | SVG logos |

### Environment variables

None required for static hosting.

---

## 4. Data Model

**N/A** — no application database.

---

## 5. Features & Functionality (complete specification)

### Feature: Marketing landing page

**Status:** ✅ Live  
**Module:** Marketing  
**User:** Site visitors  

**What it does:** Presents the client brand and messaging in a responsive single page.

**How it works (technical):** Static assets only.

Key files:
- `index.html`
- `images/logo/` — SVG logos

**What it does NOT do:**
- No CMS, auth, API, or e-commerce.

---

## 6. User Roles & Permissions

| Role | Who | Can | Cannot |
|------|-----|-----|--------|
| Visitor | Public | Read | Write |
| Maintainer | Zyntel ENG | Edit, deploy | — |

---

## 7. Integrations & External Dependencies

| System | How connected | Direction | What it does | Fallback if down |
|--------|---------------|-----------|--------------|------------------|
| GitHub | git | R/W | Source | — |
| Pulse (optional) | workflow | Read | Rules sync | Manual |

---

## 8. API Surface

**N/A**

---

## 9. Active Issues & Blockers

| Issue | Linear ID | Priority | Status | Notes |
|-------|-----------|----------|--------|-------|
| Production URL | — | Low | Open | Document when known |

---

## 10. Key Decisions Made

| Decision | What was decided | Why | Date |
|----------|------------------|-----|------|
| Static first | HTML + assets only | Cost and speed for agency v1 | Prior |

---

## 11. Branch State

| Branch | Purpose | Last active |
|--------|---------|-------------|
| `main` | Production source | ongoing |

---

## 12. How to Run Locally

```bash
git clone git@github.com:zyntel-co-ltd/mellow-empire.git
cd mellow-empire
# Serve static files, e.g. python -m http.server 8080
```

---

## 13. Cursor Context (Read Before Writing Any Code)

- **Base branch:** `main`
- **Linear team:** Engineering (ENG) — agency client project
- **After any change:** Update `Last updated` and Sections 2/5 as needed
- **Rule:** `.cursor/rules/project-status-enforcement.mdc`
- **Do not commit** `repomix-output.xml` (gitignored)

---

## Repo map (high-signal)

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
