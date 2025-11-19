const express = require('express');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { allowedOrigins, embedToken } = require('./config');

const app = express();
app.set('trust proxy', 1); // FIX for Render
const PORT = process.env.PORT || 3000;


// Security headers
app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

// CORS validator
function isAllowed(req) {
  const o = req.headers.origin || '';
  const r = req.headers.referer || '';
  return allowedOrigins.some((d) => o.startsWith(d) || r.startsWith(d));
}

// Static files
app.use('/public', express.static(path.join(__dirname, 'public')));

// Manual CSP (IMPORTANT)
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
  windowMs: 60000,
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

