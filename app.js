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

const countElement = document.querySelector("#visitor-count");
const noteElement = document.querySelector("#counter-note");

let wakeLock = null;
let refreshTimerId = null;
let isUpdating = false;
let lastDisplayedCount = 0;
let cachedArticleIds = [];
let lastSourceLabel = "くるひもタイムズ";

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function formatCount(value) {
  return new Intl.NumberFormat("ja-JP", {
    minimumIntegerDigits: 6,
    useGrouping: false,
  }).format(Math.max(0, Number(value) || 0));
}

function setNote(message) {
  if (noteElement) {
    noteElement.textContent = message;
  }
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

async function fetchJsonWithFallback(urls, buildOptions = () => ({})) {
  let lastError = null;

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        ...buildOptions(url),
      });

      if (!response.ok) {
        throw new Error(`${url} responded with ${response.status}`);
      }

      return {
        data: await response.json(),
        url,
      };
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
    if (!Array.isArray(payload?.[sectionName])) {
      continue;
    }

    for (const item of payload[sectionName]) {
      if (typeof item?.id === "string" && item.id.trim()) {
        ids.push(item.id.trim());
      }
    }
  }

  return uniqueValues(ids);
}

async function fetchArticleIds() {
  if (cachedArticleIds.length > 0) {
    return cachedArticleIds;
  }

  try {
    const { data, url } = await fetchJsonWithFallback(KURUHI_DATA_URLS);
    const articleIds = normalizeArticleIds(data);

    if (articleIds.length > 0) {
      cachedArticleIds = articleIds;
      lastSourceLabel = url.includes("githubusercontent") ? "GitHub上のdata.json" : "くるひもタイムズ";
      return cachedArticleIds;
    }
  } catch (error) {
    console.info("Could not load kuruhitimes data.json:", error);
  }

  cachedArticleIds = FALLBACK_ARTICLE_IDS;
  lastSourceLabel = "フォールバックID";
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

  return {
    total,
    articleCount: ids.length,
    apiHost: new URL(url).host,
  };
}

async function animateCount(targetCount) {
  const safeTarget = Math.max(0, Number(targetCount) || 0);
  const start = lastDisplayedCount > 0 ? lastDisplayedCount : Math.max(0, safeTarget - 24);
  const steps = 24;

  for (let index = 0; index <= steps; index += 1) {
    const eased = 1 - Math.pow(1 - index / steps, 3);
    const current = Math.round(start + (safeTarget - start) * eased);
    countElement.textContent = formatCount(current);
    await sleep(28);
  }

  lastDisplayedCount = safeTarget;
}

async function requestWakeLock() {
  if (!("wakeLock" in navigator)) {
    return;
  }

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
  if (!countElement || isUpdating) {
    return;
  }

  isUpdating = true;
  setNote("くるひもタイムズの訪問回数を確認中...");

  try {
    const { total, articleCount, apiHost } = await fetchKuruhiTotalViews();
    await animateCount(total);
    setNote(`${articleCount}件の記事ビュー合計を表示中｜${apiHost}｜${formatUpdatedAt()}更新`);
  } catch (error) {
    console.error(error);
    await animateCount(lastDisplayedCount);
    setNote(`訪問回数を取得できませんでした。5分後に再試行します（${formatUpdatedAt()}）`);
  } finally {
    isUpdating = false;
  }
}

function startAutoRefresh() {
  window.clearInterval(refreshTimerId);
  refreshTimerId = window.setInterval(updateCounter, REFRESH_INTERVAL_MS);
}

async function bootCounter() {
  if (!countElement) {
    return;
  }

  countElement.textContent = "------";
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

bootCounter();
