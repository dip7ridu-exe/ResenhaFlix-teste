import assert from "node:assert/strict";

const memory = new Map([["rf14_manga_bridge", "https://bridge.test"]]);
globalThis.localStorage = {
  getItem: key => memory.has(key) ? memory.get(key) : null,
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: key => memory.delete(key)
};
globalThis.window = {};
globalThis.location = { search: "" };
globalThis.innerWidth = 1000;

const source = {
  id: "saikai-scan",
  name: "Saikai Scan",
  lang: "pt-BR",
  homeUrl: "https://housesaikai.net",
  pkg: "eu.kanade.tachiyomi.extension.pt.saikaiscan",
  contentWarning: "safe"
};

function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
}

globalThis.fetch = async (input, options = {}) => {
  const url = new URL(String(input));
  if (url.pathname === "/api/health") return json({ ok: true, version: "32.0.0", sources: 4 });
  if (url.pathname === "/api/sources") return json({ sources: [source] });
  if (url.pathname === "/api/v2/manga/search") return json({ items: [{
    id: "11111111-1111-4111-8111-111111111111",
    connector: "mangadex",
    source: "MangaDex",
    sourceUrl: "https://mangadex.org/title/test",
    title: "Mangá de Teste",
    aliases: [],
    availableLanguages: ["pt-br"],
    tags: []
  }] });
  if (url.pathname === "/api/batch/search") return json({ results: [{
    source,
    ok: true,
    items: [{ title: "Mangá de Teste BR", url: "https://housesaikai.net/comics/teste", thumbnail: "https://bridge.test/cover.jpg", source }]
  }] });
  if (url.pathname === "/api/manga") return json({
    title: "Mangá de Teste BR",
    url: "https://housesaikai.net/comics/teste",
    description: "Sinopse",
    cover: "https://bridge.test/cover.jpg",
    chapters: [{ name: "Capítulo 1", number: 1, pageCount: 2, url: "https://housesaikai.net/ler/comics/teste/1/capitulo-1" }]
  });
  if (url.pathname === "/api/chapter") return json({ pages: [
    { image: "https://bridge.test/api/image?page=1", original: "https://img.test/1.jpg" },
    { image: "https://bridge.test/api/image?page=2", original: "https://img.test/2.jpg" }
  ] });
  throw new Error(`Unexpected fetch ${url} ${options.method || "GET"}`);
};

await import("../manga-hakuneko.js");

const api = window.ResenhaMangaEngine;
assert.equal(api.version, "32.0.0");
assert.equal(api.bridge.url, "https://bridge.test");
assert.throws(() => api.bridge.configure("javascript:alert(1)"), /HTTPS/);

const results = await api.search("teste", { language: "pt-br", limit: 20 });
assert.equal(results.length, 2);
assert.deepEqual(new Set(results.map(item => item.connector)), new Set(["mangadex", "bridge"]));

const bridgeItem = results.find(item => item.connector === "bridge");
const bridge = api.engine.connector("bridge");
const details = await bridge.manga(bridgeItem.id);
assert.equal(details.title, "Mangá de Teste BR");
const chapters = await bridge.chapters(bridgeItem.id);
assert.equal(chapters.length, 1);
const pages = await bridge.pages(chapters[0].id);
assert.equal(pages.length, 2);
assert.match(pages[0].url, /bridge\.test\/api\/image/);

const cbz = api.tools.createCBZ([
  { name: "0001.jpg", data: new Uint8Array([1, 2, 3]) },
  { name: "0002.jpg", data: new Uint8Array([4, 5]) }
]);
const bytes = new Uint8Array(await cbz.arrayBuffer());
assert.equal(new DataView(bytes.buffer).getUint32(0, true), 0x04034b50);
assert.equal(new DataView(bytes.buffer).getUint32(bytes.length - 22, true), 0x06054b50);

console.log("manga engine v32: search, PT-BR bridge, pages and CBZ OK");
