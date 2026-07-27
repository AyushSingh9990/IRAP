# Testing and security

## Automated checks

The quality pipeline validates package compatibility, repository structure, linting, frontend and backend tests, and the production frontend build.

```bash
npm run quality
```

Focused checks are also available:

```bash
npm run test:client
npm run test:server
npm run test:security
npm run test:accessibility
npm run structure:check
npm run audit:production
```

## Security controls covered

- HTTP-only authentication cookies and rotating refresh sessions
- Role and permission authorization
- CORS allowlisting and request-origin enforcement
- Fetch Metadata rejection for cross-site state-changing requests
- Helmet security headers and framework disclosure removal
- API and workflow-specific rate limiting
- JSON and form payload size limits
- MongoDB query sanitization and parameter-pollution protection
- File extension, MIME type, size, ownership, and binary-signature validation
- Private document storage and path-containment checks
- Payment signature verification and webhook-event idempotency
- Generic production error responses and request identifiers
- No-store response policy for sensitive API responses
- Structured logs with credential and token redaction

## Accessibility review

The client includes skip navigation, semantic landmarks, visible focus states, reduced-motion handling, accessible alerts, route-change announcements, page-heading focus management, labeled controls, and keyboard-compatible route protection.

## Performance review

Public and dashboard routes are lazy-loaded. Vite splits framework-heavy dependencies into stable chunks. Public read-only APIs receive short cache lifetimes while authenticated and sensitive responses remain non-cacheable.
