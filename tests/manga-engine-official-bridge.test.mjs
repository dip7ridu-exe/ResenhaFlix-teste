import assert from "node:assert/strict";

const memory = new Map();
globalThis.localStorage = {
  getItem: key => memory.has(key) ? memory.get(key) : null,
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: key => memory.delete(key)
};
globalThis.window = {};
globalThis.location = {
  search: "",
  hostname: "dip7ridu-exe.github.io",
  href: "https://dip7ridu-exe.github.io/ResenhaFLIX/"
};
globalThis.innerWidth = 390;

await import("../manga-hakuneko.js?official-bridge-v34");

const api = window.ResenhaMangaEngine;
const official = "https://resenhaflix-production.up.railway.app";
assert.equal(api.bridge.url, official, "the published site should configure new devices automatically");

api.bridge.configure("");
assert.equal(api.bridge.url, "", "the user can explicitly choose direct mode");
assert.equal(memory.get("rf_hk_bridge_disabled_v1"), "1");

api.bridge.configure(official);
assert.equal(api.bridge.url, official);
assert.equal(memory.has("rf_hk_bridge_disabled_v1"), false);

console.log("manga engine v34: official Bridge defaults and direct-mode opt-out OK");
