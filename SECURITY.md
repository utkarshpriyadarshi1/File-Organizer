# Security Policy

We take the security of **e-abhilekh** seriously. If you believe you have found a security vulnerability, please report it to us responsibly so we can address it as quickly as possible.

## Supported Versions

Currently, security updates are provided for the following versions:

| Version | Supported |
| ------- | --------- |
| 0.0.x   | Yes       |
| < 0.0.1 | No        |

---

## Reporting a Vulnerability

**Please do not report security vulnerabilities via public GitHub issues.** Instead, submit your vulnerability report privately.

When reporting a vulnerability, please include the following details:
1.  **Description:** A detailed description of the vulnerability and its potential impact.
2.  **Steps to Reproduce:** A step-by-step guide (or proof-of-concept script/exploit) showing how to reproduce the vulnerability.
3.  **Environment:** Your operating system details, Java runtime version, and Node.js/Electron versions.

You can expect an acknowledgment of your report within 48 hours.

---

## Out of Scope Vulnerabilities

The following issues are considered out of scope for security reports:
*   Physical attacks on the host machine running the software.
*   Decryption of locker files where the user has chosen a weak password (the application relies on user-supplied password entropy to derive AES-256 keys).
*   Issues relating to compromised developer environments (e.g. running unverified code or script tasks directly).

## Disclosure Process

When a vulnerability is reported:
1.  We will investigate to confirm and understand the vulnerability.
2.  If verified, we will work on a fix or patch.
3.  We will keep you updated on progress.
4.  Once the fix is merged and released, we will publish a security advisory acknowledging your contribution (unless you prefer to remain anonymous).
