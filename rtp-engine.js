// rtp-engine.js
// Time-based synthetic RTP engine in memory (no files).

const STEP_MS = 3 * 60 * 1000; // 3 minutes per logical "tick"

// baseUrl -> { gameKey -> { rtp, mode, lastUpdated } }
const stateByBase = {};

// Random in [min, max]
function randRange(min, max) {
  return min + Math.random() * (max - min);
}

function round2(x) {
  return Math.round(x * 100) / 100;
}

// One step for one game state
function stepUpdate(state) {
  let rtp = state.rtp ?? randRange(95, 98.5);
  let mode = state.mode || "normal";

  // Soft restart if at or below 0
  if (rtp <= 0) {
    rtp = randRange(88, 92); // restart low
    mode = "recovery";
  } else if (mode === "recovery") {
    if (rtp < 95) {
      // climb back up slowly
      rtp += randRange(0.01, 0.03);
    } else {
      mode = "normal";
    }
  } else {
    // normal drift: slight downward bias
    const u = Math.random();
    let delta;
    if (u < 0.65) {
      // 65% chance: down
      delta = -randRange(0.005, 0.03);
    } else {
      // 35% chance: up
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

// Update RTP states for a list of games on a given base URL.
// games: from buildRtpData() {providerCode, code, ...}
function updateRtpState(baseUrl, games) {
  const now = Date.now();
  if (!stateByBase[baseUrl]) {
    stateByBase[baseUrl] = {};
  }
  const state = stateByBase[baseUrl];

  // Ensure state exists for each game
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

  // Update by elapsed time
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

  // Optional: remove games that no longer exist
  const validKeys = new Set(
    games.map(g => `${g.providerCode}|${g.code}`)
  );
  for (const key of Object.keys(state)) {
    if (!validKeys.has(key)) delete state[key];
  }

  return state;
}

module.exports = updateRtpState;
