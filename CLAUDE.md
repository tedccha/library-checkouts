# Library Checkouts

A personal web app showing library books you have checked out, with due dates and renewal counts. Secured with Google OAuth + email whitelist.

## Architecture

- **Next.js 15** with TypeScript
- **NextAuth.js v5** for Google OAuth + email whitelist
- **Aspen Discovery API** for library data (fallback: HTTP cookies if API unavailable)
- **Railway** hosting (persistent server, no serverless limitations)

## Setup

### 1. Environment Variables

Copy `.env.local.example` to `.env.local`:
```bash
cp .env.local.example .env.local
```

Fill in:
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` from Google Cloud Console
- `LIBRARY_USERNAME` / `LIBRARY_PASSWORD` from Chappaqua Library catalog
- `NEXTAUTH_SECRET` (generate: `openssl rand -base64 32`)
- `ALLOWED_EMAILS` (comma-separated list of Google accounts that can access the app)

### 2. Install & Run

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` and sign in with Google.

## Key Files

- `app/api/auth/[...nextauth]/route.ts` — Google OAuth + email whitelist
- `app/lib/library.ts` — Aspen Discovery API client
- `app/api/checkouts/route.ts` — Server endpoint that fetches checkouts (auth-gated)
- `app/page.tsx` — Main UI (client component)

## Library Integration

The catalog runs behind Cloudflare bot protection, which blocks headless browser requests. Instead, we use authenticated session cookies:

### Getting cookies:
1. Open https://catalog.chappaqualibrary.org in your browser and sign in
2. Open DevTools → Application tab → Cookies
3. Find cookies for `catalog.chappaqualibrary.org` (especially `PHPSESSID`, `aspendiscovery`)
4. Copy all cookie values and paste into `LIBRARY_COOKIES` env var as a semicolon-separated string:
   ```
   LIBRARY_COOKIES=PHPSESSID=abc123; aspendiscovery=xyz789; other_cookie=value
   ```
5. Restart the app

### How it works:
- `app/lib/library.ts` — fetches the checkout page using stored session cookies
- Parses HTML to extract book titles, due dates, renewal counts
- HTML parsing is basic — will refine once we see the actual page structure

### Cookies expire:
- Library session cookies typically last 30 days
- When they expire, the app will return a "cookies may be expired" error
- Re-export fresh cookies from your browser and update `LIBRARY_COOKIES`

## Deployment (Railway)

1. Push to GitHub (new repo)
2. Link to Railway via dashboard
3. Add env vars in Railway settings
4. Deploy

## Notes

- Cloudflare blocks headless browsers on the library catalog, so we use API/HTTP instead of Playwright
- Family members can sign in with their own Google account if added to `ALLOWED_EMAILS`
- Library credentials are server-only (never exposed to browser)
