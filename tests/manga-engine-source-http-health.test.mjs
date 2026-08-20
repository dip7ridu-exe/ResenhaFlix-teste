import assert from "node:assert/strict";

const memory = new Map([["rf14_manga_bridge", "https://bridge.test"]]);
globalThis.localStorage = {
  getItem: key => memory.has(key) ? memory.get(key) : null,
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: key => memory.delete(key)
};
globalThis.window = {};
globalThis.location = { search: "", hostname: "app.test", href: "https://app.test/" };

const source = {
  id: "astra-toons", name: "AstraToons", lang: "pt-BR",
  homeUrl: "https://new.astratoons.com", pkg: "eu.kanade.tachiyomi.extension.pt.astratoons",
  contentWarning: "safe"
};
const json = (value, status = 200) => new Response(JSON.stringify(value), {
  status, headers: { "Content-Type": "application/json" }
});
let healthCalls = 0;

globalThis.fetch = async input => {
  const url = new URL(String(input));
  if (url.pathname === "/api/health") {
    healthCalls++;
    return json({ ok: true, version: "34.0.0", sources: 5 });
  }
  if (url.pathname === "/api/sources") return json({ sources: [source] });
  if (url.pathname === "/api/search") return json({ detail: "A fonte respondeu 502" }, 502);
  throw new Error(`Unexpected fetch ${url}`);
};

await import("../manga-hakuneko.js?source-http-health-v34");
const api = window.ResenhaMangaEngine;

assert.equal(await api.bridge.check(), "ready");
await assert.rejects(
  api.search("lookism", { source: "bridge:astra-toons", language: "pt-br" }),
  /HTTP 502/
);
assert.equal(api.state.bridgeStatus, "ready", "a source HTTP error must not mark the Bridge offline");
assert.equal(api.state.bridgeRetryTimer, 0);
assert.equal(healthCalls, 1, "HTTP source errors do not need a Bridge health revalidation");

console.log("manga engine v34: source HTTP 502 keeps a healthy Bridge online");
