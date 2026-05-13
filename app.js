const COUNTER_API_URL = "";
const LOCAL_STORAGE_KEY = "kuruhimo-times-local-visitor-count";
const BASE_LOCAL_COUNT = 4286;
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

const countElement = document.querySelector("#visitor-count");
const noteElement = document.querySelector("#counter-note");

let wakeLock = null;
let refreshTimerId = null;
let isUpdating = false;
let lastDisplayedCount = 0;

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

function getLocalCount({ increment = true } = {}) {
  const currentValue = Number(localStorage.getItem(LOCAL_STORAGE_KEY));
  const currentCount = Number.isFinite(currentValue) && currentValue > 0
    ? currentValue
    : BASE_LOCAL_COUNT;
  const nextValue = increment ? currentCount + 1 : currentCount;

  localStorage.setItem(LOCAL_STORAGE_KEY, String(nextValue));
  return nextValue;
}

async function fetchRemoteCount() {
  if (!COUNTER_API_URL) {
    return null;
  }

  const response = await fetch(COUNTER_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ site: "kuruhimo-times" }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Counter API responded with ${response.status}`);
  }

  const payload = await response.json();

  if (typeof payload.count !== "number") {
    throw new Error("Counter API response does not include a numeric count.");
  }

  return payload.count;
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

async function updateCounter({ incrementLocal = false } = {}) {
  if (!countElement || isUpdating) {
    return;
  }

  isUpdating = true;
  setNote("カウンターを更新中...");

  try {
    const remoteCount = await fetchRemoteCount();

    if (remoteCount === null) {
      const localCount = getLocalCount({ increment: incrementLocal });
      await animateCount(localCount);
      setNote(`デモ表示中：5分ごとに更新します（${formatUpdatedAt()}更新）`);
      return;
    }

    await animateCount(remoteCount);
    setNote(`くるひもタイムズに来てくれてありがとう！ ${formatUpdatedAt()}更新`);
  } catch (error) {
    console.error(error);
    const localCount = getLocalCount({ increment: incrementLocal });
    await animateCount(localCount);
    setNote(`APIにつながらなかったため、仮カウントを表示中（${formatUpdatedAt()}更新）`);
  } finally {
    isUpdating = false;
  }
}

function startAutoRefresh() {
  window.clearInterval(refreshTimerId);
  refreshTimerId = window.setInterval(() => {
    updateCounter({ incrementLocal: false });
  }, REFRESH_INTERVAL_MS);
}

async function bootCounter() {
  if (!countElement) {
    return;
  }

  countElement.textContent = "------";
  await requestWakeLock();
  await updateCounter({ incrementLocal: true });
  startAutoRefresh();
}

document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState === "visible") {
    await requestWakeLock();
    await updateCounter({ incrementLocal: false });
  }
});

window.addEventListener("pagehide", () => {
  window.clearInterval(refreshTimerId);
});

bootCounter();
