/******************************************************
 * RTP APP — FULL MODERN UPGRADE
 * Includes every function competitor has + better UI
 * No jQuery. No SweetAlert. Pure modern JavaScript.
 ******************************************************/

// ==== GLOBAL STATE ====
let providerData = {};     // provider list + games
let gameList = [];         // games under selected provider
let currentProvider = null;
let currentPage = 1;
let totalPages = 1;

const ITEMS_PER_PAGE = 60;

// ==== DOM ELEMENTS ====
const providerListEl = document.getElementById("providerList");
const gamesGridEl = document.getElementById("gamesGrid");
const providerNameEl = document.getElementById("selectedProviderName");
const pageInfoEl = document.getElementById("pageInfo");
const countdownBar = document.getElementById("countdownBar");
const refreshTimeEl = document.getElementById("refreshTime");


// ==== SIMPLE CUSTOM TOAST ====
function showToast(msg, type = "error") {
    const div = document.createElement("div");
    div.className = `toast ${type}`;
    div.textContent = msg;

    Object.assign(div.style, {
        position: "fixed",
        bottom: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        background: type === "error" ? "#e74c3c" : "#27ae60",
        color: "white",
        padding: "10px 18px",
        borderRadius: "6px",
        fontSize: "14px",
        opacity: "0",
        transition: "opacity 0.3s",
        zIndex: 999999
    });

    document.body.appendChild(div);

    setTimeout(() => div.style.opacity = "1", 20);
    setTimeout(() => {
        div.style.opacity = "0";
        setTimeout(() => div.remove(), 400);
    }, 2500);
}



// ======================================================
// 🔥 FETCH API — IMPORTANT PART
// ======================================================
// For now, we just load MOCK data.
// Later your Node server will inject REAL data here.
async function loadRTPData() {
    try {
        // 🔥 REPLACE THIS LATER WITH:
        // const res = await fetch("/rtp-data");
        // const data = await res.json();

        const data = mockApiResponse(); // TEMPORARY

        // Save provider data
        providerData = data.gameRTPData;

        // Theme & header
        applyTheme(data.cssStyle);
        document.getElementById("rtpHeaderImg").src = data.headerImageURL;

        // Auto refresh
        startRefreshCountdown(
            data.autoRTPminute,
            data.autoRTPlastTime,
            data.timestamp
        );

        renderProviderList();

    } catch (err) {
        showToast("Failed to load RTP data");
        console.error(err);
    }
}



// ======================================================
// 🎨 APPLY DYNAMIC THEME (Better than competitor)
// ======================================================
function applyTheme(css) {
    if (!css) return;

    const root = document.documentElement;

    root.style.setProperty("--text-color", css.textColor);
    root.style.setProperty("--base-color", css.baseColor);
    root.style.setProperty("--outline-color", css.outlineColor);
    root.style.setProperty("--button-text", css.buttonTextColor);
    root.style.setProperty("--button-bg", css.buttonBgColor);
    root.style.setProperty("--progress-bg", css.progressbarBgColor);
}



// ======================================================
// 🕒 AUTO REFRESH COUNTDOWN (Full competitor logic)
// ======================================================
function startRefreshCountdown(minute, lastTime, now) {
    const totalSeconds = minute * 60;
    let remaining = (lastTime + totalSeconds) - now;

    // Display readable time
    const mins = Math.floor(totalSeconds / 60);
    refreshTimeEl.textContent = `${mins} minutes`;

    const interval = setInterval(() => {
        const percent = (remaining / totalSeconds) * 100;
        countdownBar.style.width = percent + "%";

        if (remaining <= 0) {
            clearInterval(interval);
            location.reload();
        }

        remaining--;
    }, 1000);
}



