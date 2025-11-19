// rtp-engine.js
const fs = require("fs");
const path = require("path");

const STEP_MS = 3 * 60 * 1000; // 3 minutes
const STATE_PATH = path.join(__dirname, "data", "rtp-state.json");

// Random in [min, max]
function randRange(min, max) {
  return min + Math.random() * (max - min);
}

function round2(x) {
  return Math.round(x * 100) / 100;
}

// Single step update for one game state
function stepUpdate(state) {
  let rtp = state.rtp ?? randRange(95, 98.5);
  let mode = state.mode || "normal";

  // If at or below zero, soft restart
  if (rtp <= 0) {
    rtp = randRange(88, 92); // soft low restart
    mode = "recovery";
  } else if (mode === "recovery") {
    if (rtp < 95) {
      // climb back up
      rtp += randRange(0.01, 0.03);
    } else {
      // back to normal once above 95
      mode = "normal";
    }
  } else {
    // normal mode drift: bias slightly downward
    const u = Math.random();
    let delta;
    if (u < 0.65) {
      // 65% chance to go down a bit
      delta = -randRange(0.005, 0.03);
    } else {
      // 35% chance to go up
      delta = randRange(0.005, 0.02);
    }
    rtp += delta;
  }

  // clamp
  if (rtp > 98.5) rtp = 98.5;
  if (rtp < 0) rtp = 0;

  state.rtp = round2(rtp);
  state.mode = mode;
}

// Load state file
function loadState() {
  try {
    if (!fs.existsSync(STATE_PATH)) return {};
    const raw = fs.readFileSync(STATE_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// Save state file
function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), "utf8");
}

/**
 * Update RTP state based on elapsed time.
 * games: list from rtp-data.json
 * returns a map: key => { rtp, mode }
 */
async function updateRtpState(games) {
  const state = loadState();
  const now = Date.now();

  // Ensure states exist for all current games
  for (const g of games) {
    const key = `${g.providerCode}|${g.code}`;
    if (!state[key]) {
      state[key] = {
        rtp: randRange(95, 98.5),
        mode: "normal",
        lastUpdated: now
      };
    }
  }

  // Update each game based on how many steps elapsed
  for (const g of games) {
    const key = `${g.providerCode}|${g.code}`;
    const s = state[key];
    if (!s) continue;

    const last = s.lastUpdated || now;
    const dt = now - last;
    const steps = Math.floor(dt / STEP_MS);

    if (steps > 0) {
      for (let i = 0; i < steps; i++) {
        stepUpdate(s);
      }
      s.lastUpdated = last + steps * STEP_MS;
    }
  }

  // Optionally prune old games that disappeared
  const validKeys = new Set(
    games.map(g => `${g.providerCode}|${g.code}`)
  );
  for (const key of Object.keys(state)) {
    if (!validKeys.has(key)) {
      delete state[key];
    }
  }

  saveState(state);
  return state;
}

module.exports = updateRtpState;
