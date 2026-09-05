import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const [app, html, booksCss, worker] = await Promise.all([
  readFile(new URL("app.js", root), "utf8"),
  readFile(new URL("index.html", root), "utf8"),
  readFile(new URL("books-v62.css", root), "utf8"),
  readFile(new URL("service-worker.js", root), "utf8")
]);

assert.match(app, /94c8cb9f702d-tmdb-addon\.baby-beamup\.club/);
assert.match(app, /%22language%22%3A%22pt-BR%22/);
assert.match(app, /%22returnImdbId%22%3A%22true%22/);
assert.match(app, /7a82163c306e-stremio-netflix-catalog-addon\.baby-beamup\.club\/manifest\.json/);
assert.match(app, /const catalogId=manifest===TMDB_PTBR_MANIFEST/);
assert.match(app, /defs\.filter\(d=>d\.manifestUrl===TMDB_PTBR_MANIFEST&&catalogSupportsSearch/);
assert.doesNotMatch(app, /fetch their first page and filter locally/i);

assert.match(app, /https:\/\/dlivros\.com\/Buscar\?q=/);
assert.match(app, /https:\/\/dlivros\.com\/livro\/phantastes-george-macdonald/);
assert.doesNotMatch(app, /site:dlivros\.com\/livro/);
assert.match(app, /Ver no dLivros/);
assert.match(app, /rememberLastBook/);
assert.doesNotMatch(app, /runWhenIdle\(\(\)=>ensureEpubJs/);
assert.match(app, /if\(choice\.kind==="epub"\)\{await ensureEpubJs/);

assert.match(html, /books-v62\.css\?v=62/);
assert.match(booksCss, /\.bookLibraryHero/);
assert.match(booksCss, /content-visibility:auto/);
assert.doesNotMatch(html, /data-page="manga"/i);
assert.doesNotMatch(app, /manga/i);
assert.doesNotMatch(worker, /manga/i);
assert.doesNotMatch(worker, /icon-(?:maskable-)?512/);

for (const removed of ["manga-hakuneko.js", "manga-hakuneko.css", "MANGA-ENGINE.md", "manga-bridge/server.py"]) {
  await assert.rejects(access(new URL(removed, root)), `${removed} must be removed`);
}

console.log("books/catalog v62: PT-BR metadata, direct dLivros links and lean loading OK");
