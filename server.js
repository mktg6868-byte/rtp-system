import express from "express";
import fetch from "node-fetch";
import FormData from "form-data";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// === CONFIG ===
const ACCESS_ID = 20050695;
const ACCESS_TOKEN = "c574d3c7b814b2efa4e62d179764b1864766adc8700240454d7fde1c56c3a855";
const ENDPOINT = "/api/v1/index.php";

// Render health check
app.get("/", (req, res) => {
    res.send("Game List API is running.");
});

// ====================================================================
// PREMIUM GAME API → Used by the IFRAME
// ====================================================================
app.post("/games", async (req, res) => {
    const { baseURL } = req.body;

    if (!baseURL) {
        return res.status(400).json({
            status: "error",
            message: "Missing baseURL from iframe parent",
        });
    }

    try {
        const url = baseURL + ENDPOINT;

        const form = new FormData();
        form.append("module", "/games/getGameList");
        form.append("accessId", ACCESS_ID);
        form.append("accessToken", ACCESS_TOKEN);

        const response = await fetch(url, { method: "POST", body: form });
        const apiData = await response.json();

        const list = apiData?.data || [];

        // Group games by GameType
        const providers = {};

        list.forEach((g) => {
            const provider = g.GameType || "UNKNOWN";

            if (!providers[provider]) {
                providers[provider] = {
                    displayName: provider,
                    data: [],
                };
            }

            // Random RTP (40–96)
            const rtp = Math.floor(Math.random() * (96 - 40 + 1)) + 40;

            providers[provider].data.push({
                gamertpid: g.GameCode,
                gamertpnum: rtp,
                gamertpdata: {
                    gameName: g.GameName,
                    gameImgURL: g.GameImageUrl,
                    gameCode: g.GameCode,
                },
            });
        });

        // FINAL RESPONSE (matches competitor design)
        res.json({
            status: "success",
            timestamp: Date.now(),
            data: {
                autoRTPminute: 10,
                autoRTPlastTime: Math.floor(Date.now() / 1000),
                headerImageURL: "",
                cssStyle: {
                    textColor: "#ffffff",
                    baseColor: "#181d3a",
                    outlineColor: "#444",
                    buttonTextColor: "#ffffff",
                    buttonBgColor: "#181d3a",
                    progressbarBgColor: "#ffc107",
                },
                gameRTPData: providers,
            },
        });
    } catch (err) {
        console.error("Backend Error:", err);
        res.json({ status: "error", error: err.message });
    }
});

