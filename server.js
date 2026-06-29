import express from 'express';
import session from 'express-session';
import pgSession from 'connect-pg-simple';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import pg from 'pg';
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

// PostgreSQL connection for session store
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

const PgSession = pgSession(session);

// Serve static files
app.use(express.static('public'));

// Session setup with PostgreSQL store
app.use(session({
  store: new PgSession({ pool }),
  secret: process.env.SESSION_SECRET || 'dev-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 86400000 // 24 hours
  }
}));

// Middleware to log session activity
app.use((req, res, next) => {
  const origSend = res.send;
  res.send = function(data) {
    console.log('[Session] Response headers:', res.getHeaders());
    return origSend.call(this, data);
  };
  next();
});

// Passport setup (without session middleware)
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
  console.log('[Step 6] /api/user request received');
  console.log('[Step 6] Request cookies:', req.cookies);
  console.log('[Step 6] Session ID:', req.sessionID);
  console.log('[Step 6] Session object after middleware loaded:', req.session);
  console.log('[Step 6] req.user after middleware loaded:', req.user);

  if (req.user) {
    console.log('[Step 9] User authenticated:', req.user.emails[0].value);
    res.json({ user: req.user.emails[0].value });
  } else {
    console.log('[Step 9] User NOT authenticated');
    res.json({ user: null });
  }
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/api/auth/callback/google',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    console.log('[Step 1] After passport.authenticate, req.user:', req.user.emails[0].value);
    console.log('[Step 1] Session ID before login:', req.sessionID);

    req.login(req.user, (err) => {
      if (err) {
        console.log('[Step 3] req.login error:', err);
        return res.redirect('/');
      }

      console.log('[Step 3] req.login callback reached');
      console.log('[Step 3] Session ID after login:', req.sessionID);
      console.log('[Step 3] Session object:', req.session);
      console.log('[Step 3] req.user after login:', req.user.emails[0].value);

      // Force save session explicitly
      req.session.save((saveErr) => {
        if (saveErr) {
          console.log('[Step 4] Session save error:', saveErr);
          return res.redirect('/');
        }
        console.log('[Step 4] Session saved to DB');
        console.log('[Step 4] Response will include Set-Cookie header:', res.getHeader('set-cookie'));
        res.redirect('/');
      });
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
