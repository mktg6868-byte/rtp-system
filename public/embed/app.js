// public/embed/app.js
const providerTabsEl = document.getElementById("provider-tabs");
const gameGridEl = document.getElementById("game-grid");
const lastUpdatedEl = document.getElementById("last-updated");
const emptyMessageEl = document.getElementById("empty-message");

let RTP_DATA = null;
let CURRENT_PROVIDER = null;
let PREVIOUS_RTPS = {}; // key: providerCode|code -> last RTP

// Helper: create unique key
function gameKey(g) {
  return `${g.providerCode}|${g.code}`;
}

// Smooth number animation
function animateRtp(el, from, to, duration = 800) {
  if (from === null || from === undefined || isNaN(from)) from = to;
  const start = performance.now();
  const diff = to - from;

  function frame(now) {
    const t = Math.min(1, (now - start) / duration);
    const value = from + diff * t;
    el.textContent = value.toFixed(2) + "%";

    if (t < 1) {
      requestAnimationFrame(frame);
    }
  }
  requestAnimationFrame(frame);
}

function setRtpColor(el, rtp) {
  el.classList.remove("low", "very-low");
  if (rtp <= 93) {
    el.classList.add("very-low");
  } else if (rtp <= 95) {
    el.classList.add("low");
  }
}

// Build provider tabs
function buildProviderTabs() {
  providerTabsEl.innerHTML = "";
  RTP_DATA.providers.forEach(p => {
    const tab = document.createElement("div");
    tab.className = "tab";
    tab.textContent = p.displayName;

    tab.onclick = () => {
      document
        .querySelectorAll("#provider-tabs .tab")
        .forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      CURRENT_PROVIDER = p.code;
      buildGameGrid();
    };

    providerTabsEl.appendChild(tab);
  });

  // Auto select first
  const first = providerTabsEl.querySelector(".tab");
  if (first) first.click();
}

function buildGameGrid() {
  if (!RTP_DATA) return;
  gameGridEl.innerHTML = "";

  const games = RTP_DATA.games.filter(
    g => g.providerCode === CURRENT_PROVIDER
  );

  if (!games.length) {
    emptyMessageEl.classList.remove("hidden");
    return;
  } else {
    emptyMessageEl.classList.add("hidden");
  }

  games.forEach(g => {
    const key = gameKey(g);
    const prevRtp = PREVIOUS_RTPS[key] ?? g.rtp ?? null;

    const card = document.createElement("div");
    card.className = "card";

    const imgWrapper = document.createElement("div");
    imgWrapper.className = "card-img-wrapper";

    const img = document.createElement("img");
    img.src = g.thumb;
    img.loading = "lazy";
    img.alt = g.name || key;

    const overlay = document.createElement("div");
    overlay.className = "overlay";

    imgWrapper.appendChild(img);
    imgWrapper.appendChild(overlay);

    const content = document.createElement("div");
    content.className = "card-content";

    const nameEl = document.createElement("div");
    nameEl.className = "card-name";
    nameEl.textContent = g.name || key;

    const rtpRow = document.createElement("div");
    rtpRow.className = "card-rtp-row";

    const rtpLabel = document.createElement("span");
    rtpLabel.className = "card-rtp-label";
    rtpLabel.textContent = "RTP";

    const rtpValue = document.createElement("span");
    rtpValue.className = "card-rtp-value";
    rtpValue.dataset.key = key;

    // If rtp is null, show "--"
    if (g.rtp == null) {
      rtpValue.textContent = "--";
    } else {
      // animate from previous to new
      animateRtp(rtpValue, prevRtp, g.rtp);
      setRtpColor(rtpValue, g.rtp);
      PREVIOUS_RTPS[key] = g.rtp;
    }

    rtpRow.appendChild(rtpLabel);
    rtpRow.appendChild(rtpValue);

    content.appendChild(nameEl);
    content.appendChild(rtpRow);

    card.appendChild(imgWrapper);
    card.appendChild(content);

    gameGridEl.appendChild(card);
  });
}

// Refresh data from API and update UI
async function loadRtpData(initial = false) {
  try {
    const res = await fetch("/api/rtp");
    const json = await res.json();
    if (json.status !== "success") return;

    RTP_DATA = json.data;

    if (RTP_DATA.updated) {
      lastUpdatedEl.textContent = "Last updated: " + RTP_DATA.updated;
    }

    if (initial) {
      // initial build
      buildProviderTabs();
    } else {
      // only rebuild current provider’s grid
      buildGameGrid();
    }
  } catch (e) {
    console.error("Failed to load RTP:", e);
  }
}

// Initial load
loadRtpData(true);

// Poll every 60 seconds for new RTP values (server steps ~ 3 min)
setInterval(() => {
  loadRtpData(false);
}, 60000);
