const FormData = require("form-data");
const fetch = require("node-fetch");

async function fetchGamesForProvider(brand, provider) {
    const url = brand.apiBase + "/api/v1/index.php";

    const form = new FormData();
    form.append("module", "/games/getGameList");
    form.append("accessId", brand.accessId);
    form.append("accessToken", brand.accessToken);
    form.append("product", provider.product);
    form.append("site", provider.site);

    console.log(`→ Fetching games for ${provider.code}`);

    try {
        const res = await fetch(url, { method: "POST", body: form });
        const json = await res.json();

        if (json.status !== "SUCCESS") {
            console.log("❌ Invalid response", json);
            return [];
        }

        return json.data.map(g => ({
            providerCode: provider.code,
            code: g.GameCode,
            name: g.GameName,
            thumb: g.GameImageUrl || null
        }));
    }
    catch(err) {
        console.log("❌ API fetch failed:", err);
        return [];
    }
}

module.exports = { fetchGamesForProvider };
