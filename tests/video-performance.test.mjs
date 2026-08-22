import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const [app, html, worker] = await Promise.all([
  readFile(new URL("app.js", root), "utf8"),
  readFile(new URL("index.html", root), "utf8"),
  readFile(new URL("service-worker.js", root), "utf8")
]);

assert.match(html, /<script src="\.\/app\.js\?v=52">\s*<\/script>/);
const markup = html.slice(html.indexOf("</style>") + 8);
assert.doesNotMatch(markup, /data-page="music"|id="musicMiniPlayer"|data-media-source-pane="music"/i);
assert.doesNotMatch(app, /SoundCloud|Audius|iTunes|musicPage|globalMusic/i);

const sourceOrder = [
  "https://bestcine.alwaysdata.net/manifest.json",
  "https://froststream.cloutteam.com/manifest.json",
  "https://fenixflix.fenixhub.online/manifest.json",
  "https://torrentio.strem.fun/manifest.json"
];
let last = -1;
for (const source of sourceOrder) {
  const index = app.indexOf(`"${source}"`);
  assert.ok(index > last, `${source} must keep its configured priority`);
  last = index;
}

assert.match(app, /\.\.\.REQUIRED_STREAM_MANIFESTS,\.\.\.saved/);
assert.match(app, /\.slice\(0,8\)/);
assert.match(app, /"1080p":150,"4K":120/);
assert.match(app, /function diversePlayableStreams/);
assert.match(app, /streamRequestTimeout\(manifest\)/);
assert.match(app, /loadStreamsFromAddons\(type,streamId,[\s\S]*?hasDirect/);
assert.match(app, /webtorrent@1\.9\.7\/webtorrent\.min\.js/);
assert.match(app, /function loadTorrentVideo/);
assert.match(app, /function playableSeriesEpisodes/);
assert.match(app, /official\\s\+podcast/);
assert.match(app, /function setPlaybackPerformanceMode/);
assert.match(worker, /resenhaflix-shell-v52/);
assert.match(worker, /\.\/app\.js\?v=52/);

console.log("video v52: desktop playback, parallel sources, episode filtering and Torrentio OK");
