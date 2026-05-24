# Security Policy

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Report privately via GitHub Security Advisories:

> Security → Advisories → Report a vulnerability

Or email the maintainers directly. We will acknowledge receipt within 72 hours and aim to publish a fix within 30 days of confirmation.

## Supported versions

Until a `1.0.0` release, only the latest minor version receives security fixes.

## Scope

In scope:

- The HTTP API under `/api/v1/*`
- The runtime bridge served from `/runtime.js`
- The standalone player route at `/play/:attemptId`
- The Prisma schema and migrations
- The Docker image published from this repository

Out of scope:

- Vulnerabilities in third-party SCORM courses played through the engine
- Misconfiguration on the operator's side (e.g. permissive CORS in production, weak `JWT_SECRET`)
