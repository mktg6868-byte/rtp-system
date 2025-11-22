/******************************************************
 * RTP APP — competitor logic, modern JS, custom UI
 * - Always uses API (no mock mode)
 * - Mirrors key behaviors from original game-rtp.js
 * - Uses your IDs/classes: rtpHeaderImg, providerList,
 *   gamesGrid, prevPage, nextPage, pageInfo, countdownBar,
 *   refreshTime.
 ******************************************************/

// ====== DOM ELEMENTS ======
const headerImgEl      = document.getElementById('rtpHeaderImg');
const countdownBarEl   = document.getElementById('countdownBar');
const refreshTimeEl    = document.getElementById('refreshTime');

const providerListEl   = document.getElementById('providerList');
const providerTitleEl  = document.getElementById('selectedProviderName');

const gamesGridEl      = document.getElementById('gamesGrid');

const prevPageBtn      = document.getElementById('prevPage');
const nextPageBtn      = document.getElementById('nextPage');
const pageInfoEl       = document.getElementById('pageInfo');

// ====== STATE ======
let rtpData = null;              // full data from API
let gameRTPData = {};            // provider -> {displayName, data}
let currentProviderKey = null;   // provider code, e.g. "PG"
let currentGameList = [];        // array of games for selected provider
let currentPage = 1;
let totalPages = 1;

const ITEMS_PER_PAGE = 60;

// ====== UTILS ======
function postForm(url, formObj) {
    const body = Object.entries(formObj)
        .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v))
        .join('&');

    return fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        },
        body
    }).then(res => {
        if (!res.ok) {
            throw new Error('Network error: ' + res.status);
        }
        return res.json();
    });
}

function safeSendHeight() {
    if (typeof window.sendHeight === 'function') {
        setTimeout(window.sendHeight, 30);
    }
}

// ====== MAIN LOAD ======
function loadRTPData() {
    postForm('get_data.asp', { whichProvider: 'ALL' })
        .then(response => {
            if (response.status === 'success') {
                setupRTP(response);
            } else {
                showError(response?.data?.message || 'Failed to load RTP data.');
            }
        })
        .catch(err => {
            console.error(err);
            showError('Something went wrong when loading RTP data.');
        });
}

// ====== ERROR DISPLAY ======
function showError(msg) {
    providerTitleEl.textContent = 'Failed to load RTP data';
    gamesGridEl.innerHTML = `
        <div class="no-data" style="text-align:center;margin-top:20px;
             color:#fff;text-shadow:0 0 4px #000;">
            ${msg}
        </div>
    `;
    safeSendHeight();
}

// ====== INITIALIZE FROM API RESPONSE ======
function setupRTP(apiResponse) {
    rtpData = apiResponse.data;
    const currentTimestamp = apiResponse.timestamp;

    if (!rtpData) {
        showError('Invalid RTP data.');
        return;
    }

    // 1) Header image
    if (rtpData.headerImageURL) {
        headerImgEl.src = rtpData.headerImageURL;
    }

    // 2) Apply cssStyle from backend
    const css = rtpData.cssStyle || {};
    const rootStyle = document.documentElement.style;
    if (css.textColor)        rootStyle.setProperty('--text-color', css.textColor);
    if (css.baseColor)        rootStyle.setProperty('--accent-color', css.baseColor);
    if (css.outlineColor)     rootStyle.setProperty('--outline-color', css.outlineColor);
    if (css.buttonBgColor)    rootStyle.setProperty('--button-bg', css.buttonBgColor);
    if (css.buttonTextColor)  rootStyle.setProperty('--button-text', css.buttonTextColor);
    if (css.progressbarBgColor) rootStyle.setProperty('--progress-bg', css.progressbarBgColor);

    // 3) Countdown timer
    initCountdown(rtpData.autoRTPminute, rtpData.autoRTPlastTime, currentTimestamp);

    // 4) Providers + games
    gameRTPData = rtpData.gameRTPData || {};
    renderProviderList();

    safeSendHeight();
}

