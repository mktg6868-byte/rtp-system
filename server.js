const express = require('express');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { embedToken } = require('./config'); // we won't rely on allowedOrigins from config for now

const app = express();
app.set('trust proxy', 1); // required for Render

const PORT = process.env.PORT || 3000;

// Hard-coded allowed origins (iframe parents + self for testing)
const ALLOWED_ORIGINS = [
  'https://i88sg.com',
  'https://wegobet.asia',
  'https://rtp-system.onrender.com'
];

// Security headers via helmet (CSP handled manually)
app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

// CORS + preflight handling
app.use((req, res, next) => {
  const origin = req.headers.origin || '';

  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin'); // ensure caches respect per-origin headers
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

// CORS validator for API & embed
function isAllowed(req) {
  const origin = req.headers.origin || '';
  const referer = req.headers.referer || '';

  // Allow server-to-server / curl with no origin & referer
  if (!origin && !referer) {
    return true;
  }

  // Allow if origin or referer matches any allowed origin
  return ALLOWED_ORIGINS.some(
    (d) => (origin && origin.startsWith(d)) || (referer && referer.startsWith(d))
  );
}

// Static files
app.use('/public', express.static(path.join(__dirname, 'public')));

// Manual CSP (only control who can FRAME the RTP page)
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "frame-ancestors https://i88sg.com https://wegobet.asia; default-src 'self' https:; img-src * data:; style-src 'self' 'unsafe-inline' https:; script-src 'self' https: 'unsafe-inline';"
  );
  next();
});

// Embed HTML
app.get('/embed/game-rtp.html', (req, res) => {
  if (req.query.t !== embedToken) {
    return res.status(403).send('Forbidden');
  }

  if (!isAllowed(req)) {
    return res.status(403).send('Forbidden');
  }

  res.sendFile(path.join(__dirname, 'public/embed/game-rtp.html'));
});

// API rate limit
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60
});

// RTP API
app.post('/api/rtp', apiLimiter, (req, res) => {
  if (!isAllowed(req)) {
    return res.status(403).json({ status: 'error', message: 'Origin blocked' });
  }

  try {
    const raw = fs.readFileSync(path.join(__dirname, 'data/rtp-data.json'), 'utf8');
    const data = JSON.parse(raw);

    res.json({
      status: 'success',
      timestamp: Math.floor(Date.now() / 1000),
      data
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ status: 'error', message: 'Failed to load data' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`RTP server running on port ${PORT}`);
});
