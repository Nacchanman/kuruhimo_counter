const KURUHI_COUNTER_API_URLS = [
  "https://kuruhimo.com/api/article-counter",
  "https://kuruhitimes.pages.dev/api/article-counter",
];
const KURUHI_DATA_URLS = [
  "https://kuruhimo.com/data.json",
  "https://kuruhitimes.pages.dev/data.json",
  "https://raw.githubusercontent.com/Nacchanman/kuruhitimes/main/data.json",
];
const FALLBACK_ARTICLE_IDS = ["idea-5", "idea-4", "idea-3", "idea-2", "idea-1"];
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

const canvas = document.querySelector("#pixel-screen");
const noteElement = document.querySelector("#counter-note");
const ctx = canvas.getContext("2d");

const W = canvas.width;
const H = canvas.height;
const PALETTE = {
  ink: "#241309",
  dark: "#5a260f",
  mid: "#9a3f17",
  orange: "#d95820",
  lightOrange: "#f08c3f",
  sun: "#ffb24b",
  paper: "#ffd88b",
  cream: "#ffe7ad",
  pale: "#fff0c6",
};

let wakeLock = null;
let refreshTimerId = null;
let isUpdating = false;
let lastDisplayedCount = 0;
let cachedArticleIds = [];
let statusText = "NOW LOADING";
let articleCountText = "--";
let sourceText = "KURUHIMO";
let lastUpdatedText = "--:--";
let blink = false;

ctx.imageSmoothingEnabled = false;

const DIGITS = {
  "0": ["111", "101", "101", "101", "101", "101", "111"],
  "1": ["010", "110", "010", "010", "010", "010", "111"],
  "2": ["111", "001", "001", "111", "100", "100", "111"],
  "3": ["111", "001", "001", "111", "001", "001", "111"],
  "4": ["101", "101", "101", "111", "001", "001", "001"],
  "5": ["111", "100", "100", "111", "001", "001", "111"],
  "6": ["111", "100", "100", "111", "101", "101", "111"],
  "7": ["111", "001", "001", "010", "010", "010", "010"],
  "8": ["111", "101", "101", "111", "101", "101", "111"],
  "9": ["111", "101", "101", "111", "001", "001", "111"],
  "-": ["000", "000", "000", "111", "000", "000", "000"],
};

