# Copilot Instructions — wscanplus WebUI

Hard rules:
1. No secrets committed (ever).
2. One PR at a time; squash merge only.
3. CI must be green before merging.
4. No shell injection risks.
5. Do not add new CI scanners unless explicitly requested.

Context:
- This repo is part of the wscanplus ecosystem — WiFi threat detection for non-technical users.
- Portal artifacts (portal_index.html, variants) are **test harnesses for Gemini detection** — not deployable attack tools.
- OUI data (sweep-tool-v2.jsx, oui_lookup.js, oui_db.txt) is embedded threat intel for offline defensive use.
- sweep-tool-v2.jsx is a React component — no build toolchain in this repo. It is consumed by a host project.
- oui_lookup.js targets Flipper Zero Momentum firmware JS runtime — not Node.js. Do not add Node.js imports.

If a request risks expanding scope or adding untested behavior, STOP and file an Issue.
