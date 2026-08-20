import assert from "node:assert/strict";

const memory = new Map([["rf14_manga_bridge", "https://bridge-offline.test"]]);
globalThis.localStorage = {
  getItem: key => memory.has(key) ? memory.get(key) : null,
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: key => memory.delete(key)
};
globalThis.window = {};
globalThis.location = { search: "", href: "https://app.test/" };
globalThis.innerWidth = 1200;

function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
}

let bridgeHealthy = true;
globalThis.fetch = async input => {
  const url = new URL(String(input));
  if (url.hostname === "bridge-offline.test" && url.pathname === "/api/health" && bridgeHealthy) {
    bridgeHealthy = false;
    return json({ ok: true, version: "34.0.0", sources: 5 });
  }
  if (url.hostname === "bridge-offline.test") throw new TypeError("Failed to fetch");
  if (url.hostname === "api.mangadex.org" && url.pathname === "/manga") return json({
    data: [{
      id: "11111111-1111-4111-8111-111111111111",
      attributes: {
        title: { "pt-br": "Fallback direto" },
        altTitles: [],
        description: { "pt-br": "Busca direta depois da queda do Bridge." },
        status: "ongoing",
        year: 2026,
        contentRating: "safe",
        availableTranslatedLanguages: ["pt-br"],
        tags: []
      },
      relationships: []
    }],
    total: 1
  });
  throw new Error(`Unexpected fetch ${url}`);
};

await import("../manga-hakuneko.js?bridge-fallback-v34");

const api = window.ResenhaMangaEngine;
assert.equal(await api.bridge.check(), "ready");
const results = await api.search("fallback", { language: "pt-br", limit: 20 });
assert.equal(results.length, 1);
assert.equal(results[0].title, "Fallback direto");
assert.equal(api.state.bridgeStatus, "offline");
assert.match(api.state.bridgeHealth.error, /nao respondeu/i);

console.log("manga engine v34: offline bridge falls back to direct MangaDex");
