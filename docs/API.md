# API Documentation

Tauri Updater Proxy provides a simple HTTP API for serving Tauri application updates from private GitHub repositories.

## Authentication

All endpoints except `/health` require Basic HTTP Authentication.

```
Authorization: Basic base64(username:password)
```

Credentials are configured via `AUTH_USERNAME` and `AUTH_PASSWORD` environment variables.

## Endpoints

### Health Check

Check if the proxy server is running.

```
GET /health
```

**Authentication:** Not required

**Response:**
```json
{
  "status": "ok"
}
```

**Status Codes:**
- `200 OK` - Server is healthy

---

### Update Manifest

Fetch the update manifest with URLs rewritten to route through the proxy.

```
GET /latest.json
```

**Authentication:** Required (Basic Auth)

**Response:**
```json
{
  "version": "1.0.0",
  "notes": "Release notes for this version",
  "pub_date": "2025-01-15T10:00:00.000Z",
  "platforms": {
    "darwin-x86_64": {
      "signature": "base64-encoded-signature",
      "url": "https://your-proxy.example.com/download/owner/repo/releases/download/v1.0.0/app-darwin-x64.tar.gz"
    },
    "darwin-aarch64": {
      "signature": "base64-encoded-signature",
      "url": "https://your-proxy.example.com/download/owner/repo/releases/download/v1.0.0/app-darwin-arm64.tar.gz"
    },
    "linux-x86_64": {
      "signature": "base64-encoded-signature",
      "url": "https://your-proxy.example.com/download/owner/repo/releases/download/v1.0.0/app-linux.tar.gz"
    },
    "windows-x86_64": {
      "signature": "base64-encoded-signature",
      "url": "https://your-proxy.example.com/download/owner/repo/releases/download/v1.0.0/app-windows.zip"
    }
  }
}
```

**Platform Keys:**
| Platform | Description |
|----------|-------------|
| `darwin-x86_64` | macOS Intel |
| `darwin-aarch64` | macOS Apple Silicon |
| `linux-x86_64` | Linux x64 |
| `windows-x86_64` | Windows x64 |

**Status Codes:**
- `200 OK` - Manifest retrieved successfully
- `401 Unauthorized` - Missing or invalid authentication
- `500 Internal Server Error` - Failed to fetch manifest from GitHub

---

### Binary Download

Stream update binaries from GitHub through the proxy.

```
GET /download/*path
```

**Authentication:** Required (Basic Auth)

**Path Parameters:**
- `*path` - The GitHub repository path to the release asset (e.g., `owner/repo/releases/download/v1.0.0/app.tar.gz`)

**Response:**
Binary file stream with appropriate headers.

**Response Headers:**
| Header | Description |
|--------|-------------|
| `Content-Type` | MIME type of the file (e.g., `application/octet-stream`, `application/gzip`) |
| `Content-Length` | Size of the file in bytes |

**Status Codes:**
- `200 OK` - File streamed successfully
- `401 Unauthorized` - Missing or invalid authentication
- `500 Internal Server Error` - Failed to fetch file from GitHub (file not found, auth failed, etc.)

---

## Tauri Client Configuration

Configure your Tauri application to use the proxy by setting the updater endpoint in `tauri.conf.json`:

```json
{
  "tauri": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://your-proxy.example.com/latest.json"
      ],
      "dialog": true,
      "pubkey": "YOUR_PUBLIC_KEY"
    }
  }
}
```

For private proxy access, include credentials in the URL:

```json
{
  "tauri": {
    "updater": {
      "endpoints": [
        "https://username:password@your-proxy.example.com/latest.json"
      ]
    }
  }
}
```

Alternatively, configure authentication headers programmatically in your Tauri application.

---

## Error Handling

All errors return appropriate HTTP status codes. The response body may contain error details for debugging.

| Status Code | Description |
|-------------|-------------|
| `401 Unauthorized` | Authentication required or invalid credentials |
| `500 Internal Server Error` | Upstream GitHub request failed |

---

## Rate Limits

The proxy does not implement rate limiting. GitHub API rate limits may apply when fetching from private repositories. Consider implementing rate limiting at the infrastructure level (e.g., reverse proxy) for production deployments.

---

## Example Requests

### Fetch manifest with curl

```bash
curl -u username:password https://your-proxy.example.com/latest.json
```

### Download binary with curl

```bash
curl -u username:password -o app.tar.gz \
  https://your-proxy.example.com/download/owner/repo/releases/download/v1.0.0/app.tar.gz
```

### Check health

```bash
curl https://your-proxy.example.com/health
```
