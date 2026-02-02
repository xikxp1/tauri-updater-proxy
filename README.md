# Tauri Updater Proxy

**Serve Tauri application updates from private GitHub repositories.**

A lightweight proxy server that fetches update manifests and binaries from private GitHub repos, rewrites download URLs to route through the proxy, and handles authentication. Deploy one instance per Tauri app.

## Features

- Proxies `latest.json` manifests with automatic URL rewriting
- Streams release binaries from GitHub with token authentication
- Protects proxy access via Basic HTTP Auth
- Supports all Tauri platforms (macOS, Linux, Windows)
- Docker-ready with health checks

## Quick Start

```bash
# Clone and install
git clone <repo-url>
cd tauri-updater-proxy
bun install

# Configure environment
cp .env.example .env
# Edit .env with your GitHub token and upstream URL

# Run
bun run dev
```

Or with Docker:

```bash
docker compose up --build
```

## Requirements

- [Bun](https://bun.sh) v1.0+ (for local development)
- Docker (for containerized deployment)
- GitHub Personal Access Token with `repo` scope

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3000` | Server port |
| `GITHUB_TOKEN` | Yes | - | GitHub PAT for private repo access |
| `UPSTREAM_URL` | Yes | - | GitHub releases URL (e.g., `https://github.com/owner/repo/releases/latest/download`) |
| `AUTH_USERNAME` | Yes | - | Basic auth username |
| `AUTH_PASSWORD` | Yes | - | Basic auth password |

## Architecture

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────┐
│ Tauri App   │────▶│ Updater Proxy   │────▶│ GitHub API   │
│             │◀────│ (this service)  │◀────│ (private)    │
└─────────────┘     └─────────────────┘     └──────────────┘
      │                     │
      │ 1. GET /latest.json │
      │◀────────────────────│ (URLs rewritten to proxy)
      │                     │
      │ 2. GET /download/*  │
      │◀────────────────────│ (binary streamed)
```

## API Endpoints

| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET /health` | No | Health check |
| `GET /latest.json` | Yes | Update manifest (URLs rewritten) |
| `GET /download/*path` | Yes | Binary download proxy |

See [docs/API.md](docs/API.md) for detailed API documentation.

## Tauri Client Configuration

### 1. Configure `tauri.conf.json`

```json
{
  "plugins": {
    "updater": {
      "pubkey": "YOUR_PUBLIC_KEY",
      "endpoints": ["https://your-proxy.example.com/latest.json"]
    }
  }
}
```

### 2. Add CI/CD Secrets

Store proxy credentials in your CI/CD secrets (e.g., GitHub Secrets):
- `UPDATE_AUTH_USERNAME` - proxy username
- `UPDATE_AUTH_PASSWORD` - proxy password

### 3. Inject Credentials at Build Time

In your GitHub Actions workflow:

```yaml
- name: Build Tauri App
  env:
    UPDATE_AUTH: ${{ secrets.UPDATE_AUTH_USERNAME }}:${{ secrets.UPDATE_AUTH_PASSWORD }}
  run: bun tauri build
```

### 4. Read Credentials in Rust

```rust
use tauri_plugin_updater::UpdaterExt;
use base64::{Engine, engine::general_purpose::STANDARD};

// Read at compile time (never in source code)
const UPDATE_AUTH: &str = env!("UPDATE_AUTH");

// In your update check function
let auth_header = format!("Basic {}", STANDARD.encode(UPDATE_AUTH));
let update = app
    .updater_builder()
    .header("Authorization", auth_header)
    .build()?
    .check()
    .await?;
```

This approach keeps credentials out of your source repository while injecting them securely at build time.

## Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | [Bun](https://bun.sh) |
| Framework | [Hono](https://hono.dev) |
| Language | TypeScript |
| Container | Docker |
| Linter | Biome |

## Project Structure

```
src/
├── index.ts          # Server entry point
├── routes/           # API route handlers
│   ├── manifest.ts   # /latest.json endpoint
│   └── download.ts   # /download/* endpoint
├── services/         # Business logic
│   ├── manifest.ts   # Manifest fetching & rewriting
│   └── download.ts   # Binary streaming
├── types/            # TypeScript definitions
└── utils/            # Shared utilities
tests/                # Test files
docs/                 # Documentation
```

## Development

```bash
bun run dev      # Start dev server with hot reload
bun test         # Run test suite
bun run lint     # Run linter
bun run format   # Format code
bun run build    # Production build
```

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed deployment instructions including:
- Docker deployment
- Reverse proxy setup (Nginx, Caddy)
- Cloud platforms (Fly.io, Railway, DigitalOcean)
- Security considerations

## License

MIT
