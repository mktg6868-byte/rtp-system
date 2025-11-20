import fetch from "node-fetch";
import FormData from "form-data";

async function testGameList() {
    const url = "https://wegobet.asia//api/v1/index.php";

    const form = new FormData();
    form.append("module", "/games/getGameList");
    form.append("accessId", "20050695");
    form.append("accessToken", "c574d3c7b814b2efa4e62d179764b1864766adc8700240454d7fde1c56c3a855");

    const res = await fetch(url, {
        method: "POST",
        body: form
    });

    const data = await res.json();
    console.log(data);
}

testGameList();


import express from "express";
import fetch from "node-fetch";
import FormData from "form-data";
import dns from "dns";

const app = express();
const PORT = process.env.PORT || 3000;

// 1️⃣ Print the Render public IP (so you can whitelist it)
dns.lookup(process.env.RENDER_EXTERNAL_URL?.replace("https://", ""), (err, addr) => {
    if (addr) console.log("🔵 Render Public IP:", addr);
});

// 2️⃣ Test function to call your casino API from Render
async function testGameList() {
    try {
        const url = "https://wegobet.asia//api/v1/index.php";

        const form = new FormData();
        form.append("module", "/games/getGameList");
        form.append("accessId", "20050695");
    form.append("accessToken", "c574d3c7b814b2efa4e62d179764b1864766adc8700240454d7fde1c56c3a855");

        const response = await fetch(url, {
            method: "POST",
            body: form
        });

        const data = await response.json();
        console.log("🟢 API Response:", data);
    } catch (err) {
        console.error("🔴 API Error:", err);
    }
}

// 3️⃣ Endpoint to trigger the test manually
app.get("/test", async (req, res) => {
    const url = "https://wegobet.asia//api/v1/index.php";

    const form = new FormData();
    form.append("module", "/games/getGameList");
    form.append("accessId", "20050695");
    form.append("accessToken", "c574d3c7b814b2efa4e62d179764b1864766adc8700240454d7fde1c56c3a855");

    const r = await fetch(url, { method: "POST", body: form });
    const data = await r.json();
    res.json(data);
});

// 4️⃣ Start the server (REQUIRED for Render)
app.listen(PORT, () => {
    console.log(`🟢 Server running on port ${PORT}`);
    testGameList();
});
