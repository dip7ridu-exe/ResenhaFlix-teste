// ResenhaFlix — versão simplificada baseada no site funcional
const CORE_STREAM_MANIFESTS=[
  "https://bestcine.alwaysdata.net/manifest.json",
  "https://froststream.cloutteam.com/manifest.json",
  "https://fenixflix.fenixhub.online/manifest.json"
];
const BLOCKED_STREAM_HOSTS=new Set(["torrentio.strem.fun","comet.elfhosted.com","mediafusion.elfhosted.com"]);
const CATALOG_ONLY_HOSTS=new Set(["apps.soluserv.es"]);
const REQUIRED_STREAM_MANIFESTS=[...CORE_STREAM_MANIFESTS];
const CINEMETA_MANIFEST="https://v3-cinemeta.strem.io/manifest.json";
const TMDB_PTBR_MANIFEST="https://94c8cb9f702d-tmdb-addon.baby-beamup.club/%7B%22language%22%3A%22pt-BR%22%2C%22returnImdbId%22%3A%22true%22%7D/manifest.json";
const STREAMING_CATALOG_MANIFEST="https://7a82163c306e-stremio-netflix-catalog-addon.baby-beamup.club/manifest.json";
const REQUIRED_CATALOG_MANIFESTS=[
  TMDB_PTBR_MANIFEST,
  STREAMING_CATALOG_MANIFEST,
  "https://apps.soluserv.es/stremio_catalog_plus/manifest.json"
];
const CFG_DEFAULT={
  frost:REQUIRED_STREAM_MANIFESTS.join("\n"),
  meta:TMDB_PTBR_MANIFEST,
  catalogs:REQUIRED_CATALOG_MANIFESTS.join("\n"),
  subtitleAddon:"https://opensubtitles-v3.strem.io/manifest.json",
  audioPref:"jpn",
  subtitlePref:"pob",
  lang:"pt-BR"
};
let savedStreams=localStorage.getItem("cf2_frost")||CFG_DEFAULT.frost;
function isBlockedStreamManifest(value){
 try{
  const host=new URL(String(value||"")).hostname.toLowerCase();
  return BLOCKED_STREAM_HOSTS.has(host)||CATALOG_ONLY_HOSTS.has(host)
 }catch{return true}
}
function sanitizeStreamManifests(value){
 const current=String(value||"").split(/[\n,]+/).map(x=>x.trim()).filter(Boolean);
 return [...new Set([...REQUIRED_STREAM_MANIFESTS,...current.filter(url=>!isBlockedStreamManifest(url))])].slice(0,6)
}
savedStreams=sanitizeStreamManifests(savedStreams).join("\n");
localStorage.setItem("cf2_frost",savedStreams);
const savedMeta=localStorage.getItem("cf2_meta");
const preferredMeta=!savedMeta||savedMeta===CINEMETA_MANIFEST?TMDB_PTBR_MANIFEST:savedMeta;
if(!localStorage.getItem("rf62_ptbr_catalog")){
 localStorage.setItem("cf2_meta",preferredMeta);localStorage.setItem("cf2_lang","pt-BR");localStorage.setItem("rf62_ptbr_catalog","1")
}
const cfg={
  frost:savedStreams,
  meta:preferredMeta,
  catalogs:localStorage.getItem("cf4_catalogs")||CFG_DEFAULT.catalogs,
  subtitleAddon:localStorage.getItem("cf5_subtitle_addon")||CFG_DEFAULT.subtitleAddon,
  audioPref:localStorage.getItem("cf5_audio_pref")||CFG_DEFAULT.audioPref,
  subtitlePref:localStorage.getItem("cf5_subtitle_pref")||CFG_DEFAULT.subtitlePref,
  lang:"pt-BR"
};
const S={hero:null,current:null,currentShow:null,currentEpisode:null,nextEpisode:null,season:1,currentPage:"home",streams:[],selectedStream:null,selectedAddon:"all",qualityFilter:"all",streamTitle:"",streamMeta:null,playType:null,playId:null,resolvedStreamId:null,rootId:null,resumeEntry:null,resumeApplied:false,searchFilter:"all",searchItems:[],searchQuery:"",searchToken:0,listQuery:"",manifestCache:new Map(),catalogCache:new Map(),itemCache:new Map(),externalSubtitles:[],externalSubtitleBlob:null,playerMenuKind:null,aspectMode:localStorage.getItem("cf9_aspect")||"smart",introSkipped:false,introSkipSeconds:90,skipIntroEnabled:localStorage.getItem("rf55_skip_intro_enabled")!=="0",autoFallback:localStorage.getItem("cf11_auto_fallback")!=="0",sourceHealth:new Map(),sourceAttemptToken:0,attemptedSourceKeys:new Set(),streamCache:new Map(),streamLoadToken:0,addonNameCache:new Map(),addonQueryStatus:new Map(),primaryManifest:localStorage.getItem("rf17_primary_manifest")||"",sourceToolsOpen:false,sourceVisibleLimit:18,sourceResetScroll:true,pageCategory:"all",pageItems:[],pageTypeForCategories:"",pageVisibleLimit:18,pageInfiniteObserver:null,_sourceTimer:null,_sourceUiTimer:null,_ctlTimer:null,_lastProgressSave:0,_stallTimer:null,_stallStartedAt:0,_stallEvents:[],_stallRecovery:false,_stallCooldownUntil:0,_lastStablePlaybackAt:0,booksTab:"all",booksQuery:"",bookResults:[],bookReaderBook:null,bookReaderRendition:null,bookReaderEpub:null,mediaSourceTab:"books"};

