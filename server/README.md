# iRAP server

The iRAP API is an Express and MongoDB service mounted under `/api/v1`.

## Commands

```bash
npm run dev
npm run start
npm run lint
npm run test
npm run test:security
```

## Configuration

Copy `.env.example` to `.env` and provide real development or production values. The environment is validated at startup. Authentication, payments, SMTP, Cloudinary, and MongoDB-connected workflows remain disabled until their required settings are complete.

## Security

The server uses secure HTTP-only cookies, rotating refresh sessions, role and permission authorization, CORS allowlisting, origin and Fetch Metadata checks, rate limiting, Helmet headers, payload limits, MongoDB sanitization, file-content signature validation, payment-signature verification, no-store policies for sensitive responses, and structured redacted logging.

## Tests

The test environment is isolated from the developer `.env` file and never uses the production database. Run tests only against the configured test environment.
