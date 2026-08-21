import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const [app, html, worker] = await Promise.all([
  readFile(new URL("app.js", root), "utf8"),
  readFile(new URL("index.html", root), "utf8"),
  readFile(new URL("service-worker.js", root), "utf8")
]);

assert.match(html, /<script src="\.\/app\.js\?v=51">\s*<\/script>/);
const markup = html.slice(html.indexOf("</style>") + 8);
assert.doesNotMatch(markup, /data-page="music"|id="musicMiniPlayer"|data-media-source-pane="music"/i);
assert.doesNotMatch(app, /SoundCloud|Audius|iTunes|musicPage|globalMusic/i);

const sourceOrder = [
  "https://froststream.cloutteam.com/manifest.json",
  "https://bestcine.alwaysdata.net/manifest.json",
  "https://fenixflix.fenixhub.online/manifest.json",
  "https://watchhub.strem.io/manifest.json"
];
let last = -1;
for (const source of sourceOrder) {
  const index = app.indexOf(`"${source}"`);
  assert.ok(index > last, `${source} must keep its configured priority`);
  last = index;
}

assert.match(app, /configuredStreamManifests\(\)[\s\S]*?\.slice\(0,6\)/);
assert.match(app, /"1080p":96,"4K":82/);
assert.match(app, /getJSONTimeout\(manifestUrl,3500\)/);
assert.match(app, /getJSONTimeout\(streamURLFor\(manifest,type,id\),6500\)/);
assert.match(app, /waitForSourceReady\(stream,token,9000\)/);
assert.match(app, /setTimeout\(\(\)=>\{autoTimer=null;startAuto\(\)\},220\)/);
assert.match(worker, /resenhaflix-shell-v51/);
assert.match(worker, /\.\/app\.js\?v=51/);

console.log("video v51: fast navigation, 1080p priority and music removal OK");
