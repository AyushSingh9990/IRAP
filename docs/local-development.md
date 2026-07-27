# Local development

## Requirements

- Node.js 22.12 or newer
- npm 10.9 or newer
- MongoDB Atlas or a compatible MongoDB deployment for connected workflows

## Setup

```bash
npm run install:all
```

Copy the environment examples without committing the resulting private files:

```text
server/.env.example -> server/.env
client/.env.example -> client/.env
```

Start both applications:

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:5000/api/v1`
- Health: `http://localhost:5000/api/v1/health`
