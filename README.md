# iRAP

iRAP is a production-oriented MERN platform for professional membership, provider and organization accreditation, approved-course management, public registries, payments, certificates, content publishing, and secure administration.

## Repository

The project root must be named `irap` and must directly contain `client`, `server`, `docs`, and `scripts`. Do not extract another `irap` folder inside it.

See [project structure](docs/project-structure.md), [local development](docs/local-development.md), and [testing and security](docs/testing-and-security.md).

## Install

```bash
npm run install:all
```

## Run

```bash
npm run dev
```

## Quality checks

```bash
npm run quality
```

## Important security rules

Never commit `.env` files, private uploads, API keys, database credentials, SMTP credentials, payment secrets, JWT secrets, or generated certificates containing private information. Do not use `npm audit fix --force` without reviewing breaking dependency changes and rerunning the complete quality pipeline.
