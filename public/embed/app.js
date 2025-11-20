async function loadRTP() {
    const urlParams = new URLSearchParams(window.location.search);
    const base = urlParams.get("base");

    const res = await fetch(`/api/rtp?base=${base}`);
    const json = await res.json();

    const box = document.getElementById("rtp-container");
    box.innerHTML = "";

    json.providers.forEach(g => {
        const div = document.createElement("div");
        div.className = "game-card";

        div.innerHTML = `
            <img src="${g.thumb}">
            <div>${g.name}</div>
            <div class="rtp">${g.rtp}% RTP</div>
        `;

        box.appendChild(div);
    });
}

loadRTP();
setInterval(loadRTP, 60000);
