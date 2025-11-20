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

// ====================================================================
// ❗ EMBED PAGE (this loads inside the <iframe>)
// ====================================================================
app.get("/embed/games", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>Game List - RTP</title>

<style>
    body {
        margin: 0;
        padding: 16px;
        background: #0f1217;
        color: #fff;
        font-family: Arial, sans-serif;
    }

    .section-title {
        font-size: 26px;
        font-weight: bold;
        margin-bottom: 16px;
        text-align: center;
    }

    /* Category bar */
    .provider-bar {
        display: flex;
        overflow-x: auto;
        gap: 12px;
        padding-bottom: 10px;
        margin-bottom: 20px;
    }
    .provider-btn {
        padding: 8px 16px;
        border-radius: 20px;
        background: #181d3a;
        border: 1px solid #333;
        cursor: pointer;
        white-space: nowrap;
        transition: 0.2s;
    }
    .provider-btn.active {
        background: #ffca2c;
        color: #000;
        font-weight: bold;
    }

    /* Game Grid */
    .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 14px;
        margin-bottom: 30px;
    }
    .game-card {
        background: #161b22;
        padding: 10px;
        border-radius: 10px;
        text-align: center;
        border: 1px solid #222;
        transition: 0.3s;
    }
    .game-card:hover {
        transform: scale(1.03);
        background: #1d2330;
    }
    .game-img {
        width: 100%;
        border-radius: 8px;
        margin-bottom: 8px;
    }
    .game-name {
        font-size: 14px;
        margin-bottom: 6px;
    }
    .rtp-badge {
        background: #28a745;
        color: #fff;
        display: inline-block;
        padding: 3px 8px;
        border-radius: 6px;
        font-size: 12px;
    }

    /* Pagination */
    .pagination {
        display: flex;
        justify-content: center;
        gap: 16px;
        margin-bottom: 20px;
    }
    .page-btn {
        background: #181d3a;
        padding: 8px 16px;
        border-radius: 8px;
        cursor: pointer;
        border: 1px solid #333;
    }
    .page-btn:hover {
        background: #222c55;
    }

    /* Disclaimer */
    details {
        background: #141820;
        border: 1px solid #222;
        padding: 14px;
        border-radius: 10px;
        margin-bottom: 12px;
    }
</style>
</head>

<body>

<div class="section-title">🎰 Game RTP Live Tracker</div>

<!-- PROVIDER CATEGORY -->
<div class="provider-bar" id="providerBar"></div>

<!-- GAME GRID -->
<div class="grid" id="gameGrid"></div>

<!-- PAGINATION -->
<div class="pagination">
    <div class="page-btn" id="prevPage">Previous</div>
    <div class="page-btn" id="pageInfo">Page 1</div>
    <div class="page-btn" id="nextPage">Next</div>
</div>

<!-- DISCLAIMER -->
<details>
    <summary>Disclaimer</summary>
    <p>This data is based on bets placed on the network and does not guarantee future results.</p>
</details>

<script>
let parentBaseURL = null;

// =============================
// Receive baseURL from parent
// =============================
window.addEventListener("message", function(event) {
    if (event.data.baseURL) {
        parentBaseURL = event.data.baseURL;
        loadProviders();
    }
});

// =============================
// Auto Height
// =============================
function sendHeight() {
    window.parent.postMessage({
        type: "setIframeHeight",
        height: document.body.scrollHeight
    }, "*");
}
setInterval(sendHeight, 500);

// =============================
// Data Loading Logic
// =============================
let allGames = [];
let currentProvider = "";
let currentPage = 1;
const pageSize = 20;

async function loadProviders() {
    const res = await fetch("/games", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ baseURL: parentBaseURL })
    });
    const data = await res.json();

    if (!data?.data?.games) {
        document.getElementById("gameGrid").innerHTML = "<p>No games found.</p>";
        return;
    }

    allGames = data.data.games;

    const providers = [...new Set(allGames.map(g => g.provider || "Unknown"))];

    const providerBar = document.getElementById("providerBar");
    providerBar.innerHTML = providers.map(p => `
        <div class="provider-btn" data-provider="${p}">${p}</div>
    `).join("");

    document.querySelectorAll(".provider-btn").forEach(btn =>
        btn.addEventListener("click", () => {
            currentProvider = btn.dataset.provider;
            currentPage = 1;
            document.querySelectorAll(".provider-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            displayGames();
        })
    );

    displayGames();
}

function displayGames() {
    const grid = document.getElementById("gameGrid");

    let filtered = currentProvider
        ? allGames.filter(g => g.provider === currentProvider)
        : allGames;

    const start = (currentPage - 1) * pageSize;
    const pageItems = filtered.slice(start, start + pageSize);

    grid.innerHTML = pageItems.map(g => `
        <div class="game-card">
            <img src="${g.img || ''}" class="game-img">
            <div class="game-name">${g.name}</div>
            <div class="rtp-badge">RTP: ${g.rtp || 'N/A'}%</div>
        </div>
    `).join("");

    document.getElementById("pageInfo").innerText =
        "Page " + currentPage;

    sendHeight();
}

document.getElementById("prevPage").onclick = () => {
    if (currentPage > 1) {
        currentPage--;
        displayGames();
    }
};
document.getElementById("nextPage").onclick = () => {
    currentPage++;
    displayGames();
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



