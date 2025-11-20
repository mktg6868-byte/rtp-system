const express = require("express");
const path = require("path");
const helmet = require("helmet");
const { fetchGamesForProvider } = require('./game-fetch');
const rtpEngine = require('./rtp-engine');
const { brands } = require('./brandConfig');


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
// Debugging: Test API connectivity
app.get('/test-api', async (req, res) => {
    try {
        const formData = new (require('form-data'))();
        formData.append("module", "/games/getGameList");
        formData.append("accessId", "20050695");
        formData.append("accessToken", "c574d3c7b814b2efa4e62d179764b1864766adc8700240454d7fde1c56c3a855");
        formData.append("product", "0");
        formData.append("site", "PP");

        const response = await fetch("https://wegobet.asia/api/v1/index.php", {
            method: "POST",
            body: formData
        });

        const text = await response.text();

        // Try to parse JSON if possible
        try {
            res.json({
                raw: text,
                json: JSON.parse(text)
            });
        } catch (e) {
            res.json({
                raw: text,
                json: "Not JSON",
                error: e.toString()
            });
        }

    } catch (e) {
        res.json({ error: e.toString() });
    }
});


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


