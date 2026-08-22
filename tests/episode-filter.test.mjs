import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const start = app.indexOf("const SERIES_EXTRA_TITLE_RE");
const end = app.indexOf("function renderEpisodes", start);
assert.ok(start >= 0 && end > start, "episode filtering helpers must exist");

const context = {};
vm.runInNewContext(`${app.slice(start, end)}\nthis.playableSeriesEpisodes=playableSeriesEpisodes;`, context);

const paradise = [
  { id: "podcast-s1e1", season: 1, episode: 1, title: "Official Podcast Season 1 Recap: Back to Paradise (Discussion)", description: "The host discusses the series." },
  { id: "real-s1e1", season: 1, episode: 1, title: "Wildcat Is Down", thumbnail: "episode-1.jpg", description: "Agent Xavier investigates a murder." },
  { id: "podcast-s2e1", season: 2, episode: 1, title: "Official Podcast Season 2 - Episode 1: All Shook Up (Discussion)" },
  { id: "real-s2e1", season: 2, episode: 1, title: "Sinatra", thumbnail: "episode-2.jpg" },
  { id: "real-s2e2", season: 2, episode: 2, title: "The Day After", thumbnail: "episode-3.jpg" },
  { id: "trailer", season: 2, episode: 3, title: "Official Trailer" }
];

const filtered = context.playableSeriesEpisodes(paradise);
assert.deepEqual(Array.from(filtered, item => item.id), ["real-s1e1", "real-s2e1", "real-s2e2"]);
assert.equal(new Set(filtered.map(item => `${item.season}:${item.episode}`)).size, filtered.length);

console.log("series v52: promotional extras and duplicated episode numbers are removed");
