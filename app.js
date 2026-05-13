const COUNTER_API_URL = "";
const LOCAL_STORAGE_KEY = "kuruhimo-times-local-visitor-count";
const BASE_LOCAL_COUNT = 4286;

const countElement = document.querySelector("#visitor-count");
const noteElement = document.querySelector("#counter-note");

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

async function animateCount(targetCount) {
  const safeTarget = Math.max(0, Number(targetCount) || 0);
  const start = Math.max(0, safeTarget - 24);
  const steps = 24;

  for (let index = 0; index <= steps; index += 1) {
    const eased = 1 - Math.pow(1 - index / steps, 3);
    const current = Math.round(start + (safeTarget - start) * eased);
    countElement.textContent = formatCount(current);
    await sleep(28);
  }
}

function getLocalCount() {
  const currentValue = Number(localStorage.getItem(LOCAL_STORAGE_KEY));
  const nextValue = Number.isFinite(currentValue) && currentValue > 0
    ? currentValue + 1
    : BASE_LOCAL_COUNT + 1;

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

async function bootCounter() {
  if (!countElement) {
    return;
  }

  countElement.textContent = "------";

  try {
    const remoteCount = await fetchRemoteCount();

    if (remoteCount === null) {
      const localCount = getLocalCount();
      await animateCount(localCount);
      setNote("デモ表示中：API未設定のため、この端末内でカウントしています");
      return;
    }

    await animateCount(remoteCount);
    setNote("くるひもタイムズに来てくれてありがとう！");
  } catch (error) {
    console.error(error);
    const localCount = getLocalCount();
    await animateCount(localCount);
    setNote("APIにつながらなかったため、仮カウントを表示しています");
  }
}

bootCounter();
