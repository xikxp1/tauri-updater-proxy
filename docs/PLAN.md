# Implementation Plan

## Overview

Build a proxy server for Tauri application updates from private GitHub repos. The proxy fetches update manifests, rewrites download URLs to route through the proxy, and streams binaries from GitHub. Protected via Basic HTTP Auth.

## Status

- [x] Project scaffolding
- [x] Core proxy functionality
- [x] Docker deployment
- [ ] Testing

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
- [ ] Integration tests for endpoints
- [ ] API documentation
- [ ] Deployment guide

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
1. Fetches `latest.json` from GitHub releases
2. Rewrites each platform's `url` field: replace GitHub host with proxy host
3. Returns modified manifest to Tauri client

The download endpoint:
1. Receives requests with the original GitHub path
2. Reconstructs the full GitHub URL
3. Streams the binary with GitHub token authentication

## Configuration

Environment variables:
- `PORT` - Server port (default: 3000)
- `GITHUB_TOKEN` - GitHub personal access token for private repo access
- `UPSTREAM_URL` - GitHub releases URL base (e.g., `https://github.com/owner/repo/releases/latest/download`)
- `AUTH_USERNAME` - Basic auth username for proxy access
- `AUTH_PASSWORD` - Basic auth password for proxy access

## Notes

- Update this plan as implementation progresses
- Mark items complete with [x] when done
- Only rewrite the host portion of URLs, preserve the full path
