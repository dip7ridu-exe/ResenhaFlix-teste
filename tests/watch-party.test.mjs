import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const core = require("../watch-party.js");
const root = new URL("../", import.meta.url);

assert.equal(core.ROOM_LENGTH, 5);
assert.equal(core.MAX_GUESTS, 7);
assert.equal(core.MAX_JOIN_ATTEMPTS, 3);
assert.equal(core.normalizeCode(" a-b 2c9 "), "AB2C9");
assert.equal(core.isValidCode("A2B3C"), true);
assert.equal(core.isValidCode("A2B3"), false);
assert.equal(core.sanitizeName("  <Ana>   Silva  "), "Ana Silva");
assert.equal(core.sanitizeName("Uma pessoa com nome muito longo"), "Uma pessoa com nome");
assert.equal(core.createRoomCode([0, 1, 2, 3, 4]), "ABCDE");
assert.equal(core.roomPeerId(" A2B3C "), "resenhaflix-room-a2b3c");
assert.equal(core.roomUrl("https://example.test/app/?x=1#top", "a2b3c"), "https://example.test/app/?x=1&sala=A2B3C#top");
assert.equal(core.roomUrl("https://example.test/app/?x=1&sala=A2B3C", ""), "https://example.test/app/?x=1");
assert.equal(core.roomUrl("https://example.test/app/?x=1", "a2b3c", true), "https://example.test/app/?x=1&sala=A2B3C&entrar=1");
assert.equal(core.roomUrl("https://example.test/app/?sala=A2B3C&entrar=1", "A2B3C"), "https://example.test/app/?sala=A2B3C");
assert.equal(core.validConnectionMetadata({ protocol: 1, code: "a2b3c", name: "Ana" }, "A2B3C"), true);
assert.equal(core.validConnectionMetadata({ protocol: 1, code: "ZZZZZ", name: "Ana" }, "A2B3C"), false);
assert.equal(core.validConnectionMetadata({ protocol: 1, code: "A2B3C", name: "A" }, "A2B3C"), false);
assert.equal(core.safeReplaceState({}, "https://example.test/"), false);
let replacedUrl = "";
assert.equal(core.safeReplaceState({ state: { ok: true }, replaceState(_state, _title, url) { replacedUrl = url; } }, "https://example.test/?sala=A2B3C"), true);
assert.equal(replacedUrl, "https://example.test/?sala=A2B3C");
assert.equal(core.sourceIdentityKey({ url: "https://video.test/movie.m3u8" }), "url:https://video.test/movie.m3u8");
assert.equal(core.sourceIdentityKey({ infoHash: "ABC123" }), "torrent:abc123");

const movie = { type: "movie", rootId: "tt123", playId: "tt123" };
const episode = { type: "series", rootId: "tt456", playId: "tt456:1:2" };
assert.equal(core.mediaKey(movie), "movie|tt123|tt123");
assert.equal(core.mediaKey(episode), "series|tt456|tt456:1:2");
assert.equal(core.expectedTime({ currentTime: 30, paused: true, playbackRate: 1, sentAt: 1000 }, 4000), 30);
assert.equal(core.expectedTime({ currentTime: 30, paused: false, playbackRate: 1.5, sentAt: 1000 }, 3000), 33);
assert.equal(core.expectedTime({ currentTime: 30, paused: false, playbackRate: 1, sentAt: 1000 }, 20000), 30);
assert.equal(core.validMessage({ type: "sync", protocol: 1, code: "A2B3C" }, "A2B3C"), true);
assert.equal(core.validMessage({ type: "sync", protocol: 2, code: "A2B3C" }, "A2B3C"), false);

const [html, app, worker, css, partyScript] = await Promise.all([
  readFile(new URL("index.html", root), "utf8"),
  readFile(new URL("app.js", root), "utf8"),
  readFile(new URL("service-worker.js", root), "utf8"),
  readFile(new URL("watch-party.css", root), "utf8"),
  readFile(new URL("watch-party.js", root), "utf8")
]);

for (const id of ["watchPartyEntry", "detailParty", "playerParty", "watchPartyMobileEntry", "watchPartyModal", "partyNameInput", "partyCodeInput", "partyCreateBtn", "partyJoinBtn", "partyParticipants", "partyChooseBtn"]) {
  assert.match(html, new RegExp(`id="${id}"`), `${id} must exist in the page`);
}
assert.match(app, /window\.ResenhaFlixPartyAdapter=/);
assert.match(app, /resenhaflix:party-media/);
assert.match(app, /resenhaflix:party-source/);
assert.match(app, /_partyAutoplay/);
assert.match(app, /applySource:applyPartySource/);
assert.match(worker, /\.\/watch-party\.js\?v=61/);
assert.match(worker, /\.\/watch-party\.css\?v=61/);
assert.match(partyScript, /function safeReplaceState/);
assert.match(partyScript, /function validConnectionMetadata/);
assert.match(partyScript, /function retryGuestConnection/);
assert.match(partyScript, /MAX_JOIN_ATTEMPTS=3/);
assert.match(partyScript, /stun:stun\.cloudflare\.com:3478/);
assert.match(partyScript, /new Peer\(undefined,peerOptions\(\)\)/);
assert.doesNotMatch(partyScript, /new Peer\(undefined,[^;]+;await waitForPeer/);
assert.doesNotMatch(partyScript, /reliable:true/);
assert.match(partyScript, /searchParams\.get\("entrar"\)==="1"/);
assert.match(html, /class="watchPartyInviteText"/);
assert.match(css, /\.watchPartyModal\.inviteMode/);
assert.match(css, /\.partyGuest #playPause/);
assert.match(css, /\.partyGuest #preferredSourceSelect/);
assert.match(css, /touch-action:pan-y/);

console.log("watch party v61: direct invites, metadata handshake, bounded retries and source sync OK");
