# reqflow-web

Neon dark-theme SPA for visualizing HTTP request lifecycle.

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Start development server:

```bash
npm run dev
```

3. Build production bundle:

```bash
npm run build
```

4. Preview production build on port 3000:

```bash
npm run preview
```

## Pipeline order

UI pipeline runs in fixed sequence:

DNS -> TCP -> TLS -> REQ -> RES -> BND

## Backend integration

Frontend tries to fetch data from:

http://localhost:8080/api/lifecycle?url=<encoded_url>

If backend is not available, app automatically falls back to local mock JSON data.

## CI/CD

GitHub Actions workflows:

- .github/workflows/ci.yml
- .github/workflows/deploy.yml

Required deployment secrets:

- DOCKERHUB_USERNAME
- DOCKERHUB_TOKEN
- SERVER_HOST
- SERVER_USER
- SERVER_SSH_KEY
- SERVER_PORT