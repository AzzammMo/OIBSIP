const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const fs = require('node:fs/promises');
const path = require('node:path');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

app.disable('x-powered-by');
app.use(express.json({ limit: '10kb' }));
app.use(session({
  name: 'oibsip.sid',
  secret: process.env.SESSION_SECRET || 'development-only-change-this-secret-before-deployment',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 2
  }
}));
app.use(express.static(path.join(__dirname, 'public')));

async function readUsers() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    return JSON.parse(await fs.readFile(USERS_FILE, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function writeUsers(users) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tempFile = `${USERS_FILE}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(users, null, 2), 'utf8');
  await fs.rename(tempFile, USERS_FILE);
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Your session has expired. Please log in again.' });
  }
  next();
}

app.post('/api/register', async (req, res, next) => {
  try {
    const username = String(req.body.username || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Please complete all fields.' });
    }
    if (username.length < 3 || username.length > 24) {
      return res.status(400).json({ message: 'Username must contain 3–24 characters.' });
    }
    if (!validEmail(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }
    if (password.length < 8 || !/\d/.test(password)) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long and contain at least one number.' });
    }

    const users = await readUsers();
    const exists = users.some(user => user.email === email || user.username.toLowerCase() === username.toLowerCase());
    if (exists) {
      return res.status(409).json({ message: 'That username or email is already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = {
      id: cryptoRandomId(),
      username,
      email,
      passwordHash,
      createdAt: new Date().toISOString()
    };
    users.push(user);
    await writeUsers(users);

    req.session.regenerate(error => {
      if (error) return next(error);
      req.session.user = { id: user.id, username: user.username, email: user.email };
      req.session.save(saveError => {
        if (saveError) return next(saveError);
        res.status(201).json({ message: 'Account created successfully.', user: req.session.user });
      });
    });
  } catch (error) { next(error); }
});

app.post('/api/login', async (req, res, next) => {
  try {
    const identifier = String(req.body.identifier || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!identifier || !password) {
      return res.status(400).json({ message: 'Please enter your username/email and password.' });
    }

    const users = await readUsers();
    const user = users.find(item => item.email === identifier || item.username.toLowerCase() === identifier);
    const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false;

    if (!user || !passwordMatches) {
      return res.status(401).json({ message: 'Invalid username/email or password.' });
    }

    req.session.regenerate(error => {
      if (error) return next(error);
      req.session.user = { id: user.id, username: user.username, email: user.email };
      req.session.save(saveError => {
        if (saveError) return next(saveError);
        res.json({ message: 'Login successful.', user: req.session.user });
      });
    });
  } catch (error) { next(error); }
});

app.get('/api/me', requireAuth, (req, res) => {
  res.json({ user: req.session.user });
});

app.post('/api/logout', requireAuth, (req, res, next) => {
  req.session.destroy(error => {
    if (error) return next(error);
    res.clearCookie('oibsip.sid', { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
    res.json({ message: 'You have been logged out.' });
  });
});

app.get('/dashboard', (req, res) => {
  if (!req.session.user) return res.redirect('/');
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

app.use('/api', (req, res) => res.status(404).json({ message: 'API endpoint not found.' }));
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
});

function cryptoRandomId() {
  return require('node:crypto').randomUUID();
}

app.listen(PORT, () => {
  console.log(`\n  OIBSIP Authentication System is running`);
  console.log(`  Local: http://localhost:${PORT}\n`);
});
