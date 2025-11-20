const express = require("express");
const path = require("path");
const helmet = require("helmet");
const { brands } = require("./brandConfig");
const { fetchGamesForBrand } = require("./build-games");
const { updateState } = require("./rtp-engine");

const app = express();
app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "default-src": ["'self'", "https:"],
        "img-src": ["*", "data:"],
        "style-src": ["'self'", "'unsafe-inline'", "https:"],
        "script-src": ["'self'", "'unsafe-inline'", "https:"],
        "frame-ancestors": ["*"] // allow all, you can restrict to your casino domains
      }
    },
    frameguard: false
  })
);

app.use("/public", express.static(path.join(__dirname, "public")));

const cache = {}; // baseOrigin → { data, time }

async function getBrandData(baseOrigin) {
    const brand = brands.find(b => b.baseOrigin === baseOrigin);
    if (!brand) throw new Error("Unknown baseOrigin " + baseOrigin);

    const now = Date.now();
    const c = cache[baseOrigin];

    if (!c || now - c.time > 60 * 60 * 1000) {
        console.log("Refreshing game list for:", baseOrigin);
        const games = await fetchGamesForBrand(baseOrigin);

        cache[baseOrigin] = {
            data: { games, providers: brand.providers },
            time: now
        };
    }

    return cache[baseOrigin].data;
}

app.get("/api/rtp", async (req, res) => {
    try {
        const baseOrigin = req.query.base;
        if (!baseOrigin) return res.status(400).json({ error: "Missing base" });

        const data = await getBrandData(baseOrigin);
        const rtpState = updateState(baseOrigin, data.games);

        const final = data.games.map(g => {
            const key = `${g.providerCode}|${g.code}`;
            const state = rtpState[key];
            return {
                ...g,
                rtp: state ? state.rtp : null
            };
        });

        res.json({
            status: "success",
            data: {
                providers: data.providers,
                games: final
            }
        });
    } catch (e) {
        res.status(500).json({ status: "error", message: e.message });
    }
});

app.get("/embed", (req, res) => {
    res.sendFile(path.join(__dirname, "public/embed/index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("RTP server running on", PORT));
