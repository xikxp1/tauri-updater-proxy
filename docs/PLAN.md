# Implementation Plan

## Overview

Build a proxy server for Tauri application updates from private GitHub repos. The proxy fetches update manifests, rewrites download URLs to route through the proxy, and streams binaries from GitHub. Protected via Basic HTTP Auth.

## Status

- [x] Project scaffolding
- [x] Core proxy functionality
- [x] Docker deployment
- [x] Testing & Documentation
- [x] CI workflow

## Phase 1: Project Setup

- [x] Initialize Bun project with TypeScript
- [x] Set up Hono web framework
- [x] Configure Biome
- [x] Create basic project structure
- [x] Add Docker configuration

## Phase 2: Core Proxy

- [x] Implement manifest proxy endpoint (`GET /latest.json`)
- [x] Fetch manifest from GitHub releases (latest.json)
- [x] Rewrite platform URLs in manifest to point to proxy's download endpoint
- [x] Implement binary download proxy (`GET /download/*path`)
- [x] Stream binaries from GitHub with authentication
- [x] Add Basic HTTP Auth middleware

## Phase 3: Docker & Deployment

- [x] Create optimized Dockerfile
- [x] Add docker-compose.yml for local development
- [x] Configure environment variables
- [x] Add health check endpoint

## Phase 4: Testing & Documentation

- [x] Unit tests for services
- [x] Integration tests for endpoints
- [x] API documentation
- [x] Deployment guide
- [x] CI workflow (format check, lint, tests)

## Tauri Update Manifest Format

The upstream manifest (latest.json) has this structure:
```json
{
  "version": "0.1.9",
  "notes": "Release notes...",
  "pub_date": "2025-11-18T14:09:51.808Z",
  "platforms": {
    "darwin-x86_64": {
      "signature": "base64-encoded-signature",
      "url": "https://github.com/owner/repo/releases/download/tag/File.tar.gz"
    },
    "darwin-aarch64": { ... },
    "linux-x86_64": { ... },
    "windows-x86_64": { ... }
  }
}
```

Platform keys: `{os}-{arch}` where:
- OS: `darwin`, `linux`, `windows`
- Arch: `x86_64`, `aarch64`

## API Endpoints

```
GET /health                    # Health check
GET /latest.json               # Update manifest proxy (rewrites URLs)
GET /download/*path            # Binary download proxy (streams from GitHub)
```

The manifest endpoint:
1. Fetches latest release info via GitHub API (`/repos/{owner}/{repo}/releases/latest`)
2. Downloads `latest.json` asset from the release
3. Rewrites each platform's `url` field: replace GitHub host with proxy host
4. Returns modified manifest to Tauri client

The download endpoint:
1. Receives requests with the original GitHub path
2. Reconstructs the full GitHub URL
3. Streams the binary with GitHub token authentication

## Configuration

Environment variables:
- `PORT` - Server port (default: 3000)
- `GITHUB_TOKEN` - GitHub personal access token for private repo access (requires `repo` scope)
- `UPSTREAM_URL` - GitHub repository URL (e.g., `https://github.com/owner/repo`)
- `AUTH_USERNAME` - Basic auth username for proxy access
- `AUTH_PASSWORD` - Basic auth password for proxy access

## Tauri Client Authentication

To avoid hardcoding credentials in the Tauri app source code, use CI/CD secret injection:

1. Store `UPDATE_AUTH_USERNAME` and `UPDATE_AUTH_PASSWORD` in GitHub Secrets
2. Inject at build time via environment variable: `UPDATE_AUTH=$USERNAME:$PASSWORD`
3. Read in Rust with `env!("UPDATE_AUTH")` macro (compile-time)
4. Pass as `Authorization: Basic <base64>` header to the updater

This keeps credentials out of source control while maintaining access control. See README for full implementation details.

## Notes

- Update this plan as implementation progresses
- Mark items complete with [x] when done
- Only rewrite the host portion of URLs, preserve the full path
