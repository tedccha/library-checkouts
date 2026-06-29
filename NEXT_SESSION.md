# Next Session: Auth Fix - JWT Approach

## Current State
- Google OAuth works ✓
- Email validation works ✓
- Session persists to MemoryStore ✓
- **BUT:** Set-Cookie header NOT sent to browser ✗
- User always null on next request ✗

## What To Do

### 1. Install Dependencies
```bash
npm install jsonwebtoken cookie-parser
```

### 2. Replace session-based auth with JWT

**In server.js:**

Replace:
```javascript
import session from 'express-session';
// ... session middleware setup ...
app.use(session({ ... }));
```

With:
```javascript
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';

app.use(cookieParser());
// No session middleware needed
```

### 3. Update callback route

Replace callback with:
```javascript
app.get('/api/auth/callback/google',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    const token = jwt.sign(
      { email: req.user.emails[0].value },
      process.env.SESSION_SECRET || 'dev-secret',
      { expiresIn: '24h' }
    );
    res.cookie('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400000
    });
    res.redirect('/');
  }
);
```

### 4. Update /api/user endpoint

Replace with:
```javascript
app.get('/api/user', (req, res) => {
  const token = req.cookies['auth-token'];
  if (!token) return res.json({ user: null });
  
  try {
    const decoded = jwt.verify(token, process.env.SESSION_SECRET || 'dev-secret');
    res.json({ user: decoded.email });
  } catch (err) {
    res.json({ user: null });
  }
});
```

### 5. Update protected routes

Replace `requireAuth` middleware:
```javascript
function requireAuth(req, res, next) {
  const token = req.cookies['auth-token'];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    jwt.verify(token, process.env.SESSION_SECRET || 'dev-secret');
    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}
```

### 6. Remove Passport session code

Remove:
```javascript
passport.serializeUser(...);
passport.deserializeUser(...);
app.use(passport.session());
```

### 7. Test

```bash
npm run dev
# Or on Railway: deploy and test
```

## Why This Works
- No server-side session store needed
- JWT is self-contained and stateless
- Works on Railway's ephemeral filesystem
- Standard OAuth pattern
- Simple and reliable

## Files to Edit
- `server.js` (main changes)
- `package.json` (add dependencies)

See [auth-session-issue.md](../../.claude/projects/-Users-teddycha-Code-LibraryCheckouts/memory/auth-session-issue.md) for full context.
