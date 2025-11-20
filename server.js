import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/myip", async (req, res) => {
    try {
        const ipResponse = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipResponse.json();
        res.json({ outbound_ip: ipData.ip });
    } catch (err) {
        res.status(500).send("Error checking IP");
    }
});

async function fetchGameList() {
    const url = "https://wegobet.asia/api/v1/index.php";

    const body = new URLSearchParams({
        module: "/games/getGameList",
        accessId: "20050695",
        accessToken: "c574d3c7b814b2efa4e62d179764b1864766adc8700240454d7fde1c56c3a855"
    });

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: body.toString()
    });

    return await response.json();
}

app.get("/", (req, res) => {
    res.send("Railway API test server is running ✔");
});

app.get("/test", async (req, res) => {
    try {
        const data = await fetchGameList();
        res.json(data);
    } catch (err) {
        res.status(500).send("Error calling casino API");
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
