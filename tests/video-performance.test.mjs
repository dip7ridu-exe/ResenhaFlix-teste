import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const [app, html, worker, playerCss] = await Promise.all([
  readFile(new URL("app.js", root), "utf8"),
  readFile(new URL("index.html", root), "utf8"),
  readFile(new URL("service-worker.js", root), "utf8"),
  readFile(new URL("player-v55.css", root), "utf8")
]);

assert.match(html, /<script src="\.\/app\.js\?v=56">\s*<\/script>/);
const markup = html.slice(html.indexOf("</style>") + 8);
assert.doesNotMatch(markup, /data-page="music"|id="musicMiniPlayer"|data-media-source-pane="music"/i);
assert.doesNotMatch(app, /SoundCloud|Audius|iTunes|musicPage|globalMusic/i);

const sourceOrder = [
  "https://bestcine.alwaysdata.net/manifest.json",
  "https://froststream.cloutteam.com/manifest.json",
  "https://fenixflix.fenixhub.online/manifest.json"
];
let last = -1;
for (const source of sourceOrder) {
  const index = app.indexOf(`"${source}"`);
  assert.ok(index > last, `${source} must keep its configured priority`);
  last = index;
}

for (const removed of ["https://torrentio.strem.fun/manifest.json", "https://comet.elfhosted.com/manifest.json", "https://mediafusion.elfhosted.com/manifest.json"]) {
  assert.doesNotMatch(app, new RegExp(removed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${removed} must not remain configured`);
}

assert.match(app, /function sanitizeStreamManifests/);
assert.match(app, /\.slice\(0,6\)/);
assert.match(app, /REQUIRED_CATALOG_MANIFESTS/);
assert.match(app, /7a82163c306e-stremio-netflix-catalog-addon\.baby-beamup\.club\/manifest\.json/);
assert.match(app, /"1080p":150,"4K":120/);
assert.match(app, /function diversePlayableStreams/);
assert.match(app, /streamRequestTimeout\(manifest\)/);
assert.match(app, /loadStreamsFromAddons\(type,streamId,[\s\S]*?hasDirect/);
assert.match(app, /function scheduleSourceUIRender/);
assert.match(app, /sourceVisibleLimit:18/);
assert.doesNotMatch(app, /data-source-download/);
assert.doesNotMatch(html, /id="downloadCurrent"/);
assert.match(app, /function bindSourceUiEvents/);
assert.match(app, /function bindPageInfinite/);
assert.match(app, /behavior:reduced\|\|innerWidth<=760\?"auto":"smooth"/);
assert.match(app, /if\(s&&!s\.url&&!s\.externalUrl&&s\.infoHash\)return null/);
assert.match(app, /skipIntroEnabled:localStorage\.getItem\("rf55_skip_intro_enabled"\)/);
assert.match(app, /function setSkipIntroEnabled/);
assert.match(app, /function playableSeriesEpisodes/);
assert.match(app, /official\\s\+podcast/);
assert.match(app, /function setPlaybackPerformanceMode/);
assert.match(app, /setTimeout\(hidePlayerUI,1000\)/);
assert.match(app, /data-mobile-search/);
assert.match(app, /MOBILE_NAV_MAX_SHORTCUTS=3/);
assert.match(playerCss, /content-visibility:auto/);
assert.match(playerCss, /#top\{display:none!important\}/);
assert.match(playerCss, /\.mobileSearchPanel\.open/);
assert.match(playerCss, /#playerModal \.playerSide\.drawerOpen/);
assert.match(worker, /resenhaflix-shell-v56/);
assert.match(worker, /\.\/app\.js\?v=56/);
assert.match(worker, /\.\/player-v55\.css\?v=56/);

console.log("video v56: mobile navigation, 1s player controls and lightweight playback OK");
