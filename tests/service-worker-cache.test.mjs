import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const listeners = new Map();
const deleted = [];
let claimed = false;
const context = {
  URL,
  self: {
    location: { origin: "https://dip7ridu-exe.github.io" },
    addEventListener(type, listener) { listeners.set(type, listener); },
    clients: { async claim() { claimed = true; } }
  },
  caches: {
    async keys() {
      return ["resenhaflix-shell-v34", "resenhaflix-shell-v50", "resenhaflix-shell-v51", "resenhaflix-shell-v52", "resenhaflix-shell-v53", "outro-projeto-cache"];
    },
    async delete(key) { deleted.push(key); return true; }
  }
};

const source = await readFile(new URL("../service-worker.js", import.meta.url), "utf8");
vm.runInNewContext(source, context, { filename: "service-worker.js" });
let activation = null;
listeners.get("activate")({ waitUntil(promise) { activation = promise; } });
await activation;

assert.deepEqual(deleted.sort(), ["resenhaflix-shell-v34", "resenhaflix-shell-v50", "resenhaflix-shell-v51", "resenhaflix-shell-v52"]);
assert.equal(claimed, true);
assert.equal(deleted.includes("outro-projeto-cache"), false, "activation must preserve unrelated GitHub Pages caches");

console.log("service worker v53: cleanup is restricted to ResenhaFlix shell caches");
