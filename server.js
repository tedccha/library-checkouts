import express from 'express';
import session from 'express-session';
import SessionStore from 'session-file-store';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';
import { fetchCheckedOutBooks, fetchHolds } from './lib/library.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Only load .env.local in development (won't error if it doesn't exist)
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.join(__dirname, '.env.local') });
}

const app = express();
const PORT = 3000;

// Serve static files
app.use(express.static('public'));

// Session setup with file-based store
const FileStore = SessionStore(session);
const sessionDir = path.join(__dirname, '.sessions');
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-key',
  resave: false,
  saveUninitialized: true,
  store: new FileStore({ path: sessionDir }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

// Passport setup
passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.CALLBACK_URL || 'http://localhost:3000'}/api/auth/callback/google`
  },
  (accessToken, refreshToken, profile, done) => {
    const allowedEmails = (process.env.ALLOWED_EMAILS || 'tedcha@gmail.com').split(',').map(e => e.trim().toLowerCase());
    const userEmail = profile.emails[0].value.toLowerCase();

    console.log(`[Auth] Google email: ${profile.emails[0].value}`);
    console.log(`[Auth] Normalized email: ${userEmail}`);
    console.log(`[Auth] Allowed emails: [${allowedEmails.join(', ')}]`);
    console.log(`[Auth] Match: ${allowedEmails.includes(userEmail)}`);

    if (!allowedEmails.includes(userEmail)) {
      console.log(`[Auth] REJECTED: ${userEmail} not in allowlist`);
      return done(null, false, { message: 'Email not authorized' });
    }

    console.log(`[Auth] ACCEPTED: ${userEmail}`);
    return done(null, profile);
  }
));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

app.use(passport.initialize());
app.use(passport.session());

// Middleware to check auth
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Routes (API endpoints)
app.get('/api/user', (req, res) => {
  if (req.user) {
    res.json({ user: req.user.emails[0].value });
  } else {
    res.json({ user: null });
  }
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/api/auth/callback/google',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    console.log('[Callback] User authenticated:', req.user.emails[0].value);
    console.log('[Callback] Session ID:', req.sessionID);
    console.log('[Callback] Saving session...');

    req.session.save((err) => {
      if (err) {
        console.error('[Callback] Session save error:', err);
        return res.status(500).json({ error: 'Session save failed' });
      }

      console.log('[Callback] Session saved successfully');
      console.log('[Callback] Redirecting to /');
      res.redirect('/');
    });
  }
);

app.get('/api/books', requireAuth, async (req, res) => {
  try {
    console.log(`Fetching books for ${req.user.emails[0].value}...`);
    const books = await fetchCheckedOutBooks(
      process.env.LIBRARY_USERNAME,
      process.env.LIBRARY_PASSWORD
    );

    // Separate overdue and current books
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdue = [];
    const current = [];

    books.forEach(book => {
      const dueDate = new Date(book.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      if (dueDate < today) {
        overdue.push(book);
      } else {
        current.push(book);
      }
    });

    res.json({
      books: current,
      overdue: overdue,
      total: books.length
    });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/holds', requireAuth, async (req, res) => {
  try {
    console.log(`Fetching holds for ${req.user.emails[0].value}...`);
    const holds = await fetchHolds(
      process.env.LIBRARY_USERNAME,
      process.env.LIBRARY_PASSWORD
    );

    res.json({ holds });
  } catch (error) {
    console.error('Error fetching holds:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Logged out' });
  });
});

app.listen(PORT, () => {
  console.log(`\n📚 Library Checkouts API running at http://localhost:${PORT}`);
  console.log(`🔐 Sign in: http://localhost:${PORT}/auth/google`);
  console.log(`📖 Get books: http://localhost:${PORT}/api/books (after signing in)\n`);
});
