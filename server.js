import express from "express";
import fetch from "node-fetch";
import FormData from "form-data";

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * Discover Railway Outbound Public IP
 * This works even on FREE plan
 */
app.get("/myip", async (req, res) => {
    try {
        const ipResponse = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipResponse.json();
        res.json({
            outbound_ip: ipData.ip
        });
    } catch (err) {
        console.error("Error fetching IP:", err);
        res.status(500).json({ error: "Error checking IP" });
    }
});

/**
 * Function to request the casino API
 */
async function fetchGameList() {
    const url = "https://wegobet.asia/api/v1/index.php";   // FIXED URL (no double slash)

    const form = new FormData();
    form.append("module", "/games/getGameList");
    form.append("accessId", "20050695");
    form.append("accessToken", "c574d3c7b814b2efa4e62d179764b1864766adc8700240454d7fde1c56c3a855");

    const response = await fetch(url, {
        method: "POST",
        body: form
    });

    const data = await response.json();
    return data;
}

/**
 * Root route
 */
app.get("/", (req, res) => {
    res.send("Railway API test server is running ✔");
});

/**
 * Test route - calls the casino API
 */
app.get("/test", async (req, res) => {
    try {
        const result = await fetchGameList();
        res.json(result);
    } catch (err) {
        console.error("API Error:", err);
        res.status(500).json({ error: "Error contacting casino API" });
    }
});

/**
 * Start server
 */
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
