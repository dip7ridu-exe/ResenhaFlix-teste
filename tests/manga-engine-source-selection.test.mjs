import assert from "node:assert/strict";

const memory = new Map([["rf14_manga_bridge", "https://bridge.test"]]);
globalThis.localStorage = {
  getItem: key => memory.has(key) ? memory.get(key) : null,
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: key => memory.delete(key)
};
globalThis.window = {};
globalThis.location = { search: "", hostname: "app.test", href: "https://app.test/" };
globalThis.innerWidth = 390;

const astra = {
  id: "astra-toons", name: "AstraToons", lang: "pt-BR",
  homeUrl: "https://new.astratoons.com", pkg: "eu.kanade.tachiyomi.extension.pt.astratoons",
  contentWarning: "safe"
};
const lycan = {
  id: "lycan-toons", name: "Lycan Toons", lang: "pt-BR",
  homeUrl: "https://lycantoons.com", pkg: "eu.kanade.tachiyomi.extension.pt.lycantoons",
  contentWarning: "safe"
};
const calls = [];
const json = value => new Response(JSON.stringify(value), { status: 200, headers: { "Content-Type": "application/json" } });

globalThis.fetch = async (input, options = {}) => {
  const url = new URL(String(input));
  if (url.pathname === "/api/health") return json({ ok: true, version: "34.0.0", sources: 5 });
  if (url.pathname === "/api/sources") return json({ sources: [lycan, astra] });
  if (url.pathname === "/api/search" || url.pathname === "/api/popular") {
    const body = JSON.parse(options.body);
    calls.push({ path: url.pathname, body });
    return json({ ok: true, items: [{
      title: "Aparências", altTitle: "Lookism", aliases: ["Lookism"],
      url: "https://new.astratoons.com/comics/aparencias", source: astra
    }] });
  }
  throw new Error(`Unexpected fetch ${url}`);
};

await import("../manga-hakuneko.js?source-selection-v34");
const api = window.ResenhaMangaEngine;
assert.equal(await api.bridge.check(), "ready");

const results = await api.search("lookism", { source: "bridge:astra-toons", language: "pt-br" });
assert.equal(results.length, 1);
assert.equal(results[0].title, "Aparências");
assert.equal(calls[0].path, "/api/search");
assert.equal(calls[0].body.source.id, "astra-toons");

await api.search("", { source: "bridge:astra-toons", language: "pt-br" });
assert.equal(calls[1].path, "/api/popular");
assert.equal(calls[1].body.source.id, "astra-toons");

console.log("manga engine v34: individual HakuNeko-style source selection OK");
