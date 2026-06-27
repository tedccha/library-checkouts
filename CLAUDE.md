# Library Checkouts

A personal web app showing library books you have checked out, with due dates and renewal counts. Secured with Google OAuth + email whitelist.

## Architecture

- **Next.js 14** with TypeScript
- **NextAuth.js v4** for Google OAuth + email whitelist
- **Playwright + Stealth Plugin** for headless browser automation (bypasses Cloudflare bot detection)
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

The Chappaqua Library catalog runs behind Cloudflare bot protection. We use **Playwright with a stealth plugin** to:
- Mimic a real browser (defeats Cloudflare detection)
- Automatically handle login
- Extract book data from the checkout page

### How it works:
1. Playwright launches a headless Chromium browser
2. Stealth plugin patches the browser fingerprint to avoid Cloudflare bot detection
3. Logs into the library with your credentials
4. Navigates to the checkouts page
5. Parses HTML to extract: title, due date, renewal count
6. Returns data to the API

### Setup:
- Add `LIBRARY_USERNAME` and `LIBRARY_PASSWORD` to `.env.local`
- The app stores nothing — credentials are used only for each request
- No sessions, no cookie expiration to worry about

### Performance:
- First fetch takes ~10-15s (browser startup)
- Subsequent fetches reuse the same browser context (~3-5s)
- Browser instance is kept alive for fast subsequent calls

## Deployment (Railway)

1. Push to GitHub (new repo)
2. Link to Railway via dashboard
3. Add env vars in Railway settings
4. Deploy

## Notes

- Cloudflare blocks headless browsers on the library catalog, so we use API/HTTP instead of Playwright
- Family members can sign in with their own Google account if added to `ALLOWED_EMAILS`
- Library credentials are server-only (never exposed to browser)
