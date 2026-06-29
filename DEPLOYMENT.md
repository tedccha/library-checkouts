# Deployment Notes

## Current Status

### ✅ Working
- Google OAuth authentication
- Session persistence (PostgreSQL via connect-pg-simple)
- User login/logout
- Protected routes
- Auth state persists across requests and page reloads

### ❌ Known Issues

#### Browser Automation on Railway
cloakbrowser (headless browser) fails to launch on Railway due to missing system libraries (`libcups.so.2`, etc). 

**Impact:** `/api/books` and `/api/holds` return empty lists with error message instead of actual library data.

**Workaround:** App handles gracefully—doesn't crash, just shows "No books checked out" message.

**Status:** This is a **platform limitation**, not a code bug. Works fine on localhost.

## Railway Deployment

### Environment Variables Required

```
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
SESSION_SECRET=<any random string>
LIBRARY_USERNAME=<Chappaqua Library account>
LIBRARY_PASSWORD=<Chappaqua Library password>
ALLOWED_EMAILS=<comma-separated list>
DATABASE_URL=<PostgreSQL connection string>
```

### Important Config

**Cookie Security:** `secure: false` in `server.js` line 38. This is intentional for Railway's proxy. Do NOT set to `true`—it blocks Set-Cookie headers on Railway.

### Database

- PostgreSQL running on Railway
- Prisma for schema management
- Session table created via `npx prisma db push`
- Book model defined but not yet used for storage

## Local Development

Run locally to test browser automation:
```bash
npm run dev
```

Browser scraping works on localhost because system libraries are available.

## Next Steps (Deferred)

1. **Option A:** Accept current state (browser automation doesn't work on Railway, but auth works)
2. **Option B:** Replace cloakbrowser with different scraping approach (REST API, different bot detection bypass)
3. **Option C:** Switch to different deployment platform with better headless browser support

See `memory/auth-session-fix.md` for full context.
