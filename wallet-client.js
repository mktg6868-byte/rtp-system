const FormData = require("form-data");
const axios = require("axios");

class WalletAPIClient {
    constructor(baseURL, accessId, accessToken) {
        this.baseURL = baseURL.replace(/\/+$/, "");
        this.endpoint = "/api/v1/index.php";
        this.accessId = accessId;
        this.accessToken = accessToken;
    }

    async request(module, additionalData = {}) {
        const form = new FormData();
        form.append("module", module);
        form.append("accessId", this.accessId);
        form.append("accessToken", this.accessToken);

        for (const k in additionalData) {
            form.append(k, additionalData[k]);
        }

        try {
            const res = await axios.post(
                this.baseURL + this.endpoint,
                form,
                { headers: form.getHeaders(), timeout: 20000 }
            );
            return res.data;
        } catch (e) {
            console.error("❌ API request failed:", e.message);
            throw e;
        }
    }

    async getGameList(product, site) {
        return this.request("/games/getGameList", { product, site });
    }
}

module.exports = WalletAPIClient;
