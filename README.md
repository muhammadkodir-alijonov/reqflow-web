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

http://localhost:8080/api/analyze?url=<encoded_url>

If backend is not available, app automatically falls back to local mock JSON data.

Recommended backend response contract:

```json
{
	"url": "https://example.com",
	"httpVersion": "2",
	"dnsLookupMs": 21,
	"tcpHandshakeMs": 12,
	"tlsHandshakeMs": 34,
	"requestMs": 15,
	"responseMs": 40,
	"browserRenderMs": 16,
	"serverRegion": "ap-southeast"
}
```

Notes:

- `httpVersion` should be one of: `1.1`, `2`, `3` (string or number-like string).
- Frontend maps these to labels: `HTTP/1.1`, `HTTP/2`, `HTTP/3`.
- If `httpVersion` is missing, frontend will use protocol-based fallback.

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