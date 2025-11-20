const params = new URLSearchParams(window.location.search);
const BASE = params.get("base");

async function load() {
    const res = await fetch(`/api/rtp?base=${encodeURIComponent(BASE)}`);
    const json = await res.json();

    if (json.status !== "success") {
        document.getElementById("app").innerHTML = "Error loading RTP";
        return;
    }

    render(json.data);
}

function render(data) {
    const groups = {};

    data.games.forEach(g => {
        if (!groups[g.providerCode]) groups[g.providerCode] = [];
        groups[g.providerCode].push(g);
    });

    const app = document.getElementById("app");
    app.innerHTML = "";

    for (const p of data.providers) {
        const div = document.createElement("div");
        div.className = "provider";
        div.innerText = p.displayName;
        app.appendChild(div);

        const games = groups[p.code] || [];

        games.forEach(g => {
            const row = document.createElement("div");
            row.className = "game";

            const th = document.createElement("div");
            th.className = "thumb";
            if (g.thumb) {
                th.style.backgroundImage = `url('${g.thumb}')`;
            }
            row.appendChild(th);

            const name = document.createElement("div");
            name.innerText = g.name;
            row.appendChild(name);

            const r = document.createElement("div");
            r.className = "rtp";
            r.innerText = g.rtp ? g.rtp + "%" : "--";
            row.appendChild(r);

            app.appendChild(row);
        });
    }

    // Auto adjust iframe height
    window.parent.postMessage({
        type: "setIframeHeight",
        height: document.body.scrollHeight
    }, "*");
}

load();
setInterval(load, 20_000);
