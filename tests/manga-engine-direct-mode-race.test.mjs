import assert from "node:assert/strict";

const memory = new Map([
  ["rf14_manga_bridge", "https://bridge.test"],
  ["rf_hk_source_v1", "bridge:astra-toons"]
]);
globalThis.localStorage = {
  getItem: key => memory.has(key) ? memory.get(key) : null,
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: key => memory.delete(key)
};

const bridgeOption = { textContent: "", disabled: false };
const mangaDexOption = { textContent: "MangaDex", disabled: false };
const astraOption = { textContent: "AstraToons", disabled: false };
const sourceSelect = {
  value: "bridge:astra-toons",
  querySelector(selector) {
    if (selector === 'option[value="bridge"]') return bridgeOption;
    if (selector === 'option[value="mangadex"]') return mangaDexOption;
    if (selector === 'option[value="bridge:astra-toons"]') return astraOption;
    return null;
  },
  querySelectorAll(selector) { return selector === 'option[value^="bridge:"]' ? [astraOption] : []; },
  setAttribute() {}
};
globalThis.document = {
  visibilityState: "visible",
  addEventListener() {},
  getElementById(id) { return id === "hkSource" ? sourceSelect : null; }
};
globalThis.window = { addEventListener() {}, setTimeout, clearTimeout };
globalThis.location = { search: "", hostname: "app.test", href: "https://app.test/" };

let healthSignal = null;
let healthStartedResolve;
const healthStarted = new Promise(resolve => { healthStartedResolve = resolve; });
globalThis.fetch = async (input, options = {}) => {
  const url = new URL(String(input));
  if (url.pathname !== "/api/health") throw new Error(`Unexpected fetch ${url}`);
  healthSignal = options.signal;
  healthStartedResolve();
  return await new Promise((resolve, reject) => {
    options.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
  });
};

await import("../manga-hakuneko.js?direct-mode-race-v34");
const api = window.ResenhaMangaEngine;
const pendingHealth = api.bridge.check();
await healthStarted;

api.bridge.configure("");
assert.equal(healthSignal?.aborted, true, "direct mode aborts the pending health request");
assert.equal(api.bridge.url, "");
assert.equal(api.state.source, "mangadex");
assert.equal(sourceSelect.value, "mangadex");
assert.equal(astraOption.disabled, true);
assert.equal(memory.get("rf_hk_source_v1"), "mangadex");
assert.equal(memory.get("rf_hk_bridge_disabled_v1"), "1");
assert.equal(await pendingHealth, "off", "a late health result cannot reactivate the disabled Bridge");
assert.equal(api.state.bridgeStatus, "off");

console.log("manga engine v34: direct mode cancels health and leaves MangaDex active");
