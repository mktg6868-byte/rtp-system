// rtp-engine.js
// Your ORIGINAL smooth RTP logic is preserved exactly.

const STEP_MS = 3 * 60 * 1000; // update every 3 minutes

function rand(min, max) {
    return min + Math.random() * (max - min);
}

function round(v) {
    return Math.round(v * 100) / 100;
}

// GLOBAL STATE
// state[baseOrigin][ "PROVIDER|GAMECODE" ] = { rtp, mode, last }
const state = {};

/**
 * Called every request to smoothly update RTP values
 * 
 * @param {string} baseOrigin 
 * @param {Array} games [{ providerCode, code }]
 * @returns updated state for that brand
 */
function updateState(baseOrigin, games) {
    if (!state[baseOrigin]) state[baseOrigin] = {};

    const now = Date.now();
    const s = state[baseOrigin];

    // Initialize missing games
    for (const g of games) {
        const key = `${g.providerCode}|${g.code}`;
        if (!s[key]) {
            s[key] = {
                rtp: rand(95, 98.5),  // starting range
                mode: "normal",
                last: now
            };
        }
    }

    // Update each game
    for (const g of games) {
        const key = `${g.providerCode}|${g.code}`;
        const r = s[key];
        if (!r) continue;

        const elapsed = now - r.last;
        const steps = Math.floor(elapsed / STEP_MS);

        if (steps > 0) {
            for (let i = 0; i < steps; i++) {
                let v = r.rtp;

                // Reset when RTP reaches 0
                if (v <= 0) {
                    v = rand(88, 92);
                    r.mode = "recovery";
                }
                // Recovery mode: push back to stable range
                else if (r.mode === "recovery") {
                    v += rand(0.01, 0.03);
                    if (v >= 95) r.mode = "normal";
                }
                else {
                    // Normal fluctuations
                    if (Math.random() < 0.65) {
                        v -= rand(0.005, 0.03); // slow fall
                    } else {
                        v += rand(0.005, 0.02); // small rise
                    }
                }

                // Clamp RTP
                v = Math.min(98.5, Math.max(0, v));

                r.rtp = round(v);
            }

            r.last = now;
        }
    }

    return s;
}

/**
 * Helper → return final games with applied RTP values
 * 
 * @param {string} baseOrigin 
 * @param {Array} games 
 * @returns Array with merged RTP
 */
function applyRTP(baseOrigin, games) {
    const s = state[baseOrigin] || {};
    return games.map(g => {
        const key = `${g.providerCode}|${g.code}`;
        return {
            ...g,
            rtp: s[key]?.rtp ?? rand(95, 98) // fallback
        };
    });
}

module.exports = { updateState, applyRTP };
