# Deployment Guide

This guide covers deploying the Tauri Updater Proxy in various environments.

## Prerequisites

- Docker (for containerized deployment)
- A GitHub Personal Access Token with access to your private repository
- A domain or IP address for the proxy server

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3000` | Server port |
| `GITHUB_TOKEN` | Yes | - | GitHub Personal Access Token |
| `UPSTREAM_URL` | Yes | - | GitHub releases URL base |
| `AUTH_USERNAME` | Yes | - | Basic auth username for proxy access |
| `AUTH_PASSWORD` | Yes | - | Basic auth password for proxy access |

## GitHub Token Setup

1. Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Select scopes:
   - `repo` - Full control of private repositories (required for private repos)
4. Copy the generated token

For fine-grained tokens:
1. Go to [Fine-grained tokens](https://github.com/settings/tokens?type=beta)
2. Select the specific repository
3. Grant "Contents" permission with read access
4. Copy the generated token

## Local Development

### Using Bun directly

```bash
# Install dependencies
bun install

# Create .env file
cp .env.example .env
# Edit .env with your values

# Start development server
bun run dev
```

### Using Docker Compose

```bash
# Create .env file
cp .env.example .env
# Edit .env with your values

# Build and run
docker compose up --build
```

## Production Deployment

### Docker

#### Build the image

```bash
docker build -t tauri-updater-proxy .
```

#### Run the container

```bash
docker run -d \
  --name tauri-updater-proxy \
  -p 3000:3000 \
  -e GITHUB_TOKEN=ghp_your_token \
  -e UPSTREAM_URL=https://github.com/owner/repo/releases/latest/download \
  -e AUTH_USERNAME=your_username \
  -e AUTH_PASSWORD=your_secure_password \
  --restart unless-stopped \
  tauri-updater-proxy
```

#### Using environment file

```bash
docker run -d \
  --name tauri-updater-proxy \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  tauri-updater-proxy
```

### Docker Compose (Production)

Create a `docker-compose.prod.yml`:

```yaml
services:
  tauri-updater-proxy:
    image: ghcr.io/xikxp1/tauri-updater-proxy:latest
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - GITHUB_TOKEN=${GITHUB_TOKEN}
      - UPSTREAM_URL=${UPSTREAM_URL}
      - AUTH_USERNAME=${AUTH_USERNAME}
      - AUTH_PASSWORD=${AUTH_PASSWORD}
    restart: always
    healthcheck:
      test: ["CMD", "bun", "-e", "fetch('http://localhost:3000/health').then(r => process.exit(r.ok ? 0 : 1))"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
```

Run with:

```bash
docker compose -f docker-compose.prod.yml up -d
```

### Reverse Proxy (Nginx)

For production, run the proxy behind Nginx with TLS:

```nginx
server {
    listen 443 ssl http2;
    server_name updates.example.com;

    ssl_certificate /etc/ssl/certs/your-cert.pem;
    ssl_certificate_key /etc/ssl/private/your-key.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # For large binary downloads
        proxy_buffering off;
        proxy_request_buffering off;
        client_max_body_size 0;
    }
}

server {
    listen 80;
    server_name updates.example.com;
    return 301 https://$server_name$request_uri;
}
```

### Caddy

Using Caddy with automatic HTTPS:

```
updates.example.com {
    reverse_proxy localhost:3000
}
```

## Cloud Deployments

### Fly.io

Create `fly.toml`:

```toml
app = "tauri-updater-proxy"
primary_region = "iad"

[build]

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

[env]
  PORT = "3000"
```

Deploy:

```bash
# Set secrets
fly secrets set GITHUB_TOKEN=ghp_your_token
fly secrets set UPSTREAM_URL=https://github.com/owner/repo/releases/latest/download
fly secrets set AUTH_USERNAME=your_username
fly secrets set AUTH_PASSWORD=your_secure_password

# Deploy
fly deploy
```

### Railway

1. Connect your repository to Railway
2. Set environment variables in the Railway dashboard
3. Railway will automatically detect the Dockerfile and deploy

### DigitalOcean App Platform

1. Create a new App from your repository
2. Select Docker as the build type
3. Configure environment variables
4. Deploy

## Health Checks

The proxy exposes a `/health` endpoint that returns `{"status": "ok"}` when healthy.

Use this endpoint for:
- Load balancer health checks
- Container orchestration liveness probes
- Monitoring systems

Example Kubernetes liveness probe:

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 10
```

## Security Considerations

1. **Use strong credentials**: Generate secure random passwords for `AUTH_USERNAME` and `AUTH_PASSWORD`
2. **Use HTTPS**: Always deploy behind TLS in production
3. **Restrict network access**: Use firewalls to limit access to trusted networks
4. **Rotate tokens**: Periodically rotate the GitHub token
5. **Monitor access**: Review access logs for unauthorized attempts

## Troubleshooting

### 401 Unauthorized from GitHub

- Verify `GITHUB_TOKEN` is valid
- Check token has `repo` scope for private repositories
- Ensure token hasn't expired

### 404 Not Found for manifest

- Verify `UPSTREAM_URL` points to a valid GitHub releases URL
- Check that `latest.json` exists in your releases
- Ensure the release is published (not a draft)

### Connection refused

- Verify the proxy is running: `curl http://localhost:3000/health`
- Check firewall rules
- Verify port mapping in Docker

### Large file downloads timing out

- Increase proxy timeouts in Nginx/reverse proxy
- Ensure `proxy_buffering off` is set
- Check network bandwidth

## Monitoring

### Logs

View container logs:

```bash
docker logs -f tauri-updater-proxy
```

### Metrics

The proxy does not expose metrics by default. For production monitoring, consider:
- Adding a metrics endpoint with Prometheus format
- Using a sidecar container for metrics collection
- Monitoring via reverse proxy access logs
