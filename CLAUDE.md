# Library Checkouts

A personal web app showing library books you have checked out, with due dates and renewal counts. Secured with Google OAuth + email whitelist.

## Architecture

- **Express.js** server (not Next.js)
- **Passport.js** for Google OAuth + email whitelist
- **cloakbrowser** for headless browser automation (bypasses Cloudflare bot detection)
- Custom browser-based web scraping for Chappaqua Library catalog

## Setup

### 1. Environment Variables

Copy `.env.local.example` to `.env.local`:
```bash
cp .env.local.example .env.local
```

Fill in:
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` from Google Cloud Console
- `LIBRARY_USERNAME` / `LIBRARY_PASSWORD` from Chappaqua Library catalog
- `SESSION_SECRET` (any random string for session encryption)
- `ALLOWED_EMAILS` (comma-separated list of Google accounts that can access the app)

### 2. Install & Run

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` and sign in with Google.

## Key Files

- `server.js` — Express server, Google OAuth setup with Passport
- `lib/library.js` — cloakbrowser-based scraper for Chappaqua Library catalog
- `public/` — Frontend HTML/JS

## Library Integration

The Chappaqua Library catalog is protected by **Cloudflare bot detection**. We use **cloakbrowser** to:
- Launch a headless browser with anti-detection features
- Mimic real browser behavior to bypass Cloudflare challenges
- Automatically log in with library credentials
- Extract book data from the checkout page

### How it works:
1. cloakbrowser launches a headless Chrome with stealth mode enabled
2. Logs into the library with your credentials
3. Navigates to the checkouts page
4. Waits for Cloudflare Turnstile challenge to complete
5. Parses HTML to extract: title, author, due date, renewal count
6. Returns JSON via `/api/books` endpoint

### Setup:
- Add `LIBRARY_USERNAME` and `LIBRARY_PASSWORD` to `.env.local`
- The app stores nothing — credentials are used only for each request
- Browser instance is reused across requests for performance

### Performance:
- First fetch takes ~15-20s (browser startup + Cloudflare)
- Subsequent fetches reuse the same browser instance (~5-10s)
- Browser remains alive between requests

## Notes

- We use cloakbrowser (not Playwright) because Playwright was blocked by Cloudflare
- Family members can sign in with their own Google account if added to `ALLOWED_EMAILS`
- Library credentials are server-only (never exposed to browser)
