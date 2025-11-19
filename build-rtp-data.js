// build-rtp-data.js
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");
const providers = require("./providers");

// Extract https://... from style="background-image:url('...')"
function extractUrlFromStyle(style) {
  if (!style) return "";
  const match = style.match(/url\(["']?(.*?)["']?\)/i);
  return match ? match[1] : "";
}

// BASE_URL must be something like: https://wegobet.asia
function normalizeBaseUrl(baseUrl) {
  return baseUrl.replace(/\/+$/, "");
}

async function fetchProviderGames(baseUrl, provider) {
  const cleanBase = normalizeBaseUrl(baseUrl);
  const url = `${cleanBase}/gameList/${provider.code}/SLOT/0/0`;

  console.log(`Scraping games for ${provider.code} from: ${url}`);

  const res = await axios.get(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
    },
    timeout: 20000
  });

  const $ = cheerio.load(res.data);
  const games = [];

  $("#gameList .games .game").each((_, el) => {
    const $game = $(el);
    const code = $game.attr("data-code");
    if (!code) return;

    const imageDiv = $game.find(".image");
    const style = imageDiv.attr("style") || "";
    const thumb = extractUrlFromStyle(style);

    // You can improve this later if your HTML contains names.
    const nameVar = $game.find("var").first().text().trim();
    const name = nameVar || `Game ${code}`;

    games.push({
      providerCode: provider.code,
      providerName: provider.displayName,
      code,
      name,
      thumb
    });
  });

  console.log(` → Found ${games.length} games for ${provider.code}`);
  return games;
}

// Build game metadata file
async function buildRtpData(baseUrl) {
  if (!baseUrl) {
    throw new Error("BASE_URL is required for scraping game list.");
  }

  const allGames = [];

  for (const p of providers) {
    try {
      const providerGames = await fetchProviderGames(baseUrl, p);
      allGames.push(...providerGames);
    } catch (err) {
      console.error(
        `❌ Error scraping provider ${p.code}:`,
        err.message || err.toString()
      );
    }
  }

  const output = {
    updated: new Date().toISOString(),
    baseUrl,
    providers,
    games: allGames
  };

  const outPath = path.join(__dirname, "data", "rtp-data.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), "utf8");
  console.log(`✅ rtp-data.json written with ${allGames.length} games`);
}

module.exports = buildRtpData;
