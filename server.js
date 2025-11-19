// server.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const helmet = require("helmet");

const buildRtpData = require("./build-rtp-data");
const updateRtpState = require("./rtp-engine");

const app = express();
app.set("trust proxy", 1);

// Set this in Render → Environment → BASE_URL = https://wegobet.asia (or your other site)
const BASE_URL = process.env.BASE_URL; 

if (!BASE_URL) {
  console.error("❌ BASE_URL env variable is NOT set. RTP scraping will fail.");
}

// Only these domains can embed the iframe (adjust as needed)
const ALLOWED_IFRAME = [
  "https://i88sg.com",
  "https://wegobet.asia"
];

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

// Basic CORS for allowed iframe parents
app.use((req, res, next) => {
  const origin = req.headers.origin || "";
  if (ALLOWED_IFRAME.some(d => origin.startsWith(d))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  next();
});

// Static assets
app.use("/public", express.static(path.join(__dirname, "public")));

// Serve the embed UI
app.get("/embed", (req, res) => {
  res.sendFile(path.join(__dirname, "public/embed/index.html"));
});

const DATA_PATH = path.join(__dirname, "data", "rtp-data.json");

// Check mtime; refresh metadata daily if needed
async function ensureRtpDataFresh() {
  if (!BASE_URL) {
    throw new Error("BASE_URL is not configured.");
  }

  let needsBuild = false;

  if (!fs.existsSync(DATA_PATH)) {
    needsBuild = true;
  } else {
    const stat = fs.statSync(DATA_PATH);
    const ageMs = Date.now() - stat.mtimeMs;
    const oneDayMs = 24 * 60 * 60 * 1000;
    if (ageMs > oneDayMs) {
      needsBuild = true;
    }
  }

  if (needsBuild) {
    console.log("⚙ Refreshing rtp-data.json from:", BASE_URL);
    await buildRtpData(BASE_URL);
  }
}

// RTP API
app.get("/api/rtp", async (req, res) => {
  try {
    await ensureRtpDataFresh();

    const raw = fs.readFileSync(DATA_PATH, "utf8");
    const meta = JSON.parse(raw); // { updated, baseUrl, providers, games }

    // Update RTP state for all games based on elapsed time
    const state = await updateRtpState(meta.games);

    // Merge RTP into games
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
    res.status(500).json({ status: "error", message: "Failed to load RTP data" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`RTP server running on port ${PORT}`);
  console.log(`Using BASE_URL = ${BASE_URL || "NOT SET"}`);
});
