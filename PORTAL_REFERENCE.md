# wscanplus Portal Reference
`PORTAL_REFERENCE.md` (repository root) — Claude/Codex session handoff document

---

## Purpose

This document explains every design decision in `portal_index.html` (at the
repository root) so any future Claude or Codex session can maintain, extend,
or build additional portal variants without re-litigating decisions already
made.

---

## What the portal is

A **generic operator-class captive portal** that matches the structural and
visual conventions of real ISP hotspot portals (sticky branded top bar,
network status bar, card-based layout, email + password/access-code fields,
ToS accept, primary CTA button, guest path, help links, session confirmation
screen). It does not replicate any specific operator's brand, logo, or domain.

It is used as a **test artifact for the Gemini AI agent** to develop and
validate fake-versus-real portal detection. The educational walkthrough
and user-facing warnings live inside the wscanplus Android app, handled
by Gemini in-app. They do not belong in this file.

---

## Why it looks the way it does

The portal is deliberately built to the **visual class** of real operator
portals rather than being generic. The reason is operational: if the test
portal looks too different from what a real threat actor deploys, Gemini
learns to detect surface-level visual differences rather than the underlying
structural signals that mark a portal as fake. A sophisticated actor uses
a polished portal. The test artifact needs to match that standard.

The specific conventions used — sticky blue top bar with logo area, network
status sub-bar showing SSID + auth state, card layout, input icons, guest
path, help links — are drawn from the common design pattern across real
operator portals (Cox, AT&T, Xfinity, Spectrum, etc.) documented at their
public-facing hotspot URLs. No specific operator's brand, color code, logo,
or domain is used.

---

## Detection signals embedded in the portal

These are the structural properties that mark the portal as fake.
All are real signals present in every actual fake portal deployed in the wild.

| Signal | Where in file | Real portal comparison |
|--------|--------------|----------------------|
| `data-wscanplus-artifact` on `<html>` | html element | Real portals never have this |
| POST to `/capture` | capture-form action | Real portals POST to RADIUS proxy or OAuth endpoint |
| `type=text` on password field | #field-pass | Real portals use `type=password` |
| No CSRF token hidden field | form — absent | Real portals always include one |
| No session token hidden field | form — absent | Real portals bind form to server session |
| No redirect_uri field | form — absent | Real portals redirect to operator success URL |
| No MAC address hint field | form — absent | RADIUS portals pass client MAC as hidden field |
| Served from local IP | window.location.hostname | Real portals use registered operator domains |
| No TLS cert from trusted CA | transport layer | Real portals have valid cert chain |
| Generic ToS — no operator identity | tos-scroll | Real portals name the operator and provide contact |

The `wscanplus-fingerprint` JSON block in the page is readable by Gemini
via `GET /fingerprint` (Marauder serves it) or direct DOM parse:
```js
JSON.parse(document.getElementById("wscanplus-fingerprint").textContent)
```
It returns pre-scored signals, weights, and aggregate fake score (0.96).

---

## Guest path

The portal has two submission paths intentionally:

1. **Sign-in path** — email + password + ToS → POST /capture
2. **Guest path** — ToS only → POST /capture with `guest=1`

Real operator portals offer both. A fake portal that only offers the
credential path is easier to detect. Including the guest path makes the
artifact a more complete and realistic test case, and matches the
actual attack surface (a threat actor wants the credential path used,
but will accept the guest path to avoid arousing suspicion).

Both paths capture the full device analytics payload.

---

## SSID population

The SSID displayed in the network status bar is populated from the URL
query parameter `?ssid=` or `?network=`. Marauder's evil portal passes
the AP's SSID when serving the page if configured. If absent, defaults
to `Guest_WiFi`. The SSID is also included in the capture POST as `ssid`.

---

## Capture payload fields

Every submission (sign-in or guest) POSTs these fields to `/capture`:

| Field | Content |
|-------|---------|
| `ts` | ISO 8601 timestamp |
| `email` | Form input (empty string if guest) |
| `password` | Form input (empty string if guest) |
| `tos` | `1` if accepted |
| `guest` | `1` if guest path used |
| `ua` | Full User-Agent string |
| `platform` | `navigator.platform` |
| `lang` | `navigator.language` |
| `sw` / `sh` | Screen width × height |
| `dpr` | Device pixel ratio |
| `tz` | IANA timezone |
| `conn` | `effectiveType` (4g, wifi, etc.) |
| `vendor` | Browser vendor string |
| `touch` | yes/no |
| `mem` | `deviceMemory` GB |
| `cores` | `hardwareConcurrency` |
| `ssid` | Network SSID from URL param |
| `wscanplus_artifact_id` | `wscanplus-portal-test-001` |
| `wscanplus_class` | `FAKE_TEST_PORTAL` |
| `wscanplus_signals` | Comma-separated fired signal names |

Marauder intercepts the POST and streams it over serial. The Flipper FAP
writes it to `/apps_data/marauder/logs/evilportal_NNN.log` via the existing
log pipeline in `wifi_marauder_scene_console_output.c`.

`window.wscanplusLastCapture` is also set on the page for Gemini CLI
inspection without needing to read the log file.

---

## What NOT to change

- Do not add Cox, AT&T, Xfinity, or any real operator's name, logo, or domain.
- Do not remove the `data-wscanplus-*` attributes — they are detection signals.
- Do not remove the fingerprint JSON block — Gemini reads it.
- Do not change the capture endpoint from `/capture` — Marauder handles it.
- Do not add educational content or user warnings to this file — that is
  Gemini's responsibility inside the Android app (AI split: Gemini handles in-app analysis).

---

## Adding more portal variants

For each new portal variant (e.g. apartment complex portal, library portal,
coffee shop portal):

1. Copy `portal_index.html` to `[variant_name].html` in the repo root
2. Change visual styling to match the new class (color scheme, logo area text)
3. Keep all `data-wscanplus-*` attributes and the fingerprint block
4. Update `artifact_id` in the fingerprint JSON to a new unique ID
5. Load via Flipper: `Evil Portal → Load Evil Portal HTML file`

---

## File locations on Flipper SD

```
SD:/apps_data/marauder/portal_index.html        ← this portal (copy from repo root)
SD:/apps_data/marauder/logs/evilportal_NNN.log  ← capture output
SD:/apps_data/marauder/pcaps/                   ← WiFi capture PCAPs
```

---

## Threat context alignment

- Primary attack surface: evil twin / rogue AP with credential capture portal
- Target population: non-technical older and disabled veterans in multi-unit housing
- Observed attacker behavior: proximate, manual, adaptive, persistent
- Product gap: documentation and explanation for non-technical people

This portal directly tests the attack surface described. The Gemini agent's
job is to detect it, score it, and surface a plain-language explanation of
what it found — not to be triggered by this file or act outside its in-app
analysis role.
