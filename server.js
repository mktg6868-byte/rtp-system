import express from "express";
import fetch from "node-fetch";
import FormData from "form-data";

const app = express();
const PORT = process.env.PORT || 3000;

async function fetchGameList() {
    const url = "https://wegobet.asia//api/v1/index.php";

    const form = new FormData();
    form.append("module", "/games/getGameList");
    form.append("accessId", "20050695");
    form.append("accessToken", "c574d3c7b814b2efa4e62d179764b1864766adc8700240454d7fde1c56c3a855");

    const res = await fetch(url, { method: "POST", body: form });
    return await res.json();
}

app.get("/", (req, res) => {
    res.send("API test server is running ✔");
});

app.get("/test", async (req, res) => {
    try {
        const data = await fetchGameList();
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error");
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

