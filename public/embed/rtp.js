// rtp.js
(function () {
  'use strict';

  const API_URL = '/api/rtp';

  function sendHeight() {
    const height = document.body.scrollHeight;
    window.parent.postMessage({ type: 'setIframeHeight', height }, '*');
  }

  window.addEventListener('load', sendHeight);
  const resizeObserver = new ResizeObserver(sendHeight);
  resizeObserver.observe(document.body);

  const headingImg = document.getElementById('headingImg');
  const providerCategory = document.getElementById('providerCategory');
  const providerNameEl = document.querySelector('.providerName');
  const gameRtpContainer = document.getElementById('gameRTP');
  const paginationInfo = document.getElementById('paginationInfo');
  const prevPageBtn = document.getElementById('prevPage');
  const nextPageBtn = document.getElementById('nextPage');
  const countdownBar = document.getElementById('countdownBar');
  const refreshTimeLabel = document.getElementById('refreshTime');

  const leftBtn = document.querySelector('.left-btn');
  const rightBtn = document.querySelector('.right-btn');

  let gameRTPData = {};
  let currentProviderKey = null;
  let currentPage = 1;
  const itemsPerPage = 60;
  let totalPages = 1;

  let countdownInterval = null;

  async function fetchRTPData() {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await res.json();
      if (response.status !== 'success') {
        throw new Error(response.data?.message || 'Failed to load RTP data');
      }

      const data = response.data;
      const currentTimestamp = response.timestamp;

      applyTheme(data);
      buildProviders(data.gameRTPData);
      setupCountdown(data.autoRTPminute, data.autoRTPlastTime, currentTimestamp);

      // auto click first provider
      const firstKey = Object.keys(data.gameRTPData)[0];
      if (firstKey) {
        selectProvider(firstKey);
      }
    } catch (err) {
      console.error(err);
      gameRtpContainer.innerHTML = `<div class="rtp-error">Error loading RTP data.</div>`;
    }
  }

  function applyTheme(rtpData) {
    if (rtpData.headerImageURL) {
      headingImg.src = rtpData.headerImageURL;
    }

    const css = rtpData.cssStyle || {};
    const root = document.documentElement;
    if (css.textColor) root.style.setProperty('--rtp-text-color', css.textColor);
    if (css.baseColor) root.style.setProperty('--rtp-base-color', css.baseColor);
    if (css.outlineColor) root.style.setProperty('--rtp-outline-color', css.outlineColor);
    if (css.buttonTextColor) root.style.setProperty('--rtp-button-text', css.buttonTextColor);
    if (css.buttonBgColor) root.style.setProperty('--rtp-button-bg', css.buttonBgColor);
    if (css.progressbarBgColor) root.style.setProperty('--rtp-progress-bg', css.progressbarBgColor);

    gameRTPData = rtpData.gameRTPData || {};
  }

  function buildProviders(data) {
    providerCategory.innerHTML = '';
    Object.entries(data).forEach(([key, value]) => {
      const displayName = value.displayName || key;
      const item = document.createElement('div');
      item.className = 'nav-item';
      item.textContent = displayName;
      item.dataset.provider = key;
      item.addEventListener('click', () => selectProvider(key));
      providerCategory.appendChild(item);
    });

    // Horizontal scroll arrows
    leftBtn.addEventListener('click', () => {
      providerCategory.scrollBy({ left: -200, behavior: 'smooth' });
    });
    rightBtn.addEventListener('click', () => {
      providerCategory.scrollBy({ left: 200, behavior: 'smooth' });
    });
  }

  function selectProvider(providerKey) {
    currentProviderKey = providerKey;
    currentPage = 1;

    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('category-select', item.dataset.provider === providerKey);
    });

    const providerInfo = gameRTPData[providerKey];
    if (!providerInfo) return;

    providerNameEl.textContent = providerInfo.displayName || providerKey;
    renderGamePage();
  }

  function getCurrentGameList() {
    const providerInfo = gameRTPData[currentProviderKey];
    if (!providerInfo || !Array.isArray(providerInfo.data)) return [];
    return providerInfo.data;
  }

  function renderGamePage() {
    const gameList = getCurrentGameList();
    totalPages = Math.max(1, Math.ceil(gameList.length / itemsPerPage));

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageData = gameList.slice(start, end);

    gameRtpContainer.innerHTML = '';

    if (pageData.length === 0) {
      gameRtpContainer.innerHTML = `<div class="rtp-no-data">No games available.</div>`;
    } else {
      pageData.forEach(game => {
        const gameId = game.gamertpid;
        const gameName = game.gamertpdata?.gameName || 'Unknown Game';
        const gameImgURL = game.gamertpdata?.gameImgURL || '';
        const gameRTP = parseInt(game.gamertpnum || 0, 10);

        let progressBarText;
        if (gameRTP < 40) {
          progressBarText = `${gameRTP}%`;
        } else {
          progressBarText = `RTP: ${gameRTP}%`;
        }

        let progressBarClass = 'rtp-bar-green';
        if (gameRTP <= 40) progressBarClass = 'rtp-bar-red';
        else if (gameRTP <= 50) progressBarClass = 'rtp-bar-orange';
        else if (gameRTP <= 65) progressBarClass = 'rtp-bar-blue';

        const card = document.createElement('div');
        card.className = 'game-card';
        card.dataset.gameId = gameId;
        card.innerHTML = `
          <img class="game-image" src="${gameImgURL}" alt="${gameName}" loading="lazy" onerror="this.style.display='none'">
          <div class="game-title" title="${gameName}">${gameName}</div>
          <div class="game-subtitle">
            <div class="progress-container">
              <div class="progress-bar ${progressBarClass}" style="width: ${Math.min(gameRTP, 100)}%;">
                ${progressBarText}
              </div>
            </div>
          </div>
        `;

        gameRtpContainer.appendChild(card);
      });
    }

    paginationInfo.textContent = `Page ${currentPage} / ${totalPages}`;

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

    // update height each time we change content
    sendHeight();
  }

  function setupCountdown(autoRTPminute, autoRTPlastTime, currentTimestamp) {
    if (countdownInterval) {
      clearInterval(countdownInterval);
    }

    const totalSec = autoRTPminute * 60;
    let balanceSec = (autoRTPlastTime + totalSec) - currentTimestamp;

    // human readable duration
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    let displayTime = '';
    if (hours > 0) {
      displayTime += `${hours} hour${hours > 1 ? 's' : ''}`;
    }
    if (minutes > 0) {
      if (displayTime) displayTime += ' ';
      displayTime += `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
    refreshTimeLabel.textContent = displayTime || `${autoRTPminute} minutes`;

    countdownInterval = setInterval(() => {
      const percent = Math.max(0, (balanceSec / totalSec) * 100);
      countdownBar.style.width = `${percent}%`;

      if (balanceSec <= 0) {
        clearInterval(countdownInterval);
        countdownBar.style.width = '0%';
        window.location.reload(true);
      }
      balanceSec--;
    }, 1000);
  }

  // Initialize
  fetchRTPData();
})();
