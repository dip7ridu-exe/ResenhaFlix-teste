import assert from "node:assert/strict";

const memory = new Map();
globalThis.localStorage = {
  getItem: key => memory.has(key) ? memory.get(key) : null,
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: key => memory.delete(key)
};
globalThis.window = {};
globalThis.location = { search: "" };
globalThis.innerWidth = 400;
globalThis.fetch = async () => { throw new TypeError("Failed to fetch"); };

await import("../manga-hakuneko.js?direct-failure");

await assert.rejects(
  window.ResenhaMangaEngine.search("teste", { language: "pt-br" }),
  error => error.code === "BRIDGE_REQUIRED" && /bloqueou/.test(error.message)
);

console.log("manga engine v32: direct failure requests bridge setup");
