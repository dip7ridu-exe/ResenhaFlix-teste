import assert from "node:assert/strict";

const memory = new Map([["rf14_manga_bridge", "https://bridge.test"]]);
globalThis.localStorage = {
  getItem: key => memory.has(key) ? memory.get(key) : null,
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: key => memory.delete(key)
};

const statusText = { textContent: "" };
const statusElement = {
  classList: { toggle() {} }, title: "",
  querySelector(selector) { return selector === "span" ? statusText : null; }
};
globalThis.document = {
  visibilityState: "visible",
  addEventListener() {},
  getElementById(id) { return id === "hkEngineStatus" ? statusElement : null; }
};
let scheduledRetry = null;
let scheduledDelay = 0;
globalThis.window = {
  addEventListener() {},
  setTimeout(callback, delay) { scheduledRetry = callback; scheduledDelay = delay; return 77; },
  clearTimeout
};
globalThis.location = { search: "", hostname: "app.test", href: "https://app.test/" };

const source = {
  id: "astra-toons", name: "AstraToons", lang: "pt-BR",
  homeUrl: "https://new.astratoons.com", pkg: "eu.kanade.tachiyomi.extension.pt.astratoons",
  contentWarning: "safe"
};
const json = value => new Response(JSON.stringify(value), {
  status: 200, headers: { "Content-Type": "application/json" }
});
let healthCalls = 0;

globalThis.fetch = async input => {
  const url = new URL(String(input));
  if (url.pathname === "/api/health") {
    healthCalls++;
    return json({ ok: true, version: "34.0.0", sources: 5 });
  }
  if (url.pathname === "/api/sources") return json({ sources: [source] });
  if (url.pathname === "/api/search") throw new TypeError("Failed to fetch");
  throw new Error(`Unexpected fetch ${url}`);
};

await import("../manga-hakuneko.js?transport-revalidation-v34");
const api = window.ResenhaMangaEngine;
assert.equal(await api.bridge.check(), "ready");
await assert.rejects(
  api.search("lookism", { source: "bridge:astra-toons", language: "pt-br" }),
  /bloqueou/
);
assert.equal(api.state.bridgeStatus, "offline");
assert.equal(scheduledDelay, 250, "transport failures schedule an immediate health revalidation");
assert.equal(typeof scheduledRetry, "function");

await scheduledRetry();
assert.equal(healthCalls, 2);
assert.equal(api.state.bridgeStatus, "ready", "a successful health revalidation restores the Bridge");
assert.equal(api.state.bridgeRetryAttempt, 0);

console.log("manga engine v34: transport failure revalidates Bridge health");