// ====================================================================
// IFRAME PAGE HTML (PREMIUM DESIGN)
// ====================================================================
app.get("/embed/games", (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="UTF-8" />
    <title>Premium Game RTP</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <style>
    /* -----------------------------------
       AUTO-THEME DETECTION
    ----------------------------------- */
    :root {
        --accent: #00fff6;
        --accent2: #bbff00;
        --accent3: #a77bff;
        --gold: #ffc107;
        --transition: 0.25s ease;
    }
    
    /* DARK THEME */
    html.dark {
        --bg: #0f1217;
        --card-bg: rgba(255,255,255,0.05);
        --text: #ffffff;
        --subtext: #88a;
        --border: rgba(255,255,255,0.08);
        --nav-bg: #181d3a;
        --nav-active: var(--gold);
        --nav-text-active: #000;
        --shadow: 0 8px 20px rgba(0,0,0,0.6);
    }
    
    /* LIGHT THEME */
    html.light {
        --bg: #f6f7f9;
        --card-bg: rgba(0,0,0,0.03);
        --text: #111;
        --subtext: #444;
        --border: rgba(0,0,0,0.1);
        --nav-bg: #ffffff;
        --nav-active: #e1b955;
        --nav-text-active: #111;
        --shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    
    body {
        margin: 0;
        padding: 16px;
        background: var(--bg);
        color: var(--text);
        font-family: Arial, sans-serif;
        transition: background var(--transition), color var(--transition);
    }
    
    /* -----------------------------------
       PROVIDER NAV
    ----------------------------------- */
    .nav-baryuan {
        display: flex;
        gap: 12px;
        overflow-x: auto;
        padding-bottom: 12px;
        margin-bottom: 20px;
    }
    
    .nav-item {
        padding: 8px 18px;
        background: var(--nav-bg);
        border-radius: 24px;
        border: 1px solid var(--border);
        cursor: pointer;
        white-space: nowrap;
        color: var(--subtext);
        font-weight: bold;
        transition: var(--transition);
    }
    
    .nav-item:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow);
    }
    
    .nav-item.active {
        background: var(--nav-active);
        color: var(--nav-text-active);
        transform: scale(1.05);
    }
    
    /* -----------------------------------
       GAME GRID
    ----------------------------------- */
    .games-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 16px;
        margin-bottom: 30px;
    }
    
    .game-card {
        background: var(--card-bg);
        border-radius: 14px;
        padding: 12px;
        border: 1px solid var(--border);
        box-shadow: var(--shadow);
        transition: var(--transition);
    }
    
    .game-card:hover {
        transform: translateY(-6px) scale(1.03);
    }
    
    .game-card img {
        width: 100%;
        border-radius: 10px;
    }
    
    /* -----------------------------------
       RTP BAR
    ----------------------------------- */
    .progress-container {
        margin-top: 8px;
        background: var(--border);
        border-radius: 8px;
        overflow: hidden;
    }
    
    .progress-bar {
        height: 20px;
        color: #fff;
        font-size: 12px;
        line-height: 20px;
        text-align: center;
        transition: width 0.35s ease;
        background: linear-gradient(90deg,
            #ff3e57, /* red */
            #ff9800, /* orange */
            #fce83a, /* yellow */
            #4caf50  /* green */
        );
    }
    
    /* -----------------------------------
       PAGINATION
    ----------------------------------- */
    .pagination {
        display: flex;
        justify-content: center;
        gap: 16px;
        margin-top: 10px;
        margin-bottom: 30px;
    }
    
    .page-btn {
        padding: 10px 18px;
        background: var(--nav-bg);
        border: 1px solid var(--border);
        border-radius: 10px;
        cursor: pointer;
        font-weight: bold;
        transition: var(--transition);
    }
    
    .page-btn:hover {
        background: var(--nav-active);
        color: var(--nav-text-active);
    }
    
    /* -----------------------------------
       FAQ SECTION
    ----------------------------------- */
    details {
        background: var(--card-bg);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 14px;
        margin-bottom: 12px;
    }
    details summary {
        cursor: pointer;
        font-weight: bold;
        padding: 4px 0;
    }
    
    </style>
    </head>
    
    <body>
    
    <div class="nav-baryuan" id="providerCategory"></div>
    <div class="games-grid" id="gameRTP"></div>
    
    <div class="pagination">
        <div class="page-btn" id="prevPage">Previous</div>
        <div class="page-btn" id="pageInfo">Page 1</div>
        <div class="page-btn" id="nextPage">Next</div>
    </div>
    
    <details>
        <summary>Disclaimer</summary>
        <p>This RTP overview is generated for entertainment and informational purposes only.</p>
    </details>
    
    <script>
    /* -----------------------------------
       AUTO THEME DETECTION
    ----------------------------------- */
    function isDark(color) {
        const c = color.match(/\d+/g).map(Number);
        const brightness = (c[0] * 299 + c[1] * 587 + c[2] * 114) / 1000;
        return brightness < 140;
    }
    
    (function detectTheme() {
        let bg = window.parent.getComputedStyle(window.frameElement)?.backgroundColor || "rgb(20,20,20)";
        if (isDark(bg)) document.documentElement.classList.add("dark");
        else document.documentElement.classList.add("light");
    })();
    
    /* -----------------------------------
       AUTO HEIGHT
    ----------------------------------- */
    function sendHeight() {
        const h = document.body.scrollHeight;
        window.parent.postMessage({ type: "setIframeHeight", height: h }, "*");
    }
    window.addEventListener("load", sendHeight);
    new ResizeObserver(sendHeight).observe(document.body);
    
    /* -----------------------------------
       RECEIVE BASE URL
    ----------------------------------- */
    let parentBaseURL = null;
    window.addEventListener("message", (event) => {
        if (event.data?.baseURL) {
            parentBaseURL = event.data.baseURL;
            loadGameData();
        }
    });
    
    /* -----------------------------------
       LOAD GAME LIST
    ----------------------------------- */
    let providers = {};
    let currentProvider = "";
    let currentPage = 1;
    const itemsPerPage = 60;
    
    async function loadGameData() {
        const res = await fetch("/games", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ baseURL: parentBaseURL })
        });
    
        const json = await res.json();
        providers = json.data.gameRTPData;
    
        buildNav();
    }
    
    function buildNav() {
        const nav = document.getElementById("providerCategory");
        nav.innerHTML = "";
    
        Object.keys(providers).forEach((p) => {
            const btn = document.createElement("div");
            btn.className = "nav-item";
            btn.innerText = providers[p].displayName;
            btn.onclick = () => selectProvider(p, btn);
            nav.appendChild(btn);
        });
    
        const first = document.querySelector(".nav-item");
        if (first) first.click();
    }
    
    function selectProvider(provider, btn) {
        document.querySelectorAll(".nav-item").forEach((x) => x.classList.remove("active"));
        btn.classList.add("active");
    
        currentProvider = provider;
        currentPage = 1;
        renderGames();
    }
    
    function renderGames() {
        const grid = document.getElementById("gameRTP");
        grid.innerHTML = "";
    
        const list = providers[currentProvider].data;
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const subset = list.slice(start, end);
    
        subset.forEach((g) => {
            grid.innerHTML += \`
                <div class="game-card">
                    <img src="\${g.gamertpdata.gameImgURL}" onerror="this.src='https://dummyimage.com/400x400/222/fff&text=No+Image';">
                    <div style="margin-top:6px;font-weight:bold;">\${g.gamertpdata.gameName}</div>
                    <div class="progress-container">
                        <div class="progress-bar" style="width:\${g.gamertpnum}%;">
                            \${g.gamertpnum}%
                        </div>
                    </div>
                </div>
            \`;
        });
    
        document.getElementById("pageInfo").innerText = "Page " + currentPage;
        sendHeight();
    }
    
    document.getElementById("prevPage").onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            renderGames();
        }
    };
    document.getElementById("nextPage").onclick = () => {
        currentPage++;
        renderGames();
    };
    </script>
    
    </body>
    </html>
    `);
});

// ====================================================================
// START SERVER
// ====================================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
    console.log("Server running on port " + PORT)
);





