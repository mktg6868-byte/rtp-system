import express from "express";
import fetch from "node-fetch";
import FormData from "form-data";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// === CONFIG ===
// Your provider credentials
const ACCESS_ID = 20050695;
const ACCESS_TOKEN = "c574d3c7b814b2efa4e62d179764b1864766adc8700240454d7fde1c56c3a855";
const ENDPOINT = "/api/v1/index.php";

// Render needs this for health check
app.get("/", (req, res) => {
    res.send("Game List API is running.");
});

// ====================================================================
// FUNCTION → CALL PROVIDER API using iframe parent domain
// ====================================================================
async function getGameList(baseURL, provider = "", gameType = "") {
    const url = baseURL + ENDPOINT;

    const form = new FormData();
    form.append("module", "/games/getGameList");
    form.append("accessId", ACCESS_ID);
    form.append("accessToken", ACCESS_TOKEN);

    if (provider) form.append("provider", provider);
    if (gameType) form.append("gameType", gameType);

    try {
        const response = await fetch(url, {
            method: "POST",
            body: form
        });

        return await response.json();
    } catch (err) {
        console.error("Provider API Error:", err);
        return { status: "ERROR", message: err.message };
    }
}

app.post("/games", async (req, res) => {
    const { baseURL } = req.body;

    try {
        // Fetch your provider API game list
        const url = baseURL + "/api/v1/index.php";

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
                    data: []
                };
            }

            // Assign Random RTP 40–96
            const randomRTP = Math.floor(Math.random() * (96 - 40 + 1)) + 40;

            providers[provider].data.push({
                gamertpid: g.GameCode,
                gamertpnum: randomRTP,
                gamertpdata: {
                    gameName: g.GameName,
                    gameImgURL: g.GameImageUrl,
                    gameCode: g.GameCode
                }
            });
        });

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
                    progressbarBgColor: "#ffc107"
                },
                gameRTPData: providers
            }
        });

    } catch (err) {
        res.json({ status: "error", error: err.message });
    }
});

// ====================================================================
// ❗ EMBED PAGE (this loads inside the <iframe>)
// ====================================================================
app.get("/embed/games", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>Game RTP</title>

<style>
    body {
        margin: 0;
        padding: 15px;
        background: #0f1217;
        color: white;
        font-family: Arial, sans-serif;
    }
    .nav-baryuan {
        display: flex;
        overflow-x: auto;
        gap: 10px;
        padding: 10px 0;
    }
    .nav-item {
        padding: 8px 14px;
        background: #181d3a;
        border-radius: 20px;
        cursor: pointer;
        white-space: nowrap;
        border: 1px solid #333;
    }
    .category-select {
        background: #ffc107;
        color: black;
        font-weight: bold;
    }
    .games-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 12px;
        margin-top: 20px;
    }
    .game-card {
        background: #161b22;
        border-radius: 10px;
        padding: 10px;
        text-align: center;
    }
    .game-card img {
        width: 100%;
        border-radius: 8px;
    }
    .progress-container {
        margin-top: 6px;
        background: #222;
        border-radius: 6px;
        overflow: hidden;
    }
    .progress-bar {
        height: 18px;
        border-radius: 6px;
        color: #fff;
        font-size: 12px;
        text-align: center;
        line-height: 18px;
    }
    .red { background: #d9534f; }
    .orange { background: #ff9800; }
    .blue { background: #2196f3; }
    .green { background: #4caf50; }

</style>
</head>
<body>

<div class="nav-baryuan" id="providerCategory"></div>

<div class="games-grid" id="gameRTP"></div>

<div style="margin-top:20px; display:flex; justify-content:space-between;">
    <button id="prevPage">Previous</button>
    <div id="paginationInfo">Page 1</div>
    <button id="nextPage">Next</button>
</div>

<script>
/* -------------------------
   AUTO HEIGHT LIKE COMPETITOR
--------------------------*/
function sendHeight() {
    const height = document.body.scrollHeight;
    window.parent.postMessage({ type: 'setIframeHeight', height }, '*');
}
window.addEventListener('load', sendHeight);
new ResizeObserver(sendHeight).observe(document.body);

/* -------------------------
   RECEIVE BASEURL FROM PARENT
--------------------------*/
let parentBaseURL = null;
window.addEventListener("message", e => {
    if (e.data?.baseURL) {
        parentBaseURL = e.data.baseURL;
        loadRTP();
    }
});

/* -------------------------
   LOAD & PROCESS GAME DATA
--------------------------*/
let providers = {};
let currentProvider = "";
let currentPage = 1;
const itemsPerPage = 60;

async function loadRTP() {
    const res = await fetch("/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseURL: parentBaseURL })
    });

    const json = await res.json();
    providers = json.data.gameRTPData;

    buildProviderNav();
}

function buildProviderNav() {
    const holder = document.getElementById("providerCategory");
    holder.innerHTML = "";

    Object.keys(providers).forEach(p => {
        const btn = document.createElement("div");
        btn.className = "nav-item";
        btn.dataset.provider = p;
        btn.innerText = providers[p].displayName;
        btn.onclick = () => selectProvider(p, btn);
        holder.appendChild(btn);
    });

    // Auto-select first provider
    const first = document.querySelector(".nav-item");
    if (first) first.click();
}

function selectProvider(provider, btn) {
    document.querySelectorAll(".nav-item").forEach(el =>
        el.classList.remove("category-select")
    );
    btn.classList.add("category-select");

    currentProvider = provider;
    currentPage = 1;
    renderGames();
}

function renderGames() {
    const container = document.getElementById("gameRTP");
    container.innerHTML = "";

    const list = providers[currentProvider].data;

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const subset = list.slice(start, end);

    subset.forEach(g => {
        const rtp = g.gamertpnum;
        let color =
            rtp <= 40 ? "red" :
            rtp <= 50 ? "orange" :
            rtp <= 65 ? "blue" : "green";

        container.innerHTML += \`
            <div class="game-card">
                <img src="\${g.gamertpdata.gameImgURL}" onerror="this.src='https://dummyimage.com/300x300/111/fff&text=No+Image';">
                <div style="margin-top:6px;">\${g.gamertpdata.gameName}</div>
                <div class="progress-container">
                    <div class="progress-bar \${color}" style="width: \${rtp}%;">
                        \${rtp}%
                    </div>
                </div>
            </div>
        \`;
    });

    document.getElementById("paginationInfo").innerText =
        "Page " + currentPage;

    sendHeight();
}

document.getElementById("prevPage").onclick = () => {
    if (currentPage > 1) { currentPage--; renderGames(); }
};
document.getElementById("nextPage").onclick = () => {
    currentPage++; renderGames();
};

</script>

</body>
</html>
    `);
});


// ====================================================================
// API endpoint the iframe uses
// ====================================================================
app.post("/games", async (req, res) => {
    const { baseURL, provider = "", gameType = "" } = req.body;

    if (!baseURL) {
        return res.status(400).json({ 
            status: "ERROR",
            message: "Missing baseURL from iframe parent"
        });
    }

    const result = await getGameList(baseURL, provider, gameType);
    res.json(result);
});

// ====================================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));





