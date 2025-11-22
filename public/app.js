/******************************************************
 * FULL RTP ENGINE — Mirrors competitor behavior
 * Modern clean JS + your UI
 ******************************************************/

// DOM ELEMENTS
const headerImgEl      = document.getElementById('rtpHeaderImg');
const countdownBarEl   = document.getElementById('countdownBar');
const refreshTimeEl    = document.getElementById('refreshTime');
const providerListEl   = document.getElementById('providerList');
const providerTitleEl  = document.getElementById('selectedProviderName');
const gamesGridEl      = document.getElementById('gamesGrid');
const prevPageBtn      = document.getElementById('prevPage');
const nextPageBtn      = document.getElementById('nextPage');
const pageInfoEl       = document.getElementById('pageInfo');

// STATE
let gameRTPData = {};
let currentProviderKey = null;
let currentGameList = [];
let currentPage = 1;
let totalPages = 1;

const ITEMS_PER_PAGE = 60;

// UTIL — POST form data
function postForm(url, data) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(data),
  }).then((res) => res.json());
}

// Load Main RTP Data
function loadRTPData() {
  postForm("get_data.asp", { whichProvider: "ALL" })
    .then((response) => {
      if (response.status === "success") {
        initializeRTP(response);
      } else {
        showError(response?.data?.message || "Failed to load RTP data.");
      }
    })
    .catch(() => showError("Network error."));
}

function showError(msg) {
  providerTitleEl.textContent = "Failed to load RTP data";
  gamesGridEl.innerHTML = `
    <div style="text-align:center;margin-top:20px;color:white;text-shadow:0 0 4px black;">
      ${msg}
    </div>
  `;
  sendHeight();
}

// Initialize from API
function initializeRTP(res) {
  const data = res.data;
  const timestamp = res.timestamp;

  // Header image
  headerImgEl.src = data.headerImageURL;

  // Styling from API
  applyCssVariables(data.cssStyle);

  // Countdown logic
  initCountdown(data.autoRTPminute, data.autoRTPlastTime, timestamp);

  // Provider + game data
  gameRTPData = data.gameRTPData;
  renderProviderList();
}

function applyCssVariables(style) {
  if (!style) return;
  const root = document.documentElement.style;
  if (style.textColor) root.setProperty("--text-color", style.textColor);
  if (style.baseColor) root.setProperty("--accent-color", style.baseColor);
  if (style.outlineColor) root.setProperty("--outline-color", style.outlineColor);
  if (style.buttonBgColor) root.setProperty("--button-bg", style.buttonBgColor);
  if (style.buttonTextColor) root.setProperty("--button-text", style.buttonTextColor);
  if (style.progressbarBgColor) root.setProperty("--progress-bg", style.progressbarBgColor);
}

// Countdown
function initCountdown(minutes, lastTime, timestamp) {
  const total = minutes * 60;
  let remaining = lastTime + total - timestamp;

  refreshTimeEl.textContent = `${minutes} minutes`;

  const timer = setInterval(() => {
    const percent = Math.max(0, Math.min(100, (remaining / total) * 100));
    countdownBarEl.style.width = percent + "%";

    if (remaining <= 0) {
      clearInterval(timer);
      location.reload(true);
    }

    remaining--;
  }, 1000);
}

// Provider List
function renderProviderList() {
  providerListEl.innerHTML = "";
  const keys = Object.keys(gameRTPData);

  keys.forEach((key, index) => {
    const info = gameRTPData[key];

    const div = document.createElement("div");
    div.className = "provider-pill";
    div.dataset.providerKey = key;
    div.textContent = info.displayName || key;

    if (index === 0) div.classList.add("active");

    div.addEventListener("click", () => {
      document.querySelectorAll(".provider-pill").forEach(p => p.classList.remove("active"));
      div.classList.add("active");
      selectProvider(key);
    });

    providerListEl.appendChild(div);
  });

  if (keys.length > 0) {
    selectProvider(keys[0]);
  }
}

// Selecting a provider
function selectProvider(key) {
  const info = gameRTPData[key];
  if (!info) return;

  providerTitleEl.textContent = info.displayName || key;
  currentProviderKey = key;
  currentGameList = info.data || [];
  currentPage = 1;
  totalPages = Math.ceil(currentGameList.length / ITEMS_PER_PAGE);

  renderGamePage();
}

// Rendering game cards
function renderGamePage() {
  gamesGridEl.innerHTML = "";

  if (currentGameList.length === 0) {
    gamesGridEl.innerHTML = `<div style="text-align:center;color:white;">No games available.</div>`;
    pageInfoEl.textContent = "Page 1 / 1";
    sendHeight();
    return;
  }

  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const slice = currentGameList.slice(start, end);

  slice.forEach((g) => {
    const name = g.gamertpdata?.gameName || "Unknown";
    const img = g.gamertpdata?.gameImgURL || "";
    const rtpNum = Number(g.gamertpnum) || 0;

    const rtpClass =
      rtpNum <= 40
        ? "rtp-low"
        : rtpNum <= 50
        ? "rtp-mid"
        : rtpNum <= 65
        ? "rtp-high"
        : "rtp-hot";

    const card = `
      <div class="game-card">
        <div class="game-image-wrapper">
          <img class="game-image" src="${img}">
        </div>

        <div class="game-title">${name}</div>

        <div class="rtp-info">
          <span>RTP</span><span>${rtpNum}%</span>
        </div>

        <div class="progress-container">
          <div class="progress-bar ${rtpClass}" style="width:${rtpNum}%"></div>
        </div>
      </div>
    `;

    gamesGridEl.insertAdjacentHTML("beforeend", card);
  });

  pageInfoEl.textContent = `Page ${currentPage} / ${totalPages}`;

  prevPageBtn.onclick = () => {
    if (currentPage > 1) {
      currentPage--;
      renderGamePage();
    }
  };

  nextPageBtn.onclick = () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderGamePage();
    }
  };

  sendHeight();
}

// INIT
document.addEventListener("DOMContentLoaded", loadRTPData);