function setNote(message) {
  if (noteElement) noteElement.textContent = message;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatCount(value) {
  return String(Math.max(0, Number(value) || 0)).padStart(6, "0");
}

function formatUpdatedAt(date = new Date()) {
  return new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function rect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function text(str, x, y, size = 8, color = PALETTE.ink, align = "left", font = "monospace") {
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  ctx.font = `${size}px ${font}`;
  ctx.fillText(str, Math.round(x), Math.round(y));
}

function drawPixelDigit(ch, x, y, scale, color) {
  const map = DIGITS[ch] || DIGITS["-"];
  for (let row = 0; row < map.length; row += 1) {
    for (let col = 0; col < map[row].length; col += 1) {
      if (map[row][col] === "1") {
        rect(x + col * scale, y + row * scale, scale, scale, color);
      }
    }
  }
}

function drawPixelNumber(value, x, y, scale, color) {
  const chars = formatCount(value).split("");
  let cursor = x;
  for (const ch of chars) {
    drawPixelDigit(ch, cursor, y, scale, color);
    cursor += scale * 4;
  }
  return cursor;
}

function drawFrame() {
  rect(0, 0, W, H, PALETTE.paper);

  // chunky orange sky / paper bands
  rect(0, 0, W, 58, "#f07a2b");
  rect(0, 58, W, 10, "#ffad4e");
  rect(0, 68, W, 120, PALETTE.cream);

  // coarse paper grid
  for (let y = 0; y < H; y += 8) rect(0, y, W, 1, "rgba(90,38,15,0.14)");
  for (let x = 0; x < W; x += 8) rect(x, 0, 1, H, "rgba(90,38,15,0.06)");

  // sunset blocks
  rect(128, 0, 78, 8, "#ffcb75");
  rect(116, 8, 102, 8, "#ffbd61");
  rect(108, 16, 118, 8, "#f59a43");
  rect(100, 24, 134, 10, PALETTE.orange);
  rect(96, 34, 142, 12, "#c84416");
  rect(104, 46, 126, 7, "#a33612");

  // horizon and editorial lines
  rect(0, 44, W, 2, PALETTE.dark);
  rect(0, 52, W, 1, PALETTE.orange);
  rect(0, 60, W, 1, PALETTE.mid);
  rect(0, 70, W, 1, "rgba(90,38,15,0.45)");

  // pixel birds
  drawBird(92, 18);
  drawBird(244, 14);
  drawBird(262, 10);

  text("SUNSET EDITORIAL ROOM", W / 2, 50, 6, PALETTE.dark, "center");

  // header strip
  rect(0, 76, W, 2, PALETTE.dark);
  rect(0, 96, W, 2, PALETTE.dark);
  rect(4, 81, 34, 11, PALETTE.ink);
  text("VOL013", 7, 83, 6, PALETTE.cream);
  text("2026.05.13", 70, 83, 7, PALETTE.dark);
  text("HARE", 174, 83, 7, PALETTE.dark);
  text("EST.2026", 269, 83, 7, PALETTE.dark);
}

function drawBird(x, y) {
  rect(x, y + 2, 4, 2, PALETTE.dark);
  rect(x + 4, y, 3, 2, PALETTE.dark);
  rect(x + 7, y + 2, 4, 2, PALETTE.dark);
}

function drawTitle() {
  text("THE KURUHIMO TIMES", 14, 108, 9, PALETTE.dark);

  // shadow blocks behind Japanese title
  text("くるひもタイムズ", W / 2 + 2, 124 + 2, 24, PALETTE.sun, "center", "sans-serif");
  text("くるひもタイムズ", W / 2 + 1, 124 + 1, 24, "#f07a2b", "center", "sans-serif");
  text("くるひもタイムズ", W / 2, 124, 24, PALETTE.ink, "center", "sans-serif");

  // force blocky title edges with chunky corner pixels
  rect(31, 130, 4, 4, PALETTE.ink);
  rect(54, 148, 4, 4, PALETTE.ink);
  rect(273, 126, 4, 4, PALETTE.ink);
  rect(292, 143, 4, 4, PALETTE.ink);

  text("ARTICLE VIEW COUNTER", 14, 158, 8, PALETTE.dark);
}

function drawCount(value) {
  // count panel
  rect(13, 169, 234, 1, PALETTE.dark);
  rect(13, 171, 234, 1, PALETTE.dark);
  rect(13, 174, 234, 1, PALETTE.dark);
  rect(14, 161, 215, 24, "rgba(255,231,173,0.6)");

  drawPixelNumber(value, 16, 171, 6, PALETTE.ink);
  drawPixelNumber(value, 17, 172, 6, "rgba(139,38,14,0.28)");
  drawPixelNumber(value, 16, 171, 6, PALETTE.ink);
  text("VIEWS", 256, 176, 9, PALETTE.dark);
}

function drawCharacters() {
  // tiny gameboy town along bottom
  rect(0, 176, W, 12, "rgba(216,88,32,0.16)");
  rect(48, 177, 12, 9, PALETTE.orange);
  rect(49, 170, 10, 7, PALETTE.ink);
  rect(52, 168, 4, 3, PALETTE.cream);
  rect(62, 182, 6, 6, PALETTE.ink);

  rect(92, 170, 48, 11, "#b6531d");
  rect(95, 166, 12, 5, PALETTE.ink);
  rect(113, 173, 13, 5, PALETTE.cream);
  rect(96, 181, 7, 7, PALETTE.ink);
  rect(130, 181, 7, 7, PALETTE.ink);

  rect(174, 177, 12, 9, PALETTE.orange);
  rect(175, 170, 10, 7, PALETTE.ink);
  rect(178, 168, 4, 3, PALETTE.cream);

  rect(212, 157, 16, 31, PALETTE.orange);
  rect(215, 161, 3, 3, PALETTE.ink);
  rect(222, 161, 3, 3, PALETTE.ink);
  rect(215, 169, 3, 3, PALETTE.ink);
  rect(222, 169, 3, 3, PALETTE.ink);

  rect(276, 176, 9, 12, PALETTE.ink);
  rect(278, 171, 5, 5, PALETTE.ink);
  rect(270, 179, 6, 5, PALETTE.cream);
}

function drawStatus() {
  rect(0, H - 16, W, 16, PALETTE.orange);
  rect(0, H - 16, W, 2, PALETTE.ink);
  const cursor = blink ? "■" : " ";
  text(`ARTICLES ${articleCountText}  ${sourceText}  ${lastUpdatedText}`, 8, H - 12, 6, PALETTE.cream);
  text(`${cursor} 5MIN AUTO REFRESH`, 228, H - 12, 6, PALETTE.cream);
}

function render(value = lastDisplayedCount) {
  ctx.clearRect(0, 0, W, H);
  drawFrame();
  drawTitle();
  drawCount(value);
  drawCharacters();
  drawStatus();
}

async function fetchJsonWithFallback(urls, buildOptions = () => ({})) {
  let lastError = null;

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        ...buildOptions(url),
      });
      if (!response.ok) throw new Error(`${url} responded with ${response.status}`);
      return { data: await response.json(), url };
    } catch (error) {
      lastError = error;
      console.info("Failed to fetch:", url, error);
    }
  }

  throw lastError || new Error("All fetch attempts failed.");
}

