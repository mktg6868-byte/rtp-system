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
<title>Game List</title>
<style>
    body { font-family: Arial; background:#111; color:#fff; margin:0; padding:20px; }
    .game { padding:12px; margin-bottom:12px; background:#222; border-radius:6px; }
    .loading { font-size:18px; opacity:0.7; }
</style>
</head>
<body>
<h2>Game List</h2>
<div id="games" class="loading">Waiting for parent website...</div>

<script>
let parentBaseURL = null;

// Receive base domain from parent
window.addEventListener("message", function(event) {
    if (event.data.baseURL) {
        parentBaseURL = event.data.baseURL;
        loadGames();
    }
});

async function loadGames() {
    document.getElementById("games").innerHTML = "Loading...";

    const res = await fetch("/games", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ baseURL: parentBaseURL })
    });

    const data = await res.json();

    if (!data?.data?.games) {
        document.getElementById("games").innerHTML = "No games found.";
        return;
    }

    const games = data.data.games;
    let html = "";

    games.forEach(g => {
        html += "<div class='game'><b>" + g.name + "</b><br>ID: " + g.gameId + "</div>";
    });

    document.getElementById("games").innerHTML = html;
}
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

