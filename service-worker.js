const CACHE="resenhaflix-shell-v59";
const SHELL=["./","./index.html","./app.js?v=59","./watch-party.js?v=59","./watch-party.css?v=59","./manifest.webmanifest","./manga-hakuneko.css?v=34","./manga-hakuneko.js?v=34","./ui-polish.js?v=56","./theme-v54.css?v=54","./player-v55.css?v=58","./icons/resenhaflix-logo.png?v=54","./icons/icon-192.png?v=54","./icons/icon-512.png?v=54","./icons/icon-maskable-512.png?v=54"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("resenhaflix-shell-")&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{
 if(e.request.method!=="GET")return;
 const u=new URL(e.request.url);
 if(u.origin!==self.location.origin)return;
 if(e.request.mode==="navigate"){
  e.respondWith(fetch(e.request).then(r=>{
   if(r.ok)caches.open(CACHE).then(c=>c.put("./index.html",r.clone()));
   return r
  }).catch(()=>caches.match("./index.html")));
  return
 }
 if(e.request.destination==="script"||e.request.destination==="style"){
  e.respondWith(fetch(e.request,{cache:"no-store"}).then(r=>{
   if(r.ok)caches.open(CACHE).then(c=>c.put(e.request,r.clone()));
   return r
  }).catch(()=>caches.match(e.request)));
  return
 }
 e.respondWith(caches.match(e.request).then(hit=>{
  const fresh=fetch(e.request).then(r=>{
   if(r.ok)caches.open(CACHE).then(c=>c.put(e.request,r.clone()));
   return r
  }).catch(()=>hit);
  return hit||fresh
 }))
});
