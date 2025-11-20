const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');

const { brands } = require('./brandConfig');
const rtpEngine = require('./rtp-engine');
const { fetchGamesForProvider } = require('./game-fetch');

const app = express();
app.set("trust proxy", 1);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use('/public', express.static(path.join(__dirname, 'public')));

// ---------------- EMBED FRAME ----------------
app.get('/embed', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/embed/index.html'));
});

// ---------------- RTP API --------------------
app.get('/api/rtp', async (req, res) => {
    const base = req.query.base;

    const brand = brands.find(b => b.baseOrigin === base);
    if (!brand) {
        return res.status(400).json({
            status: "error",
            message: "Unknown baseOrigin " + base
        });
    }

    try {
        const rawGames = [];

        for (const provider of brand.providers) {
            const games = await fetchGamesForProvider(brand, provider);
            rawGames.push(...games);
        }

        const updated = rtpEngine.updateState(base, rawGames);
        const final = rtpEngine.applyRTP(base, rawGames);

        res.json({
            status: "success",
            providers: final
        });
    }
    catch (err) {
        res.status(500).json({
            status: "error",
            message: err.message
        });
    }
});

// ---------------- START SERVER ----------------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log("RTP server running on port " + PORT);
});