// ======================================================
// 🧭 PROVIDER LIST + SCROLL BUTTONS
// ======================================================
function renderProviderList() {
    providerListEl.innerHTML = "";

    Object.keys(providerData).forEach(key => {
        const p = providerData[key];

        const div = document.createElement("div");
        div.className = "provider-item";
        div.textContent = p.displayName || key;

        div.onclick = () => selectProvider(key);

        providerListEl.appendChild(div);
    });

    // Auto-select first provider
    const firstKey = Object.keys(providerData)[0];
    if (firstKey) selectProvider(firstKey);

    // Scroll buttons
    document.querySelector(".scroll-btn.left").onclick = () => {
        providerListEl.scrollBy({ left: -200, behavior: "smooth" });
    };
    document.querySelector(".scroll-btn.right").onclick = () => {
        providerListEl.scrollBy({ left: +200, behavior: "smooth" });
    };
}



// ======================================================
// 🧩 SELECT PROVIDER
// ======================================================
function selectProvider(key) {
    currentProvider = key;
    gameList = providerData[key].data || [];

    [...providerListEl.children].forEach(el => el.classList.remove("active"));
    event.target.classList.add("active");

    providerNameEl.textContent = providerData[key].displayName;

    currentPage = 1;
    totalPages = Math.max(1, Math.ceil(gameList.length / ITEMS_PER_PAGE));

    renderGames();
}



// ======================================================
// 🎮 RENDER GAMES + PAGINATION
// ======================================================
function renderGames() {
    gamesGridEl.innerHTML = "";

    if (gameList.length === 0) {
        gamesGridEl.innerHTML = `<div class="no-games">No games available.</div>`;
        return;
    }

    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const pageData = gameList.slice(start, end);

    pageData.forEach(game => {
        const div = document.createElement("div");
        div.className = "game-card";

        const rtp = parseInt(game.gamertpnum);
        const rtpClass =
            rtp <= 40 ? "red" :
            rtp <= 50 ? "orange" :
            rtp <= 65 ? "blue" : "green";

        const rtpText = rtp < 40 ? `${rtp}%` : `RTP: ${rtp}%`;

        div.innerHTML = `
            <img src="${game.gamertpdata.gameImgURL}" alt="">
            <div class="game-title">${game.gamertpdata.gameName}</div>
            <div class="progress-bar ${rtpClass}" style="width:${rtp}%"></div>
        `;

        div.dataset.gameId = game.gamertpid;

        gamesGridEl.appendChild(div);
    });

    pageInfoEl.textContent = `Page ${currentPage} / ${totalPages}`;
}



// ======================================================
// ⏭ PAGINATION BUTTONS
// ======================================================
document.getElementById("prevPage").onclick = () => {
    if (currentPage > 1) {
        currentPage--;
        renderGames();
    }
};

document.getElementById("nextPage").onclick = () => {
    if (currentPage < totalPages) {
        currentPage++;
        renderGames();
    }
};



// ======================================================
// 🧪 MOCK API RESPONSE (REMOVE LATER)
// ======================================================
function mockApiResponse() {
    return {
        status: "success",
        timestamp: Math.floor(Date.now() / 1000),
        autoRTPminute: 10,
        autoRTPlastTime: Math.floor(Date.now() / 1000) - 120,
        headerImageURL: "https://via.placeholder.com/900x250",

        cssStyle: {
            textColor: "#fff",
            baseColor: "#0e1220",
            outlineColor: "#2ecc71",
            buttonTextColor: "#fff",
            buttonBgColor: "#2ecc71",
            progressbarBgColor: "rgba(255,255,255,0.2)"
        },

        gameRTPData: {
            PG: {
                displayName: "PG Soft",
                data: mockGames(130)
            },
            JILI: {
                displayName: "JILI",
                data: mockGames(90)
            },
            CQ9: {
                displayName: "CQ9 Gaming",
                data: mockGames(70)
            }
        }
    };
}

function mockGames(count) {
    const arr = [];
    for (let i = 1; i <= count; i++) {
        arr.push({
            gamertpid: "pg-" + i,
            gamertpnum: Math.floor(Math.random() * 100),
            gamertpdata: {
                gameName: "Game " + i,
                gameImgURL: "https://via.placeholder.com/300x200"
            }
        });
    }
    return arr;
}



// ======================================================
// 🚀 INIT
// ======================================================
loadRTPData();
