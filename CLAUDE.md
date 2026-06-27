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

## API Integration Notes

The Aspen Discovery platform (powering Chappaqua Library catalog) has a `/API/UserAPI` endpoint. We're using:
- `login` method to authenticate and get session cookie
- `getCheckedOutTitles` to fetch current checkouts

If the API doesn't work (Cloudflare blocking or changed endpoint), fallback is to:
1. Manually import browser cookies from real Chrome session
2. Make plain HTTP requests with those cookies

See `library.ts` — add fallback scraping there if needed.

## Deployment (Railway)

1. Push to GitHub (new repo)
2. Link to Railway via dashboard
3. Add env vars in Railway settings
4. Deploy

## Notes

- Cloudflare blocks headless browsers on the library catalog, so we use API/HTTP instead of Playwright
- Family members can sign in with their own Google account if added to `ALLOWED_EMAILS`
- Library credentials are server-only (never exposed to browser)
