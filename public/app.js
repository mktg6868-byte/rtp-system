/* DEV MODE SWITCH */
const IS_DEV = location.hostname === "localhost";

/* ELEMENTS */
const providerListEl = document.getElementById("providerList");
const gamesGridEl = document.getElementById("gamesGrid");
const pageInfoEl = document.getElementById("pageInfo");
const providerUnderline = document.getElementById("providerUnderline");

/* MOVE UNDERLINE */
function moveUnderline() {
    const active = document.querySelector(".provider-item.active");
    if (!active) return;

    const rect = active.getBoundingClientRect();
    const parentRect = active.parentElement.getBoundingClientRect();

    providerUnderline.style.width = rect.width + "px";
    providerUnderline.style.transform = `translateX(${rect.left - parentRect.left}px)`;
}

/* API OR MOCK */
async function loadProviders() {
    if (IS_DEV) {
        console.log("DEV MODE: Keeping mock cards");
        return;
    }

    const response = await fetch("/api/providers");
    const data = await response.json();

    providerListEl.innerHTML = "";

    Object.keys(data).forEach((key) => {
        const item = document.createElement("div");
        item.className = "provider-item";
        item.innerText = data[key].displayName;
        item.dataset.provider = key;

        providerListEl.appendChild(item);
    });

    providerListEl.firstChild?.click();
}

/* CLICK PROVIDER */
providerListEl.addEventListener("click", (e) => {
    if (!e.target.classList.contains("provider-item")) return;

    document.querySelectorAll(".provider-item").forEach(x => x.classList.remove("active"));
    e.target.classList.add("active");
    moveUnderline();

    if (!IS_DEV) loadGames(e.target.dataset.provider);
});

/* LOAD GAMES */
async function loadGames(provider) {
    const response = await fetch(`/api/games?provider=${provider}`);
    const data = await response.json();

    gamesGridEl.innerHTML = "";

    const games = data.games;
    let currentPage = 1;
    let perPage = 60;
    let totalPages = Math.ceil(games.length / perPage);

    function render() {
        gamesGridEl.innerHTML = "";
        const start = (currentPage - 1) * perPage;
        const end = start + perPage;
        const slice = games.slice(start, end);

        slice.forEach(g => {
            const card = document.createElement("div");
            card.className = "game-card";
            card.innerHTML = `
                <div class="game-image-wrapper">
                    <img class="game-image" src="${g.img}"/>
                </div>
                <div class="game-title">${g.name}</div>
                <div class="rtp-info"><span>RTP</span><span>${g.rtp}%</span></div>
                <div class="progress-container">
                    <div class="progress-bar rtp-hot" style="width:${g.rtp}%"></div>
                </div>
            `;
            gamesGridEl.appendChild(card);
        });

        pageInfoEl.innerText = `Page ${currentPage} / ${totalPages}`;

        setTimeout(sendHeight, 50);
    }

    document.getElementById("prevPage").onclick = () => {
        if (currentPage > 1) { currentPage--; render(); }
    };

    document.getElementById("nextPage").onclick = () => {
        if (currentPage < totalPages) { currentPage++; render(); }
    };

    render();
}

/* INIT */
loadProviders();
moveUnderline();
sendHeight();