function normalizeArticleIds(payload) {
  const ids = [];
  for (const sectionName of ["ideas", "lunches", "quotes"]) {
    if (!Array.isArray(payload?.[sectionName])) continue;
    for (const item of payload[sectionName]) {
      if (typeof item?.id === "string" && item.id.trim()) ids.push(item.id.trim());
    }
  }
  return uniqueValues(ids);
}

async function fetchArticleIds() {
  if (cachedArticleIds.length > 0) return cachedArticleIds;

  try {
    const { data } = await fetchJsonWithFallback(KURUHI_DATA_URLS);
    const articleIds = normalizeArticleIds(data);
    if (articleIds.length > 0) {
      cachedArticleIds = articleIds;
      return cachedArticleIds;
    }
  } catch (error) {
    console.info("Could not load kuruhitimes data.json:", error);
  }

  cachedArticleIds = FALLBACK_ARTICLE_IDS;
  return cachedArticleIds;
}

async function fetchKuruhiTotalViews() {
  const ids = await fetchArticleIds();
  const query = new URLSearchParams({ ids: ids.join(",") }).toString();
  const apiUrls = KURUHI_COUNTER_API_URLS.map((url) => `${url}?${query}`);
  const { data, url } = await fetchJsonWithFallback(apiUrls);

  if (!data?.ok || typeof data.counts !== "object" || data.counts === null) {
    throw new Error("Kuruhitimes counter API response is invalid.");
  }

  const total = ids.reduce((sum, id) => sum + Number(data.counts[id] || 0), 0);
  return { total, articleCount: ids.length, apiHost: new URL(url).host };
}

async function animateCount(targetCount) {
  const safeTarget = Math.max(0, Number(targetCount) || 0);
  const start = lastDisplayedCount > 0 ? lastDisplayedCount : Math.max(0, safeTarget - 18);
  const steps = 18;

  for (let index = 0; index <= steps; index += 1) {
    const current = Math.round(start + ((safeTarget - start) * index) / steps);
    render(current);
    await sleep(35);
  }

  lastDisplayedCount = safeTarget;
  render(lastDisplayedCount);
}

async function requestWakeLock() {
  if (!("wakeLock" in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request("screen");
    wakeLock.addEventListener("release", () => {
      wakeLock = null;
    });
  } catch (error) {
    console.info("Screen Wake Lock is unavailable:", error);
  }
}

async function updateCounter() {
  if (isUpdating) return;
  isUpdating = true;
  statusText = "LOADING";
  setNote("くるひもタイムズの訪問回数を確認中...");
  render(lastDisplayedCount);

  try {
    const { total, articleCount, apiHost } = await fetchKuruhiTotalViews();
    articleCountText = String(articleCount).padStart(2, "0");
    sourceText = apiHost.replace("www.", "").toUpperCase().slice(0, 12);
    lastUpdatedText = formatUpdatedAt();
    statusText = "OK";
    setNote(`${articleCount}件の記事ビュー合計を表示中｜${apiHost}｜${lastUpdatedText}更新`);
    await animateCount(total);
  } catch (error) {
    console.error(error);
    statusText = "RETRY";
    lastUpdatedText = formatUpdatedAt();
    setNote(`訪問回数を取得できませんでした。5分後に再試行します（${lastUpdatedText}）`);
    render(lastDisplayedCount);
  } finally {
    isUpdating = false;
  }
}

function startAutoRefresh() {
  window.clearInterval(refreshTimerId);
  refreshTimerId = window.setInterval(updateCounter, REFRESH_INTERVAL_MS);
}

async function bootCounter() {
  render(0);
  await requestWakeLock();
  await updateCounter();
  startAutoRefresh();
}

document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState === "visible") {
    await requestWakeLock();
    await updateCounter();
  }
});

window.addEventListener("pagehide", () => {
  window.clearInterval(refreshTimerId);
});

window.setInterval(() => {
  blink = !blink;
  render(lastDisplayedCount);
}, 700);

bootCounter();
