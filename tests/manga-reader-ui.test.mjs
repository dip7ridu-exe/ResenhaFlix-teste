import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [script, styles] = await Promise.all([
  readFile(new URL("../manga-hakuneko.js", import.meta.url), "utf8"),
  readFile(new URL("../manga-hakuneko.css", import.meta.url), "utf8")
]);

assert.match(script, /id="hkMangaReader" role="dialog" aria-modal="true"/);
assert.match(script, /function trapReaderFocus\(event, reader\)/);
assert.match(script, /setReaderBackgroundInert\(true\)/);
assert.match(script, /setReaderBackgroundInert\(false\)/);
assert.match(script, /requestAnimationFrame\(restoreReaderFocus\)/);
assert.match(script, /controlsHaveFocus/);
assert.match(script, /input,select,textarea,\[contenteditable\]/);
assert.match(script, /canvas\.classList\.toggle\("allow-pan-x"/);
assert.match(script, /id="hkSourceHint"/);
assert.match(script, /data-hk-source-choice="all" aria-pressed=/);

assert.match(styles, /\.hk-reader-canvas\.vertical\.allow-pan-x\{touch-action:pan-x pan-y pinch-zoom\}/);
assert.match(styles, /@media\(max-width:760px\),\(pointer:coarse\),\(orientation:landscape\) and \(max-height:600px\)/);
assert.match(styles, /flex:0 0 min\(44vw,166px\)/);
assert.doesNotMatch(styles, /flex:0 0:min\(/);

console.log("manga reader v34: mobile gestures, modal focus and responsive controls OK");
