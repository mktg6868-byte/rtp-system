// server.js
const express = require("express");
const path = require("path");
const helmet = require("helmet");

const buildRtpData = require("./build-rtp-data");
const updateRtpState = require("./rtp-engine");

const app = express();
app.set("trust proxy", 1);

// Allowed casino domains that can use this RTP system.
// Adjust this array for all your brands.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

if (ALLOWED_ORIGINS.length === 0) {
  // safe defaults from earlier discussion
  ALLOWED_ORIGINS.push("https://i88sg.com", "https://wegobet.asia");
  console.log("Using default ALLOWED_ORIGINS:", ALLOWED_ORIGINS);
}

// Basic security headers
app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

// Static files
app.use("/public", express.static(path.join(__dirname, "public")));

// Serve embed UI
app.get("/embed", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "embed", "index.html"));
});

// In-memory cache: baseUrl -> { updated, baseUrl, providers, games, fetchedAt }
const metaCache = {};

// Ensure metadata for this baseUrl exists and is not too old
async function getMetaForBase(baseUrl) {
  const now = Date.now();
  const cached = metaCache[baseUrl];
  const maxAgeMs = 24 * 60 * 60 * 1000; // 1 day

  if (!cached || now - cached.fetchedAt > maxAgeMs) {
    console.log(`Refreshing metadata for baseUrl = ${baseUrl}`);
    const meta = await buildRtpData(baseUrl);
    metaCache[baseUrl] = {
      ...meta,
      fetchedAt: now
    };
  }

  return metaCache[baseUrl];
}

// RTP API
// Frontend passes ?base={originOfCasinoSite} (e.g. https://wegobet.asia)
app.get("/api/rtp", async (req, res) => {
  try {
    const base = req.query.base;
    if (!base) {
      return res.status(400).json({
        status: "error",
        message: "Missing base parameter"
      });
    }

    // Validate base origin
    const isAllowed = ALLOWED_ORIGINS.some(d => base.startsWith(d));
    if (!isAllowed) {
      return res.status(403).json({
        status: "error",
        message: "Origin not allowed"
      });
    }

    const meta = await getMetaForBase(base); // {providers,games,...}
    const state = updateRtpState(base, meta.games); // per-game RTP

    const gamesWithRtp = meta.games.map(g => {
      const key = `${g.providerCode}|${g.code}`;
      const s = state[key] || {};
      return {
        ...g,
        rtp: s.rtp ?? null
      };
    });

    res.json({
      status: "success",
      data: {
        updated: meta.updated,
        baseUrl: meta.baseUrl,
        providers: meta.providers,
        games: gamesWithRtp
      }
    });
  } catch (err) {
    console.error("❌ /api/rtp error:", err.message || err.toString());
    res.status(500).json({
      status: "error",
      message: "Failed to load RTP data"
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`RTP server running on port ${PORT}`);
  console.log("Allowed origins:", ALLOWED_ORIGINS);
});
