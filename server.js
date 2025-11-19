// server.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { allowedOrigins, embedToken } = require('./config');

const app = express();
const PORT = process.env.PORT || 3000;

// Security headers
app.use(helmet({
  contentSecurityPolicy: false // we’ll add our own CSP header below
}));

// Basic JSON body parsing (if needed later)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple request logger (optional)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  next();
});

// Serve static files (HTML/CSS/JS)
app.use('/public', express.static(path.join(__dirname, 'public'), {
  maxAge: '1h',
  etag: true
}));

// Anti-abuse rate limiter for API
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,             // 60 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false
});

// Helper: check if request comes from your domains (Origin / Referer)
function isAllowedOrigin(req) {
  const origin = req.headers.origin || '';
  const referer = req.headers.referer || '';

  return allowedOrigins.some(domain =>
    origin.startsWith(domain) || referer.startsWith(domain)
  );
}

// CSP + frame-ancestors to only allow your casinos to embed
app.use((req, res, next) => {
  const frameAncestors = "https://i88sg.com https://wegobet.asia";
  res.setHeader(
    'Content-Security-Policy',
    `frame-ancestors ${frameAncestors}; default-src 'self' https:; img-src * data:; style-src 'self' 'unsafe-inline' https:; script-src 'self' https: 'unsafe-inline';`
  );
  next();
});

// Serve the iframe page with optional token validation
app.get('/embed/game-rtp.html', (req, res) => {
  const token = req.query.t;

  // simple token check (optional but recommended)
  if (embedToken && token !== embedToken) {
    return res.status(403).send('Forbidden');
  }

  // additionally, allow only your domains to embed
  if (!isAllowedOrigin(req)) {
    console.warn('Blocked embed from origin/referrer:', req.headers.origin, req.headers.referer);
    return res.status(403).send('Forbidden');
  }

  res.sendFile(path.join(__dirname, 'public', 'embed', 'game-rtp.html'));
});

// RTP API – returns JSON data
app.post('/api/rtp', apiLimiter, (req, res) => {
  if (!isAllowedOrigin(req)) {
    console.warn('Blocked API from origin/referrer:', req.headers.origin, req.headers.referer);
    return res.status(403).json({ status: 'error', data: { message: 'Forbidden' } });
  }

  try {
    const jsonPath = path.join(__dirname, 'data', 'rtp-data.json');
    const raw = fs.readFileSync(jsonPath, 'utf-8');
    const rtpData = JSON.parse(raw);

    const now = Math.floor(Date.now() / 1000);

    return res.json({
      status: 'success',
      timestamp: now,
      data: rtpData
    });
  } catch (err) {
    console.error('Error reading RTP data:', err);
    return res.status(500).json({
      status: 'error',
      data: { message: 'Internal server error' }
    });
  }
});

app.listen(PORT, () => {
  console.log(`RTP server running on http://localhost:${PORT}`);
});