const $=s=>document.querySelector(s);
const $$=s=>document.querySelectorAll(s);
const esc=x=>String(x??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
function setPlayerIcon(element,name){
 if(!element)return;
 element.innerHTML=`<svg class="rfIcon ${name==="play"?"rfIconPlay":""}" aria-hidden="true"><use href="#rf-icon-${name}"></use></svg>`;
}
const SITE_DEFAULT_VOLUME=0.3,SITE_DEFAULT_VOLUME_PCT=30;
function attachYouTubePreviewVolume(iframe,pct){
 let ready=false;
 const send=(func,args=[])=>{try{iframe.contentWindow.postMessage(JSON.stringify({event:"command",func,args}),"*")}catch{}};
 const onMsg=e=>{
  if(!iframe.isConnected||e.source!==iframe.contentWindow)return;
  let data;try{data=typeof e.data==="string"?JSON.parse(e.data):e.data}catch{return}
  if(data&&data.event==="onReady"){ready=true;send("unMute");send("setVolume",[pct]);window.removeEventListener("message",onMsg)}
 };
 window.addEventListener("message",onMsg);
 setTimeout(()=>{if(!ready){send("unMute");send("setVolume",[pct])}window.removeEventListener("message",onMsg)},1200);
}

S.globalVideoResults=[];
S.globalVideosExpanded=false;

const MOBILE_NAV_STORAGE="rf33_mobile_nav";
const MOBILE_NAV_MAX_SHORTCUTS=3;
const MOBILE_NAV_DEFAULT=["home","trending","movies"];
const MOBILE_NAV_ITEMS=[
 {id:"home",label:"Início",icon:"⌂"},
 {id:"trending",label:"Em alta",icon:"↗"},
 {id:"movies",label:"Filmes",icon:"▣"},
 {id:"series",label:"Séries",icon:"▤"},
 {id:"anime",label:"Animes",icon:"✦"},
 {id:"books",label:"Livros",icon:"▧"},
 {id:"list",label:"Lista",icon:"＋"}
];
const MOBILE_NAV_IDS=new Set(MOBILE_NAV_ITEMS.map(item=>item.id));
function loadMobileNavPreferences(){
 try{
  const saved=JSON.parse(localStorage.getItem(MOBILE_NAV_STORAGE)||"null");
  if(Array.isArray(saved)){
   const valid=[...new Set(saved.map(String).filter(id=>MOBILE_NAV_IDS.has(id)))].slice(0,MOBILE_NAV_MAX_SHORTCUTS);
   if(valid.length)return valid;
  }
 }catch{}
 return [...MOBILE_NAV_DEFAULT];
}
let mobileNavPreferences=loadMobileNavPreferences();
let mobileNavEditorOpen=false;
let mobileNavPreviousFocus=null;
function saveMobileNavPreferences(){
 try{localStorage.setItem(MOBILE_NAV_STORAGE,JSON.stringify(mobileNavPreferences))}catch{}
}
function mobileNavItem(id){return MOBILE_NAV_ITEMS.find(item=>item.id===id)}
function renderMobileBottomNav(){
 const nav=$("#mobileBottomNav");if(!nav)return;
 const current=S.currentPage;
 nav.style.setProperty("--mobile-nav-count",String(Math.min(5,mobileNavPreferences.length+2)));
 nav.innerHTML=mobileNavPreferences.map(id=>{
  const item=mobileNavItem(id);if(!item)return"";
  const active=current===id;
  return `<button type="button" class="${active?"active":""}" data-mobile-page="${esc(id)}"${active?' aria-current="page"':""}><span aria-hidden="true">${item.icon}</span><small>${esc(item.label)}</small></button>`;
 }).join("")+`<button type="button" class="${current==="search"?"active":""}" data-mobile-search${current==="search"?' aria-current="page"':""} aria-label="Buscar"><span aria-hidden="true"><svg class="rfIcon"><use href="#rf-icon-search"></use></svg></span><small>Buscar</small></button><button type="button" id="mobileNavMore" data-mobile-more aria-haspopup="dialog" aria-controls="mobileNavMenu" aria-expanded="false"><span aria-hidden="true">•••</span><small>Mais</small></button>`;
 const more=$("#mobileNavMore");
 if(more&&MOBILE_NAV_IDS.has(current)&&!mobileNavPreferences.includes(current)){
  more.classList.add("active");more.setAttribute("aria-current","page");
 }
}
function renderMobileNavMenu(){
 const destinations=$("#mobileNavDestinations"),editor=$("#mobileNavEditor"),list=$("#mobileNavEditorList");
 if(!destinations||!editor||!list)return;
 destinations.innerHTML=MOBILE_NAV_ITEMS.map(item=>{
  const preferred=mobileNavPreferences.includes(item.id),active=S.currentPage===item.id;
  return `<button type="button" class="mobileNavDestination ${preferred?"preferred":""} ${active?"active":""}" data-mobile-destination="${esc(item.id)}"${active?' aria-current="page"':""}><span aria-hidden="true">${item.icon}</span><b>${esc(item.label)}</b><small>${preferred?"Na barra":"Abrir"}</small></button>`;
 }).join("")+`<button type="button" class="mobileNavDestination" data-mobile-settings><span aria-hidden="true"><svg class="rfIcon"><use href="#rf-icon-settings"></use></svg></span><b>Ajustes</b><small>Abrir</small></button>`;
 list.innerHTML=MOBILE_NAV_ITEMS.map(item=>{
  const order=mobileNavPreferences.indexOf(item.id),selected=order>=0;
  return `<div class="mobileNavEditRow"><label class="mobileNavEditChoice"><input type="checkbox" data-mobile-preference="${esc(item.id)}" ${selected?"checked":""}><span>${item.icon} ${esc(item.label)}</span></label><div class="mobileNavOrder"><button type="button" data-mobile-nav-move="-1" data-mobile-nav-id="${esc(item.id)}" aria-label="Mover ${esc(item.label)} para a esquerda" ${!selected||order===0?"disabled":""}>←</button><button type="button" data-mobile-nav-move="1" data-mobile-nav-id="${esc(item.id)}" aria-label="Mover ${esc(item.label)} para a direita" ${!selected||order===mobileNavPreferences.length-1?"disabled":""}>→</button></div></div>`;
 }).join("");
 editor.hidden=!mobileNavEditorOpen;
 const toggle=$("#mobileNavEditToggle");if(toggle)toggle.setAttribute("aria-expanded",mobileNavEditorOpen?"true":"false");
}
function openMobileNavMenu(){
 const menu=$("#mobileNavMenu");if(!menu)return;
 mobileNavPreviousFocus=document.activeElement;renderMobileNavMenu();
 menu.classList.add("open");menu.setAttribute("aria-hidden","false");
 $("#mobileNavMore")?.setAttribute("aria-expanded","true");
 requestAnimationFrame(()=>$("#mobileNavMenuPanel")?.focus({preventScroll:true}));
}
function closeMobileNavMenu(restoreFocus=true){
 const menu=$("#mobileNavMenu");if(!menu)return;
 menu.classList.remove("open");menu.setAttribute("aria-hidden","true");
 $("#mobileNavMore")?.setAttribute("aria-expanded","false");
 if(restoreFocus&&mobileNavPreviousFocus?.isConnected)mobileNavPreviousFocus.focus({preventScroll:true});
}
function navigateMobileDestination(target){
 closeMobileNavMenu(false);closeTransientUI();setActiveNav(target);
 if(target==="home")home();else page(target);
}
function updateMobileNavPreference(id,selected){
 if(!MOBILE_NAV_IDS.has(id))return;
 if(selected){
  if(mobileNavPreferences.includes(id))return;
  if(mobileNavPreferences.length>=MOBILE_NAV_MAX_SHORTCUTS){toast(`Escolha no máximo ${MOBILE_NAV_MAX_SHORTCUTS} atalhos.`);renderMobileNavMenu();return}
  mobileNavPreferences.push(id);
 }else{
  if(mobileNavPreferences.length<=1){toast("Mantenha pelo menos um atalho na barra.");renderMobileNavMenu();return}
  mobileNavPreferences=mobileNavPreferences.filter(item=>item!==id);
 }
 saveMobileNavPreferences();renderMobileBottomNav();renderMobileNavMenu();setActiveNav(S.currentPage);
}
function moveMobileNavPreference(id,direction){
 const from=mobileNavPreferences.indexOf(id),to=from+Number(direction);
 if(from<0||to<0||to>=mobileNavPreferences.length)return;
 [mobileNavPreferences[from],mobileNavPreferences[to]]=[mobileNavPreferences[to],mobileNavPreferences[from]];
 saveMobileNavPreferences();renderMobileBottomNav();renderMobileNavMenu();setActiveNav(S.currentPage);
}
renderMobileBottomNav();
renderMobileNavMenu();
const base=u=>u.replace(/\/manifest\.json.*$/,"").replace(/\/$/,"");
const api=(b,p)=>base(b)+"/"+p.replace(/^\/+/,"");


const MEDIA_DEFAULT={
 booksOpenLibrary:"https://openlibrary.org/search.json",
 booksGutendex:"https://gutendex.com/books",
 booksJsonUrls:""
};
const mediaCfg={
 booksOpenLibrary:localStorage.getItem("rf24_books_openlibrary")||MEDIA_DEFAULT.booksOpenLibrary,
 booksGutendex:localStorage.getItem("rf24_books_gutendex")||MEDIA_DEFAULT.booksGutendex,
 booksJsonUrls:localStorage.getItem("rf24_books_json_urls")||""
};
function safeHttpUrl(url){try{const u=new URL(String(url||""));return /^https?:$/.test(u.protocol)?u.toString():""}catch{return""}}
function mediaImported(){try{return JSON.parse(localStorage.getItem("rf24_books_imported")||"[]")}catch{return[]}}
function saveMediaImported(data){try{localStorage.setItem("rf24_books_imported",JSON.stringify((Array.isArray(data)?data:[]).slice(0,500)))}catch{toast("Arquivo JSON grande demais para salvar neste dispositivo.")}}
function importJsonFile(_kind,file){
 if(!file)return;
 if(file.size>1.5*1024*1024){toast("O arquivo JSON deve ter no máximo 1,5 MB.");return}
 const reader=new FileReader();
 reader.onload=()=>{try{const items=genericJsonItems(JSON.parse(String(reader.result||"")));saveMediaImported(items);const status=$("#booksImportStatus");if(status)status.textContent=`${items.length} livro(s) importado(s).`;toast("Arquivo de livros importado.")}catch{toast("O arquivo JSON não é válido.")}};
 reader.onerror=()=>toast("Não foi possível ler o arquivo JSON.");reader.readAsText(file)
}
function genericJsonItems(data){if(Array.isArray(data))return data;if(Array.isArray(data?.results))return data.results;if(Array.isArray(data?.items))return data.items;if(Array.isArray(data?.data))return data.data;return[]}
function localMatch(items,q){const n=normText(q);if(!n)return items;return items.filter(x=>normText(JSON.stringify(x)).includes(n))}
async function fetchCustomJson(url,query,timeout=5500){let target=String(url||"").trim();if(!target)return[];if(target.includes("{query}"))target=target.replaceAll("{query}",encodeURIComponent(query||""));const u=safeHttpUrl(target);if(!u)return[];const data=await getJSONTimeout(u,timeout);return localMatch(genericJsonItems(data),query)}
function toast(t){const e=$("#toast");e.textContent=t;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),3200)}
async function getJSON(url){
 const r=await fetch(url,{headers:{Accept:"application/json"}});
 if(!r.ok)throw Error("HTTP "+r.status+" — "+url);
 return r.json();
}
async function getJSONTimeout(url,timeoutMs=6500){
 const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),timeoutMs);
 try{
  const r=await fetch(url,{headers:{Accept:"application/json"},signal:ctl.signal,cache:"default"});
  if(!r.ok)throw Error("HTTP "+r.status+" — "+url);
  return await r.json();
 }finally{clearTimeout(timer)}
}
function metaURL(type,id){return api(cfg.meta,`meta/${type}/${encodeURIComponent(id)}.json`)}
function normalizeExtra(params){
 if(!params)return "";
 if(typeof params==="string")return params.replace(/^\?/,"");
 return Object.entries(params).filter(([,v])=>v!==undefined&&v!==null&&v!=="").map(([k,v])=>`${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
}
const TMDB_GENRES_PTBR=new Map([
 ["action","Ação"],["adventure","Aventura"],["animation","Animação"],["comedy","Comédia"],
 ["documentary","Documentário"],["family","Família"],["fantasy","Fantasia"],["history","História"],
 ["horror","Terror"],["mystery","Mistério"],["science fiction","Ficção científica"],["sci-fi","Ficção científica"],
 ["thriller","Suspense"],["war","Guerra"],["western","Faroeste"]
]);
function catalogParamsFor(manifest,params){
 if(manifest!==TMDB_PTBR_MANIFEST||!params||typeof params!=="object")return params;
 const localized=TMDB_GENRES_PTBR.get(normText(params.genre));
 return localized?{...params,genre:localized}:params
}
function catalogURLFor(manifest,type,id="top",params=""){
 const extra=normalizeExtra(catalogParamsFor(manifest,params));
 const catalogId=manifest===TMDB_PTBR_MANIFEST&&!String(id).startsWith("tmdb.")?`tmdb.${id}`:id;
 return api(manifest,`catalog/${type}/${encodeURIComponent(catalogId)}${extra?("/"+extra):""}.json`);
}
function catalogURL(type,id="top",params=""){return catalogURLFor(cfg.meta,type,id,params)}
function streamURLFor(manifest,type,id){return api(manifest,`stream/${type}/${encodeURIComponent(id)}.json`)}
function configuredStreamManifests(){
 return sanitizeStreamManifests(cfg.frost)
}
function configuredCatalogManifests(){
 const saved=String(cfg.catalogs||CFG_DEFAULT.catalogs).split(/[\n,]+/).map(x=>x.trim()).filter(Boolean).filter(x=>x!==CINEMETA_MANIFEST);
 return [...new Set([...REQUIRED_CATALOG_MANIFESTS,...saved])]
}
function subtitleURLFor(manifest,type,id){return api(manifest,`subtitles/${type}/${encodeURIComponent(id)}.json`)}
function normLang(x){return String(x||"").toLowerCase().replace("_","-")}
function langFamily(x){
 const l=normLang(x);
 if(["ja","jpn","jp","japanese"].includes(l))return "jpn";
 if(["pt-br","pob","pb","por-br","brazilian portuguese"].includes(l))return "pob";
 if(["pt","por","portuguese"].includes(l))return "por";
 if(["en","eng","english"].includes(l))return "eng";
 return l||"und";
}
function langLabel(x){
 const l=langFamily(x);
 return ({jpn:"Japonês",pob:"Português (Brasil)",por:"Português",eng:"Inglês",und:"Desconhecido"})[l]||x||"Desconhecido";
}

const MANIFEST_DATA=new Map();
async function getManifest(manifestUrl){
  if(S.manifestCache.has(manifestUrl))return S.manifestCache.get(manifestUrl);
  const timeout=REQUIRED_STREAM_MANIFESTS.includes(manifestUrl)?10000:REQUIRED_CATALOG_MANIFESTS.includes(manifestUrl)?7500:3500;
  const p=getJSONTimeout(manifestUrl,timeout).then(data=>{MANIFEST_DATA.set(manifestUrl,data);return data}).catch(e=>{S.manifestCache.delete(manifestUrl);throw e});
  S.manifestCache.set(manifestUrl,p);return p;
}
// Respeita o manifesto do addon (resources/types/idPrefixes) para não fazer chamadas inúteis.
function addonSupports(manifestUrl,resource,type,id){
  const m=MANIFEST_DATA.get(manifestUrl);
 if(!m)return true;
 const resources=(m.resources||[]).map(r=>typeof r==="string"?{name:r}:(r||{}));
 if(!resources.length)return true;
 const entry=resources.find(r=>r.name===resource);
 if(!entry)return false;
 const types=Array.isArray(entry.types)&&entry.types.length?entry.types:(Array.isArray(m.types)?m.types:[]);
 if(type&&types.length&&!types.includes(type))return false;
 const prefixes=Array.isArray(entry.idPrefixes)&&entry.idPrefixes.length?entry.idPrefixes:(Array.isArray(m.idPrefixes)?m.idPrefixes:[]);
 if(id&&prefixes.length&&!prefixes.some(p=>String(id).startsWith(p)))return false;
 return true;
}
// Converte fontes de torrent (infoHash) em magnet aberto em player externo.
function magnetFromStream(s){
 if(!s?.infoHash)return "";
 const browserTrackers=["wss://tracker.openwebtorrent.com","wss://tracker.webtorrent.dev"];
 const sourceTrackers=(Array.isArray(s.sources)?s.sources:[]).filter(x=>typeof x==="string"&&x.startsWith("tracker:")).map(x=>x.slice(8));
 const trackers=[...new Set([...sourceTrackers,...browserTrackers])].map(x=>"&tr="+encodeURIComponent(x));
 const dht=(Array.isArray(s.sources)?s.sources:[]).filter(x=>typeof x==="string"&&x.startsWith("dht:")).length?"":"";
 const dn=encodeURIComponent(String(s.title||s.name||s.behaviorHints?.filename||s.infoHash).split("\n")[0]);
 return `magnet:?xt=urn:btih:${String(s.infoHash).toLowerCase()}&dn=${dn}${trackers.slice(0,12).join("")}${dht}`;
}
function openExternalSource(url){
 if(!url)return;
 try{
  const a=document.createElement("a");a.href=url;a.target="_blank";a.rel="noopener noreferrer";
  document.body.appendChild(a);a.click();a.remove();
 }catch{window.open(url,"_blank","noopener,noreferrer")}
}
async function getCatalog(manifest,type,id,params=""){
  const key=[manifest,type,id,normalizeExtra(params)].join("|");
  if(S.catalogCache.has(key))return S.catalogCache.get(key);
  const p=getJSONTimeout(catalogURLFor(manifest,type,id,params),6000).then(x=>x.metas||[]).catch(e=>{S.catalogCache.delete(key);throw e});
  S.catalogCache.set(key,p);return p;
}

let listMemory=null,historyMemory=null,sourceStatsMemory=null,seriesPrefsMemory=null,introProfilesMemory=null;
function lists(){
 if(listMemory)return listMemory;
 try{return listMemory=JSON.parse(localStorage.getItem("cf2_list")||"[]")}catch{return listMemory=[]}
}
function history(){
 if(historyMemory)return historyMemory;
 try{return historyMemory=JSON.parse(localStorage.getItem("cf2_history")||"[]")}catch{return historyMemory=[]}
}
function saveList(a){listMemory=a;localStorage.setItem("cf2_list",JSON.stringify(a))}
function saveHistory(a){historyMemory=a.slice(0,40);localStorage.setItem("cf2_history",JSON.stringify(historyMemory))}
function historyKey(type,rootId){return `${type||"movie"}|${rootId||""}`}
function getHistoryEntry(key){return history().find(x=>(x.key||historyKey(x.type,x.rootId||x.id))===key)}
function removeHistory(key){
 const a=history().filter(x=>(x.key||historyKey(x.type,x.rootId||x.id))!==key);
 saveHistory(a);
}
function streamIdentity(s){
 if(!s)return null;
 return {
  manifest:s._manifest||"",
  addon:s._addon||"",
  name:s.name||s.title||"",
  title:s.title||"",
  quality:s._quality||getQuality(s),
  index:Number.isInteger(s._idx)?s._idx:null,
  provider:detectProvider(s),
  url:s.url||"",
  infoHash:s.infoHash||"",
  torrent:!!s._torrent
 };
}
function compactMeta(m){
 if(!m)return {};
 return {
  id:m.id,type:m.type,name:m.name||m.title||"",title:m.title||"",
  poster:m.poster||"",background:m.background||"",year:m.year||"",
  season:m.season,episode:m.episode
 };
}
function sourceStats(){
 if(sourceStatsMemory)return sourceStatsMemory;
 try{return sourceStatsMemory=JSON.parse(localStorage.getItem("cf11_source_stats")||"{}")}catch{return sourceStatsMemory={}}
}
function saveSourceStats(x){sourceStatsMemory=x;localStorage.setItem("cf11_source_stats",JSON.stringify(x))}
function seriesSourcePrefs(){
 if(seriesPrefsMemory)return seriesPrefsMemory;
 try{return seriesPrefsMemory=JSON.parse(localStorage.getItem("cf11_series_source_prefs")||"{}")}catch{return seriesPrefsMemory={}}
}
function saveSeriesSourcePrefs(x){seriesPrefsMemory=x;localStorage.setItem("cf11_series_source_prefs",JSON.stringify(x))}
function introProfiles(){
 if(introProfilesMemory)return introProfilesMemory;
 try{return introProfilesMemory=JSON.parse(localStorage.getItem("cf11_intro_profiles")||"{}")}catch{return introProfilesMemory={}}
}
function saveIntroProfiles(x){introProfilesMemory=x;localStorage.setItem("cf11_intro_profiles",JSON.stringify(x))}
function currentSeasonNumber(){
 return Number(S.currentEpisode?.season??S.streamMeta?.season??0)||0;
}
function sourcePrefKey(rootId=S.currentShow?.id||S.rootId,season=currentSeasonNumber()){
 return `${rootId||"unknown"}|${season||0}`;
}
function introProfileKey(rootId=S.currentShow?.id||S.rootId,season=currentSeasonNumber()){
 return `${rootId||"unknown"}|${season||0}`;
}
function getIntroProfile(){
 return introProfiles()[introProfileKey()]||null;
}
function saveIntroProfile(profile){
 const all=introProfiles(),key=introProfileKey();
 all[key]={...profile,updatedAt:Date.now()};
 saveIntroProfiles(all);
 return all[key];
}
function forgetIntroProfile(){
 const all=introProfiles(),key=introProfileKey();
 delete all[key];saveIntroProfiles(all);
}
function detectProvider(s){
 const text=[s?.name,s?.title,s?.description,...streamLines(s||{})].filter(Boolean).join(" ").toLowerCase();
 const known=[
  ["RedeFlix",/(rede\s*flix|redeflix|redflix)/i],
  ["CDMovieDB",/(cd\s*movie\s*db|cdmoviedb)/i],
  ["MyEmbed",/my\s*embed|myembed/i],
  ["Tomato",/\btomato\b/i],
  ["AniZone",/anizone|ani\s*zone/i],
  ["SvenTank",/sventank|sven\s*tank/i],
  ["HJA",/\bhja\b/i],
  ["IPTV",/\biptv\b/i]
 ];
 for(const [name,re] of known)if(re.test(text))return name;
 return s?._addon||"Fonte";
}
function sourceKey(s){
 return `${s?._manifest||""}|${s?._idx??""}|${s?._quality||""}|${detectProvider(s)}|${s?.name||s?.title||""}`;
}
function sourceStatKey(s){
 return `${s?._manifest||""}|${detectProvider(s)}|${s?._quality||"Outro"}`;
}
function healthOf(s){return S.sourceHealth.get(sourceKey(s))||""}
function setHealth(s,status,reason=""){
 if(!s)return;
 S.sourceHealth.set(sourceKey(s),{status,reason,at:Date.now()});
 const patched=patchSourceCardHealth(s);
 if(!patched||status!=="testing")scheduleSourceUIRender();
}
function getHealthStatus(s){return healthOf(s)?.status||""}
function rememberSourceResult(s,ok,reason=""){
 if(!s)return;
 const stats=sourceStats(),key=sourceStatKey(s),old=stats[key]||{};
 stats[key]={
  ...old,
  success:Number(old.success||0)+(ok?1:0),
  fail:Number(old.fail||0)+(ok?0:1),
  lastSuccess:ok?Date.now():Number(old.lastSuccess||0),
  lastFail:ok?Number(old.lastFail||0):Date.now(),
  reason:ok?"":reason
 };
 saveSourceStats(stats);
 if(ok&&S.playType==="series"){
  const prefs=seriesSourcePrefs();
  const identity={...streamIdentity(s),provider:detectProvider(s),lastSuccess:Date.now()};
  prefs[sourcePrefKey()]=identity;
  // Também salva uma preferência geral da série, útil quando muda de temporada.
  prefs[`${S.currentShow?.id||S.rootId}|0`]=identity;
  saveSeriesSourcePrefs(prefs);
 }
}
function preferredSeriesSource(){
 const prefs=seriesSourcePrefs();
 return prefs[sourcePrefKey()]||prefs[`${S.currentShow?.id||S.rootId}|0`]||null;
}
function rememberSourceStall(s,durationMs){
 if(!s||durationMs<1800)return;
 const stats=sourceStats(),key=sourceStatKey(s),old=stats[key]||{};
 const severe=durationMs>=5500;
 stats[key]={
  ...old,
  stalls:Number(old.stalls||0)+1,
  severeStalls:Number(old.severeStalls||0)+(severe?1:0),
  lastStall:Date.now(),
  lastStallDuration:Math.round(durationMs)
 };
 saveSourceStats(stats);
}
function recentSourceInstability(s){
 const st=sourceStats()[sourceStatKey(s)]||{},now=Date.now();
 let penalty=Math.min(105,Number(st.stalls||0)*7+Number(st.severeStalls||0)*18);
 if(st.lastStall&&now-Number(st.lastStall)<2*3600e3)penalty+=48;
 if(st.lastStall&&now-Number(st.lastStall)>7*864e5)penalty=Math.round(penalty*.25);
 return penalty;
}

/* ---- v42: garante que os addons recebam o ID IMDb correto ---- */
const RF_ID_CACHE=new Map();
function isImdbId(x){return /^tt\d+/i.test(String(x||""))}
async function resolveStreamId(type,id,meta){
 const raw=String(id||"");
 if(!raw)return raw;
 const parts=raw.split(":");
 const base=parts[0],suffix=parts.slice(1).join(":");
 if(isImdbId(base))return raw;
 if(RF_ID_CACHE.has(base))return [RF_ID_CACHE.get(base),suffix].filter(Boolean).join(":");
 let out=base;
 const direct=meta&&(meta.imdb_id||meta.imdbId);
 if(isImdbId(direct))out=direct;
 else{
  try{
   const d=await getJSONTimeout(metaURL(type,base),3000);
   const m=(d&&(d.meta||d))||{};
   if(isImdbId(m.imdb_id))out=m.imdb_id;
  }catch(_){}
 }
 RF_ID_CACHE.set(base,out);
 return [out,suffix].filter(Boolean).join(":");
}
function normTitleText(t){
 return String(t||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
}
/* Conservador: só marca quando o texto traz um ANO claramente diferente
   e nenhuma palavra relevante do título bate. Evita falso positivo com
   títulos traduzidos (ex.: Interstellar -> Interestelar). */
function streamLooksMismatched(s,meta,type){
 try{
  if(!meta||type==="series")return false;
  const want=normTitleText(meta.name);if(!want)return false;
  const txt=normTitleText([s.name,s.title,s.description].filter(Boolean).join(" "));
  if(!txt)return false;
  const year=Number(String(meta.year||"").slice(0,4));
  if(!year)return false;
  const years=[...txt.matchAll(/\b(?:19|20)\d{2}\b/g)].map(m=>Number(m[0]));
  if(!years.length||years.some(y=>Math.abs(y-year)<=1))return false;
  const words=want.split(" ").filter(w=>w.length>3);
  if(!words.length)return false;
  const hit=words.filter(w=>txt.includes(w)).length/words.length;
  return hit<0.5;
 }catch(_){return false}
}
function sourceReliabilityScore(s,resumeEntry=null){
 const qualityPreference={"1080p":150,"4K":120,"1440p":100,"720p":45,"576p":24,"480p":14,"360p":6,"Outro":0};
 let score=qualityPreference[s._quality]??0;
 const provider=detectProvider(s);
 const pref=preferredSeriesSource();
 const carry=resumeEntry?.stream||null;
 const stats=sourceStats()[sourceStatKey(s)]||{};
 const now=Date.now();

 if(carry){
  if(carry.url&&carry.url===s.url)score+=220;
  if(carry.manifest&&carry.manifest===s._manifest)score+=45;
  if(carry.provider&&carry.provider===provider)score+=120;
  if(carry.index===s._idx)score+=35;
  if(carry.quality&&carry.quality===s._quality)score+=30;
 }
 if(pref){
  if(pref.provider===provider)score+=60;
  if(pref.manifest===s._manifest)score+=22;
  if(pref.quality===s._quality)score+=18;
  if(pref.index===s._idx)score+=8;
 }
 score+=Math.min(70,Number(stats.success||0)*14);
 if(stats.lastSuccess&&now-stats.lastSuccess<7*864e5)score+=45;
 if(stats.lastFail&&now-stats.lastFail<6*3600e3)score-=90;
 score-=Math.min(100,Number(stats.fail||0)*18);
 score-=recentSourceInstability(s);
 if(S.primaryManifest&&s._manifest===S.primaryManifest)score+=35;
 score+=configuredManifestPriority(s._manifest);
 if(s._torrent)score-=260;
 if(s._external)score-=500;
 if(s._mismatch)score-=900;
 return score;
}
function rankedPlayableStreams(streams,resumeEntry=null,{includeTorrent=false}={}){
 return streams.filter(s=>!s._external&&!s._mismatch&&(s.url||(includeTorrent&&s._torrent))&&(includeTorrent||!s._torrent)).slice().sort((a,b)=>sourceReliabilityScore(b,resumeEntry)-sourceReliabilityScore(a,resumeEntry));
}
function diversePlayableStreams(streams,resumeEntry=null){
 const ranked=rankedPlayableStreams(streams,resumeEntry),first=[],rest=[],seen=new Set();
 for(const stream of ranked){
  if(!seen.has(stream._manifest)){seen.add(stream._manifest);first.push(stream)}
  else rest.push(stream);
 }
 return [...first,...rest];
}


function card(m){
 const key=historyKey(m.type||"movie",m._rootId||m.id);
 const h=m._continue?getHistoryEntry(m._historyKey||key):history().find(x=>(x.key||historyKey(x.type,x.rootId||x.id))===key);
 const saved=lists().some(x=>x.id===m.id&&String(x.type||"movie")===String(m.type||"movie"));
 S.itemCache.set(`${m.type||"movie"}|${m.id}`,m);
 const remaining=h?.currentTime?formatTime(h.currentTime):"";
 return `<article class="card" data-id="${esc(m.id)}" data-type="${esc(m.type||"movie")}" ${m._continue?`data-continue-key="${esc(m._historyKey||key)}"`:""}>
   <div class="poster">${m.poster?`<img class="posterImg" src="${esc(m.poster)}" alt="${esc(m.name||"")}" loading="lazy" decoding="async" fetchpriority="low">`:""}</div>
   ${m.imdbRating?`<div class="rating">★ ${esc(m.imdbRating)}</div>`:""}
   <button class="plus ${saved?"saved":""}" data-plus="${esc(m.id)}" data-type="${esc(m.type||"movie")}" title="${saved?"Remover da minha lista":"Adicionar à minha lista"}">${saved?"✓":"+"}</button>
   ${m._continue?`<button class="continueRemove" data-remove-continue="${esc(m._historyKey||key)}" title="Remover de Continuar assistindo">✕</button>`:""}
   ${m._continue&&remaining?`<div class="resumeBadge">▶ ${esc(remaining)}</div>`:""}
   <div class="cardInfo"><div class="title">${esc(m.name||"Sem título")}</div><div class="sub">${esc(m.year||"")} • ${isAnimeLike(m)?"Anime":(m.type==="series"?"Série":"Filme")}</div>${m._continue&&h?.stream?.addon?`<div class="resumeSource">Última fonte: ${esc(h.stream.addon)}${h.stream.quality?` • ${esc(h.stream.quality)}`:""}</div>`:(m._catalogSource?`<div class="sourceMark">${esc(m._catalogSource)}</div>`:"")}</div>
   ${h?`<div class="bar"><i style="width:${Math.min(100,Math.max(0,h.progress||0))}%"></i></div>`:""}
 </article>`
}

function top10Card(m, index){
 const rank = index + 1;
 const key = historyKey(m.type||"movie", m._rootId||m.id);
 S.itemCache.set(`${m.type||"movie"}|${m.id}`, m);
 const saved = lists().some(x=>x.id===m.id&&String(x.type||"movie")===String(m.type||"movie"));
 return `<article class="top10Card" data-id="${esc(m.id)}" data-type="${esc(m.type||"movie")}">
   <div class="top10Number" aria-hidden="true">${rank}</div>
   <div class="top10PosterWrap">
     ${m.poster?`<img class="posterImg" src="${esc(m.poster)}" alt="${esc(m.name||"")}" loading="lazy" decoding="async" fetchpriority="low">`:""}
     <div class="top10Badge">TOP ${rank}</div>
     ${m.imdbRating?`<div class="rating">★ ${esc(m.imdbRating)}</div>`:""}
     <button class="plus ${saved?"saved":""}" data-plus="${esc(m.id)}" data-type="${esc(m.type||"movie")}" title="${saved?"Remover da minha lista":"Adicionar à minha lista"}">${saved?"✓":"+"}</button>
   </div>
 </article>`;
}

function top10Row(title, items, sub="Top 10 no Brasil hoje", opts={}){
 const slice = (items||[]).slice(0, 10);
 if(!slice.length) return "";
 return `<section class="section top10Section" ${opts.key?`data-section="${esc(opts.key)}"`:""} aria-label="${esc(title)}">
   <div class="sectionHead">
     <div class="sectionHeadText">
       <div class="sectionTitle">${esc(title)}</div>
       <div class="sectionSub">${esc(sub||"")}</div>
     </div>
     <div class="carouselControls" aria-label="Navegar em ${esc(title)}">
       <button type="button" class="carouselArrow" data-carousel-dir="-1" aria-label="Ver itens anteriores">‹</button>
       <button type="button" class="carouselArrow" data-carousel-dir="1" aria-label="Ver próximos itens">›</button>
     </div>
   </div>
   <div class="top10Row" data-carousel tabindex="0" aria-label="${esc(title)}; deslize para ver o Top 10">${slice.map(top10Card).join("")}</div>
 </section>`;
}

function animateListButton(btn,added){
 if(!btn)return;
 btn.textContent=added?"✓":"+";
 btn.classList.toggle("saved",added);
 btn.title=added?"Remover da minha lista":"Adicionar à minha lista";
 btn.classList.remove("listPop");void btn.offsetWidth;btn.classList.add("listPop");
 const card=btn.closest(".card, .top10Card");if(card){card.classList.remove("listPulse");void card.offsetWidth;card.classList.add("listPulse")}
}
function bindCards(root){
 root.querySelectorAll(".card, .top10Card").forEach(c=>c.onclick=e=>{
   if(c._suppressClick){c._suppressClick=false;return}
   if(e.target.closest("[data-plus]")||e.target.closest("[data-remove-continue]"))return;
   const continueKey=c.dataset.continueKey;
   if(continueKey){resumeFromHistoryKey(continueKey);return}
   openDetails(c.dataset.type,c.dataset.id)
 });
 root.querySelectorAll("[data-plus]").forEach(b=>b.onclick=e=>{
   e.stopPropagation();toggleListById(b.dataset.plus,b.dataset.type,b)
 });
 root.querySelectorAll("[data-remove-continue]").forEach(b=>b.onclick=e=>{
   e.stopPropagation();
   const card=b.closest(".card"),key=b.dataset.removeContinue;
   if(card){card.classList.add("removing");setTimeout(()=>{removeHistory(key);card.remove();refreshContinueSectionState()},360)}
   else removeHistory(key);
   toast("Removido de Continuar assistindo.");
 });
 root.querySelectorAll(".card").forEach(c=>{
   c.onmouseenter=()=>schedulePreview(c);
   c.onmouseleave=()=>cancelPreview();
   let pressTimer=null,start=null;
   c.ontouchstart=e=>{
    clearTimeout(pressTimer);c._longPress=false;
    const t=e.touches[0];start={x:t.clientX,y:t.clientY};
    pressTimer=setTimeout(()=>{
     c._longPress=true;
     if(navigator.vibrate)try{navigator.vibrate(8)}catch{}
     showCardPreview(c);
    },420);
   };
   c.ontouchmove=e=>{
    if(!start)return;const t=e.touches[0];
    if(Math.abs(t.clientX-start.x)>10||Math.abs(t.clientY-start.y)>10)clearTimeout(pressTimer);
   };
   const endTouch=()=>{
    clearTimeout(pressTimer);
    if(c._longPress){hideCardPreview();c._suppressClick=true;setTimeout(()=>{c._suppressClick=false},300)}
    c._longPress=false;start=null;
   };
   c.ontouchend=endTouch;
   c.ontouchcancel=endTouch;
 });
}
let previewTimer=null,previewHideTimer=null,previewToken=0;
function schedulePreview(cardEl){
 if(!$("#cardPreview"))return;
 if(!window.matchMedia||!window.matchMedia("(hover:hover) and (pointer:fine)").matches)return;
 if(document.body.classList.contains("fastScrolling")||document.body.classList.contains("playerOpen"))return;
 clearTimeout(previewTimer);clearTimeout(previewHideTimer);
 previewTimer=setTimeout(()=>showCardPreview(cardEl),750);
}
function cancelPreview(){
 clearTimeout(previewTimer);
 clearTimeout(previewHideTimer);
 previewHideTimer=setTimeout(hideCardPreview,120);
}
function positionCardPreview(box,rect){
 const margin=10,vw=innerWidth,vh=innerHeight,isTouch=!(window.matchMedia&&window.matchMedia("(hover:hover) and (pointer:fine)").matches);
 if(isTouch)return;
 const width=Math.min(340,vw-2*margin);
 box.style.width=width+"px";
 let left=rect.left+rect.width/2-width/2;
 left=Math.max(margin,Math.min(left,vw-width-margin));
 let top=rect.top-16;
 if(top<margin)top=Math.min(rect.bottom+10,vh-margin-160);
 box.style.left=left+"px";
 box.style.top=Math.max(margin,top)+"px";
}
function renderCardPreviewContent(m){
 const img=$("#cardPreviewImg");
 img.src=m.background||m.poster||"";
 $("#cardPreviewTitle").textContent=m.name||"";
 const anime=isAnimeLike(m);
 const bits=[m.year,m.imdbRating?`★ ${m.imdbRating}`:"",anime?"Anime":(m.type==="series"?"Série":"Filme")].filter(Boolean);
 $("#cardPreviewMeta").textContent=bits.join(" • ");
 $("#cardPreviewDesc").textContent=m.description||"";
}
function showCardPreview(cardEl){
 clearTimeout(previewHideTimer);
 const type=cardEl.dataset.type,id=cardEl.dataset.id;
 if(!type||!id)return;
 const token=++previewToken;
 const box=$("#cardPreview");
 if(!box)return;
 positionCardPreview(box,cardEl.getBoundingClientRect());
 const cached=S.itemCache.get(`${type}|${id}`)||{id,type,name:cardEl.querySelector(".title")?.textContent||""};
 renderCardPreviewContent(cached);
 $("#cardPreviewVideoWrap").innerHTML="";
 box.classList.add("show");box.setAttribute("aria-hidden","false");
 fetchPreviewMeta(type,id,token);
}
async function fetchPreviewMeta(type,id,token){
 try{
  let m=S.itemCache.get(`${type}|${id}`);
  if(!m||!("description" in m)){
   const d=await getJSON(metaURL(type,id));
   m=d.meta||d;
   S.itemCache.set(`${type}|${id}`,m);
  }
  if(token!==previewToken||!$("#cardPreview").classList.contains("show"))return;
  renderCardPreviewContent(m);
  const trailer=(m.trailers||[]).find(t=>t&&t.source);
  if(trailer){
   $("#cardPreviewVideoWrap").innerHTML=`<iframe src="https://www.youtube.com/embed/${esc(trailer.source)}?autoplay=1&mute=0&controls=0&modestbranding=1&rel=0&playsinline=1&loop=1&playlist=${esc(trailer.source)}&hl=pt-BR&cc_lang_pref=pt&cc_load_policy=1&enablejsapi=1&origin=${encodeURIComponent(location.origin)}" allow="autoplay; encrypted-media" frameborder="0" title="Trailer"></iframe>`;
   const frame=$("#cardPreviewVideoWrap iframe");
   if(frame)attachYouTubePreviewVolume(frame,SITE_DEFAULT_VOLUME_PCT);
  }
 }catch{}
}
function hideCardPreview(){
 const box=$("#cardPreview");
 if(!box||!box.classList.contains("show"))return;
 box.classList.remove("show");box.setAttribute("aria-hidden","true");
 $("#cardPreviewVideoWrap").innerHTML="";
 previewToken++;
}
function refreshContinueSectionState(){
 const section=document.querySelector('[data-section="continue"]');
 if(section&&!section.querySelector(".card")){
  section.classList.add("removing");
  setTimeout(()=>section.remove(),350)
 }
}
function toggleListById(id,type,btn){
 let a=lists();let i=a.findIndex(x=>x.id===id&&String(x.type||"movie")===String(type||"movie"));
 let added=false;
 if(i>=0){
  a.splice(i,1);toast("Removido da minha lista.");
 }else{
  const m=S.itemCache.get(`${type||"movie"}|${id}`)||S.current?.id===id&&S.current||{id,type:type||"movie"};
  a.unshift(m);added=true;toast("Adicionado à minha lista.");
 }
 saveList(a);animateListButton(btn,added);
 if(S.current?.id===id)updateDetailListButton(S.current);
 if(S.currentPage==="list"&&!added)setTimeout(()=>{S.pageItems=lists();renderMyListWorkspace(S.pageItems)},280);
}
function updateDetailListButton(m){
 const added=lists().some(x=>x.id===m.id&&String(x.type||"movie")===String(m.type||"movie"));
 const b=$("#detailList");if(!b)return;
 b.textContent=added?"✓":"＋";
 b.dataset.saved=added?"1":"0";
 b.title=added?"Remover da minha lista":"Adicionar à minha lista";
 b.setAttribute("aria-label",b.title)
}

function row(title,items,sub="",opts={}){
 if(!items?.length)return "";
 return `<section class="section" ${opts.key?`data-section="${esc(opts.key)}"`:""} aria-label="${esc(title)}"><div class="sectionHead"><div class="sectionHeadText"><div class="sectionTitle">${esc(title)}</div><div class="sectionSub">${esc(sub||"")}</div></div><div class="carouselControls" aria-label="Navegar em ${esc(title)}"><button type="button" class="carouselArrow" data-carousel-dir="-1" aria-label="Ver itens anteriores">‹</button><button type="button" class="carouselArrow" data-carousel-dir="1" aria-label="Ver próximos itens">›</button></div></div><div class="row" data-carousel tabindex="0" aria-label="${esc(title)}; deslize para ver mais">${items.map(card).join("")}</div></section>`
}

const carouselControlFrames=new WeakMap();
function scheduleCarouselControls(scroller){
 if(!scroller||carouselControlFrames.has(scroller))return;
 const frame=requestAnimationFrame(()=>{carouselControlFrames.delete(scroller);updateCarouselControls(scroller)});
 carouselControlFrames.set(scroller,frame);
}
const carouselResizeObserver=typeof ResizeObserver==="function"?new ResizeObserver(entries=>entries.forEach(entry=>scheduleCarouselControls(entry.target))):null;
function updateCarouselControls(scroller){
 if(!scroller)return;
 const section=scroller.closest(".section,.globalSearchSection"),max=Math.max(0,scroller.scrollWidth-scroller.clientWidth),slack=3;
 if(!section)return;
 const previous=section.querySelector('[data-carousel-dir="-1"]'),next=section.querySelector('[data-carousel-dir="1"]');
 if(previous)previous.disabled=max<=slack||scroller.scrollLeft<=slack;
 if(next)next.disabled=max<=slack||scroller.scrollLeft>=max-slack;
}
function initCarousels(root=document){
 const carousels=[];
 if(root?.matches?.("[data-carousel]"))carousels.push(root);
 root?.querySelectorAll?.("[data-carousel]").forEach(scroller=>carousels.push(scroller));
 carousels.forEach(scroller=>{
  if(scroller.dataset.carouselReady!=="1"){
   scroller.dataset.carouselReady="1";
   scroller.addEventListener("scroll",()=>scheduleCarouselControls(scroller),{passive:true});
   scroller.addEventListener("keydown",e=>{
    if(e.key!=="ArrowLeft"&&e.key!=="ArrowRight")return;
    e.preventDefault();scrollCarousel(scroller,e.key==="ArrowLeft"?-1:1);
   });
   carouselResizeObserver?.observe(scroller);
  }
  scheduleCarouselControls(scroller);
 });
}
function scrollCarousel(scroller,direction){
 if(!scroller)return;
 const distance=Math.max(220,Math.round(scroller.clientWidth*.82));
 const reduceMotion=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
 scroller.scrollBy({left:distance*Number(direction||1),behavior:reduceMotion?"auto":"smooth"});
 scheduleCarouselControls(scroller);
}
document.addEventListener("click",e=>{
 const button=e.target.closest("[data-carousel-dir]");if(!button)return;
 const scroller=button.closest(".section,.globalSearchSection")?.querySelector("[data-carousel]");
 scrollCarousel(scroller,button.dataset.carouselDir);
});


function refreshBucket(hours=4){return Math.floor(Date.now()/(hours*3600000))}
function stableHash(text){let h=2166136261;for(const ch of String(text)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function seededShuffle(items,seedText){const a=[...items],seed=stableHash(seedText);let x=seed||1;const rnd=()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296};for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function addCatalogSkip(params,skip){if(!skip)return params;if(!params)return{skip};if(typeof params==="string")return params+(params?"&":"")+`skip=${skip}`;return{...params,skip}}
const FRESH_PAGE_CACHE=new Map();
async function freshCatalog(type,id="top",params="",manifest=cfg.meta,salt=""){
 const bucket=refreshBucket(3),page=stableHash(`${bucket}|${type}|${id}|${salt}`)%4,skip=page*20;
 const cacheKey=`${manifest}|${type}|${id}|${JSON.stringify(params)}|${skip}`;
 const warm=FRESH_PAGE_CACHE.get(cacheKey);
 if(warm?.length)return seededShuffle(warm,`${bucket}|${salt}|${type}|${id}|warm`);
 const base=await safeCatalog(type,id,params,manifest);
 if(skip&&connectionAllowsPrefetch()){
  runWhenIdle(()=>Promise.resolve(safeCatalog(type,id,addCatalogSkip(params,skip),manifest)).then(items=>{
   if(items?.length)FRESH_PAGE_CACHE.set(cacheKey,items);
  }).catch(()=>{}));
 }
 return seededShuffle(base,`${bucket}|${salt}|${type}|${id}`);
}
function rotateFresh(items,salt=""){return items?.length?seededShuffle(items,`${refreshBucket(4)}|${salt}`):[]}
async function safeCatalog(type,id="top",params="",manifest=cfg.meta){
 try{return await getCatalog(manifest,type,id,params)}catch(e){console.warn("catalog",e);return[]}
}
function catalogSupportsSearch(c){
 return Array.isArray(c?.extra)&&c.extra.some(x=>(typeof x==="string"?x:x?.name)==="search");
}
function catalogNeedsOtherRequiredExtra(c){
 return Array.isArray(c?.extra)&&c.extra.some(x=>typeof x==="object"&&x?.isRequired===true&&x?.name!=="search");
}
function cleanMeta(m,sourceName){
 if(!m||!m.id||!m.name)return null;
 return {...m,type:m.type||"movie",_catalogSource:sourceName||m._catalogSource||""};
}
function dedupeMetas(items){
 const map=new Map();
 for(const raw of items){
  const m=raw&&cleanMeta(raw,raw._catalogSource);if(!m)continue;
  const key=`${m.type}|${m.id}`;
  if(!map.has(key))map.set(key,m);
  else{
   const old=map.get(key);
   map.set(key,{...old,...m,poster:m.poster||old.poster,background:m.background||old.background,description:m.description||old.description,_catalogSource:[old._catalogSource,m._catalogSource].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(" + ")});
  }
 }
 return [...map.values()];
}
function normText(s){return String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim()}
function searchScore(m,q){
 const n=normText(m.name),x=normText(q);
 if(n===x)return 1000;
 if(n.startsWith(x))return 800;
 if(n.split(/\s+/).some(w=>w.startsWith(x)))return 650;
 if(n.includes(x))return 500;
 const tokens=x.split(/\s+/).filter(Boolean);
 const hits=tokens.filter(t=>n.includes(t)).length;
 return hits*80+(Number(m.imdbRating)||0);
}
function isAnimeLike(m){
 const g=(m.genres||[]).map(normText).join(" ");
 return g.includes("anime")||g.includes("animation")||g.includes("animacao");
}
let catalogDefinitionsPromise=null;
async function catalogDefinitions(){
 if(catalogDefinitionsPromise)return catalogDefinitionsPromise;
 catalogDefinitionsPromise=Promise.allSettled(configuredCatalogManifests().map(async manifestUrl=>({manifestUrl,mf:await getManifest(manifestUrl)}))).then(results=>{
  const defs=[];
  for(const result of results){
   if(result.status!=="fulfilled"){console.warn("manifest",result.reason);continue}
   const{manifestUrl,mf}=result.value,name=mf.name||new URL(manifestUrl).hostname;
   for(const c of (mf.catalogs||[])){
    if(!["movie","series"].includes(c.type)||catalogNeedsOtherRequiredExtra(c))continue;
    defs.push({manifestUrl,manifest:mf,sourceName:name,catalog:c});
   }
  }
  return defs
 }).catch(e=>{catalogDefinitionsPromise=null;throw e});
 return catalogDefinitionsPromise
}
async function runSearchCatalogs(defs,q){
 const jobs=defs.slice(0,4).map(async d=>(await safeCatalog(d.catalog.type,d.catalog.id,{search:q},d.manifestUrl)).map(m=>cleanMeta(m,d.sourceName)).filter(Boolean));
 const settled=await Promise.allSettled(jobs);
 return dedupeMetas(settled.flatMap(r=>r.status==="fulfilled"?r.value:[])).sort((a,b)=>searchScore(b,q)-searchScore(a,q))
}
async function searchAllCatalogs(q){
 const defs=await catalogDefinitions();
 // O TMDB configurado em pt-BR é a única busca principal. Catálogos sem suporte a
 // search não são mais baixados inteiros a cada tecla digitada.
 const localized=defs.filter(d=>d.manifestUrl===TMDB_PTBR_MANIFEST&&catalogSupportsSearch(d.catalog));
 const localizedItems=await runSearchCatalogs(localized,q);
 if(localizedItems.length)return localizedItems;
 const fallback=["movie","series"].map(type=>({manifestUrl:CINEMETA_MANIFEST,sourceName:"Cinemeta",catalog:{type,id:"top",extra:[{name:"search"}]}}));
 return runSearchCatalogs(fallback,q)
}
const STREAMING_CATALOG_LABELS=new Map([
 ["netflix","Netflix"],["hbo max","Max"],["disney plus","Disney+"],
 ["amazon prime","Prime Video"],["apple tv plus","Apple TV+"]
]);
function streamingCatalogLabel(value){const text=String(value||"");for(const[key,label]of STREAMING_CATALOG_LABELS)if(normText(text).includes(key))return label;return text||"Streaming"}
async function externalCatalogRows(){
 const available=(await catalogDefinitions()).filter(d=>d.manifestUrl===STREAMING_CATALOG_MANIFEST&&!catalogNeedsOtherRequiredExtra(d.catalog));
 const defs=[],seen=new Set();
 for(const provider of STREAMING_CATALOG_LABELS.keys()){
  const match=available.find(d=>normText(d.catalog.name||d.catalog.id).includes(provider));
  if(match&&!seen.has(match.catalog.id)){seen.add(match.catalog.id);defs.push(match)}
 }
 if(!defs.length)defs.push(...available.slice(0,5));
 const settled=await Promise.allSettled(defs.map(async d=>{
  const items=rotateFresh((await safeCatalog(d.catalog.type,d.catalog.id,"",d.manifestUrl)).map(m=>cleanMeta(m,d.sourceName)).filter(Boolean),`external-${d.sourceName}-${d.catalog.id}`).slice(0,18);
  return items.length?{title:streamingCatalogLabel(d.catalog.name||d.catalog.id),sub:"Catálogo de streaming",items}:null
 }));
 return settled.flatMap(r=>r.status==="fulfilled"&&r.value?[r.value]:[])
}

function runWhenIdle(fn){
 if("requestIdleCallback" in window)requestIdleCallback(fn,{timeout:1200});
 else setTimeout(fn,80);
}
function connectionAllowsPrefetch(){
 const c=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
 return !c?.saveData&&!/2g/.test(String(c?.effectiveType||""))
}
async function appendExternalHomeRows(){
 if(!connectionAllowsPrefetch())return;
 try{
  const extraRows=await externalCatalogRows();
  if(S.currentPage!=="home"||!extraRows.length)return;
  const host=$("#main");
  const wrapper=document.createElement("div");
  wrapper.innerHTML=extraRows.map(r=>row(r.title,r.items,r.sub)).join("");
  const nodes=[...wrapper.children];
  for(const node of nodes){host.appendChild(node);bindCards(node);initCarousels(node)}
 }catch(e){console.warn("catálogos extras",e)}
}
async function home(){
 S.currentPage="home";S.pageCategory="all";setActiveNav("home");unlockMobileDocument();scrollPageTop();toggleCategoryMega(false);
 $("#page").classList.remove("searchPage","animePageModern","booksPageModern");
 $("#hero").classList.remove("hidden");$("#main").classList.remove("hidden");$("#page").classList.add("hidden");
 $("#main").innerHTML='<div class="row">'+Array.from({length:8},()=>'<div class="skeleton card"></div>').join("")+'</div>';
 try{
  const [movies,series,animeMovies,animeSeries,hist]=await Promise.all([
   freshCatalog("movie","top","",cfg.meta,"home-movies"),
   freshCatalog("series","top","",cfg.meta,"home-series"),
   freshCatalog("movie","top",{genre:"Animation"},cfg.meta,"home-anime-movies"),
   freshCatalog("series","top",{genre:"Animation"},cfg.meta,"home-anime-series"),
   Promise.resolve(history())
  ]);
  if(S.currentPage!=="home")return;
  const continueItems=hist.map(x=>{
   const rootId=x.rootId||x.id;
   const meta=x.rootMeta||x.meta||x;
   return {...meta,id:rootId,type:x.type||meta.type||"movie",name:x.name||meta.name||meta.title||"Sem título",poster:x.poster||meta.poster||"",background:x.background||meta.background||"",year:x.year||meta.year||"",_continue:true,_rootId:rootId,_historyKey:x.key||historyKey(x.type||meta.type,rootId)};
  }).filter(x=>x.poster);
  const featured=movies[0]||series[0];
  if(featured)setHero(featured);

  const allAnime = Array.from(new Map([...animeSeries,...animeMovies].map(x=>[x.id,x])).values());
  const top10Brasil = [...series.slice(0, 5), ...movies.slice(0, 5)];
  const recommended=Array.from(new Map(movies.flatMap((movie,index)=>[movie,series[index]]).filter(Boolean).map(item=>[`${item.type}|${item.id}`,item])).values());

  $("#main").innerHTML=[
   row("Continuar assistindo",continueItems,"Retome exatamente de onde parou",{key:"continue"}),
   top10Row("Top 10 no Brasil hoje", top10Brasil, "Os filmes e séries mais assistidos"),
   row("Escolhas para você",recommended.slice(0,18),"Filmes e séries reunidos como nos grandes streamings"),
   row("Filmes em destaque",movies,"Atualizado automaticamente"),
   row("Séries para maratonar",series,"Temporadas e episódios em sequência"),
   row("Animes em destaque",allAnime,"Animação japonesa e novidades"),
   row("Só mais um filme",movies.slice(8),"Sucessos de audiência"),
   row("Só mais um episódio",series.slice(8),"Continue a maratona")
  ].join("")||'<div class="empty">Nenhum catálogo retornado.</div>';
  bindCards($("#main"));initCarousels($("#main"));
  runWhenIdle(appendExternalHomeRows);
 }catch(e){$("#main").innerHTML='<div class="loading">Não foi possível carregar o catálogo.</div>'}
}
function setHero(m){
 S.hero=m;$("#heroTitle").textContent=m.name||"ResenhaFlix";
 $("#heroMeta").textContent=[m.year,m.imdbRating?`★ ${m.imdbRating}`:"",m.runtime].filter(Boolean).join(" • ");
 $("#heroDesc").textContent=m.description||"Escolha um título para assistir.";
 $("#hero").style.backgroundImage=`url('${m.background||m.poster||""}')`;
}
function detailLikes(){
 try{return JSON.parse(localStorage.getItem("rf28_detail_likes")||"[]")}catch{return[]}
}
function detailLikeKey(m){return `${m?.type||"movie"}|${m?.id||""}`}
function updateDetailLikeButton(m){
 const b=$("#detailLike");if(!b)return;
 const on=detailLikes().includes(detailLikeKey(m));
 b.textContent=on?"♥":"♡";b.dataset.liked=on?"1":"0";b.title=on?"Remover gostei":"Gostei"
}
function toggleDetailLike(m){
 let a=detailLikes(),k=detailLikeKey(m);
 if(a.includes(k))a=a.filter(x=>x!==k);else a.unshift(k);
 localStorage.setItem("rf28_detail_likes",JSON.stringify(a.slice(0,300)));updateDetailLikeButton(m)
}
function detailPeople(m){
 const raw=m?.cast||m?.actors||m?.stars||[];
 return Array.isArray(raw)?raw.filter(Boolean).slice(0,5).join(", "):String(raw||"")
}
function detailSimilarCard(m){
 const bg=m.background||m.poster||"";
 return`<article class="detailSimilarCard" data-similar-type="${esc(m.type||"movie")}" data-similar-id="${esc(m.id)}"><div class="detailSimilarImage" style="background-image:url('${esc(bg)}')"></div><div class="detailSimilarBody"><div class="detailSimilarTitle">${esc(m.name||"Sem título")}</div><div class="detailSimilarSub">${esc(m.year||"")} ${m.imdbRating?`• ★ ${esc(m.imdbRating)}`:""}</div><div class="detailSimilarDesc">${esc(m.description||"")}</div></div></article>`
}
async function renderDetailSimilar(m){
 const root=$("#detailSimilar");if(!root)return;
 root.innerHTML='<div class="loading">Carregando recomendações…</div>';
 try{
  const genre=(m.genres||[])[0]||"";
  let items=await freshCatalog(m.type||"movie","top",genre?{genre}:"",cfg.meta,`detail-${m.id}`);
  items=items.filter(x=>String(x.id)!==String(m.id)).slice(0,9);
  if(!root.isConnected)return;
  root.innerHTML=items.length?items.map(detailSimilarCard).join(""):'<div class="hint">Nenhum título semelhante encontrado agora.</div>';
  $("#detailSimilarMeta").textContent=genre?`Baseado em ${genre}`:"";
  root.querySelectorAll("[data-similar-id]").forEach(c=>c.onclick=()=>openDetails(c.dataset.similarType,c.dataset.similarId))
 }catch{
  root.innerHTML='<div class="hint">Não foi possível carregar títulos semelhantes.</div>'
 }
}
async function openDetails(type,id){
 S.current=null;$("#detailModal").classList.add("open");document.body.classList.add("detailOpen");
 $("#detailTitle").textContent="Carregando…";$("#episodes").innerHTML="";$("#detailSimilar").innerHTML='<div class="loading">Carregando recomendações…</div>';
 try{
  const d=await getJSON(metaURL(type,id));const m=d.meta||d;m.type=type;S.current=m;
  const anime=isAnimeLike(m);
  $("#detailType").textContent="RESENHAFLIX";
  $("#detailTitle").textContent=m.name||"Sem título";
  const heroBits=[m.year,m.runtime,m.imdbRating?`★ ${m.imdbRating}`:"",anime?"ANIME":(type==="series"?"SÉRIE":"FILME")].filter(Boolean);
  $("#detailMeta").innerHTML=heroBits.map((x,i)=>i===heroBits.length-1?`<span class="metaBadge">${esc(x)}</span>`:`<span>${esc(x)}</span>`).join("");
  const match=m.imdbRating?`${Math.min(99,Math.max(70,Math.round(Number(m.imdbRating)*10)))}% relevante`:"Em destaque";
  $("#detailFacts").innerHTML=`<span class="factRating">${esc(match)}</span>${m.year?`<span>${esc(m.year)}</span>`:""}${m.runtime?`<span>${esc(m.runtime)}</span>`:""}<span class="factBadge">HD</span><span class="factBadge">${type==="series"?"SÉRIE":"FILME"}</span>`;
  $("#detailTagline").textContent=anime?"Anime selecionado para você":type==="series"?"Comece agora ou continue de onde parou":"Aperte Assistir e escolha a melhor fonte";
  $("#detailDesc").textContent=m.description||"Sem sinopse disponível.";
  $("#detailCast").textContent=detailPeople(m)||"Não informado";
  $("#detailGenres").textContent=(m.genres||[]).join(", ")||"Não informado";
  $("#detailTraits").textContent=[anime?"Anime":"",...(m.genres||[]).slice(0,3)].filter(Boolean).join(", ")||"Entretenimento";
  $("#detailHero").style.backgroundImage=`url('${m.background||m.poster||""}')`;
  const hist=getHistoryEntry(historyKey(m.type||type,m.id));
  $("#detailWatch").innerHTML=hist?.currentTime>5?'▶ <span>Continuar</span>':'▶ <span>Assistir</span>';
  $("#detailWatch").onclick=()=>playFirst(m);
  updateDetailListButton(m);$("#detailList").onclick=()=>toggleCurrentList(m);
  updateDetailLikeButton(m);$("#detailLike").onclick=()=>toggleDetailLike(m);
  if(type==="series")renderEpisodes(m);else $("#episodes").innerHTML="";
  runWhenIdle(()=>renderDetailSimilar(m))
 }catch(e){
  console.error(e);$("#detailTitle").textContent="Não foi possível carregar";toast("Erro ao buscar os detalhes.")
 }
}

function toggleCurrentList(m){
 let a=lists(),i=a.findIndex(x=>x.id===m.id&&String(x.type||"movie")===String(m.type||"movie"));
 let added=false;
 if(i>=0){a.splice(i,1);toast("Removido da minha lista.")}
 else{a.unshift(m);added=true;toast("Adicionado à minha lista.")}
 saveList(a);updateDetailListButton(m);
 const b=$("#detailList");b.classList.remove("detailListAdded");void b.offsetWidth;b.classList.add("detailListAdded");
 document.querySelectorAll(`.card[data-id="${CSS.escape(m.id)}"][data-type="${CSS.escape(m.type||"movie")}"] [data-plus]`).forEach(btn=>animateListButton(btn,added));
}
const SERIES_EXTRA_TITLE_RE=/(?:official\s+podcast|podcast\s+oficial|after\s*show|behind\s+the\s+scenes|bastidores|making\s+of|featurette|sneak\s+peek|table\s+read|cast\s+interview|entrevista\s+com\s+o\s+elenco|official\s+(?:trailer|teaser)|(?:trailer|teaser)\s+oficial|pr[eé]via\s+oficial|^(?:trailer|teaser)(?:\s+\d+)?$)/i;
function isPromotionalSeriesExtra(video){
 const title=String(video?.title||video?.name||"").trim();
 if(!title)return false;
 return SERIES_EXTRA_TITLE_RE.test(title);
}
function episodeCandidateScore(video){
 let score=isPromotionalSeriesExtra(video)?-1000:1000;
 if(video?.thumbnail||video?.poster)score+=80;
 if(video?.overview||video?.description)score+=20;
 if(video?.released)score+=5;
 return score;
}
function playableSeriesEpisodes(showOrVideos){
 const videos=Array.isArray(showOrVideos)?showOrVideos:(showOrVideos?.videos||showOrVideos?.episodes||[]);
 const bestByNumber=new Map(),withoutNumber=[];
 for(const video of videos){
  if(!video||isPromotionalSeriesExtra(video))continue;
  const season=Number(video.season),episode=Number(video.episode);
  if(!Number.isFinite(season)||!Number.isFinite(episode)||episode<=0){withoutNumber.push(video);continue}
  const key=`${season}:${episode}`,previous=bestByNumber.get(key);
  if(!previous||episodeCandidateScore(video)>episodeCandidateScore(previous))bestByNumber.set(key,video);
 }
 return [...bestByNumber.values(),...withoutNumber].sort((a,b)=>(Number(a.season||1)-Number(b.season||1))||(Number(a.episode||0)-Number(b.episode||0)));
}
function renderEpisodes(m){
 const vids=playableSeriesEpisodes(m);
 if(!vids.length){$("#episodes").innerHTML='<div class="hint">Nenhum episódio retornado pelo catálogo.</div>';return}
 const seasons=[...new Set(vids.map(v=>Number(v.season||1)))].sort((a,b)=>a-b);
 if(!seasons.includes(S.season))S.season=seasons[0];
 const eps=vids.filter(v=>Number(v.season||1)===S.season).sort((a,b)=>(a.episode||0)-(b.episode||0));
 $("#episodes").innerHTML=`<div class="seasons">${seasons.map(s=>`<button class="${s===S.season?"active":""}" data-s="${s}">Temporada ${s}</button>`).join("")}</div>`+
 eps.map(v=>`<div class="ep" data-ep="${esc(v.id)}"><div class="epThumb" style="background-image:url('${esc(v.thumbnail||v.poster||"")}')"></div><div><h4>E${esc(v.episode||"")} — ${esc(v.title||v.name||"Sem título")}</h4><p>${esc(v.overview||v.description||"")}</p></div></div>`).join("");
 $("#episodes").querySelectorAll("[data-s]").forEach(b=>b.onclick=()=>{S.season=Number(b.dataset.s);renderEpisodes(m)});
 $("#episodes").querySelectorAll(".ep").forEach(e=>e.onclick=()=>{const ep=eps.find(x=>String(x.id)===String(e.dataset.ep));if(ep)playEpisode(m,ep)});
}
function renderPlayerEpisodes(){
 const list=$("#playerEpisodesList"),show=S.currentShow;
 if(!list||!show)return;
 const vids=playableSeriesEpisodes(show);
 $("#playerEpisodesSub").textContent=show.name||"";
 if(!vids.length){list.innerHTML='<div class="hint">Nenhum episódio disponível.</div>';return}
 const seasons=[...new Set(vids.map(v=>Number(v.season||1)))].sort((a,b)=>a-b);
 if(!S.playerSeason||!seasons.includes(S.playerSeason))S.playerSeason=Number(S.currentEpisode?.season)||seasons[0];
 const eps=vids.filter(v=>Number(v.season||1)===S.playerSeason).sort((a,b)=>(a.episode||0)-(b.episode||0));
 list.innerHTML=`<div class="seasons">${seasons.map(s=>`<button class="${s===S.playerSeason?"active":""}" data-player-s="${s}">Temporada ${s}</button>`).join("")}</div>`+
 eps.map(v=>`<div class="ep${String(v.id)===String(S.currentEpisode?.id)?" active":""}" data-player-ep="${esc(v.id)}"><div class="epThumb" style="background-image:url('${esc(v.thumbnail||v.poster||"")}')"></div><div><h4>E${esc(v.episode||"")} — ${esc(v.title||v.name||"Sem título")}</h4><p>${esc(v.overview||v.description||"")}</p></div></div>`).join("");
 list.querySelectorAll("[data-player-s]").forEach(b=>b.onclick=()=>{S.playerSeason=Number(b.dataset.playerS);renderPlayerEpisodes()});
 list.querySelectorAll(".ep").forEach(e=>e.onclick=()=>{const ep=eps.find(x=>String(x.id)===String(e.dataset.playerEp));if(ep){persistPlaybackProgress(true);playEpisode(show,ep)}});
}
async function resumeFromHistoryKey(key){
 const entry=getHistoryEntry(key);
 if(!entry)return toast("Esse item não está mais no histórico.");
 try{
  if(entry.type==="series"){
   const d=await getJSON(metaURL("series",entry.rootId||entry.id));
   const show=d.meta||d;
   const vids=playableSeriesEpisodes(show);
   const ep=vids.find(v=>String(v.id)===String(entry.playId))||
            vids.find(v=>Number(v.season)===Number(entry.season)&&Number(v.episode)===Number(entry.episode))||
            vids[0];
   if(!ep)return toast("Não consegui localizar o episódio salvo.");
   playEpisode(show,ep,entry);
  }else{
   let movie=entry.rootMeta||entry.meta||{id:entry.rootId||entry.id,type:"movie",name:entry.name,poster:entry.poster,background:entry.background,year:entry.year};
   try{const d=await getJSON(metaURL("movie",entry.rootId||entry.id));movie=d.meta||d}catch{}
   playStream("movie",entry.rootId||entry.id,movie.name||entry.name,movie,entry);
  }
 }catch(e){console.error(e);toast("Não foi possível retomar este título.")}
}
function playFirst(m){
 const saved=getHistoryEntry(historyKey(m.type,m.id));
 if(saved&&saved.currentTime>5)return resumeFromHistoryKey(saved.key||historyKey(m.type,m.id));
 if(m.type==="series"){const ep=playableSeriesEpisodes(m)[0];if(ep)return playEpisode(m,ep);toast("Nenhum episódio encontrado.");return null}
 return playStream("movie",m.id,m.name,m)
}
function playEpisode(show,ep,resumeEntry=null){
 S.currentShow=show;S.currentEpisode=ep;S.playerSeason=Number(ep.season)||1;
 const ordered=playableSeriesEpisodes(show);
 const idx=ordered.findIndex(x=>String(x.id)===String(ep.id));
 S.nextEpisode=idx>=0&&idx<ordered.length-1?ordered[idx+1]:null;
 $("#nextBtn").style.display=S.nextEpisode?"":"none";
 const episodesButton=$("#episodesBtn");if(episodesButton)episodesButton.style.display=ordered.length>1?"":"none";
 $("#primeNextFloat").classList.toggle("show",!!S.nextEpisode);
 if(S.playerSideTab==="episodios")renderPlayerEpisodes();
 const key=ep.id;
 return playStream("series",key,`${show.name} — T${ep.season} E${ep.episode}`,{...compactMeta(show),...compactMeta(ep),id:ep.id,name:show.name,poster:show.poster,background:show.background,year:show.year},resumeEntry)
}
function formatTime(sec){
 sec=Number(sec)||0;const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=Math.floor(sec%60);
 return h?`${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`:`${m}:${String(s).padStart(2,"0")}`;
}
function getQuality(s){
 const text=[s.name,s.title,s.description,s.behaviorHints?.filename,s.url].filter(Boolean).join(" ");
 const m=text.match(/\b(2160p?|4k|1440p?|1080p?|720p?|576p?|480p?|360p?)\b/i);
 if(!m)return "Outro";
 let q=m[1].toLowerCase();
 if(q==="4k"||q.startsWith("2160"))return "4K";
 if(q.startsWith("1440"))return "1440p";
 if(q.startsWith("1080"))return "1080p";
 if(q.startsWith("720"))return "720p";
 if(q.startsWith("576"))return "576p";
 if(q.startsWith("480"))return "480p";
 if(q.startsWith("360"))return "360p";
 return "Outro";
}
function qualityScore(q){return {"1080p":6,"4K":5,"1440p":4,"720p":3,"576p":2,"480p":1,"360p":0,"Outro":-1}[q]??-1}
function streamLines(s){
 const raw=[s.title,s.description].filter(Boolean).join("\n").replace(/<[^>]*>/g,"");
 return raw.split(/\n+/).map(x=>x.trim()).filter(Boolean).slice(0,5);
}
function isDirectDownloadable(url){
 if(!url||/^(magnet:|blob:)/i.test(url))return false;
 try{
  const p=new URL(url,location.href).pathname.toLowerCase();
  return /\.(mp4|webm|mkv|mov|m4v|avi|mp3|m4a|aac|flac)(\.|$)/i.test(p) || !/\.m3u8(\.|$)/i.test(p);
 }catch{return false}
}
function safeFilename(name,ext="mp4"){
 const n=(name||"video").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^\w\- ]+/g,"").trim().replace(/\s+/g,"-").slice(0,90);
 return `${n||"video"}.${ext}`;
}
function extensionFromUrl(url){
 try{
  const m=new URL(url,location.href).pathname.match(/\.([a-z0-9]{2,5})$/i);
  return m?m[1].toLowerCase():"mp4";
 }catch{return "mp4"}
}
function authorizedDownloadUrl(stream){
 if(!stream?._officialLegal||stream?._torrent)return "";
 const declared=stream.downloadUrl||stream.behaviorHints?.downloadUrl||"";
 const url=safeHttpUrl(declared);
 return url&&isDirectDownloadable(url)?url:""
}
function updatePlayerDownloadButton(stream=S.selectedStream){
 const button=$("#downloadCurrent");if(!button)return;
 const available=!!authorizedDownloadUrl(stream);
 button.disabled=!available;button.setAttribute("aria-disabled",String(!available));
 button.title=available?"Baixar arquivo autorizado":"Download indisponível nesta fonte"
}
function browserDownload(stream){
 const url=authorizedDownloadUrl(stream);
 if(!url)return toast("Esta fonte não declarou um arquivo direto autorizado para download.");
 const a=document.createElement("a");
 a.href=url;a.download=safeFilename(S.streamTitle,extensionFromUrl(url));
 a.target="_blank";a.rel="noopener noreferrer";document.body.appendChild(a);a.click();a.remove();
 toast("Download autorizado enviado ao navegador.");
}
function quickAddonName(manifest,index){
 if(S.addonNameCache.has(manifest))return S.addonNameCache.get(manifest);
 const low=String(manifest).toLowerCase();let name="";
 if(low.includes("bestcine"))name="BestCine";
 else if(low.includes("froststream"))name="FrostStream";
 else if(low.includes("fenixflix"))name="FenixFlix";
 else if(low.includes("watchhub"))name="WatchHub";
 else{
  try{name=new URL(manifest).hostname.replace(/^www\./,"").split(".")[0]||`Fonte ${index+1}`}catch{name=`Fonte ${index+1}`}
  name=name.charAt(0).toUpperCase()+name.slice(1);
 }
 S.addonNameCache.set(manifest,name);
 getManifest(manifest).then(m=>{if(m?.name)S.addonNameCache.set(manifest,m.name)}).catch(()=>{});
 return name;
}
async function resolveAddonName(manifest,index){return quickAddonName(manifest,index)}
function streamCacheKey(manifest,type,id){return `${manifest}|${type}|${id}`}
function getCachedStreamBatch(manifest,type,id){
 const x=S.streamCache.get(streamCacheKey(manifest,type,id));
 if(!x)return null;
 const ttl=x.streams?.length?15*60*1000:(REQUIRED_STREAM_MANIFESTS.includes(manifest)?20*1000:45*1000);
 if(Date.now()-x.at>ttl){S.streamCache.delete(streamCacheKey(manifest,type,id));return null}
 return x.streams;
}
function saveStreamBatch(manifest,type,id,streams){S.streamCache.set(streamCacheKey(manifest,type,id),{at:Date.now(),streams})}
function preferredManifestForEpisode(){
 const pref=typeof preferredSeriesSource==="function"?preferredSeriesSource():null;
 return pref?.manifest||S.resumeEntry?.stream?.manifest||"";
}
function configuredManifestPriority(manifest){
 const list=configuredStreamManifests();
 const i=list.indexOf(manifest);
 return i<0?0:Math.max(0,(list.length-i)*12);
}
function sortStreamManifests(manifests){
 const pref=preferredManifestForEpisode(),primary=S.primaryManifest;
 return manifests.slice().sort((a,b)=>{
  const sa=(a===primary?35:0)+(a===pref?70:0)+configuredManifestPriority(a);
  const sb=(b===primary?35:0)+(b===pref?70:0)+configuredManifestPriority(b);
  return sb-sa;
 });
}
function streamRequestTimeout(manifest){
 const value=String(manifest||"").toLowerCase();
 if(value.includes("froststream"))return 18000;
 if(value.includes("fenixflix"))return 14000;
 if(value.includes("bestcine"))return 10000;
 return 8000;
}
function sourceRetryDelay(ms=350){return new Promise(resolve=>setTimeout(resolve,ms))}
async function fetchStreamPayload(manifest,type,id){
 const url=streamURLFor(manifest,type,id),timeout=streamRequestTimeout(manifest);
 try{return await getJSONTimeout(url,timeout)}catch(firstError){
  const message=String(firstError?.message||"");
  if(/HTTP 4\d\d/.test(message)&&!/HTTP (408|429)/.test(message))throw firstError;
  await sourceRetryDelay();
  try{return await getJSONTimeout(url,Math.min(timeout,6500))}catch(secondError){
   if(secondError&&typeof secondError==="object")secondError.cause=firstError;
   throw secondError
  }
 }
}
async function fetchStreamBatch(manifest,type,id,index,{fresh=false}={}){
 if(!fresh){const cached=getCachedStreamBatch(manifest,type,id);if(cached)return cached}
 const name=quickAddonName(manifest,index);
 getManifest(manifest).catch(()=>null);
 if(!addonSupports(manifest,"stream",type,id)){saveStreamBatch(manifest,type,id,[]);return []}
 const data=await fetchStreamPayload(manifest,type,id);
 const officialLegal=/watchhub\.strem\.io/i.test(manifest);
 const streams=(data.streams||[]).map(s=>{
  if(s&&!s.url&&!s.externalUrl&&s.infoHash)return null;
  if(s&&!s.url&&!s.externalUrl&&s.ytId)return {...s,externalUrl:`https://www.youtube.com/watch?v=${encodeURIComponent(s.ytId)}`};
  return s;
 }).filter(x=>x&&(x.url||x.externalUrl)).map((s,i)=>{
  const x={...s,_addon:name,_manifest:manifest,_idx:i,_quality:getQuality(s),_external:!s.url&&!s._torrent&&!!s.externalUrl,_officialLegal:officialLegal};
  x._provider=detectProvider(x);x._mismatch=streamLooksMismatched(x,S.streamMeta,type);return x;
 });
 saveStreamBatch(manifest,type,id,streams);return streams;
}
function mergeStreamBatches(current,batch){
 const map=new Map();
 for(const s of [...current,...batch]){
  const key=[s._manifest,s._idx,s.url||s.externalUrl,s.name||s.title].join("|");
  if(!map.has(key))map.set(key,s);
 }
 return [...map.values()].sort((a,b)=>(b._external?0:1)-(a._external?0:1)||sourceReliabilityScore(b,S.resumeEntry)-sourceReliabilityScore(a,S.resumeEntry));
}
async function loadStreamsFromAddons(type,id,onBatch=null,onStatus=null){
 const manifests=sortStreamManifests(configuredStreamManifests());
 const publish=(manifest,index,status,count=0,reason="")=>{
  S.addonQueryStatus.set(manifest,{name:quickAddonName(manifest,index),status,count,reason,at:Date.now()});
  if(onStatus)onStatus(manifest,status,count,reason);
 };
 const jobs=manifests.map((manifest,index)=>{
  publish(manifest,index,"loading",0);
  return fetchStreamBatch(manifest,type,id,index)
   .then(batch=>{publish(manifest,index,batch.length?"ready":"empty",batch.length);if(onBatch)onBatch(batch,manifest);return batch})
   .catch(e=>{const status=e?.name==="AbortError"?"timeout":"failed";publish(manifest,index,status,0,String(e?.message||e||""));console.warn("Addon lento/indisponível",manifest,e);return []});
 });
 const results=await Promise.all(jobs);
 return results.flat();
}
async function retryStreamSources(){
 const id=S.resolvedStreamId||S.playId,type=S.playType,button=$("#retrySourcesBtn");
 if(!id||!type)return toast("Abra um filme ou episódio antes de tentar novamente.");
 const manifests=sortStreamManifests(configuredStreamManifests());
 let targets=manifests.filter(manifest=>!["ready","loading"].includes(S.addonQueryStatus.get(manifest)?.status));
 if(!targets.length)targets=manifests;
 const token=S.streamLoadToken;
 if(button){button.disabled=true;button.textContent="↻ Tentando…"}
 for(const manifest of targets){
  const index=manifests.indexOf(manifest);
  S.addonQueryStatus.set(manifest,{name:quickAddonName(manifest,index),status:"loading",count:0,at:Date.now()})
 }
 scheduleSourceUIRender({immediate:true});
 const batches=await Promise.all(targets.map(async manifest=>{
  const index=manifests.indexOf(manifest);
  try{
   const batch=await fetchStreamBatch(manifest,type,id,index,{fresh:true});
   S.addonQueryStatus.set(manifest,{name:quickAddonName(manifest,index),status:batch.length?"ready":"empty",count:batch.length,at:Date.now()});
   return batch
  }catch(error){
   const status=error?.name==="AbortError"?"timeout":"failed";
   S.addonQueryStatus.set(manifest,{name:quickAddonName(manifest,index),status,count:0,reason:String(error?.message||error||""),at:Date.now()});
   return []
  }
 }));
 if(button){button.disabled=false;button.textContent="↻ Tentar fontes"}
 if(token!==S.streamLoadToken)return;
 S.streams=mergeStreamBatches(S.streams,batches.flat());scheduleSourceUIRender({immediate:true});
 if(!batches.flat().length){toast("As fontes continuam sem responder. Tente novamente mais tarde.");return}
 toast(`${batches.flat().length} opção(ões) atualizada(s). Testando a melhor…`);
 if(getHealthStatus(S.selectedStream)!=="working")await autoChooseWorkingSource(S.resumeEntry,true)
}
function prefetchStreams(type,id){
 if(!type||!id)return;
 sortStreamManifests(configuredStreamManifests()).forEach((manifest,index)=>{
  if(getCachedStreamBatch(manifest,type,id))return;
  fetchStreamBatch(manifest,type,id,index).catch(()=>{});
 });
}
function prefetchNextEpisodeSources(){
 const connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
 const video=$("#video");
 const lowPower=(navigator.hardwareConcurrency||8)<=4||(navigator.deviceMemory||8)<=4;
 const constrained=connection?.saveData||/2g|3g/i.test(connection?.effectiveType||"");
 const mobile=window.matchMedia?.("(max-width: 900px), (pointer: coarse)").matches;
 if(mobile||lowPower||constrained||document.hidden)return;
 if(video&&!video.paused){
  if(!video.buffered?.length)return;
  const bufferedAhead=video.buffered.end(video.buffered.length-1)-Number(video.currentTime||0);
  if(bufferedAhead<90)return;
 }
 if(S.playType==="series"&&S.nextEpisode?.id)runWhenIdle(()=>prefetchStreams("series",S.nextEpisode.id));
}
function sourceHealthRank(s){
 const h=getHealthStatus(s);
 return h==="working"?0:h==="testing"?1:h==="failed"?5:s._external?4:s._torrent?3:2;
}
function sourceBadgeList(s){
 const txt=[s.name,s.title,s.description,...streamLines(s)].filter(Boolean).join(" ").toLowerCase();
 const out=[];
 if(/dublado|dubbed|pt[- ]?br/.test(txt))out.push("PT-BR");
 else if(/portugu[eê]s|\bpt\b/.test(txt))out.push("PT");
 if(/legendado|subbed|subtitle/.test(txt))out.push("LEG");
 if(/dual/.test(txt))out.push("DUAL");
 if(/\b4k\b|2160p/.test(txt))out.push("4K");
 return [...new Set(out)].slice(0,3);
}
function sourceStatusLabel(s){
 const h=getHealthStatus(s),st=sourceStats()[sourceStatKey(s)]||{};
 if(h==="working")return"Funcionando";
 if(h==="testing")return"Testando…";
 if(h==="failed")return st.lastStall&&Date.now()-st.lastStall<2*3600e3?"Instável":"Falhou";
 return s._external?"Externo":s._torrent?"Torrent online":"Disponível";
}
function sourceStatusIcon(s){
 const h=getHealthStatus(s);
 return h==="working"?"✓":h==="testing"?"◌":h==="failed"?"!":s._external?"↗":"•";
}
function sourceSortedFiltered(streams){
 return streams.slice().sort((a,b)=>sourceHealthRank(a)-sourceHealthRank(b)||sourceReliabilityScore(b,S.resumeEntry)-sourceReliabilityScore(a,S.resumeEntry));
}
function sourceUiKey(s){return `${s?._manifest||""}|${s?._idx??""}`}
function sourceForUiKey(key){return (S.streams||[]).find(s=>sourceUiKey(s)===String(key||""))||null}
function resetSourceWindow(){S.sourceVisibleLimit=18;S.sourceResetScroll=true}
function scheduleSourceUIRender({reset=false,immediate=false}={}){
 if(reset)resetSourceWindow();
 clearTimeout(S._sourceUiTimer);
 if(immediate){renderSourceUI();return}
 const video=$("#video"),delay=video&&!video.paused?180:45;
 S._sourceUiTimer=setTimeout(()=>requestAnimationFrame(renderSourceUI),delay);
}
function patchSourceCardHealth(s){
 const root=$("#sources");if(!root)return false;
 const card=[...root.querySelectorAll("[data-source-key]")].find(x=>x.dataset.sourceKey===sourceUiKey(s));
 if(!card)return false;
 const status=getHealthStatus(s),statusNode=card.querySelector(".sourceStatus"),sub=card.querySelector(".sourceCompactSub");
 card.classList.remove("testing","working","failed");if(status)card.classList.add(status);
 card.classList.toggle("active",S.selectedStream===s);
 if(statusNode){statusNode.className=`sourceStatus ${status||"idle"}`;statusNode.textContent=sourceStatusIcon(s)}
 if(sub)sub.textContent=`${s._addon||"Fonte"} • ${sourceStatusLabel(s)}`;
 renderSourceSelectedBar();
 return true;
}
function renderSourceSelectedBar(){
 const bar=$("#sourceSelectedBar"),s=S.selectedStream;
 if(!bar)return;
 updatePlayerDownloadButton(s);
 if(!s){bar.innerHTML='<div class="sourceSelectedEmpty">Escolha uma fonte para ver as ações.</div>';return}
 const provider=detectProvider(s),torrent=!!s._torrent,external=!!s._external&&!torrent;
 bar.innerHTML=`<div class="selectedSourceInfo"><small>SELECIONADA</small><b>${esc(provider)}</b><span>${esc(s._addon||"")} • ${esc(s._quality||"Outro")}</span></div>
  <div class="selectedSourceActions">
   <button type="button" class="selectedSecondary" data-selected-other title="Abrir em outro player" ${external?"style='display:none'":""}>↗</button>
   <button type="button" class="selectedPlay" data-selected-play>${external?"Abrir provedor":"▶ Assistir"}</button>
  </div>`;
 bar.querySelector("[data-selected-play]").onclick=()=>external?openExternalSource(s.externalUrl):selectStream(s,true);
 const other=bar.querySelector("[data-selected-other]");if(other)other.onclick=()=>openOtherPlayerMenu(s);
}
function renderSourceUI(){
 const streams=S.streams||[];
 const sourceList=$("#sources"),previousScroll=S.sourceResetScroll?0:Number(sourceList?.scrollTop||0);
 S.sourceResetScroll=false;
 const configured=configuredStreamManifests();
 const manifests=configured.map((manifest,index)=>[manifest,S.addonQueryStatus.get(manifest)?.name||quickAddonName(manifest,index)]);
 const addons=["all",...new Set(manifests.map(([,name])=>name))];
 const prefSel=$("#preferredSourceSelect");
 if(prefSel){
  const current=S.primaryManifest;
  prefSel.innerHTML='<option value="">Automática</option>'+manifests.map(([m,n])=>`<option value="${esc(m)}" ${current===m?"selected":""}>${esc(n)}</option>`).join("");
  prefSel.onchange=()=>{S.primaryManifest=prefSel.value;localStorage.setItem("rf17_primary_manifest",S.primaryManifest);scheduleSourceUIRender({immediate:true});};
 }
 const states=[...S.addonQueryStatus.values()],finished=states.filter(x=>x.status!=="loading").length,failed=states.filter(x=>x.status==="failed"||x.status==="timeout").length,loading=states.some(x=>x.status==="loading");
 const count=$("#sourceCountText");if(count)count.textContent=streams.length?`${streams.length} opção(ões) • ${finished}/${configured.length} fontes consultadas${failed?` • ${failed} indisponível(is)`:""}`:loading?`Consultando ${configured.length} fontes ao mesmo tempo…`:`Nenhuma opção • ${finished}/${configured.length} fontes consultadas${failed?` • ${failed} indisponível(is)`:""}`;
 const drawerLabel=$("#sourceDrawerLabel");if(drawerLabel)drawerLabel.textContent=streams.length?`Fontes • ${streams.length}`:"Fontes";

 const addonTabs=$("#addonTabs"),addonScroll=addonTabs?.scrollLeft||0;
 addonTabs.innerHTML=addons.map(a=>`<button class="${S.selectedAddon===a?"active":""}" data-addon="${esc(a)}">${a==="all"?"Todas":esc(a)}</button>`).join("");
 const qualities=["all",...new Set(streams.map(s=>s._quality))].sort((a,b)=>a==="all"?-1:b==="all"?1:qualityScore(b)-qualityScore(a));
 $("#qualityFilters").innerHTML=qualities.map(q=>`<button class="${S.qualityFilter===q?"active":""}" data-q="${esc(q)}">${q==="all"?"Qualidade":esc(q)}</button>`).join("");

 const filtered=sourceSortedFiltered(streams.filter(s=>(S.selectedAddon==="all"||s._addon===S.selectedAddon)&&(S.qualityFilter==="all"||s._quality===S.qualityFilter)));
 const rec=filtered.find(s=>!s._external&&getHealthStatus(s)!=="failed")||filtered.find(s=>s._external&&getHealthStatus(s)!=="failed")||null;
 const recommend=$("#sourceRecommend");
 if(recommend){
  recommend.innerHTML=rec?`<button type="button" class="recommendCard"><span class="recommendIcon">★</span><span class="recommendText"><small>RECOMENDADA AGORA</small><b>${esc(detectProvider(rec))}</b><span>${esc(rec._addon)} • ${esc(rec._quality)}</span></span><span class="recommendUse">Usar</span></button>`:"";
  if(rec)recommend.querySelector("button").onclick=()=>{S.selectedStream=rec;scheduleSourceUIRender({immediate:true});if(rec._external)openExternalSource(rec.externalUrl);else selectStream(rec,true);if(innerWidth<=900)setSourceDrawer(false)};
 }
 if(!filtered.length){
  const selectedState=[...S.addonQueryStatus.values()].find(x=>x.name===S.selectedAddon);
  const message=selectedState?.status==="loading"?"Essa fonte ainda está respondendo…":selectedState?.status==="timeout"?"Essa fonte demorou demais. Use ‘Tentar fontes’.":selectedState?.status==="failed"?"Essa fonte está indisponível no momento.":"Nenhuma fonte corresponde aos filtros escolhidos.";
  $("#sources").innerHTML=`<div class="sourceEmpty">${message}</div>`;renderSourceSelectedBar();return
 }

 const visible=filtered.slice(0,S.sourceVisibleLimit);
 $("#sources").innerHTML=visible.map((s,i)=>{
  const selected=S.selectedStream===s,provider=detectProvider(s),badges=sourceBadgeList(s),status=getHealthStatus(s),action=s._external?"↗":"▶";
  return `<article class="sourceCard compact ${selected?"active":""} ${s._external?"external":""} ${status}" data-source-key="${esc(sourceUiKey(s))}" role="button" tabindex="0" aria-label="${esc(`Usar ${provider}`)}">
   <div class="sourceStatus ${status||"idle"}">${sourceStatusIcon(s)}</div>
   <div class="sourceCompactMain">
    <div class="sourceCompactTitle"><b>${esc(provider)}</b>${S.primaryManifest&&S.primaryManifest===s._manifest?'<span class="primarySourceBadge">PRINCIPAL</span>':""}</div>
    <div class="sourceCompactSub">${esc(s._addon||"Fonte")} • ${esc(sourceStatusLabel(s))}</div>
    <div class="sourceCompactBadges"><span>${esc(s._quality||"Outro")}</span>${badges.map(x=>`<span>${esc(x)}</span>`).join("")}${getCachedStreamBatch(s._manifest,S.playType,S.resolvedStreamId||S.playId)?'<span>⚡ cache</span>':""}</div>
   </div>
   <button type="button" class="sourceQuickPlay" data-source-play aria-label="Reproduzir" title="Reproduzir">${action}</button>
  </article>`;
 }).join("")+(visible.length<filtered.length?`<div class="sourceEmpty" data-source-more>Role para carregar mais • ${visible.length}/${filtered.length}</div>`:"");
 requestAnimationFrame(()=>{if(addonTabs)addonTabs.scrollLeft=addonScroll;if(sourceList)sourceList.scrollTop=previousScroll});
 renderSourceSelectedBar();
}
function useSourceCard(stream){
 if(!stream)return;
 S.selectedStream=stream;renderSourceSelectedBar();
 if(stream._external)openExternalSource(stream.externalUrl);else selectStream(stream,true);
 scheduleSourceUIRender();
 if(innerWidth<=900)setSourceDrawer(false);
}
function bindSourceUiEvents(){
 const tabs=$("#addonTabs"),qualities=$("#qualityFilters"),sources=$("#sources");
 tabs?.addEventListener("click",event=>{const button=event.target.closest("[data-addon]");if(!button)return;S.selectedAddon=button.dataset.addon;resetSourceWindow();renderSourceUI();requestAnimationFrame(()=>[...tabs.querySelectorAll("[data-addon]")].find(item=>item.dataset.addon===S.selectedAddon)?.scrollIntoView({behavior:window.matchMedia?.("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"nearest",inline:"center"}))});
 tabs?.addEventListener("wheel",event=>{if(Math.abs(event.deltaY)<=Math.abs(event.deltaX))return;event.preventDefault();tabs.scrollLeft+=event.deltaY},{passive:false});
 qualities?.addEventListener("click",event=>{const button=event.target.closest("[data-q]");if(!button)return;S.qualityFilter=button.dataset.q;resetSourceWindow();renderSourceUI();requestAnimationFrame(()=>[...qualities.querySelectorAll("[data-q]")].find(item=>item.dataset.q===S.qualityFilter)?.scrollIntoView({behavior:window.matchMedia?.("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"nearest",inline:"center"}))});
 const activate=event=>{const card=event.target.closest("[data-source-key]");if(!card)return;const stream=sourceForUiKey(card.dataset.sourceKey);useSourceCard(stream)};
 sources?.addEventListener("click",activate);
 sources?.addEventListener("keydown",event=>{if(event.key!=="Enter"&&event.key!==" ")return;event.preventDefault();activate(event)});
 sources?.addEventListener("scroll",()=>{if(sources.scrollTop+sources.clientHeight<sources.scrollHeight-160)return;const total=sourceSortedFiltered((S.streams||[]).filter(s=>(S.selectedAddon==="all"||s._addon===S.selectedAddon)&&(S.qualityFilter==="all"||s._quality===S.qualityFilter))).length;if(S.sourceVisibleLimit>=total)return;S.sourceVisibleLimit+=18;scheduleSourceUIRender({immediate:true})},{passive:true});
}
function rememberedStreamMatch(streams,entry){
 const ranked=rankedPlayableStreams(streams,entry);
 return ranked[0]||null;
}
function stopSourceAttempt(){
 clearTimeout(S._sourceTimer);
 S.sourceAttemptToken++;
}
function waitForSourceReady(stream,token,timeoutMs=14000){
 const v=$("#video");
 return new Promise(resolve=>{
  let done=false;
  const finish=(ok,reason="")=>{
   if(done||token!==S.sourceAttemptToken)return;
   done=true;clearTimeout(S._sourceTimer);
   v.removeEventListener("canplay",onReady);
   v.removeEventListener("playing",onReady);
   v.removeEventListener("error",onError);
   if(v._hls&&window.Hls)try{v._hls.off(Hls.Events.ERROR,onHlsError)}catch{}
   resolve({ok,reason});
  };
  const onReady=()=>finish(true,"");
  const onError=()=>finish(false,"media-error");
  const onHlsError=(_,data)=>{if(data?.fatal)finish(false,`hls-${data.type||"fatal"}`)};
  v.addEventListener("canplay",onReady,{once:true});
  v.addEventListener("playing",onReady,{once:true});
  v.addEventListener("error",onError,{once:true});
  if(v._hls&&window.Hls)try{v._hls.on(Hls.Events.ERROR,onHlsError)}catch{}
  if(v.readyState>=3){finish(true,"");return}
  S._sourceTimer=setTimeout(()=>finish(false,"timeout"),timeoutMs);
 });
}
async function attemptSource(stream,autoplay=true,resumeEntry=null){
 if(!stream||stream._external||(!stream.url&&!stream._torrent))return false;
 stopSourceAttempt();
 const token=S.sourceAttemptToken;
 S.selectedStream=stream;
 S.attemptedSourceKeys.add(sourceKey(stream));
 setHealth(stream,"testing");
 scheduleSourceUIRender();

 try{
  if(stream._torrent)await loadTorrentVideo(stream,autoplay,resumeEntry);
  else await loadVideo(stream.url,autoplay,stream,resumeEntry);
 }catch(e){
  console.warn("Falha preparando a fonte",e);
  setHealth(stream,"failed","prepare-error");
  rememberSourceResult(stream,false,"prepare-error");
  return false;
 }
 // Aguarda o HLS/arquivo realmente ficar pronto para reproduzir.
 const result=await waitForSourceReady(stream,token,stream._torrent?18000:9000);
 if(token!==S.sourceAttemptToken)return false;
 if(result.ok){
  setHealth(stream,"working");
  rememberSourceResult(stream,true);
  prefetchNextEpisodeSources();
  window.dispatchEvent(new CustomEvent("resenhaflix:party-source",{detail:streamIdentity(stream)}));
  if(S.playType==="series")toast(`Fonte funcionando: ${detectProvider(stream)} • ${stream._quality}.`);
  return true;
 }
 setHealth(stream,"failed",result.reason);
 rememberSourceResult(stream,false,result.reason);
 return false;
}
async function trySourcesInOrder(candidates,autoplay=true,resumeEntry=null,announce=true){
 const list=candidates.filter(s=>!S.attemptedSourceKeys.has(sourceKey(s))).slice(0,6);
 for(let i=0;i<list.length;i++){
  const s=list[i];
  if(announce&&i===0)toast(`Testando ${detectProvider(s)} • ${s._quality}...`);
  const ok=await attemptSource(s,autoplay,resumeEntry);
  if(ok)return s;
  if(!S.autoFallback)break;
  if(i<list.length-1)toast(`Essa fonte falhou. Tentando ${detectProvider(list[i+1])} • ${list[i+1]._quality}...`);
 }
 return null;
}
async function autoChooseWorkingSource(resumeEntry=null,autoplay=true){
 S.attemptedSourceKeys.clear();
 const ranked=diversePlayableStreams(S.streams,resumeEntry);
 if(!ranked.length)return null;
 const found=await trySourcesInOrder(ranked,autoplay,resumeEntry,true);
 if(!found){
  toast("Nenhuma das fontes testadas iniciou. Escolha outra manualmente na lista.");
  renderSourceUI();
 }
 return found;
}
async function selectStream(stream,autoplay=true,resumeEntry=null){
 if(!stream)return;
 if(stream._external&&!stream._torrent){openExternalSource(stream.externalUrl);return}
 const v=$("#video");
 const liveResume=resumeEntry||((v.currentTime||0)>3?{currentTime:v.currentTime,duration:v.duration||0,stream:streamIdentity(stream)}:null);
 if((v.currentTime||0)>1)persistPlaybackProgress(true);
 S.attemptedSourceKeys.clear();

 const ok=await attemptSource(stream,autoplay,liveResume);
 if(ok)return;
 if(stream._torrent){toast("Essa fonte de torrent não é compatível com o player.");scheduleSourceUIRender({immediate:true});return}
 if(!S.autoFallback){
  toast("Essa fonte não iniciou. Selecione outra fonte.");
  return;
 }
 toast("Essa fonte falhou. Procurando automaticamente outra opção...");
 const ranked=diversePlayableStreams(S.streams,liveResume).filter(s=>sourceKey(s)!==sourceKey(stream));
 const found=await trySourcesInOrder(ranked,autoplay,liveResume,false);
 if(!found)toast("Não encontrei outra fonte funcional automaticamente.");
}
async function fetchExternalSubtitles(type,id,stream){
 S.externalSubtitles=[];
 const manifest=cfg.subtitleAddon;
 if(!manifest||cfg.subtitlePref==="off")return [];
 try{
  let extra="";
  const bh=stream?.behaviorHints||{};
  const parts=[];
  if(bh.videoHash)parts.push(`videoHash=${encodeURIComponent(bh.videoHash)}`);
  if(bh.videoSize)parts.push(`videoSize=${encodeURIComponent(bh.videoSize)}`);
  if(bh.filename)parts.push(`filename=${encodeURIComponent(bh.filename)}`);
  const root=base(manifest);
  const url=root+`/subtitles/${type}/${encodeURIComponent(id)}${parts.length?("/"+parts.join("&")):""}.json`;
  const d=await getJSON(url);
  S.externalSubtitles=(d.subtitles||[]).map((x,i)=>({...x,_external:true,_idx:i}));
 }catch(e){console.warn("legendas externas",e);S.externalSubtitles=[]}
 return S.externalSubtitles;
}
function subtitleCandidates(){
 const embedded=(S.selectedStream?.subtitles||[]).map((x,i)=>({...x,_streamEmbedded:true,_idx:i}));
 return [...embedded,...(S.externalSubtitles||[])];
}
function srtToVtt(txt){
 let s=String(txt||"").replace(/^\uFEFF/,"").replace(/\r+/g,"");
 if(/^WEBVTT/.test(s.trim()))return s;
 s=s.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g,"$1.$2");
 return "WEBVTT\n\n"+s;
}
async function attachExternalSubtitle(sub){
 const v=$("#video");
 [...v.querySelectorAll("track[data-casaflix]")].forEach(t=>t.remove());
 if(S.externalSubtitleBlob){URL.revokeObjectURL(S.externalSubtitleBlob);S.externalSubtitleBlob=null}
 if(!sub)return;
 try{
  const r=await fetch(sub.url);
  if(!r.ok)throw Error("HTTP "+r.status);
  const txt=await r.text();
  const blob=new Blob([srtToVtt(txt)],{type:"text/vtt"});
  S.externalSubtitleBlob=URL.createObjectURL(blob);
  const track=document.createElement("track");track.dataset.casaflix="1";track.kind="subtitles";track.label=langLabel(sub.lang);track.srclang=langFamily(sub.lang);track.src=S.externalSubtitleBlob;track.default=true;v.appendChild(track);
  track.addEventListener("load",()=>{for(const t of v.textTracks)t.mode=t===track.track?"showing":"disabled"});
 }catch(e){
  console.warn(e);toast("A legenda foi encontrada, mas o navegador não conseguiu carregá-la (CORS/formato).");
 }
}
function collectAudioTracks(){
 const h=$("#video")._hls;
 if(h&&Array.isArray(h.audioTracks)&&h.audioTracks.length)return h.audioTracks.map((t,i)=>({index:i,name:t.name||t.lang||`Faixa ${i+1}`,lang:t.lang||t.name||"",_hls:true}));
 const v=$("#video"),a=v.audioTracks;
 if(a&&a.length)return Array.from(a).map((t,i)=>({index:i,name:t.label||t.language||`Faixa ${i+1}`,lang:t.language||t.label||"",_native:true}));
 return [];
}
function collectEmbeddedSubtitleTracks(){
 const h=$("#video")._hls;
 if(h&&Array.isArray(h.subtitleTracks))return h.subtitleTracks.map((t,i)=>({index:i,name:t.name||t.lang||`Legenda ${i+1}`,lang:t.lang||t.name||"",_hls:true}));
 return [];
}
function choosePreferredIndex(tracks,pref){
 if(!tracks.length)return -1;
 if(pref==="auto")return 0;
 let i=tracks.findIndex(t=>langFamily(t.lang)===pref);
 if(i<0&&pref==="pob")i=tracks.findIndex(t=>langFamily(t.lang)==="por");
 return i>=0?i:0;
}
function applyPreferredAudio(){
 const tracks=collectAudioTracks();if(!tracks.length){updateTrackStatus();return}
 const idx=choosePreferredIndex(tracks,cfg.audioPref);
 const h=$("#video")._hls;if(h&&tracks[idx]?._hls)h.audioTrack=tracks[idx].index;
 else{
  const a=$("#video").audioTracks;if(a)for(let i=0;i<a.length;i++)a[i].enabled=i===tracks[idx].index;
 }
 updateTrackStatus();
}
async function applyPreferredSubtitle(){
 if(cfg.subtitlePref==="off"){disableSubtitles();return}
 const hTracks=collectEmbeddedSubtitleTracks();
 let idx=choosePreferredIndex(hTracks,cfg.subtitlePref);
 if(hTracks.length&&idx>=0){
  const h=$("#video")._hls;if(h){h.subtitleTrack=hTracks[idx].index;h.subtitleDisplay=true}
  await attachExternalSubtitle(null);updateTrackStatus();return;
 }
 const ext=subtitleCandidates();
 let eidx=choosePreferredIndex(ext,cfg.subtitlePref);
 if(ext.length&&eidx>=0)await attachExternalSubtitle(ext[eidx]);
 updateTrackStatus();
}
function disableSubtitles(){
 const h=$("#video")._hls;if(h){h.subtitleTrack=-1;h.subtitleDisplay=false}
 const v=$("#video");for(const t of v.textTracks)t.mode="disabled";attachExternalSubtitle(null);updateTrackStatus();
}
function currentAudioLabel(){
 const tracks=collectAudioTracks(),h=$("#video")._hls;
 if(h&&h.audioTrack>=0&&tracks[h.audioTrack])return langLabel(tracks[h.audioTrack].lang||tracks[h.audioTrack].name);
 const a=$("#video").audioTracks;if(a)for(let i=0;i<a.length;i++)if(a[i].enabled)return langLabel(a[i].language||a[i].label);
 return tracks.length?langLabel(tracks[0].lang||tracks[0].name):"Padrão";
}
function currentSubtitleLabel(){
 const h=$("#video")._hls,ht=collectEmbeddedSubtitleTracks();
 if(h&&h.subtitleTrack>=0&&ht[h.subtitleTrack])return langLabel(ht[h.subtitleTrack].lang||ht[h.subtitleTrack].name);
 const v=$("#video");for(const t of v.textTracks)if(t.mode==="showing")return t.label||langLabel(t.language);
 return "Desligada";
}
function updateTrackStatus(){$("#trackStatus").textContent=`Áudio: ${currentAudioLabel()} • Legenda: ${currentSubtitleLabel()}`}
function closePlayerMenu(){
 const menu=$("#playerMenu"),backdrop=$("#playerMenuBackdrop");
 menu.classList.remove("open");
 backdrop.classList.remove("open");
 S.playerMenuKind=null;
 showPlayerUI();
}
function playerMenuHeader(title){
 return `<div class="playerMenuHeader"><div class="playerMenuTitle">${esc(title)}</div><button type="button" class="playerMenuClose" data-close-player-menu aria-label="Fechar">✕</button></div>`;
}
function finishPlayerMenu(kind){
 const menu=$("#playerMenu"),backdrop=$("#playerMenuBackdrop");
 S.playerMenuKind=kind;
 menu.classList.add("open");
 backdrop.classList.add("open");
 const close=menu.querySelector("[data-close-player-menu]");
 if(close)close.onclick=closePlayerMenu;
 showPlayerUI(true);
}
function openAudioMenu(){
 const menu=$("#playerMenu");
 if(menu.classList.contains("open")&&S.playerMenuKind==="audio"){closePlayerMenu();return}
 const tracks=collectAudioTracks();
 menu.innerHTML=playerMenuHeader("Faixas de áudio")+
   (tracks.length
    ? tracks.map((t,i)=>`<button class="menuItem" data-audio="${i}"><span class="check">${currentAudioLabel()===langLabel(t.lang||t.name)?"✓":""}</span><span class="menuText">${esc(t.name||langLabel(t.lang))}<small>${esc(langLabel(t.lang))}</small></span><span class="langBadge">${esc(langFamily(t.lang).toUpperCase())}</span></button>`).join("")
    : `<div class="sourceEmpty">Esta fonte não expõe múltiplas faixas de áudio ao navegador.</div>`);
 finishPlayerMenu("audio");
 menu.querySelectorAll("[data-audio]").forEach(b=>b.onclick=()=>{
  const t=tracks[Number(b.dataset.audio)],h=$("#video")._hls;
  if(t?._hls&&h)h.audioTrack=t.index;
  else if(t?._native&&$("#video").audioTracks){
   for(let i=0;i<$("#video").audioTracks.length;i++)$("#video").audioTracks[i].enabled=i===t.index;
  }
  updateTrackStatus();
  closePlayerMenu();
 });
}
function openSubtitleMenu(){
 const menu=$("#playerMenu");
 if(menu.classList.contains("open")&&S.playerMenuKind==="subs"){closePlayerMenu();return}
 const embedded=collectEmbeddedSubtitleTracks(),external=subtitleCandidates();
 const items=[
  `<button class="menuItem" data-sub-off><span class="check">${currentSubtitleLabel()==="Desligada"?"✓":""}</span><span class="menuText">Desativada<small>Sem legendas</small></span></button>`,
  ...embedded.map((t,i)=>`<button class="menuItem" data-hsub="${i}"><span class="check"></span><span class="menuText">${esc(t.name||langLabel(t.lang))}<small>Embutida no stream</small></span><span class="langBadge">${esc(langFamily(t.lang).toUpperCase())}</span></button>`),
  ...external.map((t,i)=>`<button class="menuItem" data-esub="${i}"><span class="check"></span><span class="menuText">${esc(langLabel(t.lang))}<small>Legenda externa</small></span><span class="langBadge">${esc(langFamily(t.lang).toUpperCase())}</span></button>`)
 ];
 menu.innerHTML=playerMenuHeader("Legendas")+items.join("");
 finishPlayerMenu("subs");
 const off=menu.querySelector("[data-sub-off]");
 if(off)off.onclick=()=>{disableSubtitles();closePlayerMenu()};
 menu.querySelectorAll("[data-hsub]").forEach(b=>b.onclick=async()=>{
  const t=embedded[Number(b.dataset.hsub)],h=$("#video")._hls;
  if(h){h.subtitleTrack=t.index;h.subtitleDisplay=true}
  await attachExternalSubtitle(null);
  updateTrackStatus();
  closePlayerMenu();
 });
 menu.querySelectorAll("[data-esub]").forEach(b=>b.onclick=async()=>{
  const t=external[Number(b.dataset.esub)],h=$("#video")._hls;
  if(h){h.subtitleTrack=-1;h.subtitleDisplay=false}
  await attachExternalSubtitle(t);
  updateTrackStatus();
  closePlayerMenu();
 });
}

async function copyTextSafe(text){
 try{
  if(navigator.clipboard&&window.isSecureContext){
   await navigator.clipboard.writeText(text);return true;
  }
 }catch{}
 try{
  const ta=document.createElement("textarea");
  ta.value=text;ta.style.position="fixed";ta.style.opacity="0";
  document.body.appendChild(ta);ta.select();
  const ok=document.execCommand("copy");ta.remove();return ok;
 }catch{return false}
}
function openOtherPlayerMenu(stream=S.selectedStream){
 const sourceUrl=stream?._torrent?stream.externalUrl:stream?.url;
 if(!stream||stream._external&&!stream._torrent||!sourceUrl){
  toast("Escolha primeiro uma fonte de vídeo direta.");
  return;
 }
 const menu=$("#playerMenu");
 if(menu.classList.contains("open")&&S.playerMenuKind==="other"){closePlayerMenu();return}
 menu.innerHTML=playerMenuHeader("Abrir em outro player")+`
   <button class="menuItem" data-other-share>
    <span class="check">↗</span><span class="menuText">Compartilhar com outro app<small>No celular, escolha VLC ou outro player compatível se ele aparecer.</small></span>
   </button>
   <button class="menuItem" data-other-tab>
    <span class="check">▣</span><span class="menuText">Abrir em nova aba<small>O navegador tenta reproduzir a URL diretamente.</small></span>
   </button>
   <button class="menuItem" data-other-copy>
    <span class="check">⧉</span><span class="menuText">Copiar link da fonte<small>Cole a URL no player de sua preferência.</small></span>
   </button>
   <div class="playerMenuNote">A lista de aplicativos depende do seu celular e dos players instalados. Nem todo player aceita todas as fontes HLS/M3U8.</div>`;
 finishPlayerMenu("other");

 menu.querySelector("[data-other-share]").onclick=async()=>{
  try{
   if(navigator.share){
    await navigator.share({title:S.streamTitle||"ResenhaFlix",text:"Abrir esta fonte em outro player",url:sourceUrl});
    closePlayerMenu();
   }else{
    const ok=await copyTextSafe(sourceUrl);
    toast(ok?"Link copiado. Cole no player externo.":"Compartilhamento indisponível.");
    closePlayerMenu();
   }
  }catch(e){
   if(e?.name!=="AbortError")toast("Não foi possível abrir o compartilhamento.");
  }
 };
 menu.querySelector("[data-other-tab]").onclick=()=>{
  window.open(sourceUrl,"_blank","noopener,noreferrer");
  closePlayerMenu();
 };
 menu.querySelector("[data-other-copy]").onclick=async()=>{
  const ok=await copyTextSafe(sourceUrl);
  toast(ok?"Link da fonte copiado.":"Não foi possível copiar o link.");
  closePlayerMenu();
 };
}
function aspectLabel(mode){
 return ({
  smart:"Auto 16:9",
  fit16:"16:9 sem distorcer",
  force16:"Forçar 16:9",
  cover16:"Preencher 16:9",
  original:"Original"
 })[mode]||"Auto 16:9";
}
function updateAspectButton(){
 const b=$("#aspectBtn");
 if(!b)return;
 const label=`Proporção: ${aspectLabel(S.aspectMode)}`;
 b.textContent="▭";
 b.title=label;
 b.setAttribute("aria-label",label);
}
function applyAspectMode(mode=S.aspectMode,notify=false){
 const shell=$("#videoShell"),video=$("#video");
 if(!shell||!video)return;
 S.aspectMode=mode;
 shell.dataset.aspect=mode;
 shell.style.aspectRatio="16 / 9";
 video.style.objectPosition="center center";

 const vw=Number(video.videoWidth||0),vh=Number(video.videoHeight||0);
 const ratio=vw&&vh?vw/vh:16/9;

 if(mode==="original"){
  if(vw&&vh)shell.style.aspectRatio=`${vw} / ${vh}`;
  video.style.objectFit="contain";
 }else if(mode==="force16"){
  video.style.objectFit="fill";
 }else if(mode==="cover16"){
  video.style.objectFit="cover";
 }else if(mode==="fit16"){
  video.style.objectFit="contain";
 }else{
  shell.style.aspectRatio="16 / 9";
  // Detecta fontes claramente verticais/3:4 e corrige automaticamente.
  video.style.objectFit=(ratio<1.1)?"fill":"contain";
 }
 localStorage.setItem("cf9_aspect",mode);
 updateAspectButton();
 if(notify)toast(`Proporção: ${aspectLabel(mode)}.`);
}
function openAspectMenu(){
 const menu=$("#playerMenu");
 if(menu.classList.contains("open")&&S.playerMenuKind==="aspect"){closePlayerMenu();return}
 const options=[
  ["smart","Auto 16:9","Corrige automaticamente fontes que chegam em 3:4 ou vertical."],
  ["fit16","16:9 sem distorcer","Preserva a imagem e usa barras quando necessário."],
  ["force16","Forçar 16:9","Estica a imagem para ocupar exatamente 16:9."],
  ["cover16","Preencher 16:9","Preenche a tela e pode cortar as bordas."],
  ["original","Original","Usa a proporção informada pelo arquivo."]
 ];
 menu.innerHTML=playerMenuHeader("Proporção da imagem")+
   options.map(([key,name,desc])=>`<button class="menuItem ${S.aspectMode===key?"active":""}" data-aspect="${key}">
    <span class="check">${S.aspectMode===key?"✓":""}</span>
    <span class="menuText">${name}<small>${desc}</small></span>
   </button>`).join("");
 finishPlayerMenu("aspect");
 menu.querySelectorAll("[data-aspect]").forEach(b=>b.onclick=()=>{
  applyAspectMode(b.dataset.aspect,true);
  closePlayerMenu();
 });
}

function shouldOfferSkipIntro(){
 return S.skipIntroEnabled && S.playType==="series" && !S.introSkipped;
}
function setSkipIntroEnabled(enabled,{notify=true}={}){
 S.skipIntroEnabled=!!enabled;
 localStorage.setItem("rf55_skip_intro_enabled",S.skipIntroEnabled?"1":"0");
 const button=$("#introSetupBtn");
 if(button){button.classList.toggle("on",S.skipIntroEnabled);button.classList.toggle("off",!S.skipIntroEnabled);button.setAttribute("aria-pressed",S.skipIntroEnabled?"true":"false");button.querySelector("span")?.replaceChildren(document.createTextNode(`Pular abertura ${S.skipIntroEnabled?"ON":"OFF"}`))}
 if(!S.skipIntroEnabled)$("#skipIntroBtn")?.classList.remove("show");else updateSkipIntroButton();
 if(notify)toast(`Botão de pular abertura ${S.skipIntroEnabled?"ativado":"desativado"}.`);
}
function introDiscoveryEnd(){
 const v=$("#video"),dur=Number(v.duration||0);
 // Primeira descoberta: cobre cold opens longos e aberturas próximas do meio.
 // Depois que o ResenhaFlix aprende o horário, a janela volta a ser curta e precisa.
 if(dur>0)return Math.min(dur*.60,30*60);
 return 30*60;
}
function updateSkipIntroButton(){
 const b=$("#skipIntroBtn"),v=$("#video");
 if(!b||!v)return;
 const t=Number(v.currentTime||0),profile=getIntroProfile();
 let show=false;

 if(shouldOfferSkipIntro()&&!v.ended){
  if(profile&&Number.isFinite(Number(profile.start))){
   const start=Number(profile.start),len=Math.max(20,Number(profile.length||S.introSkipSeconds||90));
   // Abre 20s antes do horário aprendido e permanece até 45s após o começo esperado.
   show=t>=Math.max(1,start-20)&&t<=start+45;
   b.classList.toggle("learned",show);
   if(show)b.querySelector("span").textContent="Pular abertura";
  }else{
   // Sem perfil: deixa disponível até 60% do episódio (máximo 30 min).
   // Assim séries com cold open ou abertura no meio continuam funcionando.
   show=t>=5&&t<=introDiscoveryEnd();
   b.classList.remove("learned");
   if(show)b.querySelector("span").textContent="Pular abertura";
  }
 }
 b.classList.toggle("show",show);
}
function skipIntro(){
 const v=$("#video");
 if(!shouldOfferSkipIntro()||!v)return;
 const now=Number(v.currentTime||0),profile=getIntroProfile();
 let target,learned=false;

 if(profile&&Number.isFinite(Number(profile.start))){
  const start=Number(profile.start),len=Math.max(20,Number(profile.length||S.introSkipSeconds||90));
  target=start+len;
 }else{
  const len=Math.max(20,Number(S.introSkipSeconds||90));
  // A primeira vez que o usuário clica ensina a posição real da abertura
  // para esta série + temporada.
  saveIntroProfile({start:now,length:len,samples:1});
  target=now+len;learned=true;
 }
 const max=(isFinite(v.duration)&&v.duration>0)?Math.max(0,v.duration-2):Infinity;
 target=Math.min(max,target);
 if(isFinite(target))v.currentTime=Math.max(now+1,target);
 S.introSkipped=true;
 $("#skipIntroBtn").classList.remove("show");
 persistPlaybackProgress(true);
 showPlayerUI();
 toast(learned?`Abertura aprendida em ${formatTime(now)} para esta temporada.`:`Abertura pulada para ${formatTime(target)}.`);
}
function openIntroSetupMenu(){
 const menu=$("#playerMenu"),v=$("#video"),profile=getIntroProfile(),now=Number(v.currentTime||0);
 if(menu.classList.contains("open")&&S.playerMenuKind==="intro"){closePlayerMenu();return}
 const start=profile?.start;
 const len=Number(profile?.length||S.introSkipSeconds||90);
 menu.innerHTML=playerMenuHeader("Ajustar abertura")+`
  <button class="menuItem introToggleItem ${S.skipIntroEnabled?"active":""}" data-intro-toggle aria-pressed="${S.skipIntroEnabled?"true":"false"}"><span class="check">${S.skipIntroEnabled?"✓":""}</span><span class="menuText">Mostrar “Pular abertura”<small>${S.skipIntroEnabled?"Ativado":"Desativado"} neste dispositivo.</small></span></button>
  <div class="introProfileInfo">${profile?`Aprendido para esta temporada: início em <b>${formatTime(start)}</b>, duração <b>${len}s</b>.`:"Ainda não existe um horário aprendido para esta temporada."}</div>
  <button class="menuItem" data-intro-mark><span class="check">⌖</span><span class="menuText">A abertura começa aqui<small>Salvar ${formatTime(now)} como início da abertura desta temporada.</small></span></button>
  <button class="menuItem" data-intro-60><span class="check"></span><span class="menuText">Duração: 60 segundos</span></button>
  <button class="menuItem" data-intro-90><span class="check">${len===90?"✓":""}</span><span class="menuText">Duração: 90 segundos</span></button>
  <button class="menuItem" data-intro-120><span class="check">${len===120?"✓":""}</span><span class="menuText">Duração: 120 segundos</span></button>
  <button class="menuItem" data-intro-forget><span class="check">↺</span><span class="menuText">Esquecer abertura aprendida<small>O botão volta ao modo de descoberta ampla.</small></span></button>`;
 finishPlayerMenu("intro");

 menu.querySelector("[data-intro-toggle]").onclick=()=>{
  setSkipIntroEnabled(!S.skipIntroEnabled);
  closePlayerMenu();
 };

 menu.querySelector("[data-intro-mark]").onclick=()=>{
  saveIntroProfile({start:now,length:len,samples:Number(profile?.samples||0)+1});
  toast(`Início da abertura salvo em ${formatTime(now)}.`);
  closePlayerMenu();updateSkipIntroButton();
 };
 for(const seconds of [60,90,120]){
  menu.querySelector(`[data-intro-${seconds}]`).onclick=()=>{
   const p=getIntroProfile()||{start:now,samples:0};
   saveIntroProfile({...p,length:seconds});
   S.introSkipSeconds=seconds;
   toast(`Duração da abertura: ${seconds}s.`);
   closePlayerMenu();updateSkipIntroButton();
  };
 }
 menu.querySelector("[data-intro-forget]").onclick=()=>{
  forgetIntroProfile();toast("Abertura aprendida removida.");closePlayerMenu();updateSkipIntroButton();
 };
}
function nextEpisodeCarry(){
 const identity=streamIdentity(S.selectedStream);
 return {
  currentTime:0,
  duration:0,
  rootId:S.currentShow?.id||S.rootId||null,
  stream:identity?{...identity,provider:detectProvider(S.selectedStream)}:null
 };
}
function setPrimePlayerMeta(type,title,meta){
 const main=type==="series"?(S.currentShow?.name||meta?.name||title):(meta?.name||title||"Reprodução");
 let sub="";
 if(type==="series"){const ep=S.currentEpisode;sub=[ep?.season?`Temporada ${ep.season}`:"",ep?.episode?`Ep. ${ep.episode}`:"",ep?.title||ep?.name||""].filter(Boolean).join(", ")}
 else sub=[meta?.year,meta?.runtime].filter(Boolean).join(" • ");
 $("#playerTitle").textContent=main||"Reprodução";$("#playerSubtitle").textContent=sub;
}
let playbackPerformanceActive=false,playbackSuspendedUi=[];
function setPlaybackPerformanceMode(active){
 if(active===playbackPerformanceActive)return;
 playbackPerformanceActive=active;
 if(active){
  hideCardPreview();clearTimeout(previewTimer);clearTimeout(previewHideTimer);
  playbackSuspendedUi=["#top","#hero","#main","#page","#detailModal","#cardPreview","#mobileBottomNav"].map(selector=>document.querySelector(selector)).filter(Boolean).map(element=>({element,visibility:element.style.visibility,pointerEvents:element.style.pointerEvents}));
  for(const item of playbackSuspendedUi){item.element.style.visibility="hidden";item.element.style.pointerEvents="none"}
  const video=$("#video");
  if(video){video.style.transform="translate3d(0,0,0)";video.style.backfaceVisibility="hidden";video.style.willChange="transform"}
 }else{
  for(const item of playbackSuspendedUi){item.element.style.visibility=item.visibility;item.element.style.pointerEvents=item.pointerEvents}
  playbackSuspendedUi=[];
 }
}
async function playStream(type,id,title,meta,resumeEntry=null){
 $("#playerModal").classList.add("open");document.body.classList.add("playerOpen");setPlaybackPerformanceMode(true);setPrimePlayerMeta(type,title,meta);$("#playerSide").classList.remove("drawerOpen");$("#sourcePanelBackdrop").classList.remove("open");$("#primeNextFloat").classList.remove("show");
 if(type!=="series"){const episodesButton=$("#episodesBtn");if(episodesButton)episodesButton.style.display="none"}
 setPlayerSideTab("fontes");
 S.streamTitle=title||"video";S.streamMeta=meta||{id,type,name:title};S.playType=type;S.playId=id;S.resolvedStreamId=null;S.introSkipped=false;$("#skipIntroBtn").classList.remove("show");S.rootId=type==="series"?(S.currentShow?.id||resumeEntry?.rootId||meta?.id):(resumeEntry?.rootId||meta?.id||id);S.resumeEntry=resumeEntry;S.resumeApplied=false;S.streams=[];S.selectedStream=null;S.selectedAddon="all";S.qualityFilter="all";resetSourceWindow();S.externalSubtitles=[];S.sourceHealth.clear();S.addonQueryStatus.clear();S.attemptedSourceKeys.clear();S._lastProgressSave=0;updatePlayerDownloadButton(null);
 window.dispatchEvent(new CustomEvent("resenhaflix:party-media",{detail:partyMediaDescriptor()}));
 configuredStreamManifests().forEach((manifest,index)=>S.addonQueryStatus.set(manifest,{name:quickAddonName(manifest,index),status:"loading",count:0,at:Date.now()}));
 resetVideo();showPlayerUI(true);
 $("#qualityFilters").innerHTML="";renderSourceUI();
 try{
  const loadToken=++S.streamLoadToken,partyAutoplay=resumeEntry?._partyAutoplay!==false;let autoStarted=false,autoPromise=null,autoTimer=null,receivedAny=false;
  const streamId=await resolveStreamId(type,id,meta);
  if(loadToken!==S.streamLoadToken)return;
  S.resolvedStreamId=streamId;
  const startAuto=()=>{
   if(autoStarted||loadToken!==S.streamLoadToken||!rankedPlayableStreams(S.streams,resumeEntry).length)return autoPromise;
   autoStarted=true;
   if(resumeEntry?.stream?.provider)toast(`Procurando novamente ${resumeEntry.stream.provider}…`);
   autoPromise=autoChooseWorkingSource(resumeEntry,partyAutoplay).then(async found=>{if(found)await fetchExternalSubtitles(type,streamId,found);return found});
   return autoPromise;
  };
  const allPromise=loadStreamsFromAddons(type,streamId,(batch)=>{
   if(loadToken!==S.streamLoadToken||!batch?.length)return;
   receivedAny=true;S.streams=mergeStreamBatches(S.streams,batch);scheduleSourceUIRender();
   const hasDirect=rankedPlayableStreams(S.streams,resumeEntry).some(stream=>!stream._torrent&&stream.url);
   if(!autoStarted&&!autoTimer&&hasDirect)autoTimer=setTimeout(()=>{autoTimer=null;startAuto()},450);
  },()=>{if(loadToken===S.streamLoadToken)scheduleSourceUIRender()});
  const streams=await allPromise;if(loadToken!==S.streamLoadToken)return;
  clearTimeout(autoTimer);autoTimer=null;
  S.streams=mergeStreamBatches(S.streams,streams);if(S.streams.length)scheduleSourceUIRender({immediate:true});
  if(!autoStarted)startAuto();
  let found=autoPromise?await autoPromise:null;
  // Se o primeiro addon chegou rápido mas todas as fontes dele falharam,
  // tenta novamente após os addons mais lentos terminarem de chegar.
  if(!found&&rankedPlayableStreams(S.streams,resumeEntry).length){
   found=await autoChooseWorkingSource(resumeEntry,partyAutoplay);
   if(found)await fetchExternalSubtitles(type,streamId,found);
  }
  if(!receivedAny&&!S.streams.length){$("#sources").innerHTML="<div class='sourceEmpty'>Nenhuma fonte foi retornada pelos addons configurados.</div>";return}
 }catch(e){console.error(e);$("#sources").innerHTML="<div class='sourceEmpty'>Falha ao consultar as fontes. Verifique CORS, o manifesto e a disponibilidade do addon.</div>"}
}
function partyMediaDescriptor(){
 if(!S.playType||!S.playId)return null;
 const rootId=S.playType==="series"?(S.currentShow?.id||S.rootId||S.streamMeta?.id):(S.rootId||S.streamMeta?.id||S.playId);
 return {
  type:S.playType,rootId,playId:S.playId,title:S.streamTitle||S.streamMeta?.name||"",
  meta:compactMeta(S.streamMeta),show:compactMeta(S.currentShow),episode:compactMeta(S.currentEpisode),
  stream:streamIdentity(S.selectedStream)
 };
}
function partyMediaKey(media){return media?[media.type||"movie",media.rootId||media.meta?.id||"",media.playId||media.episode?.id||""].join("|"):""}
function partySourceIdentityKey(source){
 if(!source)return "";
 if(source.url)return `url:${source.url}`;
 if(source.infoHash)return `torrent:${String(source.infoHash).toLowerCase()}`;
 return [source.manifest||source._manifest||"",source.index??source._idx??"",source.provider||detectProvider(source),source.quality||source._quality||getQuality(source),source.name||source.title||""].join("|");
}
const partySourceFailures=new Map();
let partyAppliedOwnerSourceKey="",partyAppliedLocalSourceKey="";
function partySourceCandidate(identity){
 if(!identity||identity.torrent)return null;
 const streams=(S.streams||[]).filter(stream=>!stream._external&&!stream._torrent&&stream.url);
 const exactUrl=identity.url&&streams.find(stream=>String(stream.url)===String(identity.url));if(exactUrl)return exactUrl;
 const exactSlot=identity.manifest&&Number.isInteger(identity.index)&&streams.find(stream=>String(stream._manifest||"")===String(identity.manifest)&&stream._idx===identity.index);if(exactSlot)return exactSlot;
 const wantedName=String(identity.name||identity.title||"").trim().toLowerCase();
 return streams.find(stream=>detectProvider(stream)===identity.provider&&stream._quality===identity.quality&&(!wantedName||String(stream.name||stream.title||"").trim().toLowerCase()===wantedName))||null;
}
async function applyPartySource(identity,playback={}){
 if(!identity||identity.torrent)return false;
 const wantedKey=partySourceIdentityKey(identity),currentKey=partySourceIdentityKey(streamIdentity(S.selectedStream));
 if(wantedKey&&wantedKey===currentKey)return true;
 if(wantedKey===partyAppliedOwnerSourceKey&&currentKey===partyAppliedLocalSourceKey)return true;
 const failedAt=partySourceFailures.get(wantedKey)||0;if(failedAt&&Date.now()-failedAt<120000)return false;
 const candidate=partySourceCandidate(identity);if(!candidate){partySourceFailures.set(wantedKey,Date.now());return false}
 if(S.selectedStream&&sourceKey(candidate)===sourceKey(S.selectedStream)){partyAppliedOwnerSourceKey=wantedKey;partyAppliedLocalSourceKey=currentKey;return true}
 const previous=S.selectedStream,rawTarget=playback.targetTime??playback.currentTime??$("#video")?.currentTime??0;
 const resume={currentTime:Math.max(0,Number(rawTarget||0)),duration:Math.max(0,Number(playback.duration||0)),rootId:S.rootId,stream:identity,_partyAutoplay:!playback.paused};
 const matched=await attemptSource(candidate,!playback.paused,resume);
 if(matched){partySourceFailures.delete(wantedKey);partyAppliedOwnerSourceKey=wantedKey;partyAppliedLocalSourceKey=partySourceIdentityKey(streamIdentity(S.selectedStream));return true}
 partySourceFailures.set(wantedKey,Date.now());
 partyAppliedOwnerSourceKey="";partyAppliedLocalSourceKey="";
 if(previous&&partySourceIdentityKey(streamIdentity(previous))!==wantedKey&&await attemptSource(previous,!playback.paused,{...resume,stream:streamIdentity(previous)}))return false;
 const alternatives=diversePlayableStreams(S.streams,{...resume,stream:null}).filter(stream=>partySourceIdentityKey(streamIdentity(stream))!==wantedKey);
 await trySourcesInOrder(alternatives,!playback.paused,{...resume,stream:null},false);
 return false;
}
function partyCurrentContext(){
 const playing=partyMediaDescriptor();
 if(playing&&$("#playerModal")?.classList.contains("open"))return {source:"player",title:S.streamTitle||S.streamMeta?.name||"Reprodução",media:playing};
 const current=S.current,type=current?.type||"movie";
 if(current?.id&&["movie","series"].includes(type)&&$("#detailModal")?.classList.contains("open")){
  return {source:"detail",title:current.name||current.title||"Título selecionado",media:{type,rootId:current.id,playId:null,title:current.name||current.title||"",meta:compactMeta(current),show:type==="series"?compactMeta(current):null,episode:null,stream:null}};
 }
 return playing?{source:"player",title:S.streamTitle||"Reprodução",media:playing}:null;
}
async function startPartyContext(context){
 if(!context)return false;
 if(context.source==="player"&&$("#playerModal")?.classList.contains("open"))return true;
 const wanted=context.media,current=S.current;
 let media=current&&String(current.id)===String(wanted?.rootId)?current:null;
 if(!media){const d=await getJSON(metaURL(wanted?.type||"movie",wanted?.rootId));media=d.meta||d}
 S.current=media;
 await playFirst(media);
 return true;
}
async function openPartyMedia(media,playback={}){
 if(!media?.type||!media?.rootId)return false;
 const currentKey=partyMediaKey(partyMediaDescriptor()),wantedKey=partyMediaKey(media);
 if(currentKey===wantedKey&&$("#playerModal")?.classList.contains("open"))return true;
 const resume={
  currentTime:Math.max(0,Number(playback.currentTime||0)),duration:Math.max(0,Number(playback.duration||0)),
  rootId:media.rootId,stream:media.stream||null,_partyAutoplay:!playback.paused
 };
 if(media.type==="series"){
  let show=S.currentShow&&String(S.currentShow.id)===String(media.rootId)?S.currentShow:null;
  if(!show){const d=await getJSON(metaURL("series",media.rootId));show=d.meta||d}
  const episodes=playableSeriesEpisodes(show),episode=episodes.find(item=>String(item.id)===String(media.playId||media.episode?.id))||episodes.find(item=>Number(item.season)===Number(media.episode?.season)&&Number(item.episode)===Number(media.episode?.episode));
  if(!episode)throw new Error("Episódio da sala não encontrado");
  S.current=show;
  await playEpisode(show,episode,resume);
 }else{
  let movie=S.current&&String(S.current.id)===String(media.rootId)?S.current:null;
  if(!movie){const d=await getJSON(metaURL("movie",media.rootId));movie=d.meta||d}
  S.current=movie;
  await playStream("movie",movie.id,movie.name||media.title,movie,resume);
 }
 return true;
}
function partyPlaybackState(){
 const video=$("#video"),media=partyMediaDescriptor();
 return {media,currentTime:Number(video?.currentTime||0),duration:Number(video?.duration||0),paused:video?video.paused:true,playbackRate:Number(video?.playbackRate||1),ready:!!(video&&(video.src||video._hls))};
}
async function applyPartyPlayback(playback={}){
 const video=$("#video");if(!video)return false;
 const target=Math.max(0,Number(playback.targetTime??playback.currentTime??0));
 const duration=Number(video.duration||0),safeTarget=duration>0?Math.min(target,Math.max(0,duration-.25)):target;
 if(Number.isFinite(safeTarget)&&Math.abs(Number(video.currentTime||0)-safeTarget)>1.05)try{video.currentTime=safeTarget}catch{}
 const rate=Math.min(2,Math.max(.5,Number(playback.playbackRate||1)));video.playbackRate=rate;
 if(playback.paused){video.pause()}else await startPlayback();
 return true;
}
window.ResenhaFlixPartyAdapter={getContext:partyCurrentContext,getPlaybackState:partyPlaybackState,mediaKey:partyMediaKey,startContext:startPartyContext,openMedia:openPartyMedia,applySource:applyPartySource,applyPlayback:applyPartyPlayback,notify:toast};
function resetVideo(){
  stopSourceAttempt();clearPlaybackStallMonitor();cleanupTorrentPlayback();disarmAutoUnmute();S._stallRecovery=false;S._stallEvents=[];
  const v=$("#video");v.pause();if(v._hls){v._hls.destroy();v._hls=null}v.removeAttribute("src");
  [...v.querySelectorAll("track[data-casaflix]")].forEach(t=>t.remove());
  if(S.externalSubtitleBlob){URL.revokeObjectURL(S.externalSubtitleBlob);S.externalSubtitleBlob=null}
  v.load();v.muted=false;setPlayerIcon($("#muteBtn"),"volume");S.resumeEntry=null;S.resumeApplied=false;updatePlayerDownloadButton(null);applyAspectMode(S.aspectMode,false);$("#seek").value=0;$("#seek").style.setProperty("--seek-fill","0%");$("#timeText").textContent="0:00 / 0:00";$("#bigPlay").classList.remove("hidden");setPlayerIcon($("#playPause"),"play");setPlayerIcon($("#centerPlay"),"play");$("#trackStatus").textContent="Áudio: auto • Legenda: auto";$("#playerMenu").classList.remove("open");$("#playerMenuBackdrop").classList.remove("open");S.playerMenuKind=null;
}
let hlsLibraryPromise=null;
function ensureHlsLibrary(){
 if(window.Hls)return Promise.resolve(window.Hls);
 if(hlsLibraryPromise)return hlsLibraryPromise;
 hlsLibraryPromise=new Promise((resolve,reject)=>{
  const s=document.createElement("script");
  s.src="https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js";
  s.async=true;
  s.onload=()=>resolve(window.Hls);
  s.onerror=()=>{hlsLibraryPromise=null;reject(new Error("Falha ao carregar HLS.js"))};
  document.head.appendChild(s);
 });
 return hlsLibraryPromise;
}
let webTorrentLibraryPromise=null,torrentClient=null,activeTorrent=null,torrentLoadGeneration=0;
function ensureWebTorrentLibrary(){
 if(window.WebTorrent)return Promise.resolve(window.WebTorrent);
 if(webTorrentLibraryPromise)return webTorrentLibraryPromise;
 webTorrentLibraryPromise=new Promise((resolve,reject)=>{
  const script=document.createElement("script");
  script.src="https://cdn.jsdelivr.net/npm/webtorrent@1.9.7/webtorrent.min.js";
  script.async=true;
  script.onload=()=>window.WebTorrent?resolve(window.WebTorrent):reject(new Error("WebTorrent não iniciou"));
  script.onerror=()=>{webTorrentLibraryPromise=null;reject(new Error("Falha ao carregar WebTorrent"))};
  document.head.appendChild(script);
 });
 return webTorrentLibraryPromise;
}
function cleanupTorrentPlayback(){
 torrentLoadGeneration++;
 const torrent=activeTorrent;activeTorrent=null;
 if(!torrent||!torrentClient)return;
 try{torrentClient.remove(torrent.infoHash,{destroyStore:true},()=>{})}catch{try{torrent.destroy(()=>{})}catch{}}
}
function torrentVideoFile(torrent,stream){
 const files=Array.isArray(torrent?.files)?torrent.files:[];
 const requested=Number.isInteger(Number(stream?.fileIdx))?files[Number(stream.fileIdx)]:null;
 if(requested&&/\.(?:mp4|m4v|mov|webm|mkv)$/i.test(requested.name||""))return requested;
 const firefox=/firefox/i.test(navigator.userAgent||"");
 return files.filter(file=>/\.(?:mp4|m4v|mov|webm|mkv)$/i.test(file.name||"")).sort((a,b)=>{
  const score=file=>{const name=String(file.name||"").toLowerCase();let value=/\.mp4$/.test(name)?1000:/\.webm$/.test(name)?900:/\.(m4v|mov)$/.test(name)?800:/\.mkv$/.test(name)?(firefox?-900:500):0;return value+Math.min(300,Number(file.length||0)/50e6)};
  return score(b)-score(a);
 })[0]||null;
}
async function loadTorrentVideo(stream,autoplay=true,resumeEntry=null){
 clearPlaybackStallMonitor();cleanupTorrentPlayback();
 const WebTorrent=await ensureWebTorrentLibrary();
 if(!WebTorrent.WEBRTC_SUPPORT)throw new Error("WebRTC indisponível neste navegador");
 if(!torrentClient)torrentClient=new WebTorrent({dht:false});
 const magnet=stream.externalUrl||magnetFromStream(stream);
 if(!magnet)throw new Error("Magnet inválido");
 const generation=++torrentLoadGeneration,v=$("#video");
 if(v._hls){v._hls.destroy();v._hls=null}
 v.pause();v.removeAttribute("src");v.preload="auto";v.load();$("#buffering").classList.add("show");
 S.resumeEntry=resumeEntry||null;S.resumeApplied=false;
 toast(`${stream._addon||"Torrent"}: conectando aos pares para reprodução online…`);
 await new Promise((resolve,reject)=>{
  let settled=false,torrent=null;
  const finish=error=>{if(settled)return;settled=true;clearTimeout(timer);if(error)reject(error);else resolve()};
  const timer=setTimeout(()=>finish(new Error("Torrent sem resposta")),10000);
  try{
   torrent=torrentClient.add(magnet,{announce:["wss://tracker.openwebtorrent.com","wss://tracker.webtorrent.dev"]},readyTorrent=>{
    if(generation!==torrentLoadGeneration){finish(new Error("Torrent cancelado"));return}
    activeTorrent=readyTorrent;
    const file=torrentVideoFile(readyTorrent,stream);
    if(!file){finish(new Error("Torrent sem arquivo de vídeo compatível"));return}
    const onMetadata=async()=>{
     applyAspectMode(S.aspectMode,false);
     const pos=Number(S.resumeEntry?.currentTime||0);
     if(pos>3&&isFinite(v.duration)&&v.duration>0)try{v.currentTime=Math.min(pos,Math.max(0,v.duration-2))}catch{}
     S.resumeApplied=true;
     await fetchExternalSubtitles(S.playType,S.playId,stream);await applyPreferredSubtitle();updateTrackStatus();
     $("#buffering").classList.remove("show");if(autoplay)startPlayback();
    };
    v.addEventListener("loadedmetadata",onMetadata,{once:true});
    try{file.renderTo(v,{autoplay:false,controls:false},error=>finish(error||null))}catch(error){finish(error)}
   });
   torrent.on("error",error=>finish(error));
  }catch(error){finish(error)}
 });
}
async function loadVideo(url,autoplay=true,stream=null,resumeEntry=null){
  clearPlaybackStallMonitor();cleanupTorrentPlayback();
  const v=$("#video");if(v._hls){v._hls.destroy();v._hls=null}v.pause();v.removeAttribute("src");v.preload="auto";v.load();$("#buffering").classList.add("show");
  S.resumeEntry=resumeEntry||null;S.resumeApplied=false;
  const applyResume=()=>{
    if(S.resumeApplied)return;
    const pos=Number(S.resumeEntry?.currentTime||0);
    if(pos>3&&isFinite(v.duration)&&v.duration>0){
      const safe=Math.min(pos,Math.max(0,v.duration-2));
      try{v.currentTime=safe;S.resumeApplied=true;toast(`Continuando em ${formatTime(safe)}.`)}catch{}
    }else S.resumeApplied=true;
  };
  const afterTracks=async()=>{applyPreferredAudio();if(S.playType&&S.playId){await fetchExternalSubtitles(S.playType,S.playId,stream||S.selectedStream);await applyPreferredSubtitle()}updateTrackStatus()};
  v.addEventListener("loadedmetadata",async()=>{applyAspectMode(S.aspectMode,false);applyResume();await afterTracks();$("#buffering").classList.remove("show");if(autoplay)v.play().catch(()=>{})},{once:true});
  if(/\.m3u8($|\?)/i.test(url)){
    try{
     await ensureHlsLibrary();
     if(window.Hls&&Hls.isSupported()){
      const lightweightPlayback=innerWidth<=900||(navigator.deviceMemory||8)<=4||(navigator.hardwareConcurrency||8)<=4;
      v._hls=new Hls({
       enableWorker:true,
       lowLatencyMode:false,
       backBufferLength:lightweightPlayback?15:30,
       maxBufferLength:lightweightPlayback?30:55,
       maxMaxBufferLength:lightweightPlayback?60:110,
       maxBufferSize:(lightweightPlayback?40:80)*1000*1000,
       capLevelToPlayerSize:true,
       startFragPrefetch:!lightweightPlayback,
       abrBandWidthFactor:.82,
       abrBandWidthUpFactor:.68,
       maxBufferHole:.5,
       nudgeMaxRetry:5,
       highBufferWatchdogPeriod:2
      });
      v._hls.loadSource(url);v._hls.attachMedia(v);
      v._hls.on(Hls.Events.MANIFEST_PARSED,async()=>{await afterTracks();$("#buffering").classList.remove("show")});
      if(Hls.Events.AUDIO_TRACKS_UPDATED)v._hls.on(Hls.Events.AUDIO_TRACKS_UPDATED,()=>{applyPreferredAudio();updateTrackStatus()});
      if(Hls.Events.SUBTITLE_TRACKS_UPDATED)v._hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED,()=>{applyPreferredSubtitle();updateTrackStatus()});
      let hlsNetworkRecoveries=0,hlsMediaRecoveries=0;
      v._hls.on(Hls.Events.ERROR,(_,data)=>{
       if(!data?.fatal)return;
       console.warn("Fonte HLS falhou",data);
       if(data.type===Hls.ErrorTypes.NETWORK_ERROR&&hlsNetworkRecoveries<1){
        hlsNetworkRecoveries++;try{v._hls.startLoad()}catch{}
        return;
       }
       if(data.type===Hls.ErrorTypes.MEDIA_ERROR&&hlsMediaRecoveries<1){
        hlsMediaRecoveries++;try{v._hls.recoverMediaError()}catch{}
        return;
       }
       schedulePlaybackRecovery("hls-fatal",1200);
      });
     }else v.src=url;
    }catch(e){console.warn("HLS.js",e);v.src=url}
    }else{
     v.src=url;
    }
}

let autoUnmuteHandler=null;
function reflectMuteState(){
  const v=$("#video");if(!v)return;
  const b=$("#muteBtn");if(b)b.textContent=v.muted?"🔇":"🔊";
  const vol=$("#volume");if(vol)vol.value=v.muted?0:v.volume;
}
function disarmAutoUnmute(){
  if(autoUnmuteHandler){
    document.removeEventListener("pointerdown",autoUnmuteHandler,true);
    document.removeEventListener("keydown",autoUnmuteHandler,true);
    document.removeEventListener("touchstart",autoUnmuteHandler,true);
    autoUnmuteHandler=null;
  }
}
function armAutoUnmute(){
  disarmAutoUnmute();
  autoUnmuteHandler=()=>{
    const v=$("#video");
    if(v&&v.muted){v.muted=false;v.volume=SITE_DEFAULT_VOLUME;reflectMuteState();}
    disarmAutoUnmute();
  };
  document.addEventListener("pointerdown",autoUnmuteHandler,true);
  document.addEventListener("keydown",autoUnmuteHandler,true);
  document.addEventListener("touchstart",autoUnmuteHandler,true);
}
// Inicia a reprodução de forma resiliente. Se o navegador bloquear o autoplay
// (gesto do usuário já expirou por causa da busca assíncrona das fontes), tenta
// muted-autoplay — sempre permitido — para que o vídeo renderize (sem tela preta)
// e reativa o áudio no primeiro toque/clique do usuário.
async function startPlayback(){
  const v=$("#video");if(!v)return;
  try{
    await v.play();
    return;
  }catch(_){
    try{
      v.muted=true;reflectMuteState();
      await v.play();
      armAutoUnmute();
      toast("Reprodução iniciada sem som. Toque para ativar o áudio.");
    }catch(__){
      clearTimeout(S._ctlTimer);showPlayerUI(true);
      toast("Toque na tela para iniciar a reprodução.");
    }
  }
}


function clearPlaybackStallMonitor(){
 clearTimeout(S._stallTimer);
 S._stallTimer=null;
 S._stallStartedAt=0;
}
function trimStallEvents(){
 const cutoff=Date.now()-90000;
 S._stallEvents=(S._stallEvents||[]).filter(t=>t>=cutoff);
}
function schedulePlaybackRecovery(reason="buffering",delayMs=null){
 const v=$("#video");
 if(!S.autoFallback||S._stallRecovery||!S.selectedStream||S.selectedStream._external)return;
 if(v.paused||v.ended||v.seeking||!v.src&&!v._hls)return;
 if(Date.now()<Number(S._stallCooldownUntil||0))return;
 trimStallEvents();
 const repeated=S._stallEvents.length>=2;
 const delay=delayMs??(repeated?3500:7500);
 clearTimeout(S._stallTimer);
 S._stallStartedAt=S._stallStartedAt||Date.now();
 S._stallTimer=setTimeout(()=>{
  if(v.paused||v.ended||v.seeking||v.readyState>=3)return;
  recoverFromUnstableSource(reason);
 },delay);
}
async function recoverFromUnstableSource(reason="buffering"){
 if(S._stallRecovery||!S.selectedStream)return;
 const v=$("#video"),current=S.selectedStream;
 if(v.paused||v.ended||v.seeking)return;
 S._stallRecovery=true;
 clearPlaybackStallMonitor();
 S._stallCooldownUntil=Date.now()+18000;
 const position=Number(v.currentTime||0);
 const duration=Number(isFinite(v.duration)?v.duration:0);
 const stalledFor=Math.max(0,Date.now()-Number(S._stallStartedAt||Date.now()));
 rememberSourceStall(current,Math.max(stalledFor,5500));
 setHealth(current,"failed",reason);
 const resume={currentTime:position,duration,stream:streamIdentity(current)};
 toast(`Fonte instável. Tentando outra opção a partir de ${formatTime(position)}…`);
 try{
  S.attemptedSourceKeys.clear();
  S.attemptedSourceKeys.add(sourceKey(current));
  const ranked=diversePlayableStreams(S.streams,resume)
   .filter(s=>sourceKey(s)!==sourceKey(current))
   .slice(0,5);
  const found=await trySourcesInOrder(ranked,true,resume,false);
  if(found){
   toast(`Troquei para ${detectProvider(found)} • ${found._quality} para reduzir travamentos.`);
   return;
  }
  // Se nenhuma alternativa funcionar, volta à fonte anterior na mesma posição.
  S.attemptedSourceKeys.clear();
  await attemptSource(current,true,resume);
 }finally{
  S._stallRecovery=false;
 }
}
function onPlaybackWaiting(kind="waiting"){
 const v=$("#video");
 $("#buffering").classList.add("show");
 if(v.paused||v.seeking||v.ended||Number(v.currentTime||0)<2)return;
 if(!S._stallStartedAt)S._stallStartedAt=Date.now();
 trimStallEvents();
 S._stallEvents.push(Date.now());
 trimStallEvents();
 schedulePlaybackRecovery(kind);
}
function onPlaybackStable(){
 const v=$("#video");
 $("#buffering").classList.remove("show");
 if(S._stallStartedAt){
  const duration=Date.now()-S._stallStartedAt;
  if(duration>=1800)rememberSourceStall(S.selectedStream,duration);
 }
 clearPlaybackStallMonitor();
 S._lastStablePlaybackAt=Date.now();
 showPlayerUI();
}
function togglePlayback(){const v=$("#video");if(!v.src&&!v._hls)return;if(v.paused)v.play().catch(()=>{});else v.pause()}
function setPlayerUIAccessibility(hidden){
 [$(".playerTop"),$("#primeCenterControls"),$("#playerControls")].forEach(el=>{
  if(!el)return;el.setAttribute("aria-hidden",hidden?"true":"false");
  if("inert" in el)el.inert=hidden;
 });
}
function hidePlayerUI(force=false){
 if((!force&&$("#video").paused)||S.playerMenuKind||$("#playerSide")?.classList.contains("drawerOpen"))return;
 clearTimeout(S._ctlTimer);
 $("#playerControls").classList.remove("show");
 $("#videoShell").classList.add("uiHidden");
 $(".playerStage").classList.add("uiHidden");
 setPlayerUIAccessibility(true);
}
function showPlayerUI(sticky=false){
 clearTimeout(S._ctlTimer);
 const alreadyVisible=$("#playerControls").classList.contains("show")&&!$(".playerStage").classList.contains("uiHidden");
 if(!alreadyVisible){$("#playerControls").classList.add("show");$("#videoShell").classList.remove("uiHidden");$(".playerStage").classList.remove("uiHidden");setPlayerUIAccessibility(false)}
 if(!sticky&&!$("#video").paused){
  S._ctlTimer=setTimeout(hidePlayerUI,1000);
 }
}
function togglePlayerUIVisibility(){
 const hidden=$(".playerStage").classList.contains("uiHidden")||!$("#playerControls").classList.contains("show");
 if(hidden)showPlayerUI();else hidePlayerUI(true);
}
function syncPlayer(){
 const v=$("#video"),dur=isFinite(v.duration)?v.duration:0,cur=v.currentTime||0;
 const seekValue=dur?Math.round(cur/dur*1000):0;$("#seek").value=seekValue;$("#seek").style.setProperty("--seek-fill",`${seekValue/10}%`);$("#timeText").textContent=`${formatTime(cur)} / ${formatTime(dur)}`;
 setPlayerIcon($("#playPause"),v.paused?"play":"pause");setPlayerIcon($("#centerPlay"),v.paused?"play":"pause");$("#bigPlay").classList.toggle("hidden",!v.paused);
 if(v.paused)showPlayerUI(true);
 if(dur&&S.streamMeta?.id)persistPlaybackProgress(false);
}
function persistPlaybackProgress(force=false){
 const v=$("#video");
 if(!S.playType||!S.playId||!S.streamMeta)return;
 const now=Date.now();
 if(!force&&now-S._lastProgressSave<5000)return;
 S._lastProgressSave=now;
 const cur=Number(v.currentTime||S.resumeEntry?.currentTime||0);
 const dur=Number((isFinite(v.duration)&&v.duration)||S.resumeEntry?.duration||0);
 // Não cria "Continuar assistindo" por apenas abrir o player.
 if(!force&&cur<2)return;
 const rootId=S.playType==="series"?(S.currentShow?.id||S.rootId):(S.rootId||S.playId);
 if(!rootId)return;
 const key=historyKey(S.playType,rootId);
 const existing=getHistoryEntry(key);
 if(cur<2&&!existing&&!(S.resumeEntry?.currentTime>2))return;
 const pct=dur>0?Math.max(0,Math.min(100,(cur/dur)*100)):0;
 const show=S.currentShow;
 const ep=S.currentEpisode;
 const rootMeta=S.playType==="series"
  ? compactMeta(show||{id:rootId,type:"series",name:S.streamMeta.name,poster:S.streamMeta.poster,background:S.streamMeta.background,year:S.streamMeta.year})
  : compactMeta({...S.streamMeta,id:rootId,type:"movie"});
 const entry={
  key,rootId,playId:S.playId,type:S.playType,
  name:S.playType==="series"?(show?.name||S.streamMeta.name||S.streamTitle):(S.streamMeta.name||S.streamTitle),
  poster:rootMeta.poster||S.streamMeta.poster||"",
  background:rootMeta.background||S.streamMeta.background||"",
  year:rootMeta.year||S.streamMeta.year||"",
  season:ep?.season??S.streamMeta.season,
  episode:ep?.episode??S.streamMeta.episode,
  episodeTitle:ep?.title||ep?.name||S.streamMeta.title||"",
  currentTime:cur,duration:dur,progress:pct,
  stream:streamIdentity(S.selectedStream),
  rootMeta,
  updatedAt:now
 };
 let a=history().filter(x=>(x.key||historyKey(x.type,x.rootId||x.id))!==key);
 // Se terminou praticamente tudo, removemos de "Continuar assistindo".
 if(dur>0&&cur/dur>=.97){
  saveHistory(a);return;
 }
 a.unshift(entry);saveHistory(a);
}
function addHistory(m,progress){
 // Compatibilidade com chamadas antigas; a V6 usa persistPlaybackProgress.
 persistPlaybackProgress(true);
}





const PAGE_GENRES=[
 ["all","Todos"],
 ["Action","Ação"],
 ["Adventure","Aventura"],
 ["Comedy","Comédia"],
 ["Drama","Drama"],
 ["Fantasy","Fantasia"],
 ["Romance","Romance"],
 ["Horror","Terror"],
 ["Sci-Fi","Ficção científica"],
 ["Thriller","Suspense"],
 ["Crime","Crime"],
 ["Mystery","Mistério"],
 ["Biography","Biografia"],
 ["Documentary","Documentário"],
 ["Family","Família"],
 ["Animation","Animação"],
 ["Sport","Esportes"],
 ["Western","Faroeste"]
];
function metaHasGenre(m,genre){
 if(!genre||genre==="all")return true;
 const target=normText(genre);
 return (m.genres||[]).some(g=>normText(g)===target||normText(g).includes(target)||target.includes(normText(g)));
}
function categoryLabel(value){
 if(value==="movie")return"Filmes";
 if(value==="series")return"Séries";
 if(value==="anime")return"Animes";
 return PAGE_GENRES.find(x=>x[0]===value)?.[1]||value;
}
function listCategories(items){
 const cats=[["all","Todos"],["movie","Filmes"],["series","Séries"],["anime","Animes"]];
 for(const def of PAGE_GENRES.slice(1))if(items.some(item=>metaHasGenre(item,def[0])))cats.push(def);
 return cats;
}
function categoriesForPage(type,items){
 if(type==="list")return listCategories(items);
 if(type==="anime")return PAGE_GENRES.filter(([v])=>v!=="Animation");
 return PAGE_GENRES;
}
const CATEGORY_INFO={
 "Action":["🔥","Ação","Para quem quer adrenalina, batalhas e muita energia."],
 "Adventure":["🧭","Aventura","Grandes jornadas, novos mundos e descobertas."],
 "Comedy":["😄","Comédia","Histórias leves para rir e relaxar."],
 "Drama":["🎭","Drama","Conflitos intensos e histórias marcantes."],
 "Fantasy":["✨","Fantasia","Magia, mundos extraordinários e criaturas fantásticas."],
 "Romance":["❤","Romance","Encontros, sentimentos e histórias de amor."],
 "Horror":["☠","Terror","Suspense, medo e histórias sombrias."],
 "Sci-Fi":["🚀","Ficção científica","Tecnologia, futuro e possibilidades além da realidade."],
 "Thriller":["⚡","Suspense","Tensão, mistério e reviravoltas."],
 "Crime":["🔎","Crime","Investigações, conspirações e submundo criminal."],
 "Mystery":["?","Mistério","Segredos e enigmas esperando para ser resolvidos."],
 "Biography":["◉","Biografia","Histórias inspiradas em pessoas e acontecimentos reais."],
 "Documentary":["▣","Documentário","Conteúdo documental e histórias reais."],
 "Family":["⌂","Família","Títulos para assistir com todo mundo."],
 "Animation":["✦","Animação","Animações para todos os gostos."],
 "Sport":["⚽","Esportes","Competição, superação e paixão pelo esporte."],
 "Western":["★","Faroeste","Velho oeste, duelos e grandes paisagens."]
};
function renderCategoryMega(){
 const grid=$("#categoryMegaGrid");if(!grid)return;
 grid.innerHTML=PAGE_GENRES.filter(([v])=>v!=="all").map(([v,label])=>`<button type="button" data-mega-genre="${esc(v)}" class="${S.pageCategory===v?"active":""}">${esc(label)}</button>`).join("");
 grid.querySelectorAll("[data-mega-genre]").forEach(b=>b.onclick=()=>openGenreFromMega(b.dataset.megaGenre));
}
function toggleCategoryMega(force){
 const box=$("#categoryMega"),back=$("#categoryMegaBackdrop"),btn=$("#categoriesNavBtn");
 const open=typeof force==="boolean"?force:!box.classList.contains("open");
 renderCategoryMega();
 box.classList.toggle("open",open);back.classList.toggle("open",open);btn.classList.toggle("open",open);
 box.setAttribute("aria-hidden",open?"false":"true");
}
function categoryTargetPage(){
 return ["movies","series","anime","list","trending"].includes(S.currentPage)?S.currentPage:"anime";
}
function openGenreFromMega(genre){
 toggleCategoryMega(false);
 page(categoryTargetPage(),genre);
}
function renderCategoryBar(type,items){
 const current=categoryLabel(S.pageCategory);
 return `<div class="categoryWrap">
   <div class="pageCategoryChooser">
    <button type="button" id="pageCategoryOpen">Categorias <span>⌄</span></button>
    <span class="pageCategoryCurrent">Exibindo: <b>${esc(current)}</b></span>
   </div>
  </div>`;
}
function filterListCategory(items,value){
 if(value==="all")return items;
 if(value==="movie")return items.filter(x=>x.type==="movie"&&!isAnimeLike(x));
 if(value==="series")return items.filter(x=>x.type==="series"&&!isAnimeLike(x));
 if(value==="anime")return items.filter(isAnimeLike);
 return items.filter(x=>metaHasGenre(x,value));
}
function listSearchText(item){
 return normText([item.name,item.title,item.originalName,item.year,item.type,...(item.genres||[])].filter(Boolean).join(" "));
}
function filterMyList(items,category=S.pageCategory,query=S.listQuery){
 const byCategory=filterListCategory(items,category||"all");
 const tokens=normText(query).split(/\s+/).filter(Boolean);
 if(!tokens.length)return byCategory;
 return byCategory.filter(item=>{const text=listSearchText(item);return tokens.every(token=>text.includes(token))});
}
function listCategoryCount(items,category){return filterListCategory(items,category).length}
function renderMyListResults(){
 const all=Array.isArray(S.pageItems)?S.pageItems:lists();
 const shown=filterMyList(all);
 $$("[data-list-category]").forEach(button=>{
  const active=button.dataset.listCategory===S.pageCategory;
  button.classList.toggle("active",active);
  if(active)button.setAttribute("aria-pressed","true");else button.setAttribute("aria-pressed","false");
 });
 const summary=$("#listResultsSummary");
 if(summary)summary.textContent=`${shown.length} de ${all.length} título(s)`;
 const target=$("#pageCatalogResults");if(!target)return;
 if(!all.length){target.innerHTML='<div class="listEmpty"><b>Sua lista está vazia.</b><span>Use o botão ＋ nos filmes, séries e animes que quiser guardar.</span></div>';return}
 if(!shown.length){target.innerHTML='<div class="listEmpty"><b>Nada encontrado na sua lista.</b><span>Tente outro nome, tipo ou gênero.</span></div>';return}
 renderPageCatalogResults(shown);
}
function renderMyListWorkspace(items){
 const categories=listCategories(items);
 $("#pageBody").innerHTML=`<section class="listLibraryTools" aria-label="Organizar minha lista">
  <div class="listLibraryHead"><div><small>MINHA BIBLIOTECA</small><h3>Encontre o que você salvou</h3></div><strong>${items.length}</strong></div>
  <label class="listSearchBox"><svg class="rfIcon" aria-hidden="true"><use href="#rf-icon-search"></use></svg><input id="listSearchInput" type="search" inputmode="search" value="${esc(S.listQuery)}" placeholder="Pesquisar em Minha Lista…" autocomplete="off" aria-label="Pesquisar somente em Minha Lista"><button type="button" id="listSearchClear" aria-label="Limpar pesquisa">×</button></label>
  <div class="listFilterChips" aria-label="Filtrar Minha Lista">${categories.map(([value,label])=>`<button type="button" data-list-category="${esc(value)}" class="${S.pageCategory===value?"active":""}" aria-pressed="${S.pageCategory===value?"true":"false"}">${esc(label)} <span>${listCategoryCount(items,value)}</span></button>`).join("")}</div>
  <div class="listResultsSummary" id="listResultsSummary"></div>
 </section><div id="pageCatalogResults"></div>`;
 const input=$("#listSearchInput"),clear=$("#listSearchClear");let frame=0;
 const update=()=>{S.listQuery=input.value;S.pageVisibleLimit=18;cancelAnimationFrame(frame);frame=requestAnimationFrame(renderMyListResults)};
 input.addEventListener("input",update);
 input.addEventListener("keydown",event=>{if(event.key==="Escape"){event.preventDefault();input.value="";update();input.blur()}});
 clear.onclick=()=>{input.value="";update();input.focus({preventScroll:true})};
 $$("[data-list-category]").forEach(button=>button.onclick=()=>{S.pageCategory=button.dataset.listCategory;S.pageVisibleLimit=18;renderMyListResults()});
 renderMyListResults();
}
async function fetchCatalogPageItems(type,category="all"){
 if(type==="list")return lists();
 if(type==="anime"){
  const [a,b]=await Promise.all([freshCatalog("series","top",{genre:"Animation"},cfg.meta,`anime-series-${category}`),freshCatalog("movie","top",{genre:"Animation"},cfg.meta,`anime-movies-${category}`)]);
  let all=Array.from(new Map([...a,...b].map(x=>[`${x.type}|${x.id}`,x])).values());
  if(category!=="all")all=all.filter(x=>metaHasGenre(x,category));
  return all;
 }
 const mediaType=type==="movies"?"movie":"series";
 return freshCatalog(mediaType,"top",category==="all"?"":{genre:category},cfg.meta,`page-${type}-${category}`);
}
function bindCategoryBar(){
 const b=$("#pageCategoryOpen");if(b)b.onclick=()=>toggleCategoryMega(true);
}
function categoryLandingHtml(category){
 if(category==="all"||["movie","series","anime"].includes(category))return"";
 const info=CATEGORY_INFO[category]||["✦",categoryLabel(category),""];
 return `<section class="categoryLanding"><div class="categoryLandingIcon">${info[0]}</div><h3>${esc(info[1])}</h3><p>${esc(info[2])}</p></section>`;
}
function renderPageCatalogResults(items){
 const target=$("#pageCatalogResults");if(!target)return;
 if(!items.length){target.innerHTML='<div class="empty">Nenhum título encontrado nesta categoria.</div>';return}
 if(S.pageCategory!=="all"&&S.currentPage!=="list"){
  const popular=items.slice(0,Math.min(12,items.length)),news=items.slice(Math.min(6,items.length),Math.min(18,items.length));
  target.innerHTML=categoryLandingHtml(S.pageCategory)+`
   <div class="categorySectionHead"><h3>Populares</h3><span>${popular.length} títulos</span></div>
   <div class="categoryMediaRow">${popular.map(card).join("")}</div>
   ${news.length?`<div class="categorySectionHead"><h3>Novidades</h3><span>Descubra mais</span></div><div class="categoryMediaRow">${news.map(card).join("")}</div>`:""}`;
 }else{
  const visible=items.slice(0,S.pageVisibleLimit);
  target.innerHTML=`<div class="grid">${visible.map(card).join("")}</div>${visible.length<items.length?`<div class="loading" id="pageInfiniteSentinel">Carregando mais títulos…</div>`:""}`;
 }
 bindCards(target);
 bindPageInfinite(items);
}
function bindPageInfinite(items){
 S.pageInfiniteObserver?.disconnect?.();S.pageInfiniteObserver=null;
 const sentinel=$("#pageInfiniteSentinel");if(!sentinel)return;
 const reveal=()=>{if(S.pageVisibleLimit>=items.length)return;S.pageVisibleLimit+=18;renderPageCatalogResults(items)};
 sentinel.onclick=reveal;
 if(typeof IntersectionObserver==="function"){
  S.pageInfiniteObserver=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting))reveal()},{rootMargin:"500px 0px"});
  S.pageInfiniteObserver.observe(sentinel);
 }
}

function socialSearchUrl(kind,title){const q=encodeURIComponent(`"${title}"`);if(kind==="tiktok")return`https://www.google.com/search?q=site%3Atiktok.com+${q}`;if(kind==="instagram")return`https://www.google.com/search?q=site%3Ainstagram.com+${q}`;return`https://trends.google.com/trends/explore?q=${encodeURIComponent(title)}`}
function socialBuzzCard(item){const title=item.name||"Título",type=item._trendType||"Em alta";return`<article class="socialBuzz"><b>${esc(title)}</b><small>${esc(type)}</small><div class="socialLinks"><button type="button" data-social-kind="tiktok" data-social-title="${esc(title)}">TikTok</button><button type="button" data-social-kind="instagram" data-social-title="${esc(title)}">Instagram</button><button type="button" data-social-kind="google" data-social-title="${esc(title)}">Google Trends</button></div></article>`}
function bindSocialBuzz(root){root.querySelectorAll("[data-social-kind]").forEach(b=>b.onclick=()=>window.open(socialSearchUrl(b.dataset.socialKind,b.dataset.socialTitle),"_blank","noopener,noreferrer"))}
async function trendingPage(){
 S.currentPage="trending";setActiveNav("trending");unlockMobileDocument();scrollPageTop();toggleCategoryMega(false);
 $("#hero").classList.add("hidden");$("#main").classList.add("hidden");$("#page").classList.remove("hidden","searchPage");$("#pageTitle").textContent="Em alta";$("#pageBody").innerHTML='<div class="loading">Atualizando o radar…</div>';
 try{
  const [movies,series,animeCatalog]=await Promise.all([freshCatalog("movie","top","",cfg.meta,"trend-movies"),freshCatalog("series","top","",cfg.meta,"trend-series"),freshCatalog("series","top",{genre:"Animation"},cfg.meta,"trend-anime-catalog")]);
  const anime=animeCatalog.slice(0,16),buzz=[...movies.slice(0,3).map(x=>({...x,_trendType:"Filme"})),...series.slice(0,3).map(x=>({...x,_trendType:"Série"})),...anime.slice(0,2).map(x=>({...x,_trendType:"Anime"}))];
  const updated=new Date().toLocaleString("pt-BR",{hour:"2-digit",minute:"2-digit",day:"2-digit",month:"2-digit"});
  $("#pageBody").innerHTML=`<div class="trendingShell"><section class="trendingHero"><div class="trendingHeroText"><div class="trendingEyebrow">RADAR RESENHAFLIX</div><h2>Em alta agora</h2><p>Filmes, séries e animes em destaque, com títulos e descrições fornecidos pelo catálogo TMDB em português do Brasil.</p></div><div class="trendingUpdated">Atualizado ${updated}</div></section><section class="socialRadar"><div class="socialRadarHead"><div><h3>Radar social</h3><p>Confira a repercussão do título com um toque. O ResenhaFlix não inventa números de redes que não fornecem um feed público anônimo.</p></div><span class="socialRadarBadge">SOCIAL</span></div><div class="socialBuzzList" id="socialBuzzList">${buzz.map(socialBuzzCard).join("")}</div></section><section class="trendingSection"><div class="trendingSectionHead"><h3>Filmes</h3><p>Atualização automática</p></div><div class="trendingRow" id="trendMovies">${movies.slice(0,18).map(card).join("")}</div></section><section class="trendingSection"><div class="trendingSectionHead"><h3>Séries</h3><p>Atualização automática</p></div><div class="trendingRow" id="trendSeries">${series.slice(0,18).map(card).join("")}</div></section><section class="trendingSection"><div class="trendingSectionHead"><h3>Animes</h3><p>Catálogo em português</p></div><div class="trendingRow" id="trendAnime">${anime.map(card).join("")}</div></section></div>`;
  bindSocialBuzz($("#socialBuzzList"));bindCards($("#trendMovies"));bindCards($("#trendSeries"));bindCards($("#trendAnime"));
 }catch(e){console.error(e);$("#pageBody").innerHTML='<div class="empty">Não foi possível atualizar o radar agora.</div>'}
}

/* Biblioteca de livros */
let bookLibraryMemory=null;
function bookLibrary(){
 if(bookLibraryMemory)return bookLibraryMemory;
 try{bookLibraryMemory=JSON.parse(localStorage.getItem("rf24_book_library")||"[]")}catch{bookLibraryMemory=[]}
 return bookLibraryMemory
}
function saveBookLibrary(x){bookLibraryMemory=x.slice(0,300);localStorage.setItem("rf24_book_library",JSON.stringify(bookLibraryMemory))}
function bookKey(x){return String(x?.key||x?.id||`${x?.title}|${x?.authors}`)}
function bookSaved(x){return bookLibrary().some(b=>bookKey(b)===bookKey(x))}
function toggleBookSaved(x){let a=bookLibrary(),i=a.findIndex(b=>bookKey(b)===bookKey(x));if(i>=0){a.splice(i,1);toast("Livro removido da estante.")}else{a.unshift(x);toast("Livro adicionado à estante.")}saveBookLibrary(a)}
function lastBook(){try{return JSON.parse(localStorage.getItem("rf62_last_book")||"null")}catch{return null}}
function rememberLastBook(book,choice){try{localStorage.setItem("rf62_last_book",JSON.stringify({book,choice,at:Date.now()}))}catch{}}
function openLibraryCover(id){return id?`https://covers.openlibrary.org/b/id/${id}-M.jpg`:""}
function normalizeOpenLibraryBook(x){
 const publicAccess=x.ebook_access==="public"||x.public_scan_b===true;
 const editions=x.editions?.docs||[];
 const ptEdition=editions.find(e=>(e.language||[]).some(l=>["por","pt"].includes(String(l).toLowerCase())));
 const title=ptEdition?.title||x.title||"Livro";
 return{kind:"book",source:"Open Library / Internet Archive",key:x.key||"",id:x.key||x.cover_edition_key||title,title,authors:(x.author_name||[]).join(", "),image:openLibraryCover(x.cover_i),year:x.first_publish_year||"",languages:(x.language||[]).slice(0,6),externalUrl:ptEdition?.key?`https://openlibrary.org${ptEdition.key}`:(x.key?`https://openlibrary.org${x.key}`:""),publicDomain:publicAccess,publicAccess,ia:Array.isArray(x.ia)?x.ia:[],ebookAccess:x.ebook_access||"",formats:{},description:""}
}
function normalizeGutendexBook(x){return{kind:"book",source:"Project Gutenberg",key:`gutenberg:${x.id}`,id:String(x.id),title:x.title||"Livro",authors:(x.authors||[]).map(a=>a.name).join(", "),image:safeHttpUrl(x.formats?.["image/jpeg"]||""),year:"",languages:x.languages||[],externalUrl:`https://www.gutenberg.org/ebooks/${x.id}`,publicDomain:x.copyright===false,formats:x.formats||{},description:(x.summaries||[])[0]||"",downloads:Number(x.download_count||0)}}
function normalizeCustomBook(x){if(!x||typeof x!=="object"||!(x.title||x.name))return null;const pd=x.publicDomain===true||x.license==="public-domain";return{kind:"book",source:String(x.source||"JSON personalizado"),key:String(x.key||x.id||`custom:${x.title||x.name}`),id:String(x.id||""),title:String(x.title||x.name),authors:Array.isArray(x.authors)?x.authors.join(", "):String(x.authors||x.author||""),image:safeHttpUrl(x.image||x.cover||""),year:x.year||"",languages:x.languages||[],externalUrl:safeHttpUrl(x.url||x.externalUrl||""),dlivrosUrl:safeHttpUrl(x.dlivrosUrl||""),publicDomain:pd,formats:x.formats&&typeof x.formats==="object"?x.formats:{},readUrl:safeHttpUrl(x.readUrl||""),downloadUrl:pd?safeHttpUrl(x.downloadUrl||""):"",description:String(x.description||"")}}
async function searchOpenLibraryBooks(q){
 const base=safeHttpUrl(mediaCfg.booksOpenLibrary)||MEDIA_DEFAULT.booksOpenLibrary,sep=base.includes("?")?"&":"?";
 const fields="key,title,author_name,cover_i,first_publish_year,language,edition_count,ebook_access,ia,public_scan_b,editions,editions.key,editions.title,editions.language,editions.ebook_access";
 const solr=`${String(q||"").trim()} language:por`;
 const data=await getJSONTimeout(`${base}${sep}q=${encodeURIComponent(solr)}&lang=pt&limit=30&fields=${encodeURIComponent(fields)}`,7000);
 return(data.docs||[]).map(normalizeOpenLibraryBook).filter(b=>{
  const langs=(b.languages||[]).map(x=>String(x).toLowerCase());
  return !langs.length||langs.some(x=>x==="por"||x==="pt")
 })
}
async function searchGutendexBooks(q=""){const base=safeHttpUrl(mediaCfg.booksGutendex)||MEDIA_DEFAULT.booksGutendex,sep=base.includes("?")?"&":"?",params=[];if(q)params.push(`search=${encodeURIComponent(q)}`);params.push("languages=pt");const data=await getJSONTimeout(`${base}${sep}${params.join("&")}`,7500);return(data.results||[]).map(normalizeGutendexBook).filter(x=>x.publicDomain)}
async function customBookResults(q){const out=mediaImported("books").map(normalizeCustomBook).filter(Boolean).filter(x=>!q||normText(JSON.stringify(x)).includes(normText(q))),urls=String(mediaCfg.booksJsonUrls||"").split(/\n+/).map(x=>x.trim()).filter(Boolean).slice(0,6),settled=await Promise.allSettled(urls.map(u=>fetchCustomJson(u,q)));for(const r of settled)if(r.status==="fulfilled")for(const x of r.value){const n=normalizeCustomBook(x);if(n)out.push(n)}return out}
function dedupeBooks(items){const map=new Map();for(const x of items){const k=normText(`${x.title}|${x.authors}`);if(!map.has(k))map.set(k,x)}return[...map.values()]}
function bookFormatChoices(b){
 const f=b.formats||{},choices=[];
 for(const[mime,url]of Object.entries(f)){
  const u=safeHttpUrl(url);if(!u)continue;const m=mime.toLowerCase(),lower=u.toLowerCase();
  if(m.includes("pdf")||/\.pdf($|\?)/.test(lower))choices.push({kind:"pdf",url:u,label:"PDF",readable:true});
  else if(m.includes("epub")||/\.epub($|\?)/.test(lower))choices.push({kind:"epub",url:u,label:"EPUB",readable:true});
  else if(m.includes("mobipocket")||m.includes("mobi")||/\.(mobi|kindle)($|\?)/.test(lower))choices.push({kind:"mobi",url:u,label:"MOBI",readable:false});
  else if(m.startsWith("text/html"))choices.push({kind:"html",url:u,label:"HTML",readable:true});
  else if(m.startsWith("text/plain"))choices.push({kind:"text",url:u,label:"TXT",readable:true})
 }
 if(b.readUrl){const u=b.readUrl.toLowerCase();choices.unshift({kind:/\.pdf($|\?)/.test(u)?"pdf":/\.epub($|\?)/.test(u)?"epub":/\.mobi($|\?)/.test(u)?"mobi":"html",url:b.readUrl,label:/\.pdf($|\?)/.test(u)?"PDF":/\.epub($|\?)/.test(u)?"EPUB":/\.mobi($|\?)/.test(u)?"MOBI":"Ler",readable:!/\.mobi($|\?)/.test(u)})}
 if(b.downloadUrl){const u=b.downloadUrl.toLowerCase();choices.unshift({kind:/\.pdf($|\?)/.test(u)?"pdf":/\.epub($|\?)/.test(u)?"epub":/\.mobi($|\?)/.test(u)?"mobi":"download",url:b.downloadUrl,label:/\.pdf($|\?)/.test(u)?"PDF":/\.epub($|\?)/.test(u)?"EPUB":/\.mobi($|\?)/.test(u)?"MOBI":"Arquivo",readable:false})}
 const seen=new Set(),order={pdf:0,epub:1,mobi:2,html:3,text:4,download:5};
 return choices.filter(x=>!seen.has(x.url)&&seen.add(x.url)).sort((a,b)=>(order[a.kind]??9)-(order[b.kind]??9))
}
function bestBookRead(b){const c=bookFormatChoices(b);return c.find(x=>x.kind==="pdf")||c.find(x=>x.kind==="html")||c.find(x=>x.kind==="epub")||c.find(x=>x.kind==="text")||null}
function bestBookDownload(b){if(!b.publicDomain)return null;const c=bookFormatChoices(b);return c.find(x=>x.kind==="pdf")||c.find(x=>x.kind==="epub")||c.find(x=>x.kind==="mobi")||c.find(x=>x.kind==="text")||c[0]||null}

function archiveFileUrl(identifier,name){return `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(name).replace(/%2F/g,"/")}`}
async function hydrateArchiveBookFormats(book){
 if(!book?.publicAccess||!book.ia?.length||book._archiveHydrated)return book;
 book._archiveHydrated=true;
 const id=String(book.ia[0]||"");if(!id)return book;
 try{
  const data=await getJSONTimeout(`https://archive.org/metadata/${encodeURIComponent(id)}`,6500),files=Array.isArray(data?.files)?data.files:[];
  const formats={...(book.formats||{})};
  const pick=(regex,mime)=>{
   const f=files.find(x=>regex.test(String(x.name||""))&&!x.private&&Number(x.size||0)<250*1024*1024);
   if(f?.name&&!formats[mime])formats[mime]=archiveFileUrl(id,f.name)
  };
  pick(/\.pdf$/i,"application/pdf");
  pick(/\.epub$/i,"application/epub+zip");
  pick(/\.(mobi|azw3?)$/i,"application/x-mobipocket-ebook");
  pick(/\.txt$/i,"text/plain");
  book.formats=formats
 }catch(e){console.warn("Internet Archive metadata",e)}
 return book
}
async function hydrateBookFormatsProgressively(items,root){
 if(!connectionAllowsPrefetch())return;
 const targets=items.filter(x=>x.publicAccess&&x.ia?.length&&!x._archiveHydrated).slice(0,4);
 if(!targets.length)return;
 await Promise.allSettled(targets.map(hydrateArchiveBookFormats));
 if(!root?.isConnected)return;
 if(S.currentPage==="books"&&S.bookResults===items){
  root.innerHTML=`<div class="bookGrid">${items.map(bookCardHtml).join("")}</div>`;bindBookCards(root,items)
 }
}
function dlivrosSearchUrl(book){
 const title=String(book?.title||"").trim(),author=String(book?.authors||"").trim();
 const explicit=safeHttpUrl(book?.dlivrosUrl||"");
 if(explicit&&new URL(explicit).hostname.replace(/^www\./,"")==="dlivros.com")return explicit;
 const normalizedAuthor=normText(author);
 if(normText(title)==="phantastes"&&normalizedAuthor.includes("george")&&normalizedAuthor.includes("macdonald"))return"https://dlivros.com/livro/phantastes-george-macdonald";
 const terms=[title,author.split(",")[0].trim()].filter(Boolean).join(" ");
 return `https://dlivros.com/Buscar?q=${encodeURIComponent(terms)}`;
}
function bookCardHtml(b,i){
 const saved=bookSaved(b),read=bestBookRead(b),formats=bookFormatChoices(b),download=bestBookDownload(b);
 const cover=b.image?`<img src="${esc(b.image)}" alt="Capa de ${esc(b.title)}" loading="lazy" decoding="async">`:`<span aria-hidden="true">▧</span>`;
 return`<article class="bookCard"><div class="bookCover">${cover}</div><div class="bookInfo"><div class="bookTitle">${esc(b.title)}</div><div class="bookAuthor">${esc(b.authors||"Autor não informado")}${b.year?` • ${esc(b.year)}`:""}</div><div class="bookBadges"><span>${esc(b.source)}</span>${b.publicDomain?`<span class="free ${b.publicAccess?'publicAccess':''}">${b.publicAccess?'Acesso público':'Domínio público'}</span>`:""}${read?`<span class="bookPreferredBadge">${esc(read.label)}</span>`:""}</div><div class="bookSourceLine">${formats.length?`Formatos: ${esc([...new Set(formats.map(x=>x.label))].join(" • "))}`:"Consulte disponibilidade no dLivros"}</div>${b.publicDomain&&formats.length?`<div class="bookFormatRow">${formats.filter(x=>["pdf","epub","mobi"].includes(x.kind)).slice(0,4).map((x,j)=>`<button type="button" class="${j===0?"preferred":""} ${x.readable?"readable":""}" data-book-format="${i}" data-book-format-kind="${esc(x.kind)}" data-book-format-url="${esc(x.url)}">${x.readable?"▶":"⬇"} ${esc(x.label)}</button>`).join("")}</div>`:""}<div class="bookActions">${read&&b.publicDomain?`<button type="button" class="read" data-book-read="${i}">▶ Ler ${esc(read.label)}</button>`:""}${download?`<button type="button" data-book-download="${i}">⬇ Baixar</button>`:""}<a class="dlivrosBtn" href="${esc(dlivrosSearchUrl(b))}" target="_blank" rel="noopener noreferrer">Ver no dLivros ↗</a>${b.externalUrl?`<button type="button" data-book-open="${i}">Original ↗</button>`:""}<button type="button" class="bookSave ${saved?"saved":""}" data-book-save="${i}" aria-label="${saved?"Remover da estante":"Adicionar à estante"}">${saved?"✓":"＋"}</button></div></div></article>`
}
function bindBookCards(root,items){
 root.querySelectorAll("[data-book-read]").forEach(b=>b.onclick=()=>openBookReader(items[Number(b.dataset.bookRead)]));
 root.querySelectorAll("[data-book-format]").forEach(btn=>btn.onclick=()=>{
  const book=items[Number(btn.dataset.bookFormat)],choice={kind:btn.dataset.bookFormatKind,url:btn.dataset.bookFormatUrl,label:btn.textContent.trim().replace(/^▶|^⬇/,"").trim()};
  if(choice.kind==="pdf"||choice.kind==="epub")openBookReader(book,choice);else downloadBookChoice(book,choice)
 });
 root.querySelectorAll("[data-book-download]").forEach(b=>b.onclick=()=>downloadBook(items[Number(b.dataset.bookDownload)]));
 root.querySelectorAll("[data-book-open]").forEach(b=>b.onclick=()=>{const u=safeHttpUrl(items[Number(b.dataset.bookOpen)]?.externalUrl);if(u)window.open(u,"_blank","noopener,noreferrer")});
 root.querySelectorAll("[data-book-save]").forEach(b=>b.onclick=()=>{const x=items[Number(b.dataset.bookSave)];toggleBookSaved(x);const saved=bookSaved(x);b.textContent=saved?"✓":"＋";b.classList.toggle("saved",saved);b.setAttribute("aria-label",saved?"Remover da estante":"Adicionar à estante");if(S.booksTab==="library"&&!saved)runBookSearch(S.booksQuery)})
}
function renderBookFeature(items=[]){
 const root=$("#bookFeature");if(!root)return;
 const recent=lastBook(),book=recent?.book||bookLibrary()[0]||items[0];
 if(!book){root.innerHTML='<div class="bookFeatureEmpty"><span>▧</span><div><b>Sua próxima história começa aqui</b><p>Busque por título ou autor para montar sua estante.</p></div></div>';return}
 const choice=recent&&bookKey(recent.book)===bookKey(book)?recent.choice:bestBookRead(book),saved=bookSaved(book);
 root.innerHTML=`<div class="bookFeatureCover">${book.image?`<img src="${esc(book.image)}" alt="Capa de ${esc(book.title)}" decoding="async">`:'<span>▧</span>'}</div><div class="bookFeatureCopy"><small>${recent?"CONTINUE SUA HISTÓRIA":"DESTAQUE DA BIBLIOTECA"}</small><h3>${esc(book.title)}</h3><p class="bookFeatureAuthor">${esc(book.authors||"Autor não informado")}${book.year?` • ${esc(book.year)}`:""}</p><p class="bookFeatureDescription">${esc(book.description||"Leia, baixe quando a licença permitir ou consulte a edição disponível diretamente no dLivros.")}</p><div class="bookFeatureActions">${choice&&book.publicDomain?'<button type="button" class="primary" data-feature-read>▶ Continuar leitura</button>':""}<a href="${esc(dlivrosSearchUrl(book))}" target="_blank" rel="noopener noreferrer">Ver no dLivros ↗</a><button type="button" data-feature-save>${saved?"✓ Na estante":"＋ Estante"}</button></div></div>`;
 root.querySelector("[data-feature-read]")?.addEventListener("click",()=>openBookReader(book,choice));
 root.querySelector("[data-feature-save]")?.addEventListener("click",()=>{toggleBookSaved(book);renderBookFeature(items)});
}
async function runBookSearch(q=S.booksQuery){
 const root=$("#bookResults");if(!root)return;
 S.booksQuery=String(q||"").trim();
 if(S.booksTab==="library"){
  const items=bookLibrary();S.bookResults=items;renderBookFeature(items);$("#bookResultMeta").textContent=`${items.length} livro(s) na estante`;
  root.innerHTML=items.length?`<div class="bookGrid">${items.map(bookCardHtml).join("")}</div>`:'<div class="mediaEmpty"><b>Sua estante está vazia.</b>Adicione livros pelos resultados da busca.</div>';
  if(items.length)bindBookCards(root,items);return
 }
 if(S.booksQuery.length===1){renderBookFeature([]);root.innerHTML='<div class="mediaEmpty"><b>Continue digitando.</b>Use pelo menos dois caracteres para pesquisar.</div>';$("#bookResultMeta").textContent="";return}
 const token=++S.searchToken;root.innerHTML='<div class="loading">Buscando livros em português…</div>';
 try{
  let items=[];
  if(S.booksTab==="free"){
   items=dedupeBooks([...(await searchGutendexBooks(S.booksQuery).catch(()=>[])),...(await customBookResults(S.booksQuery).catch(()=>[])).filter(x=>x.publicDomain)])
  }else{
   const discoveryQuery=S.booksQuery||"literatura";
   const[ol,gut,custom]=await Promise.all([searchOpenLibraryBooks(discoveryQuery).catch(()=>[]),searchGutendexBooks(S.booksQuery).catch(()=>[]),customBookResults(S.booksQuery).catch(()=>[])]);
   items=dedupeBooks([...gut,...ol,...custom])
  }
  if(token!==S.searchToken)return;
  S.bookResults=items;renderBookFeature(items);
  $("#bookResultMeta").textContent=S.booksQuery?`${items.length} resultado(s) para “${S.booksQuery}”`:`${items.length} livros selecionados em português`;
  root.innerHTML=items.length?`<div class="bookGrid">${items.map(bookCardHtml).join("")}</div>`:'<div class="mediaEmpty"><b>Nenhum livro encontrado.</b>Tente outro título ou autor.</div>';
  if(items.length){bindBookCards(root,items);runWhenIdle(()=>hydrateBookFormatsProgressively(items,root))}
 }catch(e){console.error(e);renderBookFeature([]);root.innerHTML='<div class="mediaEmpty"><b>A busca falhou.</b>Confira as fontes de livros.</div>'}
}
const BOOK_CATEGORIES=[
 ["romance","Romance"],["biography","Biografias"],["adventure","Ficção e aventura"],
 ["fantasy","Fantasia"],["science fiction","Ficção científica"],["mystery","Policial e mistério"],
 ["poetry","Poesia"],["history","História"],["juvenile literature","Infantojuvenil"]
];
async function booksPage(){
 S.currentPage="books";setActiveNav("books");unlockMobileDocument();scrollPageTop();toggleCategoryMega(false);
 $("#page").classList.remove("searchPage","animePageModern");$("#page").classList.add("booksPageModern");
 $("#hero").classList.add("hidden");$("#main").classList.add("hidden");$("#page").classList.remove("hidden");$("#pageTitle").textContent="Livros";
 $("#pageBody").innerHTML=`<div class="bookLibraryShell">
  <section class="bookLibraryHero"><div class="bookLibraryIntro"><small>BIBLIOTECA RESENHAFLIX</small><h2>Continue sua história.</h2><p>Encontre edições em português, leia sem sair do ResenhaFlix e acesse cada livro diretamente no dLivros.</p><div class="bookHeroSearch"><span aria-hidden="true">⌕</span><input id="bookSearchInput" placeholder="Busque livro, autor ou edição…" value="${esc(S.booksQuery)}" autocomplete="off" aria-label="Buscar livros"><button type="button" id="bookSearchBtn">Buscar</button></div></div><div class="bookFeature" id="bookFeature"><div class="bookFeatureEmpty"><span>▧</span><div><b>Carregando sua biblioteca…</b></div></div></div></section>
  <div class="bookLibraryTools"><div class="mediaTabs" id="bookTabs"><button data-book-tab="all">Explorar</button><button data-book-tab="free">Grátis</button><button data-book-tab="library">Minha estante</button></div><button type="button" class="mediaSourcesBtn" id="openBookSources">⚙ Fontes</button></div>
  <div class="bookCategoryStrip" id="bookCategoryStrip">${BOOK_CATEGORIES.map(([q,n])=>`<button type="button" data-book-category="${esc(q)}">${esc(n)}</button>`).join("")}</div>
  <section class="bookShelf"><div class="bookShelfHead"><div><small>COLEÇÃO</small><h3>Livros para você</h3></div><div class="mediaResultMeta" id="bookResultMeta"></div></div><div id="bookResults"></div></section>
 </div>`;
 const input=$("#bookSearchInput"),sync=()=>{$$("#bookTabs [data-book-tab]").forEach(b=>b.classList.toggle("active",b.dataset.bookTab===S.booksTab))};
 $("#openBookSources").onclick=()=>openMediaSources("books");$("#bookSearchBtn").onclick=()=>runBookSearch(input.value);
 input.onkeydown=e=>{if(e.key==="Enter"){runBookSearch(input.value);input.blur()}};
 $$("#bookTabs [data-book-tab]").forEach(b=>b.onclick=()=>{S.booksTab=b.dataset.bookTab;sync();runBookSearch(input.value)});
 $$("#bookCategoryStrip [data-book-category]").forEach(b=>b.onclick=()=>{S.booksTab="all";sync();input.value=b.dataset.bookCategory;S.booksQuery=input.value;runBookSearch(input.value)});
 sync();runBookSearch(S.booksQuery);
}

let epubLibPromise=null,bookReaderBookObject=null;
function ensureEpubJs(){if(window.ePub)return Promise.resolve(window.ePub);if(epubLibPromise)return epubLibPromise;epubLibPromise=new Promise((resolve,reject)=>{const load=(src,done)=>{const s=document.createElement("script");s.src=src;s.async=true;s.onload=done;s.onerror=()=>reject(new Error("Falha ao carregar leitor EPUB"));document.head.appendChild(s)},next=()=>load("https://cdn.jsdelivr.net/npm/epubjs@0.3.93/dist/epub.min.js",()=>resolve(window.ePub));if(window.JSZip)next();else load("https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js",next)});return epubLibPromise}
function resetBookReader(){if(S.bookReaderRendition){try{S.bookReaderRendition.destroy()}catch{}S.bookReaderRendition=null}if(bookReaderBookObject){try{bookReaderBookObject.destroy()}catch{}bookReaderBookObject=null}$("#bookEpubArea").innerHTML="";$("#bookEpubArea").classList.remove("active");$("#bookHtmlFrame").classList.remove("active");$("#bookHtmlFrame").src="about:blank";$("#bookTextReader").classList.remove("active");$("#bookTextReader").textContent=""}
async function openBookReader(b,forcedChoice=null){const choice=forcedChoice||bestBookRead(b);if(!choice)return b.externalUrl&&window.open(b.externalUrl,"_blank","noopener,noreferrer");S.bookReaderBook=b;rememberLastBook(b,choice);resetBookReader();$("#bookReaderTitle").textContent=b.title;$("#bookReaderMeta").textContent=`${b.authors||"Autor não informado"} • ${choice.label}`;$("#bookReaderExternal").onclick=()=>window.open(b.externalUrl||choice.url,"_blank","noopener,noreferrer");$("#bookReaderLoading").textContent="Preparando livro…";$("#bookReaderLoading").classList.remove("hidden");$("#bookReaderModal").classList.add("open");document.body.classList.add("bookReaderOpen");try{if(choice.kind==="epub"){await ensureEpubJs();$("#bookEpubArea").classList.add("active");bookReaderBookObject=ePub(choice.url);S.bookReaderRendition=bookReaderBookObject.renderTo("bookEpubArea",{width:"100%",height:"100%",spread:"none"});await S.bookReaderRendition.display();$("#bookReaderStatus").textContent="EPUB"}else if(choice.kind==="text"){const r=await fetch(choice.url);if(!r.ok)throw Error("Texto "+r.status);$("#bookTextReader").textContent=await r.text();$("#bookTextReader").classList.add("active");$("#bookReaderStatus").textContent="Texto"}else{$("#bookHtmlFrame").src=choice.url;$("#bookHtmlFrame").classList.add("active");$("#bookReaderStatus").textContent=choice.kind.toUpperCase()}$("#bookReaderLoading").classList.add("hidden")}catch(e){console.warn(e);$("#bookReaderLoading").textContent="Não consegui abrir dentro do leitor. Use “Abrir original”."}}
function closeBookReader(){resetBookReader();$("#bookReaderModal").classList.remove("open");document.body.classList.remove("bookReaderOpen")}
function downloadBookChoice(b,d){if(!b?.publicDomain||!d?.url)return toast("Este formato não está liberado para download.");const u=safeHttpUrl(d.url);if(!u)return;const a=document.createElement("a");a.href=u;a.target="_blank";a.rel="noopener noreferrer";a.download="";document.body.appendChild(a);a.click();a.remove()}
function downloadBook(b){const d=bestBookDownload(b);if(!d)return toast("Este livro não possui download liberado.");downloadBookChoice(b,d)}

function openMediaSources(){S.mediaSourceTab="books";$("#booksOpenLibraryUrl").value=mediaCfg.booksOpenLibrary;$("#booksGutendexUrl").value=mediaCfg.booksGutendex;$("#booksJsonUrls").value=mediaCfg.booksJsonUrls;$$("[data-media-source-tab]").forEach(b=>b.classList.add("active"));$$("[data-media-source-pane]").forEach(x=>x.classList.add("active"));$("#mediaSourcesModal").classList.add("open");document.body.classList.add("mediaSourcesOpen")}
function closeMediaSources(){$("#mediaSourcesModal").classList.remove("open");document.body.classList.remove("mediaSourcesOpen")}
function saveMediaSourceSettings(){mediaCfg.booksOpenLibrary=$("#booksOpenLibraryUrl").value.trim()||MEDIA_DEFAULT.booksOpenLibrary;mediaCfg.booksGutendex=$("#booksGutendexUrl").value.trim()||MEDIA_DEFAULT.booksGutendex;mediaCfg.booksJsonUrls=$("#booksJsonUrls").value.trim();localStorage.setItem("rf24_books_openlibrary",mediaCfg.booksOpenLibrary);localStorage.setItem("rf24_books_gutendex",mediaCfg.booksGutendex);localStorage.setItem("rf24_books_json_urls",mediaCfg.booksJsonUrls);closeMediaSources();toast("Fontes de livros salvas.")}
let currentAnimeSpotlightIndex = 0;
let animeSpotlightItems = [];

async function animePage(initialGenre = "all") {
  S.currentPage = "anime";
  S.pageTypeForCategories = "anime";
  S.pageCategory = initialGenre || "all";
  setActiveNav("anime");
  unlockMobileDocument();
  scrollPageTop();
  toggleCategoryMega(false);

  $("#page").classList.remove("searchPage", "booksPageModern");
  $("#page").classList.add("animePageModern");
  $("#hero").classList.add("hidden");
  $("#main").classList.add("hidden");
  $("#page").classList.remove("hidden");
  $("#pageTitle").textContent = "Animes";
  $("#pageBody").innerHTML = '<div class="loading">Carregando portal de animes...</div>';

  try {
    const [animeMovies, animeSeries] = await Promise.all([
      freshCatalog("movie", "top", { genre: "Animation" }, cfg.meta, "anime-movies"),
      freshCatalog("series", "top", { genre: "Animation" }, cfg.meta, "anime-series")
    ]);

    if (S.currentPage !== "anime") return;

    const combinedCatalog = dedupeMetas([...animeSeries, ...animeMovies]);

    const spotlightCandidates = combinedCatalog.slice(0, 6);
    animeSpotlightItems = spotlightCandidates.length ? spotlightCandidates : combinedCatalog.slice(0, 5);
    currentAnimeSpotlightIndex = 0;

    const genres = [
      ["all", "Todos (A–Z)"],
      ["Shonen", "Shonen"],
      ["Ação", "Ação"],
      ["Isekai", "Isekai"],
      ["Romance", "Romance"],
      ["Fantasia", "Fantasia"],
      ["Sci-Fi", "Ficção Científica"],
      ["Sobrenatural", "Sobrenatural"],
      ["Seinen", "Seinen"],
      ["Comédia", "Comédia"],
      ["Aventura", "Aventura"]
    ];

    let filteredItems = combinedCatalog;
    if (S.pageCategory && S.pageCategory !== "all") {
      const gNorm = normText(S.pageCategory);
      filteredItems = combinedCatalog.filter(item => {
        const itemGenres = (item.genres || []).map(normText).join(" ");
        const name = normText(item.name || "");
        return itemGenres.includes(gNorm) || name.includes(gNorm);
      });
      if (!filteredItems.length) filteredItems = combinedCatalog;
    }

    const top10Animes = combinedCatalog.slice(0, 10);
    const seasonReleases = combinedCatalog.slice(4, 16);
    const dubbedAnimes = combinedCatalog.filter(x => isAnimeLike(x)).slice(8, 20);
    const classics = combinedCatalog.slice(12, 24);

    const firstSpotlight = animeSpotlightItems[0] || {};

    const shellHtml = `
      <div class="animePageShell">
        <section class="animeSpotlight" id="animeSpotlightContainer">
          <div class="animeSpotlightBg" id="animeSpotlightBg" style="background-image: url('${esc(firstSpotlight.background || firstSpotlight.poster || "")}')"></div>
          <div class="animeSpotlightGradient"></div>
          <div class="animeSpotlightGrid">
            <div class="animeSpotlightMain">
              <div class="animeSpotlightBadge" id="animeSpotlightBadge">#1 SPOTLIGHT</div>
              <h1 class="animeSpotlightTitle" id="animeSpotlightTitle">${esc(firstSpotlight.name || "Anime em Destaque")}</h1>
              <p class="animeSpotlightDesc" id="animeSpotlightDesc">${esc(firstSpotlight.description || "Assista a episódios legendados e dublados em alta definição.")}</p>
              <div class="animeSpotlightActions">
                <button type="button" class="btn primary" id="animeSpotlightWatch">▶ EXPLORAR ANIME</button>
                <button type="button" class="btn secondary" id="animeSpotlightSave">＋ Minha Lista</button>
              </div>
              <div class="animeSpotlightControls">
                <button type="button" class="animeControlBtn" id="animeSpotlightPrev" aria-label="Anime anterior">‹</button>
                <button type="button" class="animeControlBtn" id="animeSpotlightNext" aria-label="Próximo anime">›</button>
                <span id="animeSpotlightCounter" style="font-size:12px;color:var(--rf-muted);margin-left:8px;font-weight:700">1 / ${animeSpotlightItems.length || 1}</span>
              </div>
            </div>
            <div class="animeFeaturedStack" id="animeFeaturedStack">
              ${animeSpotlightItems.slice(1, 5).map((item, idx) => `
                <div class="animeMiniCard" data-spotlight-jump="${idx + 1}" title="${esc(item.name || "")}">
                  <img src="${esc(item.poster || item.background || "")}" alt="${esc(item.name || "")}" loading="lazy">
                </div>
              `).join("")}
            </div>
          </div>
        </section>

        <div class="animeGenreBar">
          ${genres.map(([gKey, gLabel]) => `
            <button type="button" class="animeGenreChip ${S.pageCategory === gKey ? "active" : ""}" data-anime-genre="${esc(gKey)}">
              ${esc(gLabel)}
            </button>
          `).join("")}
        </div>

        ${top10Row("Top 10 Animes no Brasil", top10Animes, "Os animes mais assistidos da temporada")}

        ${row("Lançamentos da Temporada", seasonReleases, "Episódios novos toda semana")}
        ${row("Animes Dublados em Português", dubbedAnimes.length ? dubbedAnimes : combinedCatalog.slice(6, 18), "Áudio em PT-BR")}
        ${row("Clássicos Obrigatórios", classics.length ? classics : combinedCatalog.slice(10, 22), "Obras consagradas")}

        <section class="section" style="margin-top: 30px;">
          <div class="sectionHead">
            <div class="sectionTitle">Catálogo de Animes ${S.pageCategory !== "all" ? `— ${esc(S.pageCategory)}` : ""}</div>
            <div class="sectionSub">${filteredItems.length} animes disponíveis</div>
          </div>
          <div class="grid" id="animeCatalogGrid">
            ${filteredItems.map(card).join("")}
          </div>
        </section>
      </div>
    `;

    $("#pageBody").innerHTML = shellHtml;
    bindCards($("#pageBody"));
    initCarousels($("#pageBody"));

    bindAnimeSpotlight();

    $$("[data-anime-genre]").forEach(chip => {
      chip.onclick = () => {
        const g = chip.dataset.animeGenre;
        animePage(g);
      };
    });
  } catch (err) {
    console.error(err);
    $("#pageBody").innerHTML = '<div class="empty">Não foi possível carregar a página de animes.</div>';
  }
}

function updateAnimeSpotlight(index) {
  if (!animeSpotlightItems.length) return;
  currentAnimeSpotlightIndex = (index + animeSpotlightItems.length) % animeSpotlightItems.length;
  const item = animeSpotlightItems[currentAnimeSpotlightIndex];
  if (!item) return;

  const bg = $("#animeSpotlightBg");
  const badge = $("#animeSpotlightBadge");
  const title = $("#animeSpotlightTitle");
  const desc = $("#animeSpotlightDesc");
  const counter = $("#animeSpotlightCounter");
  const watchBtn = $("#animeSpotlightWatch");
  const saveBtn = $("#animeSpotlightSave");

  if (bg) bg.style.backgroundImage = `url('${item.background || item.poster || ""}')`;
  if (badge) badge.textContent = `#${currentAnimeSpotlightIndex + 1} SPOTLIGHT`;
  if (title) title.textContent = item.name || "Anime";
  if (desc) desc.textContent = item.description || "Assista aos episódios completos.";
  if (counter) counter.textContent = `${currentAnimeSpotlightIndex + 1} / ${animeSpotlightItems.length}`;

  if (watchBtn) watchBtn.onclick = () => openDetails(item.type || "series", item.id);
  if (saveBtn) {
    const saved = lists().some(x => x.id === item.id);
    saveBtn.textContent = saved ? "✓ Na minha lista" : "＋ Minha Lista";
    saveBtn.onclick = () => {
      toggleCurrentList(item);
      const isNowSaved = lists().some(x => x.id === item.id);
      saveBtn.textContent = isNowSaved ? "✓ Na minha lista" : "＋ Minha Lista";
    };
  }
}

function bindAnimeSpotlight() {
  updateAnimeSpotlight(0);

  const prevBtn = $("#animeSpotlightPrev");
  const nextBtn = $("#animeSpotlightNext");
  if (prevBtn) prevBtn.onclick = () => updateAnimeSpotlight(currentAnimeSpotlightIndex - 1);
  if (nextBtn) nextBtn.onclick = () => updateAnimeSpotlight(currentAnimeSpotlightIndex + 1);

  $$("[data-spotlight-jump]").forEach(card => {
    card.onclick = () => {
      const idx = Number(card.dataset.spotlightJump);
      updateAnimeSpotlight(idx);
    };
  });
}

async function page(type,initialCategory="all"){
 if(type==="trending")return trendingPage();
 if(type==="anime")return animePage(initialCategory);
 if(type==="books")return booksPage();
 S.currentPage=type;S.pageTypeForCategories=type;S.pageCategory=initialCategory||"all";
 S.pageVisibleLimit=18;S.pageInfiniteObserver?.disconnect?.();S.pageInfiniteObserver=null;
 setActiveNav(type);unlockMobileDocument();scrollPageTop();toggleCategoryMega(false);
 $("#page").classList.remove("searchPage","booksPageModern","animePageModern");
 $("#hero").classList.add("hidden");$("#main").classList.add("hidden");$("#page").classList.remove("hidden");
 const titles={movies:"Filmes",series:"Séries",anime:"Animes",list:"Minha lista"};
 $("#pageTitle").textContent=titles[type]||"Catálogo";
 $("#pageBody").innerHTML='<div class="loading">Carregando...</div>';
 try{
  const allItems=await fetchCatalogPageItems(type,S.pageCategory);
  if(S.currentPage!==type)return;
  S.pageItems=allItems;
  if(type==="list")renderMyListWorkspace(allItems);
  else{
   $("#pageBody").innerHTML=renderCategoryBar(type,allItems)+`<div id="pageCatalogResults"></div>`;
   renderPageCatalogResults(allItems);bindCategoryBar();renderCategoryMega();
  }
 }catch(e){
  console.error(e);$("#pageBody").innerHTML='<div class="empty">Não foi possível carregar esta página.</div>';
 }
}

function searchCounts(){
 const all=S.searchItems||[];
 return {
  all,
  movie:all.filter(x=>x.type==="movie"),
  series:all.filter(x=>x.type==="series"),
  anime:all.filter(isAnimeLike)
 };
}

function syncSearchField(input,value){
 if(!input||document.activeElement===input||input.value===value)return;
 input.value=value;
}

function ensureSearchShell(){
 $("#pageTitle").textContent="Buscar";
 $("#page").classList.add("searchPage");
 let shell=$("#searchShell");
 if(shell)return shell;
 $("#pageBody").innerHTML=`<div id="searchShell">
   <div class="crSearchBar">
    <div class="crSearchInputWrap">
     <span class="crSearchIcon">⌕</span>
     <input id="pageSearchInput" placeholder="Buscar filmes, séries, animes e livros..." autocomplete="off" inputmode="search" aria-label="Buscar filmes, séries, animes e livros">
     <button type="button" class="crSearchClose" id="pageSearchClose" aria-label="Fechar busca">✕</button>
    </div>
   </div>
   <div class="searchContent">
    <div class="searchTabs" id="searchTabs"></div>
    <div class="searchMeta" id="searchMeta"></div>
    <div id="searchResultsArea"></div>
   </div>
  </div>`;
 const inp=$("#pageSearchInput");
 inp.value=S.searchQuery||"";
 let timer;
 inp.addEventListener("input",e=>{
  clearTimeout(timer);
  const value=e.target.value;
  const delay=value.trim().length<2?140:480;
  timer=setTimeout(()=>search(value,false),delay);
 });
 inp.addEventListener("keydown",e=>{
  if(e.isComposing)return;
  if(e.key==="Enter"){
   clearTimeout(timer);e.preventDefault();search(e.target.value,true);e.target.blur();
  }
  if(e.key==="Escape"){e.preventDefault();home()}
 });
 $("#pageSearchClose").onclick=()=>home();
 return $("#searchShell");
}
function searchResultItem(m){
 const saved=lists().some(x=>x.id===m.id&&String(x.type||"movie")===String(m.type||"movie"));
 const label=isAnimeLike(m)?"Anime":(m.type==="series"?"Série":"Filme");
 return `<article class="searchResultItem" data-search-id="${esc(m.id)}" data-search-type="${esc(m.type||"movie")}">
   <div class="searchResultThumb" style="background-image:url('${esc(m.background||m.poster||"")}')"></div>
   <div class="searchResultInfo">
    <div class="searchResultTitle">${esc(m.name||"Sem título")}</div>
    <div class="searchResultMeta">${[m.year,label,m.imdbRating?`★ ${m.imdbRating}`:""].filter(Boolean).map(esc).join(" • ")}</div>
    <div class="searchResultGenres">${esc((m.genres||[]).slice(0,4).join(" • "))}</div>
   </div>
   <button type="button" class="searchResultPlus ${saved?"saved":""}" data-search-plus="${esc(m.id)}" data-search-plus-type="${esc(m.type||"movie")}" title="${saved?"Remover da minha lista":"Adicionar à minha lista"}">${saved?"✓":"+"}</button>
  </article>`;
}
function bindSearchResultItems(root,items){
 root.querySelectorAll(".searchResultItem").forEach(el=>el.onclick=e=>{
  if(e.target.closest("[data-search-plus]"))return;
  openDetails(el.dataset.searchType,el.dataset.searchId);
 });
 root.querySelectorAll("[data-search-plus]").forEach(b=>b.onclick=e=>{
  e.stopPropagation();
  const m=items.find(x=>x.id===b.dataset.searchPlus&&String(x.type||"movie")===String(b.dataset.searchPlusType||"movie"));
  if(m)S.itemCache.set(`${m.type||"movie"}|${m.id}`,m);
  toggleListById(b.dataset.searchPlus,b.dataset.searchPlusType,b);
  const saved=lists().some(x=>x.id===b.dataset.searchPlus&&String(x.type||"movie")===String(b.dataset.searchPlusType||"movie"));
  b.classList.toggle("saved",saved);b.textContent=saved?"✓":"+";
 });
}
function renderSearchResults(){
 ensureSearchShell();
 const groups=searchCounts();
 const shown=S.searchFilter==="movie"?groups.movie:S.searchFilter==="series"?groups.series:S.searchFilter==="anime"?groups.anime:groups.all;
 const tabs=[
  ["all",`Todos (${groups.all.length})`],
  ["movie",`Filmes (${groups.movie.length})`],
  ["series",`Séries (${groups.series.length})`],
  ["anime",`Animes (${groups.anime.length})`]
 ];
 $("#searchTabs").innerHTML=tabs.map(([k,t])=>`<button type="button" data-search-filter="${k}" class="${S.searchFilter===k?"active":""}">${t}</button>`).join("");
 $("#searchTabs").querySelectorAll("[data-search-filter]").forEach(b=>b.onclick=()=>{S.searchFilter=b.dataset.searchFilter;renderSearchResults()});
 const q=S.searchQuery;
 $("#searchMeta").textContent=q?`${shown.length} resultado(s) para “${q}”`:"Digite pelo menos 2 caracteres para pesquisar.";
 const area=$("#searchResultsArea");
 if(!shown.length){
  area.innerHTML=`<div class="empty">${q?"Nenhum resultado encontrado. Tente parte do nome ou o título original.":"Comece digitando acima."}</div>`;
 }else if(innerWidth<=760){
  area.innerHTML=`<div class="searchResultList">${shown.map(searchResultItem).join("")}</div>`;
  bindSearchResultItems(area,shown);
 }else{
  area.innerHTML=`<div class="searchDesktopGrid">${shown.map(card).join("")}</div>`;
  bindCards(area);
 }
 syncSearchField($("#pageSearchInput"),q);
}

function renderSearchLoading(){
 ensureSearchShell();
 syncSearchField($("#pageSearchInput"),S.searchQuery);
 $("#searchMeta").textContent=`Pesquisando “${S.searchQuery}”...`;
 $("#searchResultsArea").innerHTML=`<div class="searchLoading"><span>Buscando em vários catálogos</span><i class="searchDot"></i><i class="searchDot"></i><i class="searchDot"></i></div>`;
}
function globalSectionShell(id,title,sub="",opts={}){
 const toggle=opts.videoToggle?'<button type="button" data-global-video-toggle aria-expanded="false" disabled>Ver mais</button>':"";
 const carousel=opts.carousel?'<button type="button" class="carouselArrow" data-carousel-dir="-1" aria-label="Ver resultados anteriores">‹</button><button type="button" class="carouselArrow" data-carousel-dir="1" aria-label="Ver próximos resultados">›</button>':"";
 return `<section class="globalSearchSection" data-global-section="${esc(id)}"><div class="globalSearchHead"><h3>${esc(title)}</h3>${sub?`<small>${esc(sub)}</small>`:""}<div class="globalSearchActions">${toggle}${carousel}</div></div><div id="${id}" class="globalSearchLoading">Buscando…</div></section>`
}
function globalSearchVideoHtml(items,expanded=S.globalVideosExpanded){
 const shown=expanded?items:items.slice(0,12);
 return items.length?`<div class="globalSearchRow ${expanded?"is-expanded":""}" data-carousel tabindex="0" aria-label="Resultados de filmes, séries e animes; ${expanded?"todos exibidos":"deslize para ver mais"}">${shown.map(card).join("")}</div>`:'<div class="mediaEmpty">Nenhum filme, série ou anime.</div>'
}
function renderGlobalVideoResults(){
 const el=$("#globalVideos");if(!el)return;
 const items=S.globalVideoResults||[],section=el.closest(".globalSearchSection"),toggle=section?.querySelector("[data-global-video-toggle]");
 el.innerHTML=globalSearchVideoHtml(items,S.globalVideosExpanded);
 section?.classList.toggle("is-expanded",S.globalVideosExpanded);
 if(toggle){toggle.disabled=!items.length;toggle.textContent=S.globalVideosExpanded?"Ver menos":"Ver mais";toggle.setAttribute("aria-expanded",S.globalVideosExpanded?"true":"false")}
 if(items.length)bindCards(el);
 initCarousels(el);
}
function globalSearchBooksHtml(items){
 return items.length?`<div class="globalBookGrid">${items.slice(0,8).map(bookCardHtml).join("")}</div>`:'<div class="mediaEmpty">Nenhum livro encontrado.</div>'
}
document.addEventListener("click",e=>{
 const toggle=e.target.closest("[data-global-video-toggle]");if(!toggle)return;
 S.globalVideosExpanded=!S.globalVideosExpanded;renderGlobalVideoResults();
});
async function search(rawQuery,force=false){
 const raw=String(rawQuery||""),q=raw.trim(),sourceId=document.activeElement?.id||"";
 S.currentPage="search";S.searchQuery=q;
 $("#hero").classList.add("hidden");$("#main").classList.add("hidden");$("#page").classList.remove("hidden");
 $("#page").classList.add("searchPage");setActiveNav("search");ensureSearchShell();
 const displayValue=(sourceId==="pageSearchInput"||sourceId==="search")?raw:q;
 syncSearchField($("#pageSearchInput"),displayValue);
 syncSearchField($("#search"),displayValue);
 if(q.length<2){
  ++S.searchToken;
  S.lastGlobalSearchQuery="";
  $("#searchTabs").innerHTML="";$("#searchMeta").textContent="Pesquisa global";
  $("#searchResultsArea").innerHTML='<div class="mediaEmpty"><b>Pesquise em todo o ResenhaFlix.</b>Filmes, séries, animes e livros aparecem juntos.</div>';
  return
 }
 if(!force&&S.lastGlobalSearchQuery===q&&$("#globalVideos"))return;
 S.lastGlobalSearchQuery=q;
 const token=++S.searchToken;
 S.globalVideoResults=[];S.globalVideosExpanded=false;
 $("#searchTabs").innerHTML="";
 $("#searchMeta").textContent=`Resultados globais para “${q}”`;
 $("#searchResultsArea").innerHTML=`<div class="globalSearchIntro"><div><h2>${esc(q)}</h2><p>Filmes, séries, animes e livros carregados em paralelo.</p></div></div>
  ${globalSectionShell("globalVideos","Filmes, séries e animes","",{carousel:true,videoToggle:true})}
  ${globalSectionShell("globalBooks","Livros")}`;

 const jobs=[
  (async()=>{try{const items=await searchAllCatalogs(q);if(token!==S.searchToken)return;S.globalVideoResults=items;renderGlobalVideoResults()}catch{$("#globalVideos").innerHTML='<div class="globalSearchError">Falha ao buscar vídeos.</div>'}})(),
  (async()=>{try{
    const [ol,gut]=await Promise.all([searchOpenLibraryBooks(q).catch(()=>[]),searchGutendexBooks(q).catch(()=>[])]);
    if(token!==S.searchToken)return;const items=dedupeBooks([...gut,...ol]);const el=$("#globalBooks");el.innerHTML=globalSearchBooksHtml(items);if(items.length){bindBookCards(el,items);runWhenIdle(()=>hydrateBookFormatsProgressively(items,el))}
   }catch{$("#globalBooks").innerHTML='<div class="globalSearchError">Falha ao buscar livros.</div>'}})()
 ];
 Promise.allSettled(jobs)
}

$("#heroWatch").onclick=()=>S.hero&&openDetails(S.hero.type,S.hero.id);
$("#heroDetails").onclick=()=>S.hero&&openDetails(S.hero.type,S.hero.id);

function unlockMobileDocument(){
 if(innerWidth>760)return;
 const body=document.body,doc=document.documentElement;
 if(!$("#playerModal").classList.contains("open")){
  body.style.removeProperty("overflow");
  body.style.removeProperty("position");
  body.style.removeProperty("height");
  doc.style.removeProperty("overflow");
  doc.style.removeProperty("height");
 }
}
function scrollPageTop(){
 const reduced=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
 requestAnimationFrame(()=>{try{window.scrollTo({top:0,left:0,behavior:reduced||innerWidth<=760?"auto":"smooth"})}catch{window.scrollTo(0,0)}});
}
function repairTouchState(){
 const body=document.body;
 if(!$("#playerModal").classList.contains("open"))body.classList.remove("playerOpen");
 if(!$("#detailModal").classList.contains("open"))body.classList.remove("detailOpen");
 if(!$("#settingsModal").classList.contains("open"))body.classList.remove("settingsOpen");
 if(!$("#mediaSourcesModal").classList.contains("open"))body.classList.remove("mediaSourcesOpen");if(!$("#bookReaderModal").classList.contains("open"))body.classList.remove("bookReaderOpen");
 if(!$("#playerMenu").classList.contains("open")){
  $("#playerMenuBackdrop").classList.remove("open");
  S.playerMenuKind=null;
 }
 unlockMobileDocument();
}
function closeTransientUI(){
 $("#playerMenu").classList.remove("open");
 $("#playerMenuBackdrop").classList.remove("open");
 S.playerMenuKind=null;
 closeMobileSearch();
 repairTouchState();
}
function setActiveNav(target){
 $$(".nav button").forEach(x=>x.classList.toggle("active",x.dataset.page===target));
 $$("[data-mobile-page]").forEach(x=>{
  const active=x.dataset.mobilePage===target;x.classList.toggle("active",active);
  if(active)x.setAttribute("aria-current","page");else x.removeAttribute("aria-current");
 });
 $$("[data-mobile-destination]").forEach(x=>{
  const active=x.dataset.mobileDestination===target;x.classList.toggle("active",active);
  if(active)x.setAttribute("aria-current","page");else x.removeAttribute("aria-current");
 });
 const mobileSearch=$("[data-mobile-search]");
 if(mobileSearch){
  const active=target==="search";mobileSearch.classList.toggle("active",active);
  if(active)mobileSearch.setAttribute("aria-current","page");else mobileSearch.removeAttribute("aria-current");
 }
 const more=$("#mobileNavMore"),moreActive=MOBILE_NAV_IDS.has(target)&&!mobileNavPreferences.includes(target);
 if(more){more.classList.toggle("active",moreActive);if(moreActive)more.setAttribute("aria-current","page");else more.removeAttribute("aria-current")}
}
$("#closeMediaSources").onclick=closeMediaSources;
$("#mediaSourcesModal").onclick=e=>{if(e.target.id==="mediaSourcesModal")closeMediaSources()};
$$("#mediaSourcesModal [data-media-source-tab]").forEach(b=>b.onclick=()=>openMediaSources(b.dataset.mediaSourceTab));
$("#saveMediaSources").onclick=saveMediaSourceSettings;
$("#resetMediaSources").onclick=()=>{mediaCfg.booksOpenLibrary=MEDIA_DEFAULT.booksOpenLibrary;mediaCfg.booksGutendex=MEDIA_DEFAULT.booksGutendex;mediaCfg.booksJsonUrls="";localStorage.removeItem("rf24_books_openlibrary");localStorage.removeItem("rf24_books_gutendex");localStorage.removeItem("rf24_books_json_urls");openMediaSources();toast("Fontes de livros restauradas.")};
$("#booksJsonFile").onchange=e=>importJsonFile("books",e.target.files?.[0]);
$("#closeBookReader").onclick=closeBookReader;$("#bookReaderCloseX").onclick=closeBookReader;
$("#bookReaderModal").onclick=e=>{if(e.target.id==="bookReaderModal")closeBookReader()};
$("#bookPrevPage").onclick=()=>{if(S.bookReaderRendition)S.bookReaderRendition.prev()};
$("#bookNextPage").onclick=()=>{if(S.bookReaderRendition)S.bookReaderRendition.next()};
$("#logoHome").onclick=()=>{closeTransientUI();home()};
$("#categoriesNavBtn").onclick=e=>{e.stopPropagation();toggleCategoryMega()};
$("#categoryMegaBackdrop").onclick=()=>toggleCategoryMega(false);
$$("#categoryMega [data-category-page]").forEach(b=>b.onclick=()=>{toggleCategoryMega(false);page(b.dataset.categoryPage)});

$$("[data-page]").forEach(b=>b.onclick=()=>{closeTransientUI();setActiveNav(b.dataset.page);if(b.dataset.page==="home")home();else page(b.dataset.page)});
$("#mobileBottomNav").onclick=e=>{
 const destination=e.target.closest("[data-mobile-page]");
 if(destination){navigateMobileDestination(destination.dataset.mobilePage);return}
 if(e.target.closest("[data-mobile-search]")){openMobileSearch();return}
 if(e.target.closest("[data-mobile-more]"))openMobileNavMenu();
};
$("#mobileNavMenuBackdrop").onclick=()=>closeMobileNavMenu();
$("#mobileNavMenuClose").onclick=()=>closeMobileNavMenu();
$("#mobileNavEditToggle").onclick=()=>{mobileNavEditorOpen=!mobileNavEditorOpen;renderMobileNavMenu()};
$("#mobileNavMenu").onclick=e=>{
 const destination=e.target.closest("[data-mobile-destination]");
 if(destination){navigateMobileDestination(destination.dataset.mobileDestination);return}
 if(e.target.closest("[data-mobile-settings]")){closeMobileNavMenu(false);$("#settingsBtn").click();return}
 const move=e.target.closest("[data-mobile-nav-move]");
 if(move)moveMobileNavPreference(move.dataset.mobileNavId,move.dataset.mobileNavMove);
};
$("#mobileNavMenu").onchange=e=>{
 const input=e.target.closest("[data-mobile-preference]");
 if(input)updateMobileNavPreference(input.dataset.mobilePreference,input.checked);
};
$("#mobileNavMenuPanel").addEventListener("keydown",e=>{
 if(e.key==="Escape"){e.preventDefault();closeMobileNavMenu();return}
 if(e.key!=="Tab")return;
 const focusable=[...$("#mobileNavMenuPanel").querySelectorAll('button:not([disabled]),input:not([disabled])')].filter(el=>!el.closest("[hidden]"));
 if(!focusable.length)return;
 const first=focusable[0],last=focusable.at(-1);
 if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
 else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
});
let topSearchTimer;
$("#search").addEventListener("input",e=>{
 clearTimeout(topSearchTimer);
 const input=e.target,raw=input.value;
 if(raw.trim().length<2)return;
 topSearchTimer=setTimeout(()=>{
  search(raw,false);
  requestAnimationFrame(()=>{
   const pageInput=$("#pageSearchInput");if(!pageInput)return;
   pageInput.value=raw;
   try{pageInput.focus({preventScroll:true})}catch{pageInput.focus()}
   try{pageInput.setSelectionRange(raw.length,raw.length)}catch{}
  });
 },480)
});
$("#search").addEventListener("keydown",e=>{if(e.isComposing)return;if(e.key==="Enter"){clearTimeout(topSearchTimer);search(e.target.value,true)};if(e.key==="Escape"){e.target.value="";home()}});
const mobileSearchPanel=$("#mobileSearchPanel"),mobileSearchInput=$("#mobileSearchInput");
function openMobileSearch(){
 repairTouchState();
 const value=S.searchQuery||"";
 mobileSearchPanel.classList.add("open");
 mobileSearchPanel.setAttribute("aria-hidden","false");
 mobileSearchInput.value=value;
 search(value,false);
 requestAnimationFrame(()=>{
  try{mobileSearchInput.focus({preventScroll:true})}catch{mobileSearchInput.focus()}
  const n=mobileSearchInput.value.length;
  try{mobileSearchInput.setSelectionRange(n,n)}catch{}
 });
}
function closeMobileSearch(){mobileSearchPanel.classList.remove("open");mobileSearchPanel.setAttribute("aria-hidden","true");mobileSearchInput.blur()}
$("#mobileSearchBtn").onclick=openMobileSearch;
$("#mobileSearchClose").onclick=closeMobileSearch;
let mobileSearchTimer;
mobileSearchInput.addEventListener("input",e=>{
 clearTimeout(mobileSearchTimer);
 const value=e.target.value;
 mobileSearchTimer=setTimeout(()=>search(value,false),value.trim().length<2?0:360);
});
mobileSearchInput.addEventListener("keydown",e=>{
 if(e.key==="Enter"){
  e.preventDefault();
  search(e.target.value,true);
  closeMobileSearch();
 }
 if(e.key==="Escape")closeMobileSearch();
});
$("#closeDetail").onclick=()=>{$("#detailModal").classList.remove("open");document.body.classList.remove("detailOpen");unlockMobileDocument()};
$("#closePlayer").onclick=()=>{S.streamLoadToken++;clearTimeout(S._sourceUiTimer);$("#playerSide")?.classList.remove("drawerOpen");$("#sourcePanelBackdrop")?.classList.remove("open");$("#skipIntroBtn").classList.remove("show");stopSourceAttempt();clearPlaybackStallMonitor();persistPlaybackProgress(true);clearTimeout(S._ctlTimer);$("#playerMenu").classList.remove("open");$("#playerMenuBackdrop").classList.remove("open");S.playerMenuKind=null;resetVideo();$("#playerModal").classList.remove("open");document.body.classList.remove("playerOpen");setPlaybackPerformanceMode(false)};
$("#bigPlay").onclick=togglePlayback;$("#playPause").onclick=togglePlayback;
$("#back10").onclick=()=>{$("#video").currentTime=Math.max(0,$("#video").currentTime-10);showPlayerUI()};
$("#forward10").onclick=()=>{const v=$("#video");v.currentTime=Math.min(v.duration||Infinity,v.currentTime+10);showPlayerUI()};
$("#muteBtn").onclick=()=>{disarmAutoUnmute();const v=$("#video");v.muted=!v.muted;setPlayerIcon($("#muteBtn"),v.muted?"muted":"volume");showPlayerUI()};
$("#volume").oninput=e=>{const v=$("#video");v.volume=Number(e.target.value);v.muted=v.volume===0;setPlayerIcon($("#muteBtn"),v.muted?"muted":"volume");showPlayerUI()};
$("#speed").onchange=e=>{$("#video").playbackRate=Number(e.target.value);showPlayerUI()};
$("#seek").oninput=e=>{const v=$("#video"),n=Number(e.target.value);e.target.style.setProperty("--seek-fill",`${n/10}%`);if(isFinite(v.duration)&&v.duration)v.currentTime=n/1000*v.duration;showPlayerUI()};
$("#fullBtn").onclick=()=>{const el=$("#videoShell");if(!document.fullscreenElement)el.requestFullscreen?.();else document.exitFullscreen?.();showPlayerUI()};
$("#pipBtn").onclick=async()=>{const v=$("#video");try{if(document.pictureInPictureElement)await document.exitPictureInPicture();else if(document.pictureInPictureEnabled)await v.requestPictureInPicture()}catch{toast("Picture-in-Picture não disponível neste navegador.")}showPlayerUI()};
bindSourceUiEvents();
$("#skipIntroBtn").onclick=skipIntro;
$("#sourceToolsToggle").onclick=()=>{S.sourceToolsOpen=!S.sourceToolsOpen;$("#sourceTools").classList.toggle("open",S.sourceToolsOpen);$("#sourceToolsToggle").classList.toggle("active",S.sourceToolsOpen)};
function setSourceDrawer(open){$("#playerSide").classList.toggle("drawerOpen",!!open);$("#sourcePanelBackdrop").classList.toggle("open",!!open);showPlayerUI(!!open)}
function setPlayerSideTab(tab){
 S.playerSideTab=tab;
 $$(".playerSideTab").forEach(b=>b.classList.toggle("active",b.dataset.sideTab===tab));
 const sourcesPanel=$("#playerSidePanelFontes"),episodesPanel=$("#playerSidePanelEpisodes");
 if(sourcesPanel)sourcesPanel.hidden=tab!=="fontes";
 if(episodesPanel)episodesPanel.hidden=tab!=="episodios";
 if(tab==="episodios")renderPlayerEpisodes();
}
$$(".playerSideTab").forEach(b=>b.onclick=()=>setPlayerSideTab(b.dataset.sideTab));
$("#sourceDrawerHandle").onclick=()=>{const opening=!$("#playerSide").classList.contains("drawerOpen");if(opening)setPlayerSideTab("fontes");setSourceDrawer(opening)};
$("#sourcePanelBackdrop").onclick=()=>setSourceDrawer(false);
$("#primeSourceBtn").onclick=()=>{const opening=!$("#playerSide").classList.contains("drawerOpen");if(opening)setPlayerSideTab("fontes");setSourceDrawer(opening)};
if($("#episodesBtn"))$("#episodesBtn").onclick=()=>{setPlayerSideTab("episodios");setSourceDrawer(true)};
$("#centerPlay").onclick=togglePlayback;
$("#centerBack10").onclick=()=>{$("#video").currentTime=Math.max(0,$("#video").currentTime-10);showPlayerUI()};
$("#centerForward10").onclick=()=>{const v=$("#video");v.currentTime=Math.min(v.duration||Infinity,v.currentTime+10);showPlayerUI()};
$("#primeNextFloat").onclick=()=>{persistPlaybackProgress(true);if(S.currentShow&&S.nextEpisode){const carry=nextEpisodeCarry();playEpisode(S.currentShow,S.nextEpisode,carry)}};
$("#otherPlayerBtn").onclick=()=>openOtherPlayerMenu(S.selectedStream);
$("#retrySourcesBtn").onclick=retryStreamSources;
$("#downloadCurrent").onclick=()=>browserDownload(S.selectedStream);
$("#aspectBtn").onclick=openAspectMenu;
$("#introSetupBtn").onclick=openIntroSetupMenu;
$("#autoFallbackBtn").onclick=()=>{
 S.autoFallback=!S.autoFallback;
 localStorage.setItem("cf11_auto_fallback",S.autoFallback?"1":"0");
 updateAutoFallbackButton();
 toast(S.autoFallback?"Troca automática ativada.":"Troca automática desativada.");
};
function updateAutoFallbackButton(){
 const b=$("#autoFallbackBtn");if(!b)return;
 b.textContent=`⚡ Auto ${S.autoFallback?"ON":"OFF"}`;
 b.classList.toggle("on",S.autoFallback);b.classList.toggle("off",!S.autoFallback);
}
updateAspectButton();updateAutoFallbackButton();setSkipIntroEnabled(S.skipIntroEnabled,{notify:false});
$("#audioBtn").onclick=e=>{e.stopPropagation();openAudioMenu()};
$("#subsBtn").onclick=e=>{e.stopPropagation();openSubtitleMenu()};
$("#nextBtn").onclick=()=>{persistPlaybackProgress(true);if(S.currentShow&&S.nextEpisode){const carry=nextEpisodeCarry();playEpisode(S.currentShow,S.nextEpisode,carry)}};
$("#video").addEventListener("timeupdate",()=>{syncPlayer();updateSkipIntroButton()});
$("#video").addEventListener("play",()=>{syncPlayer();showPlayerUI()});
$("#video").addEventListener("pause",()=>{syncPlayer();persistPlaybackProgress(true);showPlayerUI(true)});
$("#video").addEventListener("ended",()=>{$("#skipIntroBtn").classList.remove("show");persistPlaybackProgress(true);showPlayerUI(true);if(S.currentShow&&S.nextEpisode){$("#nextBtn").style.display="";$("#primeNextFloat").classList.add("show")}});
$("#video").addEventListener("waiting",()=>onPlaybackWaiting("waiting"));
$("#video").addEventListener("stalled",()=>onPlaybackWaiting("stalled"));
$("#video").addEventListener("playing",onPlaybackStable);
$("#video").addEventListener("canplay",()=>{if(!$("#video").paused)onPlaybackStable()});
$("#video").addEventListener("seeking",clearPlaybackStallMonitor);
$("#video").addEventListener("seeked",()=>{if(!$("#video").paused)S._stallCooldownUntil=Date.now()+2500});
$("#video").addEventListener("dblclick",()=>$("#fullBtn").click());
let lastPlayerMoveUiAt=0,playerMoveUiFrame=0;
$("#videoShell").addEventListener("mousemove",()=>{
 const now=performance.now();if(now-lastPlayerMoveUiAt<180||playerMoveUiFrame)return;
 lastPlayerMoveUiAt=now;playerMoveUiFrame=requestAnimationFrame(()=>{playerMoveUiFrame=0;showPlayerUI()});
},{passive:true});
$("#videoShell").addEventListener("pointerup",e=>{
 if(e.pointerType==="mouse"&&e.button!==0)return;
 if(e.target.closest("button,input,select,a,.playerTop,.playerControls,.primeCenterControls,.playerMenu"))return;
 togglePlayerUIVisibility();
});
$("#playerControls").addEventListener("mouseenter",()=>showPlayerUI(true));
$("#playerControls").addEventListener("mouseleave",()=>showPlayerUI());
$("#playerMenu").addEventListener("mouseenter",()=>showPlayerUI(true));
$("#playerMenu").addEventListener("mouseleave",()=>{if(!S.playerMenuKind)showPlayerUI()});
$("#playerMenuBackdrop").onclick=closePlayerMenu;
document.addEventListener("keydown",e=>{if(!$("#playerModal").classList.contains("open"))return;if(["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName))return;
 showPlayerUI();
 if(e.code==="Space"){e.preventDefault();togglePlayback()} if(e.key==="ArrowLeft")$("#back10").click();if(e.key==="ArrowRight")$("#forward10").click();if(e.key.toLowerCase()==="f")$("#fullBtn").click();if(e.key.toLowerCase()==="m")$("#muteBtn").click();if(e.key.toLowerCase()==="c")$("#subsBtn").click();if(e.key.toLowerCase()==="a")$("#audioBtn").click();
});
$("#detailModal").onclick=e=>{if(e.target.id==="detailModal"){$("#detailModal").classList.remove("open");document.body.classList.remove("detailOpen")}};
$("#playerModal").onclick=e=>{if(e.target.id==="playerModal")$("#closePlayer").click()};
$("#settingsBtn").onclick=()=>{$("#frostUrl").value=cfg.frost;$("#metaUrl").value=cfg.meta;$("#catalogUrls").value=configuredCatalogManifests().join("\n");$("#subtitleAddon").value=cfg.subtitleAddon;$("#audioPref").value=cfg.audioPref;$("#subtitlePref").value=cfg.subtitlePref;$("#skipIntroEnabled").value=S.skipIntroEnabled?"1":"0";if($("#corsProxyUrl"))$("#corsProxyUrl").value=localStorage.getItem("rf40_cors_proxy")||"";$("#lang").value="pt-BR";$("#settingsModal").classList.add("open");document.body.classList.add("settingsOpen");openSettingsTab("geral")};
$("#closeSettings").onclick=()=>{$("#settingsModal").classList.remove("open");document.body.classList.remove("settingsOpen");unlockMobileDocument()};
$("#saveSettings").onclick=()=>{cfg.frost=sanitizeStreamManifests($("#frostUrl").value.trim()||CFG_DEFAULT.frost).join("\n");cfg.meta=$("#metaUrl").value.trim()||CFG_DEFAULT.meta;cfg.catalogs=$("#catalogUrls").value.trim()||CFG_DEFAULT.catalogs;cfg.subtitleAddon=$("#subtitleAddon").value.trim()||CFG_DEFAULT.subtitleAddon;cfg.audioPref=$("#audioPref").value;cfg.subtitlePref=$("#subtitlePref").value;setSkipIntroEnabled($("#skipIntroEnabled").value!=="0",{notify:false});cfg.lang="pt-BR";localStorage.setItem("cf2_frost",cfg.frost);localStorage.setItem("cf2_meta",cfg.meta);localStorage.setItem("cf4_catalogs",cfg.catalogs);localStorage.setItem("cf5_subtitle_addon",cfg.subtitleAddon);localStorage.setItem("cf5_audio_pref",cfg.audioPref);localStorage.setItem("cf5_subtitle_pref",cfg.subtitlePref);localStorage.setItem("rf40_cors_proxy",($("#corsProxyUrl")?.value||"").trim());localStorage.setItem("cf2_lang","pt-BR");S.manifestCache.clear();S.catalogCache.clear();catalogDefinitionsPromise=null;$("#settingsModal").classList.remove("open");document.body.classList.remove("settingsOpen");toast("Configurações salvas.");home()};
function openSettingsTab(name="geral"){
 $$("#settingsTabs [data-settings-tab]").forEach(b=>b.classList.toggle("active",b.dataset.settingsTab===name));
 $$("#settingsBody [data-settings-pane]").forEach(p=>p.classList.toggle("active",p.dataset.settingsPane===name));
 $("#settingsBody").scrollTop=0;
}
$$("[data-settings-tab]").forEach(b=>b.onclick=()=>openSettingsTab(b.dataset.settingsTab));
$("#resetSettings").onclick=()=>{$("#frostUrl").value=CFG_DEFAULT.frost;$("#metaUrl").value=CFG_DEFAULT.meta;$("#catalogUrls").value=CFG_DEFAULT.catalogs;$("#subtitleAddon").value=CFG_DEFAULT.subtitleAddon;$("#audioPref").value=CFG_DEFAULT.audioPref;$("#subtitlePref").value=CFG_DEFAULT.subtitlePref;$("#skipIntroEnabled").value="1";if($("#corsProxyUrl"))$("#corsProxyUrl").value="";$("#lang").value="pt-BR"};
let scrollRAF=0,scrollEndTimer=0;
window.addEventListener("scroll",()=>{
 if(innerWidth<=760)return;
 document.body.classList.add("fastScrolling");
 clearTimeout(scrollEndTimer);
 scrollEndTimer=setTimeout(()=>document.body.classList.remove("fastScrolling"),110);
 if(scrollRAF)return;
 scrollRAF=requestAnimationFrame(()=>{scrollRAF=0;$("#top").classList.toggle("solid",scrollY>35)});
},{passive:true});
window.addEventListener("beforeunload",()=>persistPlaybackProgress(true));
window.addEventListener("pageshow",()=>setTimeout(repairTouchState,0));
window.addEventListener("orientationchange",()=>setTimeout(()=>{repairTouchState();applyAspectMode(S.aspectMode,false)},180));
let resizeTimer=0;
window.addEventListener("resize",()=>{
 clearTimeout(resizeTimer);
 resizeTimer=setTimeout(()=>{if(innerWidth<=760)repairTouchState()},120);
},{passive:true});
document.addEventListener("visibilitychange",()=>{if(document.hidden)persistPlaybackProgress(true)});

let deferredInstallPrompt=null;
window.addEventListener("beforeinstallprompt",e=>{
 e.preventDefault();deferredInstallPrompt=e;
 const b=$("#installAppBtn");if(b)b.style.display="";
});
$("#installAppBtn").onclick=async()=>{
 if(!deferredInstallPrompt){
  toast("No Android, abra o menu do navegador e escolha “Adicionar à tela inicial”. No iPhone, use Compartilhar → Adicionar à Tela de Início.");
  return;
 }
 deferredInstallPrompt.prompt();
 try{await deferredInstallPrompt.userChoice}catch{}
 deferredInstallPrompt=null;$("#installAppBtn").style.display="none";
};
window.addEventListener("appinstalled",()=>{deferredInstallPrompt=null;$("#installAppBtn").style.display="none";toast("ResenhaFlix instalado como aplicativo.")});
if("serviceWorker" in navigator){
 window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js?v=62",{updateViaCache:"none"}).catch(e=>console.warn("Service Worker",e)));
}
window.addEventListener("scroll",()=>hideCardPreview(),{passive:true,capture:true});
window.addEventListener("resize",()=>hideCardPreview());
home();
