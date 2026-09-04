import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const [app, html, theme, player, manifest, worker] = await Promise.all([
  readFile(new URL("app.js", root), "utf8"),
  readFile(new URL("index.html", root), "utf8"),
  readFile(new URL("theme-v54.css", root), "utf8"),
  readFile(new URL("player-v55.css", root), "utf8"),
  readFile(new URL("manifest.webmanifest", root), "utf8"),
  readFile(new URL("service-worker.js", root), "utf8")
]);

assert.match(app, /function setSkipIntroEnabled/);

for (const color of ["#6B5E90", "#100502", "#B5D0EC", "#204995", "#4B75FF"]) {
  assert.match(theme, new RegExp(color, "i"), `${color} must be present in the visual theme`);
}

const uiPolishIndex = html.indexOf('./ui-polish.css?v=50');
const themeIndex = html.indexOf('./theme-v54.css?v=54');
const playerIndex = html.indexOf('./player-v55.css?v=58');
assert.ok(uiPolishIndex >= 0 && themeIndex > uiPolishIndex && playerIndex > themeIndex, "v58 player theme must load last");
assert.match(player, /--rf-player-accent:#36b7f4/);
assert.match(player, /width:100vw!important;height:100dvh!important/);
assert.match(html, /id="rf-icon-play"/);
assert.match(html, /id="rf-icon-fullscreen"/);

const parsedManifest = JSON.parse(manifest);
assert.equal(parsedManifest.background_color, "#100502");
assert.equal(parsedManifest.theme_color, "#4B75FF");
assert.ok(parsedManifest.icons.every(icon => icon.src.endsWith("?v=54")), "PWA icons must bypass older caches");
assert.match(html, /\.\/icons\/resenhaflix-logo\.png\?v=54/);
assert.match(worker, /resenhaflix-shell-v59/);
assert.match(worker, /\.\/theme-v54\.css\?v=54/);
assert.match(worker, /\.\/player-v55\.css\?v=58/);

const iconSizes = new Map([
  ["icons/icon-192.png", [192, 192]],
  ["icons/icon-512.png", [512, 512]],
  ["icons/icon-maskable-512.png", [512, 512]],
  ["icons/resenhaflix-logo.png", [192, 192]]
]);

for (const [path, [expectedWidth, expectedHeight]] of iconSizes) {
  const png = await readFile(new URL(path, root));
  assert.equal(png.subarray(1, 4).toString(), "PNG", `${path} must be a PNG`);
  assert.equal(png.readUInt32BE(16), expectedWidth, `${path} width`);
  assert.equal(png.readUInt32BE(20), expectedHeight, `${path} height`);
}

console.log("visual v59: original palette, local SVG controls and full-screen player OK");
