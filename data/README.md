# Data directory

- **`impact-dashboard-cache/`** — Cached GitHub impact data (PRs, issues, etc.). These JSON files are committed so the deployed app (e.g. Vercel) can serve the same data on the live link without re-fetching. If you had cache in the old `.cache/impact-dashboard/` location, copy those `.json` files here so they are used and included in the repo.
