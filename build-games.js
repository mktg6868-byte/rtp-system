const WalletAPIClient = require("./wallet-client");
const { brands } = require("./brandConfig");

async function fetchGamesForBrand(baseOrigin) {
    const brand = brands.find(b => b.baseOrigin === baseOrigin);
    if (!brand) throw new Error("Brand not found: " + baseOrigin);

    const client = new WalletAPIClient(
        brand.apiBase,
        brand.accessId,
        brand.accessToken
    );

    const all = [];

    for (const p of brand.providers) {
        console.log(`→ Fetching games for ${p.code}`);

        try {
            const res = await client.getGameList(p.product, p.site);

            if (res.status !== "SUCCESS") {
                console.log("⚠ Non-SUCCESS:", res);
                continue;
            }

            for (const g of res.data) {
                if (g.GameType !== "SLOT") continue;

                all.push({
                    providerCode: p.code,
                    providerName: p.displayName,
                    code: g.GameCode,
                    name: g.GameName,
                    thumb: g.GameImageUrl || null
                });
            }
        } catch (e) {
            console.error("FETCH ERROR:", e.message);
        }
    }

    return all;
}

module.exports = { fetchGamesForBrand };
