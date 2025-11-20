const STEP_MS = 3 * 60 * 1000;

function rand(min, max) {
    return min + Math.random() * (max - min);
}

function round(v) {
    return Math.round(v * 100) / 100;
}

const state = {};

function updateState(baseOrigin, games) {
    if (!state[baseOrigin]) state[baseOrigin] = {};

    const now = Date.now();
    const s = state[baseOrigin];

    for (const g of games) {
        const key = `${g.providerCode}|${g.code}`;
        if (!s[key]) {
            s[key] = {
                rtp: rand(95, 98.5),
                mode: "normal",
                last: now
            };
        }
    }

    for (const g of games) {
        const key = `${g.providerCode}|${g.code}`;
        const r = s[key];
        if (!r) continue;

        const elapsed = now - r.last;
        const steps = Math.floor(elapsed / STEP_MS);

        if (steps > 0) {
            for (let i = 0; i < steps; i++) {
                let v = r.rtp;

                if (v <= 0) {
                    v = rand(88, 92);
                    r.mode = "recovery";
                }
                else if (r.mode === "recovery") {
                    v += rand(0.01, 0.03);
                    if (v >= 95) r.mode = "normal";
                }
                else {
                    if (Math.random() < 0.65) {
                        v -= rand(0.005, 0.03);
                    } else {
                        v += rand(0.005, 0.02);
                    }
                }

                v = Math.min(98.5, Math.max(0, v));
                r.rtp = round(v);
            }

            r.last = now;
        }
    }

    return s;
}

function applyRTP(baseOrigin, games) {
    const s = state[baseOrigin] || {};
    return games.map(g => {
        const key = `${g.providerCode}|${g.code}`;
        return {
            ...g,
            rtp: s[key]?.rtp ?? rand(95, 98)
        };
    });
}

module.exports = { updateState, applyRTP };
