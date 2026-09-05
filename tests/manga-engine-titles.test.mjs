import assert from "node:assert/strict";

const memory = new Map();
globalThis.localStorage = {
  getItem: key => memory.has(key) ? memory.get(key) : null,
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: key => memory.delete(key)
};
globalThis.window = {};
globalThis.location = { search: "", href: "https://app.test/" };
globalThis.innerWidth = 1000;

function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
}

const LOOKISM_ID = "596191eb-69ee-4401-983e-cc07e277fa17";
let searchedTitle = "";
globalThis.fetch = async input => {
  const url = new URL(String(input));
  if (url.hostname !== "api.mangadex.org") throw new Error(`Unexpected host ${url.hostname}`);
  if (url.pathname === "/manga") {
    searchedTitle = url.searchParams.get("title") || "";
    return json({ data: [{
      id: LOOKISM_ID,
      attributes: {
        title: { en: "Oemo Jisangjuui" },
        altTitles: [{ en: "Lookism" }],
        description: { en: "Test" },
        status: "ongoing",
        contentRating: "safe",
        availableTranslatedLanguages: ["en", "pt-br"],
        tags: []
      },
      relationships: []
    }], total: 1 });
  }
  if (url.pathname === "/chapter") return json({ total: 2, data: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      attributes: { chapter: "598", volume: null, title: "A", translatedLanguage: "en", pages: 19, publishAt: "2026-06-24T20:41:36Z", externalUrl: null },
      relationships: []
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      attributes: { chapter: "598", volume: null, title: "B", translatedLanguage: "en", pages: 105, publishAt: "2026-03-12T17:14:23Z", externalUrl: null },
      relationships: []
    }
  ] });
  throw new Error(`Unexpected fetch ${url}`);
};

await import("../manga-hakuneko.js?localized-titles");

const api = window.ResenhaMangaEngine;
const results = await api.search("aparências", { language: "all", source: "mangadex", limit: 20 });
assert.equal(searchedTitle, "Lookism");
assert.equal(results[0].title, "Lookism");
assert.equal(results[0].altTitle, "Aparências");
assert(results[0].aliases.includes("Oemo Jisangjuui"));

const chapters = await api.engine.connector("mangadex").chapters(LOOKISM_ID, { language: "en" });
assert.equal(chapters.length, 2, "different releases of the same chapter must remain visible");
assert.deepEqual(new Set(chapters.map(chapter => chapter.id)), new Set([
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222"
]));

console.log("manga engine: localized aliases and every MangaDex release OK");
