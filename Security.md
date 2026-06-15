# 🔐 Security Policy

## 📌 Supported Versions

The following versions of TaskQuest currently receive security updates:

| Version | Supported |
| ------- | --------- |
| 2.x.x   | ✅ Active development — security patches applied immediately |
| 1.x.x   | ⚠️ Critical security fixes only |
| <1.0    | ❌ No longer supported (upgrade to latest version) |

---

## 📌 Overview

TaskQuest is a client-side web application (HTML, CSS, JavaScript) that stores user data in the browser's LocalStorage. While no server-side component exists, the following security considerations apply:

- **XSS (Cross-Site Scripting):** User-supplied task descriptions, tags, and notes are rendered in the DOM. All text must be properly escaped.
- **CSP (Content Security Policy):** The application uses a `<meta>` tag CSP to restrict script sources.
- **Data Privacy:** All data is stored locally in the browser. No data is transmitted to external servers.
- **Dependency Security:** Third-party libraries (Chart.js, jsPDF, Font Awesome, RemixIcon) are loaded from CDNs.

---

## 🎯 Scope

### ✅ In-Scope

- Cross-Site Scripting (XSS) vulnerabilities in task/note rendering
- Content Security Policy bypasses
- LocalStorage data integrity and manipulation issues
- Service Worker caching vulnerabilities
- DOM Clobbering and prototype pollution
- Dependency supply chain risks (CDN-served libraries)

### ❌ Out-of-Scope

- UI/UX improvements or design suggestions
- Feature requests
- Non-security-related bugs
- Social engineering attacks
- Physical attacks against users
- Third-party website vulnerabilities (CDN providers)

---

## 📬 Reporting a Vulnerability

If you discover a security issue, please report it responsibly **via GitHub**:

1. **Do NOT** open a public issue.
2. Go to the repository's **Security** tab → **Report a vulnerability**.
3. Provide a detailed description with:

### Required Information:
- **Type of vulnerability** (e.g., XSS, CSP bypass, data leakage)
- **Affected component** (e.g., task input, reflection form, service worker)
- **Steps to reproduce** — concise, minimal, and complete
- **Impact** — what an attacker could achieve
- **Proof of Concept (PoC)** — code or URL demonstrating the issue (if available)
- **Browser and version** where the issue was observed
- **Suggested fix** (if known)

---

## ⏱️ Response Timeline

| Phase | Timeframe |
| ----- | --------- |
| **Acknowledgement** | Within 24 hours of report |
| **Triage & Verification** | Within 72 hours |
| **Fix Development** | Dependent on severity (High: 7 days, Medium: 14 days, Low: 30 days) |
| **Patch Release** | Coordinated with reporter |
| **Public Advisory** | After patch is merged and deployed |

---

## 🔒 Responsible Disclosure

- Report vulnerabilities **privately** through the GitHub Security Advisory system.
- Do **not** publicly disclose vulnerabilities before a fix is available.
- Test only within your **local environment** or your own fork.
- Allow reasonable time for the maintainers to respond and fix the issue.

---

## ⚖️ Safe Harbor

We support good-faith security research conducted in accordance with this policy:

- You will not be pursued or penalized for activities conducted in good faith.
- We will work with you to understand and resolve the issue.
- You will receive credit for valid, verified vulnerabilities (if desired).

---

## 🛡️ Security Best Practices for Contributors

When contributing code, please follow these guidelines:

1. **Always use `escapeHtml()`** when inserting user-supplied data into the DOM.
2. **Do not use `innerHTML`** with unsanitized data — prefer `textContent` where possible.
3. **Validate all inputs** — enforce length limits, reject unexpected characters.
4. **Do not hardcode secrets** — this is a client-side app; no secrets should exist.
5. **Keep dependencies updated** — CDN versions should be pinned to specific versions.
6. **Follow CSP rules** — when adding new external resources, update the CSP header.
7. **Review SW changes** — service worker has access to all app requests, handle with care.

---

## 🔍 Known Security Controls

TaskQuest implements the following security measures:

| Control | Implementation |
| ------- | -------------- |
| Content Security Policy | `<meta http-equiv="Content-Security-Policy">` in `index.html` |
| XSS Prevention | `escapeHtml()` function used in all DOM insertions |
| Input Validation | Length limits, character sanitization |
| Frame Protection | `X-Frame-Options: DENY` (clickjacking prevention) |
| MIME Sniffing | `X-Content-Type-Options: nosniff` |
| Permissions Policy | `Permissions-Policy` restricts camera, mic, geolocation |
| Subresource Integrity | SRI hashes on external CSS/JS (planned) |

---

## 🙌 Acknowledgements

We appreciate the community's help in keeping TaskQuest secure. Contributors who report valid security issues will be acknowledged in our security advisories (unless they prefer to remain anonymous).

---

*Last updated: June 2026*