// ====== COUNTDOWN LOGIC ======
function initCountdown(autoRTPminute, autoRTPlastTime, currentTimestamp) {
    if (!autoRTPminute || !autoRTPlastTime || !currentTimestamp) {
        refreshTimeEl.textContent = '--';
        return;
    }

    const totalSec = autoRTPminute * 60;
    let remainingSec = (autoRTPlastTime + totalSec) - currentTimestamp;

    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    let txt = '';
    if (hours > 0) {
        txt += hours + ' hour' + (hours > 1 ? 's' : '');
    }
    if (minutes > 0) {
        if (txt) txt += ' ';
        txt += minutes + ' minute' + (minutes > 1 ? 's' : '');
    }
    refreshTimeEl.textContent = txt || (autoRTPminute + ' minutes');

    function updateBar() {
        const percent = Math.max(0, Math.min(100, (remainingSec / totalSec) * 100));
        countdownBarEl.style.width = percent + '%';

        if (remainingSec <= 0) {
            clearInterval(timer);
            countdownBarEl.style.width = '0%';
            location.reload(true);
        }
        remainingSec--;
    }

    updateBar();
    const timer = setInterval(updateBar, 1000);
}

// ====== PROVIDER LIST ======
function renderProviderList() {
    providerListEl.innerHTML = '';

    const providerKeys = Object.keys(gameRTPData);
    if (providerKeys.length === 0) {
        providerTitleEl.textContent = 'No providers available';
        return;
    }

    providerKeys.forEach((key, index) => {
        const info = gameRTPData[key];
        const displayName = info.displayName || key;

        const div = document.createElement('div');
        div.className = 'provider-pill';
        div.textContent = displayName;
        div.dataset.providerKey = key;

        if (index === 0) {
            div.classList.add('active');
            currentProviderKey = key;
        }

        div.addEventListener('click', () => {
            document.querySelectorAll('.provider-pill.active')
                .forEach(el => el.classList.remove('active'));
            div.classList.add('active');
            selectProvider(key);
        });

        providerListEl.appendChild(div);
    });

    selectProvider(currentProviderKey);
}

// ====== SELECT PROVIDER ======
function selectProvider(providerKey) {
    if (!providerKey || !gameRTPData[providerKey]) return;

    const providerInfo = gameRTPData[providerKey];
    const displayName = providerInfo.displayName || providerKey;
    providerTitleEl.textContent = displayName;

    currentProviderKey = providerKey;
    currentGameList = Array.isArray(providerInfo.data) ? providerInfo.data : [];
    currentPage = 1;
    totalPages = Math.max(1, Math.ceil(currentGameList.length / ITEMS_PER_PAGE));

    renderGamePage();
}

// ====== RENDER GAME PAGE ======
function renderGamePage() {
    gamesGridEl.innerHTML = '';

    if (!currentGameList || currentGameList.length === 0) {
        gamesGridEl.innerHTML = `
            <div class="no-data" style="text-align:center;margin-top:20px;
                color:#fff;text-shadow:0 0 4px #000;">
                No games available.
            </div>
        `;
        pageInfoEl.textContent = `Page 1 / 1`;
        safeSendHeight();
        return;
    }

    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end   = start + ITEMS_PER_PAGE;
    const pageData = currentGameList.slice(start, end);

    pageData.forEach(game => {
        const gameId   = game.gamertpid;
        const meta     = game.gamertpdata || {};
        const gameName = meta.gameName || 'Unknown Game';
        const gameImg  = meta.gameImgURL || '';

        const rtpNum   = parseInt(game.gamertpnum, 10) || 0;

        let progressBarText;
        if (rtpNum < 40) {
            progressBarText = rtpNum + '%';
        } else {
            progressBarText = 'RTP: ' + rtpNum + '%';
        }

        let progressClass;
        if (rtpNum <= 40) {
            progressClass = 'rtp-low';
        } else if (rtpNum <= 50) {
            progressClass = 'rtp-mid';
        } else if (rtpNum <= 65) {
            progressClass = 'rtp-high';
        } else {
            progressClass = 'rtp-hot';
        }

        const card = document.createElement('div');
        card.className = 'game-card';
        card.dataset.gameId = gameId;

        card.innerHTML = `
            <div class="game-image-wrapper">
                <img class="game-image" src="${gameImg}" alt="${gameName}">
            </div>
            <div class="game-title">${gameName}</div>
            <div class="rtp-info">
                <span>RTP</span>
                <span>${rtpNum}%</span>
            </div>
            <div class="progress-container">
                <div class="progress-bar ${progressClass}" style="width:${rtpNum}%;">
                    ${progressBarText}
                </div>
            </div>
        `;

        gamesGridEl.appendChild(card);
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

    safeSendHeight();
}

// ====== INIT ======
document.addEventListener('DOMContentLoaded', loadRTPData);
