# Tauri Updater Proxy

Proxy server that serves Tauri application updates from private GitHub repos. Fetches update manifests, rewrites download URLs to route through the proxy, and streams binaries with GitHub authentication. Proxy access is protected via Basic HTTP Auth.

Consult @docs/PLAN.md before every task. Update @docs/PLAN.md after every change to keep it up-to-date.

## Tech Stack

- Bun runtime with TypeScript
- Hono web framework
- Docker for deployment

## Project Structure

```
src/
├── index.ts        # Server entry point
├── routes/         # API route handlers
├── services/       # Business logic (proxying)
├── types/          # TypeScript type definitions
└── utils/          # Shared utilities
tests/              # Test files
```

## Commands

Always use `bun` instead of `npm`

Use `bun add <package>` to add new dependencies, avoid editing `package.json` manually

**Development**
- `bun run dev` - Start dev server with hot reload
- `bun test` - Run test suite
- `bun run lint` - Run linter
- `bun run format` - Format code

Always run `bun run format && bun run lint && bun test` after making changes to validate code integrity.

**Build & Deploy**
- `bun run build` - Production build
- `docker build -t tauri-updater-proxy .` - Build Docker image
- `docker compose up` - Run with Docker Compose

## Workflows

**Adding New Endpoint:**
1. Create route handler in `src/routes/`
2. Add service logic in `src/services/`
3. Register route in `src/index.ts`
4. Add tests in `tests/`
5. Run `bun test` to verify

## Domain Terminology

- **Manifest**: JSON file (`latest.json`) describing available updates with structure:
  - `version`: Semver version string
  - `notes`: Release notes
  - `pub_date`: ISO 8601 timestamp
  - `platforms`: Object keyed by `{os}-{arch}` (e.g., `darwin-aarch64`, `windows-x86_64`)
    - Each platform has `signature` (base64) and `url` (download link)
- **Platform**: Target OS (`darwin`, `linux`, `windows`) with architecture (`x86_64`, `aarch64`)
- **Upstream**: GitHub releases URL for the private repo

## Architecture Notes

- Do not cache any data, just proxy it
- Support one upstream, one proxy instance per app
- URL rewriting: only replace the host portion, preserve the full path
- Manifest proxy: fetch from GitHub, rewrite `url` fields to point to proxy's `/download/*` endpoint
- Download proxy: stream binaries from GitHub using token authentication
