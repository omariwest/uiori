const EXTENSION_IDS = [
  "jngbedjpioeongcicaomeideeompcbcc",
  "chpomjnojnimgcaomhmcmfgjinfoekhi",
];
const RESOURCE_PATHS = ["pascoli.html", "meucci.js"];
const ACTIVE_WORK_SELECTOR = 'iframe[data-id="data-mllwtl-frame-crwl-ml"]';

let lastActiveWorkAt = 0;
let observer = null;

function noteActiveWork(node) {
  if (!(node instanceof Element)) return;
  if (node.matches?.(ACTIVE_WORK_SELECTOR) || node.querySelector?.(ACTIVE_WORK_SELECTOR)) {
    lastActiveWorkAt = Date.now();
  }
}

function startActiveWorkObserver() {
  if (observer || !document.documentElement) return;
  if (document.querySelector(ACTIVE_WORK_SELECTOR)) lastActiveWorkAt = Date.now();

  observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach(noteActiveWork);
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

async function probeResource(extensionId, resource) {
  try {
    const response = await fetch(`chrome-extension://${extensionId}/${resource}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2000),
    });
    return response.status === 200;
  } catch {
    return false;
  }
}

async function probeExtension(extensionId) {
  const results = await Promise.all(
    RESOURCE_PATHS.map((resource) => probeResource(extensionId, resource)),
  );
  return results.every(Boolean);
}

export async function verifyMellowtelPresence() {
  const results = await Promise.all(EXTENSION_IDS.map(probeExtension));
  return results.some(Boolean);
}

export function hasObservedMellowtelWork() {
  return lastActiveWorkAt > 0;
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startActiveWorkObserver, { once: true });
} else {
  startActiveWorkObserver();
}
