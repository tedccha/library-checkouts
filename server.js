import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';
import { fetchCheckedOutBooks } from './lib/library.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env.local') });

const app = express();
const PORT = 3000;

// Session setup
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production', httpOnly: true }
}));

// Passport setup
passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.CALLBACK_URL || 'http://localhost:3000'}/auth/google/callback`
  },
  (accessToken, refreshToken, profile, done) => {
    const allowedEmails = (process.env.ALLOWED_EMAILS || 'tedcha@gmail.com').split(',').map(e => e.trim());

    if (!allowedEmails.includes(profile.emails[0].value)) {
      return done(null, false, { message: 'Email not authorized' });
    }

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

// Routes
app.get('/', (req, res) => {
  if (req.user) {
    res.json({
      message: 'Welcome!',
      user: req.user.emails[0].value,
      booksUrl: '/api/books'
    });
  } else {
    res.json({ message: 'Not authenticated. Visit /auth/google to sign in' });
  }
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    res.json({ message: 'Authenticated!', user: req.user.emails[0].value });
  }
);

app.get('/api/books', requireAuth, async (req, res) => {
  try {
    console.log(`Fetching books for ${req.user.emails[0].value}...`);
    const books = await fetchCheckedOutBooks(
      process.env.LIBRARY_USERNAME,
      process.env.LIBRARY_PASSWORD
    );
    res.json({ books });
  } catch (error) {
    console.error('Error:', error.message);
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
