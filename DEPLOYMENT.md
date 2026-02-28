# Deployment Guide

## Why Not GitHub Pages

This app uses Next.js API routes that run server-side code and access
`GITHUB_TOKEN` as a secret. GitHub Pages only serves static files and
cannot run server routes or protect secrets. **Deploy to Vercel instead.**

## Vercel Deployment

### 1. Connect Repository

- Push this repo to GitHub
- Go to [vercel.com](https://vercel.com) and import the repository
- Vercel auto-detects the Next.js framework

### 2. Environment Variables

Set these in Vercel project settings → Environment Variables:

| Variable | Required | Description |
|---|---|---|
| `GITHUB_TOKEN` | Yes | GitHub personal access token (classic or fine-grained) with `repo` read scope |
| `KV_REST_API_URL` | For persistent cache | Provided automatically when you add a Redis/KV store |
| `KV_REST_API_TOKEN` | For persistent cache | Provided automatically when you add a Redis/KV store |
| `CRON_SECRET` | Optional | Secret for cron endpoint authentication |

### 3. Add Persistent Cache (Recommended)

Without persistent cache, data is re-fetched from GitHub on every cold
start, which burns API quota quickly.

1. In your Vercel dashboard, go to **Storage** (or **Integrations** → **Marketplace**)
2. Add **Upstash Redis** (this is the successor to Vercel KV)
3. Connect it to your project — this auto-sets `KV_REST_API_URL` and `KV_REST_API_TOKEN`
4. Redeploy

When KV env vars are present and `NODE_ENV=production`, the app
automatically uses the KV backend. Locally it uses disk cache.

> **Note:** The `@vercel/kv` package is a thin wrapper around Upstash Redis.
> If you prefer, you can migrate to `@upstash/redis` directly — the API is
> nearly identical.

### 4. Optional: Scheduled Refresh (Cron)

To keep the cache warm without manual clicks, add a cron job.

Create `vercel.json` in the project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/refresh",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

This refreshes data every 6 hours. Set `CRON_SECRET` in env vars —
Vercel passes it automatically as `Authorization: Bearer <secret>`.

## How Refresh Works

- **Normal load**: serves cached data if fresh (< 6 hours old)
- **Refresh button**: fetches fresh data from GitHub and updates cache
- **Rate limited**: if GitHub returns 403 rate limit, the app serves the
  most recent cached data with a "Showing cached data" indicator
- **Cooldown**: refresh is throttled to once per 60 seconds to prevent
  accidental API quota burn
- **No cache + rate limited**: returns HTTP 429 with a clear message to
  wait for the rate limit reset

## Interpreting Status Messages

| UI Message | Meaning |
|---|---|
| "Data from Xm ago" | Cache age — everything normal |
| "Rate limited — showing cached data" | GitHub API quota exceeded; stale but valid data shown |
| "Cooldown active — showing cached data" | Refresh attempted too soon; try again in ~60s |
| "Fetch error — showing cached data" | Network or other error; stale data served as fallback |
| "Next refresh available at HH:MM" | Rate limit resets at this time |

## Local Development

```bash
cp .env.example .env.local
# Add your GITHUB_TOKEN to .env.local
npm install
npm run dev
```

Local dev always uses disk cache (`.cache/` directory, gitignored).
No KV setup needed locally.
