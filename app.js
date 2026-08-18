// ResenhaFlix v41 — fontes revisadas (somente addons online e com foco PT-BR).
// Addons removidos por estarem offline: fenixflix, animes-br(vercel), anima-o-pt-pt,
// stremio-archive-org(fly.dev) e o exemplo estático da Stremio.
const STREAM_SOURCES_V41=[
 "https://flixnest.app/flix-streams/manifest.json",
 "https://froststream.cloutteam.com/manifest.json",
 "https://comet.elfhosted.com/manifest.json",
 "https://mediafusion.elfhosted.com/manifest.json",
 "https://94c8cb9f702d-brazuca-torrents.baby-beamup.club/manifest.json",
 "https://torrentio.strem.fun/manifest.json",
 "https://watchhub.strem.io/manifest.json",
 "https://youtubio.elfhosted.com/%7B%7D/manifest.json"
];
const DEAD_SOURCES_V41=[
 "fenixflix.fenixhub.online",
 "animes-br-self.vercel.app",
 "anima-o-pt-pt-addon-stremio-6dzv.vercel.app",
 "stremio-archive-org-addon.fly.dev",
 "stremio.github.io/stremio-static-addon-example"
];
const CATALOG_SOURCES_V41=[
 "https://v3-cinemeta.strem.io/manifest.json",
 "https://7a82163c306e-stremio-netflix-catalog-addon.baby-beamup.club/manifest.json",
 "https://mediafusion.elfhosted.com/manifest.json",
 "https://comet.elfhosted.com/manifest.json",
 "https://youtubio.elfhosted.com/%7B%7D/manifest.json",
 "https://v3-channels.strem.io/manifest.json"
];
const CFG_DEFAULT={
 frost:STREAM_SOURCES_V41.join("\n"),
 meta:"https://v3-cinemeta.strem.io/manifest.json",
 catalogs:CATALOG_SOURCES_V41.join("\n"),
 subtitleAddon:"https://subsense.nepiraw.com/manifest.json",
 audioPref:"jpn",
 subtitlePref:"pob",
 mangaRepos:[
  "https://raw.githubusercontent.com/keiyoushi/extensions/repo/index.json"
 ].join("\n"),
 mangaBridge:"",
 lang:"pt-BR"
};
let savedStreams=localStorage.getItem("cf2_frost")||CFG_DEFAULT.frost;
if(!localStorage.getItem("cf5_watchhub_migrated")){
 if(!savedStreams.includes("watchhub.strem.io"))savedStreams=savedStreams.trim()+"\nhttps://watchhub.strem.io/manifest.json";
 localStorage.setItem("cf2_frost",savedStreams);localStorage.setItem("cf5_watchhub_migrated","1");
}
if(!localStorage.getItem("rf35_sources_migrated")){
 const newFrost=["https://fenixflix.fenixhub.online/manifest.json","https://comet.elfhosted.com/manifest.json","https://94c8cb9f702d-brazuca-torrents.baby-beamup.club/manifest.json","https://mediafusion.elfhosted.com/manifest.json","https://animes-br-self.vercel.app/manifest.json","https://anima-o-pt-pt-addon-stremio-6dzv.vercel.app/manifest.json"];
 for(const u of newFrost)if(!savedStreams.includes(u))savedStreams=savedStreams.trim()+"\n"+u;
 localStorage.setItem("cf2_frost",savedStreams);
 let savedCatalogs=localStorage.getItem("cf4_catalogs")||CFG_DEFAULT.catalogs;
 if(!savedCatalogs.includes("mediafusion.elfhosted.com"))savedCatalogs=savedCatalogs.trim()+"\nhttps://mediafusion.elfhosted.com/manifest.json";
 localStorage.setItem("cf4_catalogs",savedCatalogs);
 localStorage.setItem("cf5_subtitle_addon","https://subsense.nepiraw.com/manifest.json");
 localStorage.setItem("rf35_sources_migrated","1");
}
if(!localStorage.getItem("rf40_sources_migrated")){
 const extraStreams=["https://torrentio.strem.fun/manifest.json", "https://top-streaming.stream/username=temporary_username/manifest.json", "https://stremio-archive-org-addon.fly.dev/manifest.json", "https://stremio.github.io/stremio-static-addon-example/manifest.json", "https://v3-channels.strem.io/manifest.json"];
 const extraCatalogs=["https://v3-channels.strem.io/manifest.json", "https://stremio-archive-org-addon.fly.dev/manifest.json", "https://torrentio.strem.fun/manifest.json", "https://comet.elfhosted.com/manifest.json"];
 for(const u of extraStreams)if(!savedStreams.includes(u))savedStreams=savedStreams.trim()+"\n"+u;
 localStorage.setItem("cf2_frost",savedStreams);
 let savedCatalogs40=localStorage.getItem("cf4_catalogs")||CFG_DEFAULT.catalogs;
 for(const u of extraCatalogs)if(!savedCatalogs40.includes(u))savedCatalogs40=savedCatalogs40.trim()+"\n"+u;
 localStorage.setItem("cf4_catalogs",savedCatalogs40);
 localStorage.setItem("rf40_sources_migrated","1");
}
if(!localStorage.getItem("rf41_sources_migrated")){
 const cleanList=txt=>String(txt||"").split(/\s*\n\s*/).map(s=>s.trim()).filter(Boolean)
  .filter(u=>!DEAD_SOURCES_V41.some(d=>u.includes(d)));
 const mergeList=(txt,add)=>{const list=cleanList(txt);for(const u of add)if(!list.includes(u))list.push(u);return list.join("\n")};
 savedStreams=mergeList(savedStreams,STREAM_SOURCES_V41);
 localStorage.setItem("cf2_frost",savedStreams);
 localStorage.setItem("cf4_catalogs",mergeList(localStorage.getItem("cf4_catalogs")||CFG_DEFAULT.catalogs,CATALOG_SOURCES_V41));
 if(!localStorage.getItem("cf5_subtitle_addon"))localStorage.setItem("cf5_subtitle_addon",CFG_DEFAULT.subtitleAddon);
 localStorage.setItem("rf41_sources_migrated","1");
}
const BROKEN_STREAM_SOURCES_V42=[
 "top-streaming.stream",
 "v3-channels.strem.io"
];
if(!localStorage.getItem("rf42_sources_migrated")){
 const clean42=txt=>String(txt||"").split(/\s*\n\s*/).map(x=>x.trim()).filter(Boolean)
  .filter(u=>!BROKEN_STREAM_SOURCES_V42.some(d=>u.includes(d)));
 savedStreams=clean42(savedStreams).join("\n");
 localStorage.setItem("cf2_frost",savedStreams);
 localStorage.setItem("rf42_sources_migrated","1");
}
const cfg={
 frost:savedStreams,
 meta:localStorage.getItem("cf2_meta")||CFG_DEFAULT.meta,
 catalogs:localStorage.getItem("cf4_catalogs")||CFG_DEFAULT.catalogs,
 subtitleAddon:localStorage.getItem("cf5_subtitle_addon")||CFG_DEFAULT.subtitleAddon,
 audioPref:localStorage.getItem("cf5_audio_pref")||CFG_DEFAULT.audioPref,
 subtitlePref:localStorage.getItem("cf5_subtitle_pref")||CFG_DEFAULT.subtitlePref,
 mangaRepos:localStorage.getItem("rf15_manga_repos")||localStorage.getItem("cf12_manga_repo")||CFG_DEFAULT.mangaRepos,
 mangaBridge:localStorage.getItem("rf14_manga_bridge")||CFG_DEFAULT.mangaBridge,
 lang:localStorage.getItem("cf2_lang")||CFG_DEFAULT.lang
};
if(!localStorage.getItem("rf30_manga_repo_defaults")){
 const merged=[...new Set([...String(cfg.mangaRepos||"").split(/\n+/),...String(CFG_DEFAULT.mangaRepos).split(/\n+/)].map(x=>x.trim()).filter(Boolean))];
 cfg.mangaRepos=merged.join("\n");localStorage.setItem("rf15_manga_repos",cfg.mangaRepos);localStorage.setItem("rf30_manga_repo_defaults","1")
}
const S={hero:null,current:null,currentShow:null,currentEpisode:null,nextEpisode:null,season:1,currentPage:"home",streams:[],selectedStream:null,selectedAddon:"all",qualityFilter:"all",streamTitle:"",streamMeta:null,playType:null,playId:null,rootId:null,resumeEntry:null,resumeApplied:false,searchFilter:"all",searchItems:[],searchQuery:"",searchToken:0,manifestCache:new Map(),catalogCache:new Map(),itemCache:new Map(),externalSubtitles:[],externalSubtitleBlob:null,playerMenuKind:null,aspectMode:localStorage.getItem("cf9_aspect")||"smart",introSkipped:false,introSkipSeconds:90,autoFallback:localStorage.getItem("cf11_auto_fallback")!=="0",sourceHealth:new Map(),sourceAttemptToken:0,attemptedSourceKeys:new Set(),streamCache:new Map(),streamLoadToken:0,addonNameCache:new Map(),primaryManifest:localStorage.getItem("rf17_primary_manifest")||"",sourceToolsOpen:false,pageCategory:"all",pageItems:[],pageTypeForCategories:"",mangaRepoItems:[],mangaRepoLoadedAt:0,mangaTab:"explore",mangaQuery:"",mangaExtensionQuery:"",mangaLang:"pt",mangaReaderUrl:"",mangaCatalog:[],mangaCatalogPage:1,mangaCatalogHasNext:true,mangaSearchToken:0,mangaPickerMedia:null,mangaSearchCandidates:[],mangaSearchCandidateIndex:0,mangaNativeResults:[],mangaDetail:null,mangaDetailSource:null,mangaChapters:[],mangaChapterOrder:"desc",mangaReaderManga:null,mangaReaderSource:null,mangaReaderChapter:null,mangaReaderPages:[],mangaReaderPageIndex:0,mangaReaderObserver:null,mangaReaderUiTimer:null,mangaRepoStats:[],mangaExploreCatalogCache:new Map(),mangaProgressiveToken:0,mangaProgressiveResults:[],mangaMatchMedia:null,mangaMatchResults:[],mangaMatchToken:0,mangaSearchLang:localStorage.getItem("rf16_manga_search_lang")||"both",mangaWebSource:null,mangaWebQuery:"",mangaWebCandidates:[],mangaWebCandidateIndex:0,mangaWebCurrentUrl:"",_sourceTimer:null,_ctlTimer:null,_lastProgressSave:0,_stallTimer:null,_stallStartedAt:0,_stallEvents:[],_stallRecovery:false,_stallCooldownUntil:0,_lastStablePlaybackAt:0,mangaSourceLimit:Number(localStorage.getItem("rf24_manga_source_limit")||5),mangaRepoV24:null,musicTab:"tracks",musicQuery:"",musicResults:[],booksTab:"all",booksQuery:"",bookResults:[],bookReaderBook:null,bookReaderRendition:null,bookReaderEpub:null,mediaSourceTab:"music",musicQueue:[],musicQueueIndex:-1,musicShuffle:false,musicRepeat:false,musicCurrentItem:null,musicBackend:"audio",soundcloudWidget:null,soundcloudWidgetReady:false,soundcloudPosition:0,soundcloudDuration:0,soundcloudPaused:true};

const $=s=>document.querySelector(s);
const $$=s=>document.querySelectorAll(s);
const esc=x=>String(x??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
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
const MOBILE_NAV_DEFAULT=["home","trending","movies","manga"];
const MOBILE_NAV_ITEMS=[
 {id:"home",label:"Início",icon:"⌂"},
 {id:"trending",label:"Em alta",icon:"↗"},
 {id:"movies",label:"Filmes",icon:"▣"},
 {id:"series",label:"Séries",icon:"▤"},
 {id:"anime",label:"Animes",icon:"✦"},
 {id:"manga",label:"Mangás",icon:"▥"},
 {id:"music",label:"Música",icon:"♪"},
 {id:"books",label:"Livros",icon:"▧"},
 {id:"list",label:"Lista",icon:"＋"}
];
const MOBILE_NAV_IDS=new Set(MOBILE_NAV_ITEMS.map(item=>item.id));
function loadMobileNavPreferences(){
 try{
  const saved=JSON.parse(localStorage.getItem(MOBILE_NAV_STORAGE)||"null");
  if(Array.isArray(saved)){
   const valid=[...new Set(saved.map(String).filter(id=>MOBILE_NAV_IDS.has(id)))].slice(0,4);
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
 nav.style.setProperty("--mobile-nav-count",String(Math.min(5,mobileNavPreferences.length+1)));
 nav.innerHTML=mobileNavPreferences.map(id=>{
  const item=mobileNavItem(id);if(!item)return"";
  const active=current===id;
  return `<button type="button" class="${active?"active":""}" data-mobile-page="${esc(id)}"${active?' aria-current="page"':""}><span aria-hidden="true">${item.icon}</span><small>${esc(item.label)}</small></button>`;
 }).join("")+`<button type="button" id="mobileNavMore" data-mobile-more aria-haspopup="dialog" aria-controls="mobileNavMenu" aria-expanded="false"><span aria-hidden="true">•••</span><small>Mais</small></button>`;
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
 }).join("");
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
  if(mobileNavPreferences.length>=4){toast("Escolha no máximo quatro atalhos.");renderMobileNavMenu();return}
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
// Aceita variações de URL de addon: stremio://, sem https, sem /manifest.json, com barra final.
function normalizeManifestUrl(u){
 let x=String(u||"").trim().replace(/\s+/g,"");
 if(!x)return "";
 x=x.replace(/^stremio:\/\//i,"https://");
 if(!/^https?:\/\//i.test(x))x="https://"+x;
 if(!/\/manifest\.json(\?.*)?$/i.test(x))x=x.replace(/\/+$/,"")+"/manifest.json";
 try{const p=new URL(x);return /^https?:$/.test(p.protocol)?p.toString():""}catch{return ""}
}
function uniqueManifests(list){return [...new Set(list.map(normalizeManifestUrl).filter(Boolean))]}


const MEDIA_DEFAULT={
 audiusApi:"https://api.audius.co",
 audiusApiKey:"",
 soundcloudProxyUrl:"",
 musicApi:"https://itunes.apple.com/search",
 musicJsonUrls:"",
 booksOpenLibrary:"https://openlibrary.org/search.json",
 booksGutendex:"https://gutendex.com/books",
 booksJsonUrls:""
};
const mediaCfg={
 audiusApi:localStorage.getItem("rf25_audius_api")||MEDIA_DEFAULT.audiusApi,
 audiusApiKey:localStorage.getItem("rf25_audius_key")||"",
 soundcloudProxyUrl:localStorage.getItem("rf26_soundcloud_proxy")||"",
 musicApi:localStorage.getItem("rf24_music_api")||MEDIA_DEFAULT.musicApi,
 musicJsonUrls:localStorage.getItem("rf24_music_json_urls")||"",
 booksOpenLibrary:localStorage.getItem("rf24_books_openlibrary")||MEDIA_DEFAULT.booksOpenLibrary,
 booksGutendex:localStorage.getItem("rf24_books_gutendex")||MEDIA_DEFAULT.booksGutendex,
 booksJsonUrls:localStorage.getItem("rf24_books_json_urls")||""
};
function safeHttpUrl(url){try{const u=new URL(String(url||""));return /^https?:$/.test(u.protocol)?u.toString():""}catch{return""}}
function mediaImported(kind){try{return JSON.parse(localStorage.getItem(kind==="music"?"rf24_music_imported":"rf24_books_imported")||"[]")}catch{return[]}}
function saveMediaImported(kind,data){const key=kind==="music"?"rf24_music_imported":"rf24_books_imported";try{localStorage.setItem(key,JSON.stringify((Array.isArray(data)?data:[]).slice(0,500)))}catch{toast("Arquivo JSON grande demais para salvar neste dispositivo.")}}
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
  const r=await fetch(url,{headers:{Accept:"application/json"},signal:ctl.signal,cache:"no-store"});
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
function catalogURLFor(manifest,type,id="top",params=""){
 const extra=normalizeExtra(params);
 return api(manifest,`catalog/${type}/${encodeURIComponent(id)}${extra?("/"+extra):""}.json`);
}
function catalogURL(type,id="top",params=""){return catalogURLFor(cfg.meta,type,id,params)}
function streamURLFor(manifest,type,id){return api(manifest,`stream/${type}/${encodeURIComponent(id)}.json`)}
function configuredStreamManifests(){return uniqueManifests(String(cfg.frost||CFG_DEFAULT.frost).split(/[\n,\s]+/).map(x=>x.trim()).filter(Boolean))}
function configuredCatalogManifests(){return uniqueManifests(String(cfg.catalogs||CFG_DEFAULT.catalogs).split(/[\n,\s]+/).map(x=>x.trim()).filter(Boolean))}
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
// Proxies usados apenas como plano B quando o addon bloqueia CORS ou fica instável.
const CORS_PROXY_TEMPLATES=["https://api.allorigins.win/raw?url={url}","https://corsproxy.io/?url={url}"];
function corsProxyUrls(url){
 const custom=String(localStorage.getItem("rf40_cors_proxy")||"").trim();
 const templates=[...(custom?[custom.includes("{url}")?custom:custom.replace(/\/+$/,"")+"/{url}"]:[]),...CORS_PROXY_TEMPLATES];
 return templates.map(t=>t.replace("{url}",encodeURIComponent(url)));
}
async function getJSONRetry(url,timeoutMs=9000,retries=1,{proxy=true}={}){
 let lastError=null;
 for(let attempt=0;attempt<=retries;attempt++){
  try{return await getJSONTimeout(url,timeoutMs+attempt*4000)}catch(e){lastError=e}
 }
 if(proxy){
  for(const alt of corsProxyUrls(url)){
   try{
    const data=await getJSONTimeout(alt,timeoutMs+4000);
    if(data&&typeof data==="object")return data;
   }catch(e){lastError=e}
  }
 }
 throw lastError||Error("Falha ao consultar "+url);
}
async function getManifest(manifestUrl){
 const url=normalizeManifestUrl(manifestUrl)||manifestUrl;
 if(S.manifestCache.has(url))return S.manifestCache.get(url);
 const p=getJSONRetry(url,9000,1).then(m=>{MANIFEST_DATA.set(url,m);return m}).catch(e=>{S.manifestCache.delete(url);throw e});
 S.manifestCache.set(url,p);return p;
}
// Respeita o manifesto do addon (resources/types/idPrefixes) para não fazer chamadas inúteis.
function addonSupports(manifestUrl,resource,type,id){
 const m=MANIFEST_DATA.get(normalizeManifestUrl(manifestUrl)||manifestUrl);
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
 const trackers=(Array.isArray(s.sources)?s.sources:[]).filter(x=>typeof x==="string"&&x.startsWith("tracker:")).map(x=>"&tr="+encodeURIComponent(x.slice(8)));
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
 const p=getJSONRetry(catalogURLFor(manifest,type,id,params),9000,1).then(x=>x.metas||[]).catch(e=>{S.catalogCache.delete(key);throw e});
 S.catalogCache.set(key,p);return p;
}

function lists(){
 try{return JSON.parse(localStorage.getItem("cf2_list")||"[]")}catch{return[]}
}
function history(){
 try{return JSON.parse(localStorage.getItem("cf2_history")||"[]")}catch{return[]}
}
function saveList(a){localStorage.setItem("cf2_list",JSON.stringify(a))}
function saveHistory(a){localStorage.setItem("cf2_history",JSON.stringify(a.slice(0,40)))}
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
  url:s.url||""
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
 try{return JSON.parse(localStorage.getItem("cf11_source_stats")||"{}")}catch{return{}}
}
function saveSourceStats(x){localStorage.setItem("cf11_source_stats",JSON.stringify(x))}
function seriesSourcePrefs(){
 try{return JSON.parse(localStorage.getItem("cf11_series_source_prefs")||"{}")}catch{return{}}
}
function saveSeriesSourcePrefs(x){localStorage.setItem("cf11_series_source_prefs",JSON.stringify(x))}
function introProfiles(){
 try{return JSON.parse(localStorage.getItem("cf11_intro_profiles")||"{}")}catch{return{}}
}
function saveIntroProfiles(x){localStorage.setItem("cf11_intro_profiles",JSON.stringify(x))}
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
 renderSourceUI();
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
   const d=await getJSONTimeout(metaURL(type,base),7000);
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
 let score=qualityScore(s._quality)*12;
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
  if(pref.provider===provider)score+=150;
  if(pref.manifest===s._manifest)score+=40;
  if(pref.quality===s._quality)score+=28;
  if(pref.index===s._idx)score+=16;
 }
 score+=Math.min(70,Number(stats.success||0)*14);
 if(stats.lastSuccess&&now-stats.lastSuccess<7*864e5)score+=45;
 if(stats.lastFail&&now-stats.lastFail<6*3600e3)score-=90;
 score-=Math.min(100,Number(stats.fail||0)*18);
 score-=recentSourceInstability(s);
 if(S.primaryManifest&&s._manifest===S.primaryManifest)score+=190;
 score+=configuredManifestPriority(s._manifest);
 if(s._external)score-=500;
 if(s._mismatch)score-=900;
 return score;
}
function rankedPlayableStreams(streams,resumeEntry=null){
 return streams.filter(s=>!s._external&&s.url&&!s._mismatch).slice().sort((a,b)=>sourceReliabilityScore(b,resumeEntry)-sourceReliabilityScore(a,resumeEntry));
}


function card(m){
 const key=historyKey(m.type||"movie",m._rootId||m.id);
 const h=m._continue?getHistoryEntry(m._historyKey||key):history().find(x=>(x.key||historyKey(x.type,x.rootId||x.id))===key);
 const saved=lists().some(x=>x.id===m.id&&String(x.type||"movie")===String(m.type||"movie"));
 S.itemCache.set(`${m.type||"movie"}|${m.id}`,m);
 const remaining=h?.currentTime?formatTime(h.currentTime):"";
 return `<article class="card" data-id="${esc(m.id)}" data-type="${esc(m.type||"movie")}" ${m._continue?`data-continue-key="${esc(m._historyKey||key)}"`:""}>
   <div class="poster">${m.poster?`<img class="posterImg" src="${esc(m.poster)}" alt="" loading="lazy" decoding="async" fetchpriority="low">`:""}</div>
   ${m.imdbRating?`<div class="rating">★ ${esc(m.imdbRating)}</div>`:""}
   <button class="plus ${saved?"saved":""}" data-plus="${esc(m.id)}" data-type="${esc(m.type||"movie")}" title="${saved?"Remover da minha lista":"Adicionar à minha lista"}">${saved?"✓":"+"}</button>
   ${m._continue?`<button class="continueRemove" data-remove-continue="${esc(m._historyKey||key)}" title="Remover de Continuar assistindo">✕</button>`:""}
   ${m._continue&&remaining?`<div class="resumeBadge">▶ ${esc(remaining)}</div>`:""}
   <div class="cardInfo"><div class="title">${esc(m.name||"Sem título")}</div><div class="sub">${esc(m.year||"")} • ${isAnimeLike(m)?"Anime":(m.type==="series"?"Série":"Filme")}</div>${m._continue&&h?.stream?.addon?`<div class="resumeSource">Última fonte: ${esc(h.stream.addon)}${h.stream.quality?` • ${esc(h.stream.quality)}`:""}</div>`:(m._catalogSource?`<div class="sourceMark">${esc(m._catalogSource)}</div>`:"")}</div>
   ${h?`<div class="bar"><i style="width:${Math.min(100,Math.max(0,h.progress||0))}%"></i></div>`:""}
 </article>`
}
function animateListButton(btn,added){
 if(!btn)return;
 btn.textContent=added?"✓":"+";
 btn.classList.toggle("saved",added);
 btn.title=added?"Remover da minha lista":"Adicionar à minha lista";
 btn.classList.remove("listPop");void btn.offsetWidth;btn.classList.add("listPop");
 const card=btn.closest(".card");if(card){card.classList.remove("listPulse");void card.offsetWidth;card.classList.add("listPulse")}
}
function bindCards(root){
 root.querySelectorAll(".card").forEach(c=>c.onclick=e=>{
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
 if(!window.matchMedia||!window.matchMedia("(hover:hover) and (pointer:fine)").matches)return;
 clearTimeout(previewTimer);clearTimeout(previewHideTimer);
 previewTimer=setTimeout(()=>showCardPreview(cardEl),500);
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
 if(S.currentPage==="list"&&!added)setTimeout(()=>page("list"),280);
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

const carouselResizeObserver=typeof ResizeObserver==="function"?new ResizeObserver(entries=>entries.forEach(entry=>updateCarouselControls(entry.target))):null;
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
   scroller.addEventListener("scroll",()=>updateCarouselControls(scroller),{passive:true});
   scroller.addEventListener("keydown",e=>{
    if(e.key!=="ArrowLeft"&&e.key!=="ArrowRight")return;
    e.preventDefault();scrollCarousel(scroller,e.key==="ArrowLeft"?-1:1);
   });
   carouselResizeObserver?.observe(scroller);
  }
  requestAnimationFrame(()=>updateCarouselControls(scroller));
 });
}
function scrollCarousel(scroller,direction){
 if(!scroller)return;
 const distance=Math.max(220,Math.round(scroller.clientWidth*.82));
 const reduceMotion=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
 scroller.scrollBy({left:distance*Number(direction||1),behavior:reduceMotion?"auto":"smooth"});
 requestAnimationFrame(()=>updateCarouselControls(scroller));
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
 if(skip){
  Promise.resolve(safeCatalog(type,id,addCatalogSkip(params,skip),manifest)).then(items=>{
   if(items?.length)FRESH_PAGE_CACHE.set(cacheKey,items);
  }).catch(()=>{});
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
async function catalogDefinitions(){
 const defs=[];
 for(const manifestUrl of configuredCatalogManifests()){
  try{
   const mf=await getManifest(manifestUrl);
   const name=mf.name||new URL(manifestUrl).hostname;
   for(const c of (mf.catalogs||[])){
    if(!["movie","series"].includes(c.type)||catalogNeedsOtherRequiredExtra(c))continue;
    defs.push({manifestUrl,manifest:mf,sourceName:name,catalog:c});
   }
  }catch(e){console.warn("manifest",manifestUrl,e)}
 }
 // Fallback: Cinemeta top search, useful if its manifest is temporarily unavailable.
 if(!defs.some(d=>d.manifestUrl===cfg.meta&&d.catalog.id==="top"&&d.catalog.type==="movie")){
  defs.push({manifestUrl:cfg.meta,sourceName:"Cinemeta",catalog:{type:"movie",id:"top",extra:[{name:"search"}]}});
 }
 if(!defs.some(d=>d.manifestUrl===cfg.meta&&d.catalog.id==="top"&&d.catalog.type==="series")){
  defs.push({manifestUrl:cfg.meta,sourceName:"Cinemeta",catalog:{type:"series",id:"top",extra:[{name:"search"}]}});
 }
 return defs;
}
async function searchAllCatalogs(q){
 const defs=await catalogDefinitions();
 // Limit each source to a sane number of catalogs so a typo does not fire dozens of requests.
 const counts=new Map(),chosen=[];
 for(const d of defs){
  const n=counts.get(d.manifestUrl)||0;
  if(n>=12)continue;
  counts.set(d.manifestUrl,n+1);chosen.push(d);
 }
 const jobs=chosen.map(async d=>{
  const c=d.catalog;
  let metas=[];
  if(catalogSupportsSearch(c)){
   metas=await safeCatalog(c.type,c.id,{search:q},d.manifestUrl);
  }else{
   // Some catalog addons do not expose "search"; fetch their first page and filter locally.
   metas=await safeCatalog(c.type,c.id,"",d.manifestUrl);
   const x=normText(q);metas=metas.filter(m=>normText(m.name).includes(x));
  }
  return metas.map(m=>cleanMeta(m,d.sourceName)).filter(Boolean);
 });
 const settled=await Promise.allSettled(jobs);
 const items=dedupeMetas(settled.flatMap(r=>r.status==="fulfilled"?r.value:[]));
 return items.sort((a,b)=>searchScore(b,q)-searchScore(a,q));
}
async function externalCatalogRows(){
 const defs=(await catalogDefinitions()).filter(d=>d.manifestUrl!==cfg.meta&&!catalogNeedsOtherRequiredExtra(d.catalog)).slice(0,5);
 const rows=[];
 for(const d of defs){
  try{
   const items=rotateFresh((await safeCatalog(d.catalog.type,d.catalog.id,"",d.manifestUrl)).map(m=>cleanMeta(m,d.sourceName)).filter(Boolean),`external-${d.sourceName}-${d.catalog.id}`).slice(0,18);
   if(items.length)rows.push({title:d.catalog.name||d.catalog.id||d.sourceName,sub:d.sourceName,items});
  }catch{}
 }
 return rows;
}

function runWhenIdle(fn){
 if("requestIdleCallback" in window)requestIdleCallback(fn,{timeout:1200});
 else setTimeout(fn,80);
}
async function appendExternalHomeRows(){
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
 $("#page").classList.remove("searchPage","hk-manga-page");
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
  $("#main").innerHTML=[
   row("Continuar assistindo",continueItems,"Retome exatamente de onde parou",{key:"continue"}),
   row("Filmes populares",movies,"Atualizado automaticamente"),
   row("Séries populares",series,"Atualizado automaticamente"),
   row("Animes",Array.from(new Map([...animeSeries,...animeMovies].map(x=>[x.id,x])).values()),"Animação"),
   row("Mais filmes",movies.slice(8),""),
   row("Mais séries",series.slice(8),"")
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
 $("#detailModal").classList.add("open");document.body.classList.add("detailOpen");
 $("#detailTitle").textContent="Carregando…";$("#episodes").innerHTML="";$("#detailSimilar").innerHTML='<div class="loading">Carregando recomendações…</div>';
 try{
  const d=await getJSON(metaURL(type,id));const m=d.meta||d;S.current=m;
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
function renderEpisodes(m){
 const vids=m.videos||m.episodes||[];
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
 const vids=show.videos||show.episodes||[];
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
   const vids=show.videos||show.episodes||[];
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
 if(saved&&saved.currentTime>5){resumeFromHistoryKey(saved.key||historyKey(m.type,m.id));return}
 if(m.type==="series"){const ep=(m.videos||[])[0];if(ep)playEpisode(m,ep);else toast("Nenhum episódio encontrado.")}
 else playStream("movie",m.id,m.name,m)
}
function playEpisode(show,ep,resumeEntry=null){
 S.currentShow=show;S.currentEpisode=ep;S.playerSeason=Number(ep.season)||1;
 const ordered=[...(show.videos||show.episodes||[])].sort((a,b)=>(Number(a.season||1)-Number(b.season||1))||(Number(a.episode||0)-Number(b.episode||0)));
 const idx=ordered.findIndex(x=>String(x.id)===String(ep.id));
 S.nextEpisode=idx>=0&&idx<ordered.length-1?ordered[idx+1]:null;
 $("#nextBtn").style.display=S.nextEpisode?"":"none";
 $("#episodesBtn").style.display=ordered.length>1?"":"none";
 $("#primeNextFloat").classList.toggle("show",!!S.nextEpisode);
 if(S.playerSideTab==="episodios")renderPlayerEpisodes();
 const key=ep.id;
 playStream("series",key,`${show.name} — T${ep.season} E${ep.episode}`,{...compactMeta(show),...compactMeta(ep),id:ep.id,name:show.name,poster:show.poster,background:show.background,year:show.year},resumeEntry)
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
function qualityScore(q){return {"4K":6,"1440p":5,"1080p":4,"720p":3,"576p":2,"480p":1,"360p":0,"Outro":-1}[q]??-1}
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
function browserDownload(stream){
 if(!stream?.url)return toast("Esta fonte não possui URL direta.");
 if(!isDirectDownloadable(stream.url))return toast("Download direto indisponível para esta fonte (ex.: HLS/M3U8).");
 const a=document.createElement("a");
 a.href=stream.url;a.download=safeFilename(S.streamTitle,extensionFromUrl(stream.url));
 a.target="_blank";a.rel="noopener noreferrer";document.body.appendChild(a);a.click();a.remove();
 toast("O navegador recebeu o link de download. A fonte ainda pode decidir abrir o vídeo em vez de baixar.");
}
function quickAddonName(manifest,index){
 if(S.addonNameCache.has(manifest))return S.addonNameCache.get(manifest);
 const low=String(manifest).toLowerCase();let name="";
 if(low.includes("froststream"))name="FrostStream";
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
 if(Date.now()-x.at>120000){S.streamCache.delete(streamCacheKey(manifest,type,id));return null}
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
 return i<0?0:Math.max(0,(list.length-i)*28);
}
function sortStreamManifests(manifests){
 const pref=preferredManifestForEpisode(),primary=S.primaryManifest;
 return manifests.slice().sort((a,b)=>{
  const sa=(a===primary?190:0)+(a===pref?110:0)+configuredManifestPriority(a);
  const sb=(b===primary?190:0)+(b===pref?110:0)+configuredManifestPriority(b);
  return sb-sa;
 });
}
async function fetchStreamBatch(manifest,type,id,index,{fresh=false}={}){
 if(!fresh){const cached=getCachedStreamBatch(manifest,type,id);if(cached)return cached}
 const name=quickAddonName(manifest,index);
 await getManifest(manifest).catch(()=>null);
 if(!addonSupports(manifest,"stream",type,id)){saveStreamBatch(manifest,type,id,[]);return []}
 const data=await getJSONRetry(streamURLFor(manifest,type,id),9000,1);
 const officialLegal=/watchhub\.strem\.io/i.test(manifest);
 const streams=(data.streams||[]).map(s=>{
  if(s&&!s.url&&!s.externalUrl&&s.infoHash){const magnet=magnetFromStream(s);return magnet?{...s,externalUrl:magnet,_torrent:true}:null}
  if(s&&!s.url&&!s.externalUrl&&s.ytId)return {...s,externalUrl:`https://www.youtube.com/watch?v=${encodeURIComponent(s.ytId)}`};
  return s;
 }).filter(x=>x&&(x.url||x.externalUrl)).map((s,i)=>{
  const x={...s,_addon:name,_manifest:manifest,_idx:i,_quality:getQuality(s),_external:!s.url&&!!s.externalUrl,_officialLegal:officialLegal};
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
async function loadStreamsFromAddons(type,id,onBatch=null){
 const manifests=sortStreamManifests(configuredStreamManifests());
 const jobs=manifests.map((manifest,index)=>fetchStreamBatch(manifest,type,id,index)
  .then(batch=>{if(onBatch)onBatch(batch,manifest);return batch})
  .catch(e=>{console.warn("Addon lento/indisponível",manifest,e);return []}));
 const results=await Promise.all(jobs);
 return results.flat();
}
function prefetchStreams(type,id){
 if(!type||!id)return;
 sortStreamManifests(configuredStreamManifests()).forEach((manifest,index)=>{
  if(getCachedStreamBatch(manifest,type,id))return;
  fetchStreamBatch(manifest,type,id,index).catch(()=>{});
 });
}
function prefetchNextEpisodeSources(){
 if(S.playType==="series"&&S.nextEpisode?.id)prefetchStreams("series",S.nextEpisode.id);
}
function sourceHealthRank(s){
 const h=getHealthStatus(s);
 return h==="working"?0:h==="testing"?1:h==="failed"?4:s._external?3:2;
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
 return s._external?"Externo":"Disponível";
}
function sourceStatusIcon(s){
 const h=getHealthStatus(s);
 return h==="working"?"✓":h==="testing"?"◌":h==="failed"?"!":s._external?"↗":"•";
}
function sourceSortedFiltered(streams){
 return streams.slice().sort((a,b)=>sourceHealthRank(a)-sourceHealthRank(b)||sourceReliabilityScore(b,S.resumeEntry)-sourceReliabilityScore(a,S.resumeEntry));
}
function renderSourceSelectedBar(){
 const bar=$("#sourceSelectedBar"),s=S.selectedStream;
 if(!bar)return;
 if(!s){bar.innerHTML='<div class="sourceSelectedEmpty">Escolha uma fonte para ver as ações.</div>';return}
 const provider=detectProvider(s),external=!!s._external;
 bar.innerHTML=`<div class="selectedSourceInfo"><small>SELECIONADA</small><b>${esc(provider)}</b><span>${esc(s._addon||"")} • ${esc(s._quality||"Outro")}</span></div>
  <div class="selectedSourceActions">
   <button type="button" class="selectedSecondary" data-selected-other ${external?"style='display:none'":""}>↗</button>
   <button type="button" class="selectedSecondary" data-selected-download ${(!external&&isDirectDownloadable(s.url))?"":"disabled"}>⇩</button>
   <button type="button" class="selectedPlay" data-selected-play>${external?"Abrir provedor":"▶ Assistir"}</button>
  </div>`;
 bar.querySelector("[data-selected-play]").onclick=()=>external?openExternalSource(s.externalUrl):selectStream(s,true);
 const other=bar.querySelector("[data-selected-other]");if(other)other.onclick=()=>openOtherPlayerMenu(s);
 const dl=bar.querySelector("[data-selected-download]");if(dl)dl.onclick=()=>{if(!external)browserDownload(s)};
}
function renderSourceUI(){
 const streams=S.streams||[];
 const manifests=[...new Map(streams.map(s=>[s._manifest,s._addon||"Fonte"])).entries()];
 const addons=["all",...new Set(streams.map(s=>s._addon))];
 const prefSel=$("#preferredSourceSelect");
 if(prefSel){
  const current=S.primaryManifest;
  prefSel.innerHTML='<option value="">Automática</option>'+manifests.map(([m,n])=>`<option value="${esc(m)}" ${current===m?"selected":""}>${esc(n)}</option>`).join("");
  prefSel.onchange=()=>{S.primaryManifest=prefSel.value;localStorage.setItem("rf17_primary_manifest",S.primaryManifest);renderSourceUI();};
 }
 const count=$("#sourceCountText");if(count)count.textContent=streams.length?`${streams.length} opção(ões) • ${addons.length-1} addon(s) • ordenação inteligente`:"Procurando fontes…";
 const drawerLabel=$("#sourceDrawerLabel");if(drawerLabel)drawerLabel.textContent=streams.length?`Fontes • ${streams.length}`:"Fontes";

 $("#addonTabs").innerHTML=addons.map(a=>`<button class="${S.selectedAddon===a?"active":""}" data-addon="${esc(a)}">${a==="all"?"Todas":esc(a)}</button>`).join("");
 $("#addonTabs").querySelectorAll("[data-addon]").forEach(b=>b.onclick=()=>{S.selectedAddon=b.dataset.addon;renderSourceUI()});
 const qualities=["all",...new Set(streams.map(s=>s._quality))].sort((a,b)=>a==="all"?-1:b==="all"?1:qualityScore(b)-qualityScore(a));
 $("#qualityFilters").innerHTML=qualities.map(q=>`<button class="${S.qualityFilter===q?"active":""}" data-q="${esc(q)}">${q==="all"?"Qualidade":esc(q)}</button>`).join("");
 $("#qualityFilters").querySelectorAll("[data-q]").forEach(b=>b.onclick=()=>{S.qualityFilter=b.dataset.q;renderSourceUI()});

 const filtered=sourceSortedFiltered(streams.filter(s=>(S.selectedAddon==="all"||s._addon===S.selectedAddon)&&(S.qualityFilter==="all"||s._quality===S.qualityFilter)));
 const rec=filtered.find(s=>!s._external&&getHealthStatus(s)!=="failed")||filtered[0];
 const recommend=$("#sourceRecommend");
 if(recommend){
  recommend.innerHTML=rec?`<button type="button" class="recommendCard"><span class="recommendIcon">★</span><span class="recommendText"><small>RECOMENDADA AGORA</small><b>${esc(detectProvider(rec))}</b><span>${esc(rec._addon)} • ${esc(rec._quality)}</span></span><span class="recommendUse">Usar</span></button>`:"";
  if(rec)recommend.querySelector("button").onclick=()=>{S.selectedStream=rec;renderSourceUI();if(rec._external)openExternalSource(rec.externalUrl);else selectStream(rec,true);if(innerWidth<=900)$("#playerSide")?.classList.remove("drawerOpen")};
 }
 if(!filtered.length){$("#sources").innerHTML='<div class="sourceEmpty">Nenhuma fonte corresponde aos filtros escolhidos.</div>';renderSourceSelectedBar();return}

 $("#sources").innerHTML=filtered.map((s,i)=>{
  const selected=S.selectedStream===s,provider=detectProvider(s),badges=sourceBadgeList(s),status=getHealthStatus(s);
  return `<article class="sourceCard compact ${selected?"active":""} ${s._external?"external":""} ${status}" data-source-key="${esc(s._manifest+"|"+s._idx)}">
   <div class="sourceStatus ${status||"idle"}">${sourceStatusIcon(s)}</div>
   <div class="sourceCompactMain">
    <div class="sourceCompactTitle"><b>${esc(provider)}</b>${S.primaryManifest&&S.primaryManifest===s._manifest?'<span class="primarySourceBadge">PRINCIPAL</span>':""}</div>
    <div class="sourceCompactSub">${esc(s._addon||"Fonte")} • ${esc(sourceStatusLabel(s))}</div>
    <div class="sourceCompactBadges"><span>${esc(s._quality||"Outro")}</span>${badges.map(x=>`<span>${esc(x)}</span>`).join("")}${getCachedStreamBatch(s._manifest,S.playType,S.playId)?'<span>⚡ cache</span>':""}</div>
   </div>
   <button type="button" class="sourceQuickPlay" data-play aria-label="Reproduzir">${s._external?"↗":"▶"}</button>
  </article>`;
 }).join("");

 $("#sources").querySelectorAll(".sourceCard").forEach(card=>{
  const s=filtered.find(x=>`${x._manifest}|${x._idx}`===card.dataset.sourceKey);if(!s)return;
  card.onclick=e=>{if(e.target.closest("[data-play]"))return;S.selectedStream=s;renderSourceUI()};
  card.querySelector("[data-play]").onclick=e=>{e.stopPropagation();S.selectedStream=s;renderSourceSelectedBar();if(s._external)openExternalSource(s.externalUrl);else selectStream(s,true)};
 });
 renderSourceSelectedBar();
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
  S._sourceTimer=setTimeout(()=>finish(false,"timeout"),timeoutMs);
 });
}
async function attemptSource(stream,autoplay=true,resumeEntry=null){
 if(!stream||stream._external||!stream.url)return false;
 stopSourceAttempt();
 const token=S.sourceAttemptToken;
 S.selectedStream=stream;
 S.attemptedSourceKeys.add(sourceKey(stream));
 setHealth(stream,"testing");
 renderSourceUI();

 try{
  await loadVideo(stream.url,autoplay,stream,resumeEntry);
 }catch(e){
  console.warn("Falha preparando a fonte",e);
  setHealth(stream,"failed","prepare-error");
  rememberSourceResult(stream,false,"prepare-error");
  return false;
 }
 // Aguarda o HLS/arquivo realmente ficar pronto para reproduzir.
 const result=await waitForSourceReady(stream,token,14000);
 if(token!==S.sourceAttemptToken)return false;
 if(result.ok){
  setHealth(stream,"working");
  rememberSourceResult(stream,true);
  prefetchNextEpisodeSources();
  if(S.playType==="series")toast(`Fonte funcionando: ${detectProvider(stream)} • ${stream._quality}.`);
  return true;
 }
 setHealth(stream,"failed",result.reason);
 rememberSourceResult(stream,false,result.reason);
 return false;
}
async function trySourcesInOrder(candidates,autoplay=true,resumeEntry=null,announce=true){
 const list=candidates.filter(s=>!S.attemptedSourceKeys.has(sourceKey(s)));
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
 const ranked=rankedPlayableStreams(S.streams,resumeEntry);
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
 if(stream._external){openExternalSource(stream.externalUrl);return}
 const v=$("#video");
 const liveResume=resumeEntry||((v.currentTime||0)>3?{currentTime:v.currentTime,duration:v.duration||0,stream:streamIdentity(stream)}:null);
 if((v.currentTime||0)>1)persistPlaybackProgress(true);
 S.attemptedSourceKeys.clear();

 const ok=await attemptSource(stream,autoplay,liveResume);
 if(ok)return;
 if(!S.autoFallback){
  toast("Essa fonte não iniciou. Selecione outra fonte.");
  return;
 }
 toast("Essa fonte falhou. Procurando automaticamente outra opção...");
 const ranked=rankedPlayableStreams(S.streams,liveResume).filter(s=>sourceKey(s)!==sourceKey(stream));
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
 if(!stream||stream._external||!stream.url){
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
    await navigator.share({title:S.streamTitle||"ResenhaFlix",text:"Abrir esta fonte em outro player",url:stream.url});
    closePlayerMenu();
   }else{
    const ok=await copyTextSafe(stream.url);
    toast(ok?"Link copiado. Cole no player externo.":"Compartilhamento indisponível.");
    closePlayerMenu();
   }
  }catch(e){
   if(e?.name!=="AbortError")toast("Não foi possível abrir o compartilhamento.");
  }
 };
 menu.querySelector("[data-other-tab]").onclick=()=>{
  window.open(stream.url,"_blank","noopener,noreferrer");
  closePlayerMenu();
 };
 menu.querySelector("[data-other-copy]").onclick=async()=>{
  const ok=await copyTextSafe(stream.url);
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
 return S.playType==="series" && !S.introSkipped;
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
   if(show)b.textContent=`Pular abertura ⏭`;
  }else{
   // Sem perfil: deixa disponível até 60% do episódio (máximo 30 min).
   // Assim séries com cold open ou abertura no meio continuam funcionando.
   show=t>=5&&t<=introDiscoveryEnd();
   b.classList.remove("learned");
   if(show)b.textContent="Pular abertura ⏭";
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
  <div class="introProfileInfo">${profile?`Aprendido para esta temporada: início em <b>${formatTime(start)}</b>, duração <b>${len}s</b>.`:"Ainda não existe um horário aprendido para esta temporada."}</div>
  <button class="menuItem" data-intro-mark><span class="check">⌖</span><span class="menuText">A abertura começa aqui<small>Salvar ${formatTime(now)} como início da abertura desta temporada.</small></span></button>
  <button class="menuItem" data-intro-60><span class="check"></span><span class="menuText">Duração: 60 segundos</span></button>
  <button class="menuItem" data-intro-90><span class="check">${len===90?"✓":""}</span><span class="menuText">Duração: 90 segundos</span></button>
  <button class="menuItem" data-intro-120><span class="check">${len===120?"✓":""}</span><span class="menuText">Duração: 120 segundos</span></button>
  <button class="menuItem" data-intro-forget><span class="check">↺</span><span class="menuText">Esquecer abertura aprendida<small>O botão volta ao modo de descoberta ampla.</small></span></button>`;
 finishPlayerMenu("intro");

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
async function playStream(type,id,title,meta,resumeEntry=null){
 $("#playerModal").classList.add("open");document.body.classList.add("playerOpen");setPrimePlayerMeta(type,title,meta);$("#playerSide").classList.remove("drawerOpen");$("#sourcePanelBackdrop").classList.remove("open");$("#primeNextFloat").classList.remove("show");
 if(type!=="series")$("#episodesBtn").style.display="none";
 setPlayerSideTab("fontes");
 S.streamTitle=title||"video";S.streamMeta=meta||{id,type,name:title};S.playType=type;S.playId=id;S.introSkipped=false;$("#skipIntroBtn").classList.remove("show");S.rootId=type==="series"?(S.currentShow?.id||resumeEntry?.rootId||meta?.id):(resumeEntry?.rootId||meta?.id||id);S.resumeEntry=resumeEntry;S.resumeApplied=false;S.streams=[];S.selectedStream=null;S.selectedAddon="all";S.qualityFilter="all";S.externalSubtitles=[];S.sourceHealth.clear();S.attemptedSourceKeys.clear();S._lastProgressSave=0;
 resetVideo();showPlayerUI(true);
 $("#addonTabs").innerHTML="";$("#qualityFilters").innerHTML="";$("#sources").innerHTML="<div class='sourceEmpty'>Buscando fontes disponíveis...</div>";
 try{
  const loadToken=++S.streamLoadToken;let autoStarted=false,autoPromise=null,receivedAny=false;
  const streamId=await resolveStreamId(type,id,meta);
  if(loadToken!==S.streamLoadToken)return;
  const allPromise=loadStreamsFromAddons(type,streamId,(batch)=>{
   if(loadToken!==S.streamLoadToken||!batch?.length)return;
   receivedAny=true;S.streams=mergeStreamBatches(S.streams,batch);renderSourceUI();
   if(!autoStarted&&rankedPlayableStreams(S.streams,resumeEntry).length){
    autoStarted=true;
    if(resumeEntry?.stream?.provider)toast(`Procurando novamente ${resumeEntry.stream.provider}…`);
    autoPromise=autoChooseWorkingSource(resumeEntry,!!resumeEntry).then(async found=>{if(found)await fetchExternalSubtitles(type,streamId,found);return found});
   }
  });
  const streams=await allPromise;if(loadToken!==S.streamLoadToken)return;
  S.streams=mergeStreamBatches(S.streams,streams);if(S.streams.length)renderSourceUI();
  let found=autoPromise?await autoPromise:null;
  // Se o primeiro addon chegou rápido mas todas as fontes dele falharam,
  // tenta novamente após os addons mais lentos terminarem de chegar.
  if(!found&&rankedPlayableStreams(S.streams,resumeEntry).length){
   found=await autoChooseWorkingSource(resumeEntry,!!resumeEntry);
   if(found)await fetchExternalSubtitles(type,streamId,found);
  }
  if(!receivedAny&&!S.streams.length){$("#sources").innerHTML="<div class='sourceEmpty'>Nenhuma fonte foi retornada pelos addons configurados.</div>";return}
  if(!rankedPlayableStreams(S.streams,resumeEntry).length&&S.streams.length)$("#sources").insertAdjacentHTML("afterbegin","<div class='sourceEmpty'>As opções disponíveis abrem provedores externos; escolha uma delas na lista.</div>");
 }catch(e){console.error(e);$("#sources").innerHTML="<div class='sourceEmpty'>Falha ao consultar as fontes. Verifique CORS, o manifesto e a disponibilidade do addon.</div>"}
}
function resetVideo(){
 stopSourceAttempt();clearPlaybackStallMonitor();S._stallRecovery=false;S._stallEvents=[];
 const v=$("#video");v.pause();if(v._hls){v._hls.destroy();v._hls=null}v.removeAttribute("src");
 [...v.querySelectorAll("track[data-casaflix]")].forEach(t=>t.remove());
 if(S.externalSubtitleBlob){URL.revokeObjectURL(S.externalSubtitleBlob);S.externalSubtitleBlob=null}
 v.load();v.volume=SITE_DEFAULT_VOLUME;v.muted=false;$("#volume").value=SITE_DEFAULT_VOLUME;$("#muteBtn").textContent="🔊";S.resumeEntry=null;S.resumeApplied=false;applyAspectMode(S.aspectMode,false);$("#seek").value=0;$("#seek").style.setProperty("--seek-fill","0%");$("#timeText").textContent="0:00 / 0:00";$("#bigPlay").classList.remove("hidden");$("#playPause").textContent="▶";$("#centerPlay").textContent="▶";$("#trackStatus").textContent="Áudio: auto • Legenda: auto";$("#playerMenu").classList.remove("open");$("#playerMenuBackdrop").classList.remove("open");S.playerMenuKind=null;
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
async function loadVideo(url,autoplay=true,stream=null,resumeEntry=null){
 clearPlaybackStallMonitor();
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
    v._hls=new Hls({
     enableWorker:true,
     lowLatencyMode:false,
     backBufferLength:30,
     maxBufferLength:55,
     maxMaxBufferLength:110,
     maxBufferSize:80*1000*1000,
     capLevelToPlayerSize:true,
     startFragPrefetch:true,
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
  const ranked=rankedPlayableStreams(S.streams,resume)
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
 clearTimeout(S._ctlTimer);$("#playerControls").classList.add("show");$("#videoShell").classList.remove("uiHidden");$(".playerStage").classList.remove("uiHidden");
 setPlayerUIAccessibility(false);
 if(!sticky&&!$("#video").paused){
  const coarse=window.matchMedia?.("(hover: none), (pointer: coarse)").matches;
  S._ctlTimer=setTimeout(hidePlayerUI,coarse?3800:7000);
 }
}
function togglePlayerUIVisibility(){
 const hidden=$(".playerStage").classList.contains("uiHidden")||!$("#playerControls").classList.contains("show");
 if(hidden)showPlayerUI();else hidePlayerUI(true);
}
function syncPlayer(){
 const v=$("#video"),dur=isFinite(v.duration)?v.duration:0,cur=v.currentTime||0;
 const seekValue=dur?Math.round(cur/dur*1000):0;$("#seek").value=seekValue;$("#seek").style.setProperty("--seek-fill",`${seekValue/10}%`);$("#timeText").textContent=`${formatTime(cur)} / ${formatTime(dur)}`;
 $("#playPause").textContent=v.paused?"▶":"❚❚";$("#centerPlay").textContent=v.paused?"▶":"❚❚";$("#bigPlay").classList.toggle("hidden",!v.paused);
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





const ANILIST_API="https://graphql.anilist.co";
const MANGA_CATALOG_CACHE_KEY="rf15_manga_catalog_cache";
const MANGA_SOURCE_HEALTH_KEY="rf15_manga_source_health";

function mangaInstalled(){try{return JSON.parse(localStorage.getItem("cf12_manga_installed")||"[]")}catch{return[]}}
function saveMangaInstalled(a){localStorage.setItem("cf12_manga_installed",JSON.stringify(a))}
function mangaLibrary(){try{return JSON.parse(localStorage.getItem("rf13_manga_library")||"[]")}catch{return[]}}
function saveMangaLibrary(a){localStorage.setItem("rf13_manga_library",JSON.stringify(a))}
function mangaProgress(){try{return JSON.parse(localStorage.getItem("rf14_manga_progress")||"{}")}catch{return{}}}
function saveMangaProgressMap(x){localStorage.setItem("rf14_manga_progress",JSON.stringify(x))}
function mangaReaderPrefs(){try{return JSON.parse(localStorage.getItem("rf14_reader_prefs")||'{"mode":"vertical","fit":"width","gap":"0","brightness":100}')}catch{return{mode:"vertical",fit:"width",gap:"0",brightness:100}}}
function saveMangaReaderPrefs(p){localStorage.setItem("rf14_reader_prefs",JSON.stringify(p))}
function mangaSourceHealth(){try{return JSON.parse(localStorage.getItem(MANGA_SOURCE_HEALTH_KEY)||"{}")}catch{return{}}}
function saveMangaSourceHealth(x){localStorage.setItem(MANGA_SOURCE_HEALTH_KEY,JSON.stringify(x))}
function configuredMangaRepos(){
 return [...new Set(String(cfg.mangaRepos||CFG_DEFAULT.mangaRepos).split(/\n+/).map(x=>x.trim()).filter(Boolean))]
}
function isMangaInstalled(pkg){return mangaInstalled().some(x=>x.pkg===pkg)}
function isPortugueseLang(lang){const l=String(lang||"").toLowerCase();return l==="pt"||l==="pt-br"||l==="pt_br"||l==="por"||l==="pob"||l.startsWith("pt-")}
function mangaLangScore(lang){const l=String(lang||"").toLowerCase();if(l==="pt-br"||l==="pt_br"||l==="pob")return 100;if(l==="pt"||l==="por"||l.startsWith("pt-"))return 90;if(l==="all")return 60;if(l==="en")return 30;return 10}
function sortMangaSourcesPtFirst(sources){
 const health=mangaSourceHealth(),now=Date.now();
 return sources.slice().sort((a,b)=>{
  const ha=health[a.homeUrl]||{},hb=health[b.homeUrl]||{};
  const pa=(ha.okAt&&now-ha.okAt<864e5?30:0)-(ha.failAt&&now-ha.failAt<10*60e3?50:0);
  const pb=(hb.okAt&&now-hb.okAt<864e5?30:0)-(hb.failAt&&now-hb.failAt<10*60e3?50:0);
  return (mangaLangScore(b.lang)+pb)-(mangaLangScore(a.lang)+pa)||(a.name||"").localeCompare(b.name||"");
 })
}
function extensionPortugueseScore(e){return Math.max(0,...(e.sources||[]).map(s=>mangaLangScore(s.lang)))}
function repoLabel(url){try{const h=new URL(url).hostname;if(url.includes("keiyoushi"))return"Keiyoushi";if(url.includes("aniyomi"))return"Aniyomi";return h}catch{return"Repositório"}}
function repoKind(ext){
 const p=String(ext.packageName||ext.pkg||"").toLowerCase();
 if(p.includes(".animeextension.")||p.includes("animeextension"))return"anime";
 return"manga";
}
function normalizeMangaRepo(data,repoUrl){
 let raw=[];if(Array.isArray(data))raw=data;else if(Array.isArray(data?.extensionList?.extensions))raw=data.extensionList.extensions;else if(Array.isArray(data?.extensions))raw=data.extensions;
 return raw.map((e,i)=>{
  const kind=repoKind(e);
  const sources=sortMangaSourcesPtFirst((e.sources||[]).map(s=>({id:String(s.id||""),name:s.name||e.name||"Fonte",lang:s.language||s.lang||e.lang||"all",homeUrl:s.homeUrl||s.baseUrl||"",_repo:repoUrl,_kind:kind})).filter(s=>s.homeUrl));
  return {name:e.name||`Extensão ${i+1}`,pkg:e.packageName||e.pkg||`repo-${i}`,version:e.versionName||e.version||"",lang:e.lang||sources[0]?.lang||"all",icon:e.resources?.iconUrl||e.icon||"",apk:e.resources?.apkUrl||e.apk||"",warning:e.contentWarning||((Number(e.nsfw||0)>0)?"CONTENT_WARNING_NSFW":""),sources,_repo:repoUrl,_repoLabel:repoLabel(repoUrl),_kind:kind};
 }).filter(x=>x.sources.length)
}
function mangaRepoFallbackUrl(url){
 try{const u=new URL(url);if(/index\.min\.json$/i.test(u.pathname)&&url.includes("keiyoushi"))u.pathname=u.pathname.replace(/index\.min\.json$/i,"index.json");return u.toString()}catch{}
 return url
}
async function fetchOneMangaRepo(repoUrl){
 const candidates=[repoUrl];
 if(repoUrl.includes("keiyoushi")&&/index\.min\.json/i.test(repoUrl))candidates.push(mangaRepoFallbackUrl(repoUrl),"https://cdn.jsdelivr.net/gh/keiyoushi/extensions@repo/index.json");
 let used=repoUrl,fallback=false,items=[],lastError=null;
 for(const candidate of [...new Set(candidates)]){
  try{
   const data=await getJSONTimeout(candidate,candidate===repoUrl?7000:11000),parsed=normalizeMangaRepo(data,repoUrl);
   if(parsed.length>items.length){items=parsed;used=candidate;fallback=candidate!==repoUrl}
   if(parsed.filter(x=>x._kind==="manga").length>=10)break
  }catch(e){lastError=e}
 }
 if(!items.length&&lastError)throw lastError;
 const manga=items.filter(x=>x._kind==="manga"&&!String(x.warning||"").includes("NSFW"));
 const anime=items.filter(x=>x._kind==="anime");
 return {repoUrl,used,label:repoLabel(repoUrl),fallback,manga,anime,total:items.length}
}
async function loadMangaRepo(force=false){
 if(!force&&S.mangaRepoItems.length&&Date.now()-S.mangaRepoLoadedAt<1800000)return S.mangaRepoItems;
 const status=$("#mangaRepoStatus");if(status){status.className="mangaRepoStatus";status.textContent="Carregando repositórios em paralelo…"}
 const repos=configuredMangaRepos();
 const settled=await Promise.allSettled(repos.map(fetchOneMangaRepo));
 const stats=[],all=[];
 for(let i=0;i<settled.length;i++){
  const r=settled[i],url=repos[i];
  if(r.status==="fulfilled"){
   stats.push({label:r.value.label,url,ok:true,manga:r.value.manga.length,anime:r.value.anime.length,fallback:r.value.fallback});
   all.push(...r.value.manga);
  }else stats.push({label:repoLabel(url),url,ok:false,manga:0,anime:0,error:String(r.reason||"Erro")});
 }
 const map=new Map();for(const e of all)if(!map.has(e.pkg))map.set(e.pkg,e);
 S.mangaRepoItems=[...map.values()].sort((a,b)=>extensionPortugueseScore(b)-extensionPortugueseScore(a)||(a.name||"").localeCompare(b.name||""));
 S.mangaRepoStats=stats;S.mangaRepoLoadedAt=Date.now();
 if(status){
  const pt=S.mangaRepoItems.filter(e=>extensionPortugueseScore(e)>=90).length;
  const skipped=stats.reduce((n,x)=>n+x.anime,0);
  status.className="mangaRepoStatus "+(S.mangaRepoItems.length?"ok":"warn");
  status.innerHTML=`${S.mangaRepoItems.length} extensões de mangá • ${pt} com Português priorizado.${skipped?` <br>${skipped} extensão(ões) de anime/vídeo detectadas em repositório secundário e ignoradas nesta tela.`:""}<div class="mangaRepoStats">${stats.map(x=>`<div class="mangaRepoStat"><b>${esc(x.label)}</b><span class="${x.ok?"repoOk":"repoSkip"}">${x.ok?`${x.manga} mangá${x.fallback?" • compatibilidade index.json":""}`:"falhou"}</span>${x.anime?`<span class="repoSkip">${x.anime} anime/vídeo ignoradas</span>`:""}</div>`).join("")}</div>`;
 }
 return S.mangaRepoItems
}
function filteredMangaExtensions(){
 const q=normText(S.mangaExtensionQuery),lang=S.mangaLang;
 return S.mangaRepoItems.filter(e=>{
  const tx=normText([e.name,e.pkg,...e.sources.map(s=>`${s.name} ${s.homeUrl}`)].join(" "));
  return (!q||tx.includes(q))&&(lang==="all"||e.sources.some(s=>lang==="pt"?isPortugueseLang(s.lang):s.lang===lang));
 }).sort((a,b)=>extensionPortugueseScore(b)-extensionPortugueseScore(a)||(a.name||"").localeCompare(b.name||""))
}
function mangaExtCard(e){
 const installed=isMangaInstalled(e.pkg),pt=extensionPortugueseScore(e)>=90,langs=[...new Set(e.sources.map(s=>s.lang))].slice(0,5).join(" • "),names=e.sources.slice(0,4).map(s=>s.name).join(", ");
 return `<article class="mangaExtCard ${pt?"ptFirst":""}" data-manga-pkg="${esc(e.pkg)}"><div class="mangaExtHead"><div class="mangaExtIcon" ${e.icon?`style="background-image:url('${esc(e.icon)}')"`:""}>${e.icon?"":esc((e.name||"?").slice(0,2).toUpperCase())}</div><div class="mangaExtInfo"><div class="mangaExtName">${esc(e.name)}${pt?'<span class="mangaPtBadge">PT</span>':""}</div><div class="mangaExtMeta">${esc(e.version||"")} • ${esc(langs||"all")} • ${esc(e._repoLabel||"")}</div></div></div><div class="mangaExtSources">${esc(names||"Sem fontes")}${e.sources.length>4?` +${e.sources.length-4}`:""}</div><div class="mangaExtActions"><button type="button" data-manga-install class="${installed?"installed":""}">${installed?"✓ Instalada":"＋ Instalar"}</button><button type="button" data-manga-web ${e.sources?.[0]?.homeUrl?"":"disabled"}>🌐 Abrir fonte</button></div></article>`
}
function toggleMangaExtension(pkg){
 const e=S.mangaRepoItems.find(x=>x.pkg===pkg)||mangaInstalled().find(x=>x.pkg===pkg);if(!e)return;
 let a=mangaInstalled(),i=a.findIndex(x=>x.pkg===pkg);
 if(i>=0){a.splice(i,1);toast("Fonte removida.")}else{a.unshift(e);toast(extensionPortugueseScore(e)>=90?"Fonte em Português instalada.":"Fonte instalada.")}
 saveMangaInstalled(a);renderMangaCurrentTab()
}
function mangaSourcesFromInstalled(){return sortMangaSourcesPtFirst(mangaInstalled().flatMap(e=>(e.sources||[]).filter(s=>s._kind!=="anime").map(s=>({...s,extension:e.name,pkg:e.pkg,icon:e.icon||"",_repo:e._repo||s._repo||""}))))}
function portugueseInstalledSources(){return mangaSourcesFromInstalled().filter(s=>isPortugueseLang(s.lang))}
function englishInstalledSources(){return mangaSourcesFromInstalled().filter(s=>String(s.lang||"").toLowerCase()==="en"||String(s.lang||"").toLowerCase()==="all")}
function mangaSourcesForSearch(){
 const all=mangaSourcesFromInstalled();
 if(S.mangaSearchLang==="pt")return all.filter(s=>isPortugueseLang(s.lang)||String(s.lang).toLowerCase()==="all");
 if(S.mangaSearchLang==="en")return all.filter(s=>String(s.lang).toLowerCase()==="en"||String(s.lang).toLowerCase()==="all");
 return sortMangaSourcesPtFirst(all.filter(s=>isPortugueseLang(s.lang)||["en","all"].includes(String(s.lang||"").toLowerCase())));
}
const MANGA_ALIAS_CACHE_KEY="rf27_manga_aliases";
function mangaAliasCache(){try{return JSON.parse(localStorage.getItem(MANGA_ALIAS_CACHE_KEY)||"{}")}catch{return{}}}
function mangaAliasKey(media,query=""){return String(media?.id||normText(mangaDisplayTitle(media)||query)||query||"")}
function rememberMangaAlias(media,alias,query=""){
 alias=String(alias||"").trim();if(!alias)return;
 const all=mangaAliasCache(),key=mangaAliasKey(media,query),old=all[key]||{aliases:[]};
 const set=new Set([...(old.aliases||[]),alias].map(x=>String(x||"").trim()).filter(Boolean));
 all[key]={at:Date.now(),aliases:[...set].slice(0,14)};
 try{localStorage.setItem(MANGA_ALIAS_CACHE_KEY,JSON.stringify(all))}catch{}
}
function rememberedMangaAliases(media,query=""){
 const x=mangaAliasCache()[mangaAliasKey(media,query)];
 return Array.isArray(x?.aliases)?x.aliases:[]
}
const MANGA_PT_WORDS={
 "mage":"mago","wizard":"mago","magician":"mago","magic":"magia","infinite":"infinito","infinity":"infinito",
 "sword":"espada","swordsman":"espadachim","swordmaster":"mestre da espada","master":"mestre",
 "player":"jogador","hunter":"caçador","hero":"herói","villain":"vilão","villainess":"vilã",
 "reincarnated":"reencarnado","reincarnation":"reencarnação","returner":"retornado","regressor":"regressor",
 "demon":"demônio","king":"rei","queen":"rainha","emperor":"imperador","empress":"imperatriz",
 "duke":"duque","princess":"princesa","prince":"príncipe","academy":"academia","school":"escola",
 "tower":"torre","level":"nível","system":"sistema","legendary":"lendário","strongest":"mais forte",
 "weakest":"mais fraco","youngest":"mais jovem","genius":"gênio","heavenly":"celestial","martial":"marcial",
 "god":"deus","goddess":"deusa","dragon":"dragão","necromancer":"necromante","archmage":"arquimago",
 "assassin":"assassino","doctor":"doutor","mercenary":"mercenário"
};
function heuristicPtMangaTitles(title){
 const raw=String(title||"").trim();if(!raw)return[];
 const clean=raw.replace(/^(the|a|an)\s+/i,"").trim();
 const words=clean.split(/\s+/).map(w=>w.replace(/[^\p{L}\p{N}'-]/gu,"")).filter(Boolean);
 const translated=words.map(w=>MANGA_PT_WORDS[w.toLowerCase()]||w),out=[];
 if(translated.some((w,i)=>w!==words[i])){
  out.push(translated.join(" "));
  const lastEn=words.at(-1)?.toLowerCase(),lastPt=translated.at(-1);
  if(["mage","wizard","magician","master","king","queen","emperor","empress","hunter","player"].includes(lastEn)&&translated.length>=2){
   const before=translated.slice(0,-1);
   out.push([lastPt,...before].join(" "));
   if(before.length===1)out.push(`${lastPt} do ${before[0]}`);
  }
 }
 return out
}
async function translateMangaTitlePt(title){
 title=String(title||"").trim();if(!title||title.length>180)return"";
 const key=`rf27_tr_${normText(title)}`,cached=localStorage.getItem(key);
 if(cached)return cached;
 let timer;
 try{
  const ctl=new AbortController();timer=setTimeout(()=>ctl.abort(),3500);
  const r=await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(title)}&langpair=en|pt-BR`,{signal:ctl.signal});
  if(!r.ok)return"";
  const d=await r.json(),t=String(d?.responseData?.translatedText||"").trim();
  if(t&&normText(t)!==normText(title)){try{localStorage.setItem(key,t)}catch{};return t}
 }catch{}finally{clearTimeout(timer)}
 return""
}
function mangaBaseAliases(query,media=null){
 return[
  query,media?mangaDisplayTitle(media):"",media?mangaAltTitle(media):"",
  media?.title?.romaji||"",media?.title?.english||"",media?.title?.native||"",
  ...(Array.isArray(media?.synonyms)?media.synonyms:[]),...rememberedMangaAliases(media,query)
 ].map(x=>String(x||"").trim()).filter(Boolean)
}
async function mangaQueryVariants(query,media=null){
 const english=media?.title?.english||query||"";
 const translated=await translateMangaTitlePt(english);
 const heuristics=heuristicPtMangaTitles(english);
 const raw=[
  ...rememberedMangaAliases(media,query),
  translated,
  ...heuristics,
  ...(Array.isArray(media?.synonyms)?media.synonyms:[]),
  query,
  media?mangaDisplayTitle(media):"",
  media?mangaAltTitle(media):"",
  media?.title?.english||"",
  media?.title?.romaji||"",
  media?.title?.native||""
 ];
 if(/\b(infinite mage|the infinite mage)\b/i.test(english))raw.unshift("Mago do Infinito","Mago Infinito");
 const seen=new Set(),out=[];
 for(const x of raw){const k=normText(x);if(!k||seen.has(k))continue;seen.add(k);out.push(String(x).trim())}
 return out.slice(0,8)
}

function bindMangaExtensionCards(container){
 container.querySelectorAll("[data-manga-install]").forEach(b=>b.onclick=()=>toggleMangaExtension(b.closest("[data-manga-pkg]").dataset.mangaPkg));
 container.querySelectorAll("[data-manga-web]").forEach(b=>b.onclick=()=>{
  const pkg=b.closest("[data-manga-pkg]")?.dataset.mangaPkg;
  const e=S.mangaRepoItems.find(x=>x.pkg===pkg)||mangaInstalled().find(x=>x.pkg===pkg);
  const source=sortMangaSourcesPtFirst(e?.sources||[])[0];
  if(source)openMangaWebSource({...source,extension:e.name,pkg:e.pkg,_repo:e._repo||source._repo||""},"");
 });
}
function renderMangaExtensions(){
 const items=filteredMangaExtensions(),shown=items.slice(0,140);
 $("#mangaContent").innerHTML=`<div class="mangaRepoStatus" id="mangaRepoStatus">${S.mangaRepoItems.length?`${S.mangaRepoItems.length} extensões carregadas dos repositórios configurados.`:"Carregando repositórios…"}</div><div class="mangaToolbar"><input id="mangaExtSearch" value="${esc(S.mangaExtensionQuery)}" placeholder="Buscar extensão ou fonte…" autocomplete="off"><select id="mangaLangFilter"><option value="pt" ${S.mangaLang==="pt"?"selected":""}>🇧🇷 Português</option><option value="all" ${S.mangaLang==="all"?"selected":""}>Todos</option><option value="en" ${S.mangaLang==="en"?"selected":""}>Inglês</option><option value="es" ${S.mangaLang==="es"?"selected":""}>Espanhol</option></select><button type="button" id="refreshMangaRepo">↻ Atualizar</button></div><div class="mangaCount">${items.length} extensão(ões) de mangá • ${mangaInstalled().length} instalada(s)</div><div class="mangaExtGrid">${shown.map(mangaExtCard).join("")||'<div class="mangaEmpty">Nenhuma extensão encontrada.</div>'}</div>`;
 let t;$("#mangaExtSearch").oninput=e=>{clearTimeout(t);t=setTimeout(()=>{S.mangaExtensionQuery=e.target.value;renderMangaExtensions()},240)};
 $("#mangaLangFilter").onchange=e=>{S.mangaLang=e.target.value;renderMangaExtensions()};$("#refreshMangaRepo").onclick=async()=>{await loadMangaRepo(true);renderMangaExtensions()};bindMangaExtensionCards($("#mangaContent"))
}

async function aniListManga(query="",page=1){
 const key=`${query.toLowerCase()}|${page}`,mem=S.mangaExploreCatalogCache.get(key);
 if(mem&&Date.now()-mem.at<30*60e3)return mem.value;
 try{
  const raw=JSON.parse(localStorage.getItem(MANGA_CATALOG_CACHE_KEY)||"{}"),c=raw[key];
  if(c&&Date.now()-c.at<30*60e3){S.mangaExploreCatalogCache.set(key,c);return c.value}
 }catch{}
 const gql=`query($page:Int,$search:String){Page(page:$page,perPage:24){pageInfo{hasNextPage}media(type:MANGA,search:$search,sort:${query?"SEARCH_MATCH":"TRENDING_DESC"}){id title{romaji english native}synonyms coverImage{large extraLarge}format status averageScore chapters volumes description(asHtml:false)countryOfOrigin genres}}}`;
 const vars={page};if(query)vars.search=query;const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),7000);
 try{
  const r=await fetch(ANILIST_API,{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify({query:gql,variables:vars}),signal:ctl.signal});
  if(!r.ok)throw Error("AniList "+r.status);const d=await r.json(),value=d.data?.Page||{media:[],pageInfo:{hasNextPage:false}};
  const item={at:Date.now(),value};S.mangaExploreCatalogCache.set(key,item);
  try{let raw=JSON.parse(localStorage.getItem(MANGA_CATALOG_CACHE_KEY)||"{}");raw[key]=item;const keys=Object.keys(raw).sort((a,b)=>raw[b].at-raw[a].at).slice(0,8),trim={};for(const k of keys)trim[k]=raw[k];localStorage.setItem(MANGA_CATALOG_CACHE_KEY,JSON.stringify(trim))}catch{}
  return value
 }finally{clearTimeout(timer)}
}
function mangaDisplayTitle(m){return m?._rfTitle||m?.title?.english||m?.title?.romaji||m?.title?.native||m?.title||"Mangá"}
function mangaAltTitle(m){const main=mangaDisplayTitle(m);return [m?.title?.romaji,m?.title?.english,m?.title?.native].filter(Boolean).find(x=>x!==main)||m?._rfAlt||""}
function normalizeAniMedia(m){return {...m,_rfTitle:mangaDisplayTitle(m),_rfAlt:mangaAltTitle(m),_rfCover:m.coverImage?.extraLarge||m.coverImage?.large||m.thumbnail||""}}
function mangaItemKey(m){return m?.url?`src:${m.source?.homeUrl||""}|${m.url}`:`ani:${m?.id||m?._rfTitle||m?.title||""}`}
function mangaIsSavedItem(m){const k=mangaItemKey(m);return mangaLibrary().some(x=>mangaItemKey(x)===k)}
function toggleMangaLibrary(media){
 const m=media?._nativeSource?media:normalizeAniMedia(media),key=mangaItemKey(m),a=mangaLibrary(),i=a.findIndex(x=>mangaItemKey(x)===key);
 if(i>=0){a.splice(i,1);toast("Mangá removido da biblioteca.")}else{a.unshift(m);toast("Mangá adicionado à biblioteca.")}
 saveMangaLibrary(a)
}

function mangaWebSources(){
 return sortMangaSourcesPtFirst(mangaSourcesFromInstalled()).slice(0,14);
}
function mangaWebSearchCandidates(source,query=""){
 const base=String(source?.homeUrl||"").replace(/\/+$/,"");
 if(!base)return[];
 if(!query)return[base];
 const q=encodeURIComponent(query);
 return [...new Set([
  `${base}/?s=${q}&post_type=wp-manga`,
  `${base}/?s=${q}`,
  `${base}/search?q=${q}`,
  `${base}/buscar?q=${q}`,
  `${base}/busca?q=${q}`,
  base
 ])];
}
function mangaWebFallbackHtml(query=""){
 const sources=mangaWebSources();
 if(!sources.length)return`<div class="mangaWebFallback"><div class="mangaWebFallbackHead"><div><h3>Modo site</h3><p>Instale uma extensão para ter uma fonte disponível aqui.</p></div></div></div>`;
 return `<section class="mangaWebFallback">
  <div class="mangaWebFallbackHead">
   <div><h3>Abrir uma fonte diretamente</h3><p>Se a busca automática não achar o mangá, abra a fonte dentro do próprio ResenhaFlix e use o site normalmente. ${query?`A busca por “${esc(query)}” já vai preparada quando possível.`:""}</p></div>
   <span class="mangaWebFallbackBadge">SEM PONTE</span>
  </div>
  <div class="mangaWebSourceRow">
   ${sources.map((s,i)=>`<button type="button" class="mangaWebSourceBtn ${isPortugueseLang(s.lang)?"pt":""}" data-manga-web-source="${i}">
    <div class="mangaWebSourceName">${esc(s.name||s.extension||"Fonte")}</div>
    <div class="mangaWebSourceMeta">${esc(mangaLanguageLabel(s.lang))}${s.extension?` • ${esc(s.extension)}`:""}</div>
    <div class="mangaWebSourceOpen">Abrir dentro do ResenhaFlix →</div>
   </button>`).join("")}
  </div>
 </section>`;
}
function bindMangaWebFallback(root,query=""){
 const sources=mangaWebSources();
 root.querySelectorAll("[data-manga-web-source]").forEach(b=>b.onclick=()=>{
  const s=sources[Number(b.dataset.mangaWebSource)];
  if(s)openMangaWebSource(s,query);
 });
}
function appendMangaWebFallback(root,query=""){
 if(!root||root.querySelector(".mangaWebFallback"))return;
 root.insertAdjacentHTML("beforeend",mangaWebFallbackHtml(query));
 bindMangaWebFallback(root,query);
}
function openMangaWebSource(source,query="",directUrl=""){
 if(!source?.homeUrl&&!directUrl)return toast("Essa fonte não possui endereço web.");
 S.mangaWebSource=source;
 S.mangaWebQuery=query||"";
 S.mangaWebCandidates=directUrl?[directUrl,...mangaWebSearchCandidates(source,query).filter(x=>x!==directUrl)]:mangaWebSearchCandidates(source,query);
 S.mangaWebCandidateIndex=0;
 const url=S.mangaWebCandidates[0]||source.homeUrl;
 S.mangaWebCurrentUrl=url;
 $("#mangaWebTitle").textContent=source.name||source.extension||"Fonte de mangá";
 $("#mangaWebSubtitle").textContent=query?`Buscando: ${query}`:`${mangaLanguageLabel(source.lang)} • modo site`;
 $("#mangaWebFrame").src=url;
 $("#mangaWebExternal").onclick=()=>window.open(S.mangaWebCurrentUrl||source.homeUrl,"_blank","noopener,noreferrer");
 $("#mangaWebHome").onclick=()=>{S.mangaWebCurrentUrl=source.homeUrl;$("#mangaWebFrame").src=source.homeUrl};
 $("#mangaWebNextSearch").style.display=S.mangaWebCandidates.length>1?"":"none";
 $("#mangaWebNextSearch").onclick=nextMangaWebSearch;
 $("#mangaWebNotice").textContent="A fonte está aberta dentro do ResenhaFlix. Se a página ficar vazia, o site bloqueou incorporação; use “Abrir fora”.";
 $("#mangaWebModal").classList.add("open");document.body.classList.add("mangaWebOpen");
}
function nextMangaWebSearch(){
 const list=S.mangaWebCandidates||[];if(!list.length)return;
 S.mangaWebCandidateIndex=(Number(S.mangaWebCandidateIndex||0)+1)%list.length;
 S.mangaWebCurrentUrl=list[S.mangaWebCandidateIndex];
 $("#mangaWebFrame").src=S.mangaWebCurrentUrl;
 $("#mangaWebNotice").textContent=`Tentativa de busca ${S.mangaWebCandidateIndex+1}/${list.length}. Se não aparecer o mangá, use a busca do próprio site.`;
}
function closeMangaWeb(){
 $("#mangaWebFrame").src="about:blank";
 $("#mangaWebModal").classList.remove("open");document.body.classList.remove("mangaWebOpen");
 S.mangaWebCandidates=[];S.mangaWebCurrentUrl="";
}
function bridgeBase(){return String(cfg.mangaBridge||"").trim().replace(/\/+$/,"")}
async function mangaBridgeRequest(path,payload,timeout=10000){
 const base=bridgeBase();if(!base)throw Object.assign(Error("bridge-not-configured"),{code:"NO_BRIDGE"});
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),timeout);
 try{const r=await fetch(base+path,{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify(payload),signal:ctl.signal});if(!r.ok)throw Error(`Bridge ${r.status}`);return await r.json()}finally{clearTimeout(timer)}
}
function sourcePayload(s){return{id:s.id||"",name:s.name||"Fonte",lang:s.lang||"all",homeUrl:s.homeUrl||"",extension:s.extension||"",pkg:s.pkg||"",repo:s._repo||""}}
function absUrl(base,href){try{return new URL(href,base).toString()}catch{return href||""}}
function parseDirectCards(doc,base,source){
 const sels=[".c-tabs-item__content",".page-item-detail",".row.c-tabs-item__content",".bs .bsx",".listupd .bs",".manga__item","article"],out=[],seen=new Set();
 for(const sel of sels){for(const el of doc.querySelectorAll(sel)){const a=el.querySelector("a[href]"),img=el.querySelector("img"),title=(el.querySelector("h3,h4,.post-title,.tab-summary,.tt")?.textContent||a?.getAttribute("title")||img?.getAttribute("alt")||"").trim(),url=absUrl(base,a?.getAttribute("href")||"");if(!title||!url||seen.has(url))continue;seen.add(url);out.push({title,url,thumbnail:absUrl(base,img?.getAttribute("data-src")||img?.getAttribute("data-lazy-src")||img?.getAttribute("src")||""),source:sourcePayload(source),_nativeSource:true})}if(out.length>=20)break}return out.slice(0,20)
}
async function directSourceSearch(source,query,popular=false,timeout=2300){
 const base=String(source.homeUrl||"").replace(/\/+$/,""),q=encodeURIComponent(query||"");
 const urls=popular?[base]:[
  `${base}/?s=${q}&post_type=wp-manga`,
  `${base}/?s=${q}`,
  `${base}/search?q=${q}`
 ];
 if(!base)return[];
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),timeout);
 try{
  const settled=await Promise.allSettled(urls.map(async url=>{
   const r=await fetch(url,{headers:{Accept:"text/html"},signal:ctl.signal});
   if(!r.ok)return[];
   const tx=await r.text(),doc=new DOMParser().parseFromString(tx,"text/html");
   return parseDirectCards(doc,url,source)
  }));
  for(const r of settled)if(r.status==="fulfilled"&&r.value?.length)return r.value;
  return[]
 }catch{return[]}
 finally{clearTimeout(timer)}
}

function markMangaSourceHealth(source,ok){
 const h=mangaSourceHealth(),x=h[source.homeUrl]||{};h[source.homeUrl]={...x,okAt:ok?Date.now():x.okAt,failAt:ok?x.failAt:Date.now()};saveMangaSourceHealth(h)
}
async function searchOneInstalledSource(source,query,popular=false,media=null,variantsOverride=null){
 const variants=popular?[""]:(variantsOverride?.length?variantsOverride:await mangaQueryVariants(query,media));
 const attempts=(variants.length?variants:[query]).slice(0,3);
 for(const q of attempts){
  if(bridgeBase()){
   try{
    const data=await Promise.race([
       mangaBridgeRequest(popular?"/api/popular":"/api/search",{source:sourcePayload(source),query:q},9000),
       new Promise((_,rej)=>setTimeout(()=>rej(Error("source-timeout")),9200))
    ]);
    const items=(data.items||[]).map(x=>({...x,source:{...sourcePayload(source),...(x.source||{})},_nativeSource:true}));
    if(items.length){markMangaSourceHealth(source,true);return items}
   }catch{}
  }
   const items=await directSourceSearch(source,q,popular,3500);
  if(items.length){markMangaSourceHealth(source,true);return items}
 }
 markMangaSourceHealth(source,false);return[]
}

function nativeMangaCard(m){
 const sourceBacked=!!m.url,title=mangaDisplayTitle(m),saved=mangaIsSavedItem(m),cover=m.thumbnail||m._rfCover||m.coverImage?.large||"",src=m.source||{};
 return `<article class="mangaNativeResultCard" data-item-key="${esc(mangaItemKey(m))}">
  <div class="mangaNativeResultCover" style="background-image:url('${esc(cover)}')">${sourceBacked?`<div class="mangaNativeResultSource">${esc(src.name||src.extension||"Fonte")} ${isPortugueseLang(src.lang)?"• PT":""}</div>`:'<div class="mangaCatalogOnlyBadge">Catálogo</div>'}</div>
  <div class="mangaNativeResultBody"><div class="mangaNativeResultTitle">${esc(title)}</div><div class="mangaNativeResultMeta">${sourceBacked?esc(src.lang||"all"):esc(m.format||m.status||"MANGA")}</div>
   <div class="mangaNativeResultActions"><button type="button" data-native-open>${sourceBacked?"▶ Ler capítulos":"🔎 Buscar nas fontes"}</button><button type="button" class="nativeLibraryBtn ${saved?"saved":""}" data-native-library>${saved?"✓":"＋"}</button></div>
  </div>
 </article>`
}
function bindNativeMangaCards(container,items){
 container.querySelectorAll("[data-item-key]").forEach(card=>{
  const m=items.find(x=>mangaItemKey(x)===card.dataset.itemKey);if(!m)return;
  card.querySelector("[data-native-open]").onclick=()=>m.url?openNativeMangaDetails(m):findMangaAcrossSources(m);
  card.querySelector("[data-native-library]").onclick=()=>{toggleMangaLibrary(m);card.querySelector("[data-native-library]").classList.toggle("saved",mangaIsSavedItem(m));card.querySelector("[data-native-library]").textContent=mangaIsSavedItem(m)?"✓":"＋"}
 })
}
function mergeNativeResults(current,next){
 const map=new Map();for(const x of [...current,...next]){const k=mangaItemKey(x);if(!map.has(k))map.set(k,x)}return[...map.values()]
}
function sourceStatusChip(source,status){
 return `<span class="${status}">${esc(source.name)}${isPortugueseLang(source.lang)?" • PT":""}</span>`
}
async function progressiveSourceSearch(query,container,statusEl){
 const token=++S.mangaProgressiveToken,sources=mangaSourcesForSearch().slice(0,8),primary=sources.slice(0,4),secondary=sources.slice(4);
 S.mangaProgressiveResults=[];
 const progress=$("#mangaSourceProgress");if(progress)progress.innerHTML=sources.map(s=>sourceStatusChip(s,"loading")).join("");
 const updateChip=(source,state)=>{if(token!==S.mangaProgressiveToken||!progress)return;const arr=sources.map(s=>sourceStatusChip(s,s.homeUrl===source.homeUrl?state:(mangaSourceHealth()[s.homeUrl]?.okAt?"ok":"loading")));progress.innerHTML=arr.join("")};
 const run=async source=>{
  const items=await searchOneInstalledSource(source,query,false);if(token!==S.mangaProgressiveToken)return;
  updateChip(source,items.length?"ok":"fail");
  if(items.length){S.mangaProgressiveResults=mergeNativeResults(S.mangaProgressiveResults,items);container.innerHTML=S.mangaProgressiveResults.map(nativeMangaCard).join("");bindNativeMangaCards(container,S.mangaProgressiveResults);statusEl.textContent=`${S.mangaProgressiveResults.length} resultado(s) encontrados nas fontes instaladas.`}
 };
 await Promise.all(primary.map(run));
 if(token!==S.mangaProgressiveToken)return;
 secondary.forEach(run)
}
function mangaTrendCard(m){
 return nativeMangaCard(m);
}
function mangaLatestCard(m){
 return nativeMangaCard(m);
}
async function loadMangaExplore(query=""){
 const token=++S.mangaSearchToken,area=$("#mangaExploreResults");if(!area)return;
 const sources=mangaSourcesFromInstalled();
 if(!query){
  area.innerHTML='<div class="loading">Carregando mangás…</div>';
  try{
   const page=await aniListManga("",1);if(token!==S.mangaSearchToken)return;
   S.mangaCatalog=(page.media||[]).map(normalizeAniMedia);
   const trending=S.mangaCatalog.slice(0,7),latest=S.mangaCatalog.slice(7,22);
   area.innerHTML=`
    <div class="mangaShelfTitle"><div><h3>Em alta</h3><small>Mais procurados agora</small></div></div>
    <div class="mangaTrendRow" id="mangaTrendingRow">${trending.map(mangaTrendCard).join("")}</div>
    <div class="mangaShelfTitle"><div><h3>Descobrir agora</h3><small>Mais títulos para você</small></div></div>
    <div class="mangaLatestGrid" id="mangaLatestGrid">${latest.map(mangaLatestCard).join("")}</div>`;
   bindNativeMangaCards($("#mangaTrendingRow"),trending);
   bindNativeMangaCards($("#mangaLatestGrid"),latest);
   appendMangaWebFallback(area,"");
  }catch{area.innerHTML='<div class="mangaEmpty">Não foi possível carregar o catálogo de mangás agora.</div>'}
  return
 }
 area.innerHTML=`<div class="mangaSourceSearchStatus" id="mangaExploreSearchStatus">Pesquisando “${esc(query)}” nas fontes instaladas…</div><div class="mangaSourceProgress" id="mangaSourceProgress"></div><div class="mangaNativeResultGrid" id="nativeSourceResults"></div>${mangaWebFallbackHtml(query)}<h3 class="mangaSectionTitle">Outros resultados</h3><div class="mangaNativeResultGrid" id="catalogMangaResults"><div class="loading">Buscando catálogo…</div></div>`;
 bindMangaWebFallback(area,query);
 const sourceContainer=$("#nativeSourceResults"),status=$("#mangaExploreSearchStatus");
 if(sources.length)progressiveSourceSearch(query,sourceContainer,status);else status.textContent="Nenhuma fonte instalada. Vá em Extensões e instale uma fonte para ler.";
 try{
  const page=await aniListManga(query,1);if(token!==S.mangaSearchToken)return;
  S.mangaCatalog=(page.media||[]).map(normalizeAniMedia);
  $("#catalogMangaResults").innerHTML=S.mangaCatalog.map(nativeMangaCard).join("")||'<div class="mangaEmpty">Nenhum outro resultado.</div>';
  bindNativeMangaCards($("#catalogMangaResults"),S.mangaCatalog);
 }catch{$("#catalogMangaResults").innerHTML='<div class="mangaEmpty">Catálogo temporariamente indisponível.</div>'}
}
function renderMangaExplore(){
 const area=$("#mangaContent");if(!area)return;
 area.innerHTML='<div id="mangaExploreResults"><div class="loading">Carregando…</div></div>';
 loadMangaExplore(S.mangaQuery)
}
function renderMangaLibrary(){
 const items=mangaLibrary();$("#mangaContent").innerHTML=items.length?`<div class="mangaCount">${items.length} mangá(s) salvo(s).</div><div class="mangaNativeResultGrid" id="libraryMangaResults">${items.map(nativeMangaCard).join("")}</div>`:'<div class="mangaLibraryEmpty">Sua biblioteca está vazia.<br>No Explorar, use o botão ＋ em qualquer mangá.</div>';if(items.length)bindNativeMangaCards($("#libraryMangaResults"),items)
}
async function findMangaInSingleSource(title,source){
 $("#mangaMatchModal").classList.add("open");document.body.classList.add("mangaMatchOpen");$("#mangaMatchTitle").textContent=title;$("#mangaMatchStatus").textContent=`Pesquisando em ${source.name}…`;$("#mangaMatchProgress").innerHTML=sourceStatusChip(source,"loading");$("#mangaMatchList").innerHTML="";
 const items=await searchOneInstalledSource(source,title,false);$("#mangaMatchProgress").innerHTML=sourceStatusChip(source,items.length?"ok":"fail");
 showMangaMatchResults(items,title)
}
function titleSimilarity(a,b){
 a=normText(a);b=normText(b);if(!a||!b)return 0;if(a===b)return 100;if(a.includes(b)||b.includes(a))return 80;
 const aa=new Set(a.split(/\s+/)),bb=new Set(b.split(/\s+/));let hit=0;for(const x of aa)if(bb.has(x))hit++;return Math.round(hit/Math.max(aa.size,bb.size)*70)
}
function showMangaMatchResults(items,title){
 items=items.slice().sort((a,b)=>titleSimilarity(b.title,title)-titleSimilarity(a.title,title));
 S.mangaMatchResults=items;$("#mangaMatchStatus").textContent=items.length?`${items.length} resultado(s). Português e correspondências mais próximas aparecem primeiro.`:"Nenhuma fonte encontrou esse título.";
 $("#mangaMatchList").innerHTML=items.length?items.map((m,i)=>`<div class="mangaMatchItem ${isPortugueseLang(m.source?.lang)?"pt":""}"><div class="mangaMatchThumb" style="background-image:url('${esc(m.thumbnail||"")}')"></div><div class="mangaMatchInfo"><div class="mangaMatchTitle">${esc(m.title||"Mangá")}</div><div class="mangaMatchSource">${esc(m.source?.name||"Fonte")} • ${esc(m.source?.lang||"all")}</div></div><button type="button" data-match-index="${i}">Ler</button></div>`).join(""):'<div class="mangaEmpty">Tente outra fonte ou configure a Ponte de mangá.</div>';
 $$("#mangaMatchList [data-match-index]").forEach(b=>b.onclick=()=>{const m=items[Number(b.dataset.matchIndex)];closeMangaMatch();openNativeMangaDetails(m)})
}
async function findMangaAcrossSources(media){
 const sources=mangaSourcesForSearch().slice(0,8),title=mangaDisplayTitle(media),token=++S.mangaMatchToken;
 S.mangaMatchMedia=media;S.mangaMatchResults=[];$("#mangaMatchModal").classList.add("open");document.body.classList.add("mangaMatchOpen");$("#mangaMatchTitle").textContent=title;$("#mangaMatchStatus").textContent=sources.length?"Procurando primeiro nas fontes em Português…":"Nenhuma fonte instalada.";$("#mangaMatchProgress").innerHTML=sources.map(s=>sourceStatusChip(s,"loading")).join("");$("#mangaMatchList").innerHTML=sources.length?"":'<div class="mangaEmpty">Instale uma extensão em Mangás → Extensões.</div>';
 if(!sources.length)return;
 const progress=$("#mangaMatchProgress");
 const update=()=>{progress.innerHTML=sources.map(s=>{const st=mangaSourceHealth()[s.homeUrl]||{};return sourceStatusChip(s,st.okAt?"ok":st.failAt?"fail":"loading")}).join("")};
 const run=async s=>{
  const items=await searchOneInstalledSource(s,title,false,media);if(token!==S.mangaMatchToken)return;
  S.mangaMatchResults=mergeNativeResults(S.mangaMatchResults,items);update();showMangaMatchResults(S.mangaMatchResults,title)
 };
 await Promise.all(sources.slice(0,4).map(run));sources.slice(4).forEach(run)
}
function closeMangaMatch(){S.mangaMatchToken++;$("#mangaMatchModal").classList.remove("open");document.body.classList.remove("mangaMatchOpen")}
function closeMangaSourcePicker(){$("#mangaSourceModal").classList.remove("open");document.body.classList.remove("mangaSourceOpen")}

async function fetchNativeMangaDetails(item){
 if(!item?.source||!item?.url)throw Error("Fonte inválida");
 try{return await mangaBridgeRequest("/api/manga",{source:sourcePayload(item.source),url:item.url})}catch(e){if(e.code!=="NO_BRIDGE")console.warn(e);return directMangaDetails(item)}
}
async function directMangaDetails(item){
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),6000);
 try{
  const r=await fetch(item.url,{headers:{Accept:"text/html"},signal:ctl.signal});if(!r.ok)throw Error("HTTP "+r.status);const text=await r.text(),doc=new DOMParser().parseFromString(text,"text/html"),title=(doc.querySelector("h1,.post-title h1,.manga-title h1")?.textContent||item.title||"Mangá").trim(),cover=absUrl(item.url,doc.querySelector(".summary_image img,.manga-thumb img,.tab-summary img")?.getAttribute("data-src")||doc.querySelector(".summary_image img,.manga-thumb img,.tab-summary img")?.getAttribute("src")||item.thumbnail||""),desc=(doc.querySelector(".summary__content,.description-summary,.manga-excerpt,.description")?.textContent||"").trim(),chapters=[],seen=new Set();
  for(const a of doc.querySelectorAll(".wp-manga-chapter a,.chapter-link-item a,.chapter-name a,.eph-num a,a[href*='/capitulo'],a[href*='/chapter']")){const url=absUrl(item.url,a.getAttribute("href")||""),name=(a.textContent||"").trim();if(!url||!name||seen.has(url))continue;seen.add(url);chapters.push({name,url,number:chapterNumber(name)})}
  if(!chapters.length)throw Error("Nenhum capítulo encontrado");chapters.sort((a,b)=>(a.number??-1)-(b.number??-1));return{title,cover,description:desc,chapters,url:item.url,source:item.source}
 }finally{clearTimeout(timer)}
}
function chapterNumber(name){const m=String(name||"").replace(",",".").match(/(?:cap(?:ítulo|itulo|\.?)?|chapter|ch\.?)\s*#?\s*(\d+(?:\.\d+)?)/i)||String(name||"").match(/(\d+(?:\.\d+)?)/);return m?Number(m[1]):null}
function mangaLanguageLabel(lang){
 const l=String(lang||"").toLowerCase();
 if(isPortugueseLang(l))return"Português (BR)";
 if(l==="en")return"Inglês";
 if(l==="es")return"Espanhol";
 if(l==="ja")return"Japonês";
 if(l==="all")return"Multilíngue";
 return lang||"Idioma não informado";
}

function mangaCurrentMarketTitle(){return S.mangaDetail?.title||S.mangaDetail?._rfTitle||S.mangaPickerMedia?._rfTitle||"Mangá"}
function marketGoogleSearch(query){return`https://www.google.com/search?q=${encodeURIComponent(query)}`}
function mangaStoreProviders(title){return[{name:"Amazon Brasil",sub:"Edições físicas e digitais",url:`https://www.amazon.com.br/s?k=${encodeURIComponent(title+" mangá")}`},{name:"Panini Brasil",sub:"Pesquisar edição nacional",url:marketGoogleSearch(`site:panini.com.br "${title}" mangá`)},{name:"JBC",sub:"Pesquisar edição brasileira",url:marketGoogleSearch(`site:editorajbc.com.br "${title}"`)},{name:"NewPOP",sub:"Pesquisar edição brasileira",url:marketGoogleSearch(`site:newpop.com.br "${title}"`)}]}
function mangaFreeProviders(title){return[{name:"MANGA Plus",sub:"Pesquisar capítulos oficiais gratuitos",url:marketGoogleSearch(`site:mangaplus.shueisha.co.jp "${title}"`),free:true},{name:"WEBTOON",sub:"Pesquisar leitura oficial gratuita",url:marketGoogleSearch(`site:webtoons.com "${title}"`),free:true},{name:"Google Books",sub:"Pesquisar prévias gratuitas / domínio público",url:`https://books.google.com/books?q=${encodeURIComponent(title+" manga")}`,free:true}]}
async function googleBooksManga(title){const q=encodeURIComponent(`intitle:${title}`),ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),7000);try{const r=await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=10&printType=books`,{signal:ctl.signal});if(!r.ok)throw Error("Google Books "+r.status);const d=await r.json();return(d.items||[]).map(x=>({id:x.id,title:x.volumeInfo?.title||"Livro",authors:(x.volumeInfo?.authors||[]).join(", "),image:(x.volumeInfo?.imageLinks?.thumbnail||x.volumeInfo?.imageLinks?.smallThumbnail||"").replace("http://","https://"),info:x.volumeInfo?.infoLink||"",buy:x.saleInfo?.buyLink||"",price:x.saleInfo?.retailPrice?`${x.saleInfo.retailPrice.amount} ${x.saleInfo.retailPrice.currencyCode}`:"",preview:x.accessInfo?.webReaderLink||x.volumeInfo?.previewLink||"",publicDomain:!!x.accessInfo?.publicDomain,viewability:x.accessInfo?.viewability||""})).filter(x=>x.title)}finally{clearTimeout(timer)}}
function marketBookHtml(x,tab){const canFree=x.publicDomain||x.viewability==="ALL_PAGES"||x.viewability==="PARTIAL";return`<article class="marketBook"><div class="marketBookCover" style="background-image:url('${esc(x.image)}')"></div><div class="marketBookInfo"><div class="marketBookTitle">${esc(x.title)}</div><div class="marketBookMeta">${esc(x.authors||"")}${x.price?` • ${esc(x.price)}`:""}</div><div class="marketBookActions">${tab==="buy"&&x.buy?`<button type="button" data-market-open="${esc(x.buy)}">Comprar</button>`:""}${canFree&&x.preview?`<button type="button" data-market-open="${esc(x.preview)}">${x.publicDomain||x.viewability==="ALL_PAGES"?"Ler grátis":"Ver prévia"}</button>`:""}${x.info?`<button type="button" data-market-open="${esc(x.info)}">Detalhes</button>`:""}</div></div></article>`}
async function renderMangaMarket(tab="buy"){const body=$("#mangaMarketBody"),title=mangaCurrentMarketTitle();$$('#mangaMarketModal [data-market-tab]').forEach(b=>b.classList.toggle("active",b.dataset.marketTab===tab));body.innerHTML='<div class="loading">Procurando opções…</div>';let books=[];try{books=await googleBooksManga(title)}catch(e){console.warn(e)}const providers=tab==="buy"?mangaStoreProviders(title):mangaFreeProviders(title),useful=books.filter(x=>tab==="buy"?x.buy:(x.publicDomain||x.viewability==="ALL_PAGES"||x.viewability==="PARTIAL"));body.innerHTML=`<div class="marketInfo">${tab==="buy"?"Resultados de compra e pesquisas em lojas brasileiras. A disponibilidade varia por edição e região.":"Aqui aparecem apenas opções oficiais/gratuitas ou prévias quando disponíveis. O ResenhaFlix não direciona para cópias piratas."}</div>${useful.length?`<div class="marketGrid">${useful.slice(0,6).map(x=>marketBookHtml(x,tab)).join("")}</div>`:""}<div class="mangaShelfTitle"><div><h3>${tab==="buy"?"Pesquisar em lojas":"Serviços oficiais"}</h3><small>${tab==="buy"?"Brasil":"Grátis / prévia"}</small></div></div><div class="marketProviderGrid">${providers.map(x=>`<button type="button" class="marketProvider ${x.free?"free":""}" data-market-open="${esc(x.url)}"><b>${esc(x.name)}</b><small>${esc(x.sub)}</small></button>`).join("")}</div>`;body.querySelectorAll("[data-market-open]").forEach(b=>b.onclick=()=>window.open(b.dataset.marketOpen,"_blank","noopener,noreferrer"))}
function openMangaMarket(tab="buy"){$("#mangaMarketTitle").textContent=mangaCurrentMarketTitle();$("#mangaMarketModal").classList.add("open");document.body.classList.add("mangaMarketOpen");renderMangaMarket(tab)}
function closeMangaMarket(){$("#mangaMarketModal").classList.remove("open");document.body.classList.remove("mangaMarketOpen")}
function updateMangaDetailBadges(){
 if(!S.mangaDetail)return;
 const src=S.mangaDetailSource||{};
 $("#mangaDetailBadges").innerHTML=`<span class="mangaDetailBadge good">● Disponível</span><span class="mangaDetailBadge">${esc(mangaLanguageLabel(src.lang))}</span><span class="mangaDetailBadge">${esc(src.name||"Fonte")}</span>`;
 $("#mangaChapterLanguage").textContent=(isPortugueseLang(src.lang)?"🇧🇷 ":"")+mangaLanguageLabel(src.lang);
}
async function openNativeMangaDetails(item){
 $("#mangaDetailModal").classList.add("open");document.body.classList.add("mangaDetailOpen");$("#mangaNativeDetailTitle").textContent=item.title||mangaDisplayTitle(item)||"Carregando…";$("#mangaNativeDetailSource").textContent=item.source?.name||"Fonte";$("#mangaNativeDetailCover").style.backgroundImage=`url('${item.thumbnail||item._rfCover||""}')`;$("#mangaChapterList").innerHTML='<div class="loading">Carregando capítulos…</div>';
 try{
  const d=await fetchNativeMangaDetails(item);S.mangaDetail={...item,...d,_nativeSource:true,source:item.source||d.source};S.mangaDetailSource=S.mangaDetail.source;S.mangaChapters=(d.chapters||[]).map((c,i)=>({...c,_index:i}));
  $("#mangaNativeDetailTitle").textContent=d.title||item.title||"Mangá";$("#mangaNativeDetailSource").textContent=`Fonte: ${S.mangaDetailSource?.name||"Não informada"}`;$("#mangaNativeDetailCover").style.backgroundImage=`url('${d.cover||item.thumbnail||""}')`;$("#mangaNativeDetailDesc").textContent=d.description||"Sem descrição disponível.";updateMangaDetailBadges();updateNativeMangaSaveButton();renderMangaChapterList()
 }catch(e){
  console.error(e);
  const source=item.source||S.mangaDetailSource;
  $("#mangaChapterList").innerHTML=`<div class="mangaReadFallback">O leitor nativo não conseguiu carregar os capítulos desta fonte. Você ainda pode continuar sem sair do ResenhaFlix.<button type="button" id="mangaOpenWebFallback">🌐 Abrir este mangá no modo site</button></div>`;
  $("#mangaOpenWebFallback").onclick=()=>{closeMangaDetail();openMangaWebSource(source,mangaDisplayTitle(item),item.url||source?.homeUrl||"")};
 }
}
function closeMangaDetail(){$("#mangaDetailModal").classList.remove("open");document.body.classList.remove("mangaDetailOpen")}
function nativeMangaSaved(){return S.mangaDetail&&mangaIsSavedItem(S.mangaDetail)}
function updateNativeMangaSaveButton(){if(!S.mangaDetail)return;$("#mangaSaveNative").textContent=nativeMangaSaved()?"✓ Seguindo":"☆ Seguir"}
function toggleNativeMangaSave(){if(!S.mangaDetail)return;toggleMangaLibrary(S.mangaDetail);updateNativeMangaSaveButton()}
function chapterProgressKey(ch){return`${S.mangaDetailSource?.homeUrl||""}|${S.mangaDetail?.url||""}|${ch?.url||""}`}
function getChapterProgress(ch){return mangaProgress()[chapterProgressKey(ch)]||null}
function setChapterProgress(ch,data){const p=mangaProgress();p[chapterProgressKey(ch)]={...p[chapterProgressKey(ch)],...data,updatedAt:Date.now()};saveMangaProgressMap(p)}
function renderMangaChapterList(){
 const filter=normText($("#mangaChapterFilter")?.value||"");let chapters=S.mangaChapters.slice();if(S.mangaChapterOrder==="desc")chapters.reverse();if(filter)chapters=chapters.filter(c=>normText(c.name).includes(filter));
 $("#mangaChapterOrder").textContent=S.mangaChapterOrder==="desc"?"↓ Mais novos":"↑ Mais antigos";const flag=isPortugueseLang(S.mangaDetailSource?.lang)?"🇧🇷 ":"";$("#mangaChapterList").innerHTML=chapters.length?chapters.map(c=>{const pr=getChapterProgress(c),pct=pr?.completed?100:Math.round(pr?.percent||0);return`<button type="button" class="mangaChapterItem ${pr?.completed?"read":""}" data-chapter-url="${esc(c.url)}"><div class="mangaChapterText"><div class="mangaChapterName">${flag}${esc(c.name)}</div><div class="mangaChapterMeta">${Number.isFinite(c.number)?`Capítulo ${c.number}`:"Capítulo"}</div></div><div class="mangaChapterProgress">${pr?.completed?"Lido":pct?`${pct}%`:""}</div></button>`}).join(""):'<div class="mangaEmpty">Nenhum capítulo disponível.</div>';
 $$("#mangaChapterList [data-chapter-url]").forEach(b=>b.onclick=()=>{const ch=S.mangaChapters.find(x=>x.url===b.dataset.chapterUrl);if(ch)openNativeChapter(ch)})
}
async function fetchChapterPages(chapter){try{return await mangaBridgeRequest("/api/chapter",{source:sourcePayload(S.mangaDetailSource),url:chapter.url})}catch(e){if(e.code!=="NO_BRIDGE")console.warn(e);return directChapterPages(chapter)}}
async function directChapterPages(chapter){
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),7000);
 try{const r=await fetch(chapter.url,{headers:{Accept:"text/html"},signal:ctl.signal});if(!r.ok)throw Error("HTTP "+r.status);const text=await r.text(),doc=new DOMParser().parseFromString(text,"text/html"),pages=[],seen=new Set();for(const img of doc.querySelectorAll(".reading-content img,.page-break img,.reader-area img,.chapter-content img,.container-chapter-reader img")){const u=absUrl(chapter.url,img.getAttribute("data-src")||img.getAttribute("data-lazy-src")||img.getAttribute("data-original")||img.getAttribute("src")||"");if(!u||seen.has(u))continue;seen.add(u);pages.push({image:u})}if(!pages.length)throw Error("Nenhuma página encontrada");return{pages}}finally{clearTimeout(timer)}
}
function readerChapterIndex(){return S.mangaChapters.findIndex(x=>x.url===S.mangaReaderChapter?.url)}
async function openNativeChapter(chapter){
 S.mangaReaderManga=S.mangaDetail;S.mangaReaderSource=S.mangaDetailSource;S.mangaReaderChapter=chapter;S.mangaReaderPages=[];S.mangaReaderPageIndex=0;closeMangaDetail();$("#mangaReaderModal").classList.add("open");document.body.classList.add("mangaReaderOpen");$("#mangaReaderTitle").textContent=S.mangaDetail?.title||"Mangá";$("#mangaReaderChapterTitle").textContent=chapter.name||"Capítulo";$("#mangaReaderLoading").classList.remove("hidden");$("#mangaReaderPages").innerHTML="";renderReaderChapterSelect();
 try{const d=await fetchChapterPages(chapter);S.mangaReaderPages=(d.pages||[]).map((p,i)=>({index:i,image:p.image||p.url||""}));if(!S.mangaReaderPages.length)throw Error("Sem páginas");renderNativeReaderPages();restoreNativeReaderProgress()}catch(e){
  console.error(e);$("#mangaReaderLoading").classList.add("hidden");
  $("#mangaReaderPages").innerHTML=`<div class="mangaPageError">Não consegui carregar as páginas neste modo.<br><button type="button" id="mangaReaderWebFallback" style="margin-top:12px;min-height:40px;border:0;border-radius:7px;padding:8px 12px;font-weight:900">🌐 Ler no modo site</button></div>`;
  $("#mangaReaderWebFallback").onclick=()=>{const source=S.mangaReaderSource||S.mangaDetailSource,ch=S.mangaReaderChapter;closeMangaReader();openMangaWebSource(source,S.mangaReaderManga?.title||"",ch?.url||source?.homeUrl||"")};
 }
}
function renderReaderChapterSelect(){const sel=$("#mangaChapterSelect");sel.innerHTML=S.mangaChapters.map(c=>`<option value="${esc(c.url)}" ${c.url===S.mangaReaderChapter?.url?"selected":""}>${esc(c.name)}</option>`).join("");sel.onchange=()=>{const ch=S.mangaChapters.find(x=>x.url===sel.value);if(ch)openNativeChapter(ch)};const i=readerChapterIndex();$("#mangaPrevChapter").disabled=i<=0;$("#mangaNextChapter").disabled=i<0||i>=S.mangaChapters.length-1}
function readerPrefs(){return mangaReaderPrefs()}
function applyNativeReaderPrefs(){const p=readerPrefs(),canvas=$("#mangaReaderCanvas"),pages=$("#mangaReaderPages");canvas.classList.remove("vertical","paged-ltr","paged-rtl");canvas.classList.add(p.mode);pages.style.gap=`${Number(p.gap||0)}px`;pages.style.filter=`brightness(${Number(p.brightness||100)}%)`;$$(".mangaPageImg",pages).forEach(img=>{img.classList.remove("fit-width","fit-contain","fit-original");img.classList.add(`fit-${p.fit}`)});$("#mangaReaderMode").value=p.mode;$("#mangaReaderFit").value=p.fit;$("#mangaReaderGap").value=String(p.gap);$("#mangaReaderBrightness").value=Number(p.brightness||100);$("#mangaBrightnessLabel").textContent=`${Number(p.brightness||100)}%`;$("#mangaReaderHud").classList.toggle("show",p.mode!=="vertical");updatePagedReader()}
function renderNativeReaderPages(){
 if(S.mangaReaderObserver){S.mangaReaderObserver.disconnect();S.mangaReaderObserver=null}
 const pages=$("#mangaReaderPages");pages.innerHTML=S.mangaReaderPages.map(p=>`<img class="mangaPageImg" data-page="${p.index}" loading="${p.index<3?"eager":"lazy"}" src="${esc(p.image)}" alt="Página ${p.index+1}">`).join("")+'<div class="nativeReaderTapZone" id="readerTapLeft"></div><div class="nativeReaderTapZone" id="readerTapRight"></div>';
 $$(".mangaPageImg",pages).forEach(img=>img.onerror=()=>{img.outerHTML=`<div class="mangaPageError">Falha ao carregar a página ${Number(img.dataset.page)+1}</div>`});$("#mangaReaderLoading").classList.add("hidden");applyNativeReaderPrefs();bindReaderTapZones();if(readerPrefs().mode==="vertical")observeVerticalPages()
}
function observeVerticalPages(){const canvas=$("#mangaReaderCanvas"),imgs=$$(".mangaPageImg",$("#mangaReaderPages"));if(!imgs.length)return;S.mangaReaderObserver=new IntersectionObserver(entries=>{let best=null;for(const e of entries)if(e.isIntersecting&&(!best||e.intersectionRatio>best.intersectionRatio))best=e;if(best){S.mangaReaderPageIndex=Number(best.target.dataset.page);updateReaderProgress();saveNativeReaderProgress()}},{root:canvas,threshold:[.15,.35,.55,.75]});imgs.forEach(i=>S.mangaReaderObserver.observe(i));canvas.onscroll=()=>{showReaderUi(false);saveNativeReaderProgressDebounced()}}
let mangaProgressTimer;
function saveNativeReaderProgressDebounced(){clearTimeout(mangaProgressTimer);mangaProgressTimer=setTimeout(saveNativeReaderProgress,700)}
function saveNativeReaderProgress(){const ch=S.mangaReaderChapter;if(!ch||!S.mangaReaderPages.length)return;const p=readerPrefs(),canvas=$("#mangaReaderCanvas"),pct=p.mode==="vertical"&&canvas.scrollHeight>canvas.clientHeight?canvas.scrollTop/(canvas.scrollHeight-canvas.clientHeight):S.mangaReaderPageIndex/Math.max(1,S.mangaReaderPages.length-1);setChapterProgress(ch,{page:S.mangaReaderPageIndex,percent:Math.max(0,Math.min(100,pct*100)),completed:S.mangaReaderPageIndex>=S.mangaReaderPages.length-1&&pct>.92,scrollTop:canvas.scrollTop,mode:p.mode})}
function restoreNativeReaderProgress(){const pr=getChapterProgress(S.mangaReaderChapter),p=readerPrefs(),canvas=$("#mangaReaderCanvas");if(!pr){S.mangaReaderPageIndex=0;updateReaderProgress();return}S.mangaReaderPageIndex=Math.min(S.mangaReaderPages.length-1,Number(pr.page||0));updatePagedReader();updateReaderProgress();requestAnimationFrame(()=>{if(p.mode==="vertical"){if(Number(pr.scrollTop)>0)canvas.scrollTop=Number(pr.scrollTop);else document.querySelector(`.mangaPageImg[data-page="${S.mangaReaderPageIndex}"]`)?.scrollIntoView({block:"start"})}})}
function updateReaderProgress(){const total=S.mangaReaderPages.length,idx=Math.min(total-1,Math.max(0,S.mangaReaderPageIndex));$("#mangaPageCounter").textContent=total?`${idx+1} / ${total}`:"0 / 0";$("#mangaReaderProgressBar").style.width=total?`${((idx+1)/total)*100}%`:"0%"}
function updatePagedReader(){const p=readerPrefs();if(p.mode==="vertical"){updateReaderProgress();return}$$(".mangaPageImg",$("#mangaReaderPages")).forEach(img=>img.classList.toggle("active",Number(img.dataset.page)===S.mangaReaderPageIndex));updateReaderProgress();saveNativeReaderProgress()}
function readerNextPage(delta=1){const p=readerPrefs();if(p.mode==="vertical")return;const ni=S.mangaReaderPageIndex+delta;if(ni>=0&&ni<S.mangaReaderPages.length){S.mangaReaderPageIndex=ni;updatePagedReader();showReaderUi()}else if(ni>=S.mangaReaderPages.length)nextNativeChapter(1)}
function bindReaderTapZones(){const l=$("#readerTapLeft"),r=$("#readerTapRight");if(!l||!r)return;l.onclick=()=>readerNextPage(readerPrefs().mode==="paged-rtl"?1:-1);r.onclick=()=>readerNextPage(readerPrefs().mode==="paged-rtl"?-1:1)}
function nextNativeChapter(delta){const i=readerChapterIndex(),ch=S.mangaChapters[i+delta];if(ch){saveNativeReaderProgress();openNativeChapter(ch)}else toast(delta>0?"Você chegou ao último capítulo.":"Você está no primeiro capítulo.")}
function showReaderUi(sticky=false){clearTimeout(S.mangaReaderUiTimer);$("#nativeReaderTop").classList.remove("hidden");$("#nativeReaderBottom").classList.remove("hidden");if(!sticky)S.mangaReaderUiTimer=setTimeout(()=>{$("#nativeReaderTop").classList.add("hidden");$("#nativeReaderBottom").classList.add("hidden")},4500)}
function closeMangaReader(){saveNativeReaderProgress();if(S.mangaReaderObserver){S.mangaReaderObserver.disconnect();S.mangaReaderObserver=null}clearTimeout(S.mangaReaderUiTimer);$("#mangaReaderModal").classList.remove("open");document.body.classList.remove("mangaReaderOpen");$("#mangaReaderPages").innerHTML="";S.mangaReaderPages=[]}
function renderMangaCurrentTab(){if(S.mangaTab==="extensions"){if(!S.mangaRepoItems.length)return loadMangaRepo(false).then(renderMangaExtensions);renderMangaExtensions()}else if(S.mangaTab==="explore")renderMangaExplore();else renderMangaLibrary();$$("[data-manga-tab]").forEach(b=>b.classList.toggle("active",b.dataset.mangaTab===S.mangaTab))}
async function mangaPage(){
 S.currentPage="manga";setActiveNav("manga");unlockMobileDocument();scrollPageTop();toggleCategoryMega(false);
 $("#page").classList.remove("searchPage");$("#page").classList.add("mangaPageModern");
 $("#hero").classList.add("hidden");$("#main").classList.add("hidden");$("#page").classList.remove("hidden");$("#pageTitle").textContent="Mangás";
 const sources=mangaSourcesFromInstalled(),pt=portugueseInstalledSources().length,en=englishInstalledSources().length;
 if(!sources.length&&S.mangaTab==="library")S.mangaTab="explore";
 $("#pageBody").innerHTML=`<div class="mangaModernShell">
   <div class="mangaModernHeader">
    <div class="mangaModernTitle"><h2>Mangás</h2><p>Pesquise, acompanhe e leia sem sair do ResenhaFlix.</p></div>
    <div class="mangaTabs" id="mangaTabs">
     <button type="button" data-manga-tab="explore">Explorar</button>
     <button type="button" data-manga-tab="library">Biblioteca</button>
     <button type="button" data-manga-tab="extensions">Extensões</button>
    </div>
   </div>
   <div class="mangaModernSearch">
    <input id="mangaTitleSearch" placeholder="Pesquisar mangá em português ou inglês…" autocomplete="off" value="${esc(S.mangaQuery)}">
    <select id="mangaSearchLang">
     <option value="both" ${S.mangaSearchLang==="both"?"selected":""}>Português + Inglês</option>
     <option value="pt" ${S.mangaSearchLang==="pt"?"selected":""}>Somente Português</option>
     <option value="en" ${S.mangaSearchLang==="en"?"selected":""}>Somente Inglês</option>
    </select>
    <button type="button" id="mangaSearchBtn">Buscar</button>
   </div>
   <div class="mangaModernStats">
    <span class="pt">🇧🇷 ${pt} fonte(s) em Português</span>
    <span>EN ${en} fonte(s) em Inglês/multilíngue</span>
    <span>${bridgeBase()?"Ponte de mangá configurada":"Acesso direto"}</span>
   </div>
   <div id="mangaContent"><div class="loading">Carregando…</div></div>
  </div>`;
 const input=$("#mangaTitleSearch");let timer;
 const go=()=>{S.mangaQuery=input.value.trim();if(S.mangaTab!=="explore"){S.mangaTab="explore";syncMangaTabs()}renderMangaExplore()};
 input.oninput=()=>{clearTimeout(timer);timer=setTimeout(go,500)};
 input.onkeydown=e=>{if(e.key==="Enter"){clearTimeout(timer);go();input.blur()}};
 $("#mangaSearchBtn").onclick=go;
 $("#mangaSearchLang").onchange=e=>{S.mangaSearchLang=e.target.value;localStorage.setItem("rf16_manga_search_lang",S.mangaSearchLang);if(S.mangaQuery)go()};
 function syncMangaTabs(){$$("#mangaTabs [data-manga-tab]").forEach(b=>b.classList.toggle("active",b.dataset.mangaTab===S.mangaTab))}
 $$("#mangaTabs [data-manga-tab]").forEach(b=>b.onclick=()=>{S.mangaTab=b.dataset.mangaTab;S.mangaQuery="";input.value="";syncMangaTabs();renderMangaCurrentTab()});
 syncMangaTabs();await renderMangaCurrentTab()
}

/* Manga V24 */
const MANGA_REPO_V24="https://raw.githubusercontent.com/keiyoushi/extensions/refs/heads/repo/index.json";
const MANGA_REPO_FALLBACKS=[
 "https://cdn.jsdelivr.net/gh/keiyoushi/extensions@repo/index.json",
 "https://raw.githubusercontent.com/keiyoushi/extensions/refs/heads/repo/index.json"
];
function normalizeKeiyoushiV26(data,repoUrl){
 const raw=data?.extensionList?.extensions;
 if(!Array.isArray(raw))return[];
 return raw.map(e=>({
  name:e.name||"Extensão",
  pkg:e.packageName||"",
  icon:e.resources?.iconUrl||"",
  warning:e.contentWarning||"",
  _kind:"manga",
  _repo:repoUrl,
  sources:(e.sources||[]).map(s=>({
   id:String(s.id||""),
   name:s.name||e.name||"Fonte",
   lang:s.language||"all",
   homeUrl:s.homeUrl||"",
   extension:e.name||"",
   pkg:e.packageName||"",
   icon:e.resources?.iconUrl||"",
   _repo:repoUrl
  })).filter(s=>s.homeUrl)
 })).filter(e=>e.sources.length&&!String(e.warning||"").includes("NSFW"));
}
async function loadMangaRepoV24(force=false){
 if(!force&&S.mangaRepoV24&&Date.now()-Number(S.mangaRepoV24.at||0)<30*60e3)return S.mangaRepoV24.items;
 const items=await loadMangaRepo(force);
 if(items.length){S.mangaRepoV24={at:Date.now(),items,url:configuredMangaRepos().join("\n")};return items}
 console.warn("Mangás: nenhum índice configurado retornou extensões compatíveis.");
 return S.mangaRepoV24?.items||[]
}
async function mangaPortugueseSourcesV24(){
 const exts=await loadMangaRepoV24(false),installedPkgs=new Set(mangaInstalled().map(e=>e.pkg)),all=[];
 for(const e of exts)for(const s of (e.sources||[]))if(isPortugueseLang(s.lang))all.push({...s,extension:e.name,pkg:e.pkg,icon:e.icon||"",warning:e.warning||"",_installed:installedPkgs.has(e.pkg)});
 for(const s of portugueseInstalledSources())all.unshift({...s,_installed:true});
 const byHost=new Map();
 for(const s of sortMangaSourcesPtFirst(all).sort((a,b)=>Number(!!b._installed)-Number(!!a._installed))){let h=s.homeUrl;try{h=new URL(s.homeUrl).hostname.replace(/^www\./,"")}catch{}if(!byHost.has(h)||s._installed)byHost.set(h,s)}
 return[...byHost.values()]
}
function mangaV24Title(m){return m?._rfTitle||mangaDisplayTitle(m)||"Mangá"}
function mangaV24Cover(m){return m?._rfCover||m?.coverImage?.extraLarge||m?.coverImage?.large||m?.thumbnail||""}
function mangaV24Saved(m){return mangaIsSavedItem(m)}
function mangaV24Card(m){
 const saved=mangaV24Saved(m),key=mangaItemKey(m),title=mangaV24Title(m);
 return`<article class="m24Card" data-m24-key="${esc(key)}"><div class="m24Cover" style="background-image:url('${esc(mangaV24Cover(m))}')"></div><div class="m24CardTitle">${esc(title)}</div><div class="m24CardMeta">${esc(m.format||m.status||"Mangá")} ${m.chapters?`• ${esc(m.chapters)} cap.`:""}</div><div class="m24Actions"><button type="button" class="find" data-m24-find>Buscar fontes</button><button type="button" class="${saved?"saved":""}" data-m24-save>${saved?"✓":"＋"}</button></div></article>`
}
function bindMangaV24Cards(root,items){
 root.querySelectorAll("[data-m24-key]").forEach(card=>{const m=items.find(x=>mangaItemKey(x)===card.dataset.m24Key);if(!m)return;card.querySelector("[data-m24-find]").onclick=()=>findMangaAcrossSourcesV24(m);card.querySelector("[data-m24-save]").onclick=()=>{toggleMangaLibrary(m);const b=card.querySelector("[data-m24-save]"),saved=mangaV24Saved(m);b.classList.toggle("saved",saved);b.textContent=saved?"✓":"＋";if(S.mangaTab==="library"&&!saved)renderMangaLibrary()}})
}
async function renderMangaCurrentTab(){
 if(S.mangaTab==="extensions"){
  S.mangaSearchToken++;
  const area=$("#mangaContent");if(area)area.innerHTML='<div class="loading">Carregando extensões…</div>';
  try{await loadMangaRepo(false);renderMangaExtensions()}catch(e){console.error(e);if(area)area.innerHTML='<div class="mangaEmpty">Não foi possível carregar os repositórios agora.</div>'}
 }else if(S.mangaTab==="library"){S.mangaSearchToken++;renderMangaLibrary()}else renderMangaExplore();
 $$("[data-manga-tab]").forEach(b=>b.classList.toggle("active",b.dataset.mangaTab===S.mangaTab))
}
async function renderMangaExplore(){
 const area=$("#mangaContent");if(!area)return;const q=String(S.mangaQuery||"").trim(),token=++S.mangaSearchToken;area.innerHTML='<div class="loading">Carregando mangás…</div>';
 try{const page=await aniListManga(q,1);if(token!==S.mangaSearchToken)return;const items=(page.media||[]).map(normalizeAniMedia);S.mangaCatalog=items;area.innerHTML=`<div class="m24ShelfHead"><h3>${q?`Resultados para “${esc(q)}”`:"Em alta"}</h3><small>${items.length} títulos</small></div><div class="m24Grid" id="m24ExploreGrid">${items.map(mangaV24Card).join("")||'<div class="mediaEmpty">Nenhum mangá encontrado.</div>'}</div>`;bindMangaV24Cards($("#m24ExploreGrid"),items)}catch(e){console.error(e);area.innerHTML='<div class="mediaEmpty"><b>Não consegui carregar os mangás.</b>Tente novamente em alguns segundos.</div>'}
}
function renderMangaLibrary(){const area=$("#mangaContent");if(!area)return;const items=mangaLibrary();area.innerHTML=items.length?`<div class="m24ShelfHead"><h3>Biblioteca</h3><small>${items.length} salvos</small></div><div class="m24Grid" id="m24LibraryGrid">${items.map(mangaV24Card).join("")}</div>`:'<div class="m24LibraryEmpty"><b>Sua biblioteca está vazia.</b>Adicione mangás pelo Explorar para encontrá-los rapidamente depois.</div>';if(items.length)bindMangaV24Cards($("#m24LibraryGrid"),items)}

function mangaSourceUseStats(){try{return JSON.parse(localStorage.getItem("rf25_manga_source_use")||"{}")}catch{return{}}}
function rememberMangaSourceUse(source,confirmed=true){
 const stats=mangaSourceUseStats(),key=source.homeUrl||source.name||"fonte",old=stats[key]||{};
 stats[key]={clicks:Number(old.clicks||0)+1,confirmed:Number(old.confirmed||0)+(confirmed?1:0),last:Date.now()};
 localStorage.setItem("rf25_manga_source_use",JSON.stringify(stats))
}
function mangaSourceHistoryScore(source){
 const s=mangaSourceUseStats()[source.homeUrl||source.name||"fonte"]||{};
 return Math.min(30,Number(s.confirmed||0)*5+Number(s.clicks||0)*2)+(s.last&&Date.now()-s.last<30*864e5?8:0)
}
function m24SourceSearchUrl(source,title){
 const candidates=mangaWebSearchCandidates(source,title);
 return candidates.find(safeHttpUrl)||safeHttpUrl(source.homeUrl)
}
function mangaSlug(text){
 return String(text||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()
  .replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")
}
const VERIFIED_MANGA_DIRECTS=[
 {
  host:"lycantoons.com",
  aliases:["the infinite mage","infinite mage","mago do infinito","mago infinito"],
  title:"Mago do Infinito",
  url:"https://lycantoons.com/series/mago-do-infinito"
 },
 {
  host:"lycantoons.com",
  aliases:["eleceed","veletric"],
  title:"Veletric - Eleceed",
  url:"https://lycantoons.com/series/veletric"
 },
 {
  host:"lycantoons.com",
  aliases:["the stellar swordmaster","stellar swordmaster","mestre espadachim criado pelas estrelas"],
  title:"Mestre Espadachim Criado Pelas Estrelas",
  url:"https://lycantoons.com/series/mestre-espadachim-criado-pelas-estrelas"
 },
 {
  host:"mangasbrasuka.com.br",
  aliases:["revenge of the baskerville bloodhound","the revenge of the baskerville bloodhound","a vinganca do cao de caca dos baskerville","o retorno do cao de caca dos baskerville","the return of the iron-blood sword hound"],
  title:"A Vingança do Cão de Caça dos Baskerville",
  url:"https://mangasbrasuka.com.br/manhwa/a-vinganca-do-cao-de-caca-dos-baskerville"
 },
 {
  host:"leitor.borutoexplorer.com.br",
  aliases:["boruto","boruto: naruto next generations","boruto naruto next generations"],
  title:"Boruto: Naruto Next Generations",
  url:"https://leitor.borutoexplorer.com.br/manga/boruto-naruto-next-generations/"
 }
];
function verifiedMangaDirect(source,aliases){
 const host=(()=>{try{return new URL(source.homeUrl).hostname.replace(/^www\./,"")}catch{return""}})();
 const normalized=(aliases||[]).map(normText);
 return VERIFIED_MANGA_DIRECTS.find(x=>x.host===host&&x.aliases.some(a=>normalized.includes(normText(a))))||null
}
async function smartMangaDirectCandidates(source,title,media,aliasesOverride=null){
 const aliases=aliasesOverride?.length?aliasesOverride:await mangaQueryVariants(title,media);
 const hit=verifiedMangaDirect(source,aliases);
 if(!hit)return[];
 return [{
  title:hit.title,url:hit.url,thumbnail:"",
  source:sourcePayload(source),_nativeSource:true,_verifiedKnown:true
 }]
}

function mangaMatchScore(result,source,title){
 const sim=titleSimilarity(result?.title||"",title);
 let score=sim*1.6+mangaSourceHistoryScore(source);
 if(isPortugueseLang(source.lang))score+=20;
 if(result?.url)score+=45;
 if(normText(result?.title||"")===normText(title))score+=35;
 return Math.round(score)
}
function m25SourceChip(source,status){return`<span class="${status}">${esc(source.name||source.extension||"Fonte")}</span>`}
function m25SourceCard(source,result=null,rank=0,title=""){
 const direct=safeHttpUrl(result?.url||""),smart=!!result?._verifiedKnown,confirmed=!!direct;
 const target=confirmed?direct:m24SourceSearchUrl(source,title);
 const score=confirmed?mangaMatchScore(result,source,title):mangaSourceHistoryScore(source);
 return`<article class="m24SourceCard ${confirmed?"confirmed":""}">
  <div class="m25SourceRank">${rank||"•"}</div>
  <div>
   <div class="m24SourceName">${esc(source.name||source.extension||"Fonte")} ${confirmed?`<span class="m25SourceScore">${score}</span>`:""}</div>
    <div class="m24SourceMeta">🇧🇷 Português • ${source._installed?"✓ Instalada":"Catálogo"} • ${esc(source.extension||"Keiyoushi")}</div>
   <div class="m24SourceResult ${confirmed?"m25DirectLabel":""}">${confirmed?(smart?`✓ Link validado: ${esc(result.title||title)}`:`✓ Abre direto em: ${esc(result.title||title)}`):"Não foi possível confirmar a página exata; abrir pesquisa da fonte"}</div>
  </div>
  <button type="button" data-m25-open="${esc(target||source.homeUrl)}" data-m25-confirmed="${confirmed?"1":"0"}" data-m25-source="${esc(source.homeUrl||"")}">${confirmed?"Ler agora":"Abrir busca"} ↗</button>
 </article>`
}
function bindM25SourceOpen(root,sources){
 root.querySelectorAll("[data-m25-open]").forEach(b=>b.onclick=()=>{
  const u=safeHttpUrl(b.dataset.m25Open);if(!u)return;
  const source=sources.find(s=>(s.homeUrl||"")===b.dataset.m25Source);
  if(source)rememberMangaSourceUse(source,b.dataset.m25Confirmed==="1");
  window.open(u,"_blank","noopener,noreferrer")
 })
}
async function findMangaAcrossSourcesV24(media){
 const title=mangaV24Title(media),token=++S.mangaMatchToken;
 const sourceCount=Math.max(5,Math.min(15,Number(S.mangaSourceLimit||5)));
 S.mangaMatchMedia=media;S.mangaMatchResults=[];
 $("#mangaMatchModal").classList.add("open");document.body.classList.add("mangaMatchOpen");
 $("#mangaMatchTitle").textContent=title;
 $("#mangaMatchStatus").innerHTML=`Preparando busca em <b>${sourceCount}</b> fontes…`;
 $("#mangaMatchProgress").innerHTML="";
 $("#mangaMatchList").innerHTML='<div class="loading">Traduzindo aliases e selecionando fontes rápidas…</div>';

 const [all,aliases]=await Promise.all([mangaPortugueseSourcesV24(),mangaQueryVariants(title,media)]);
 if(token!==S.mangaMatchToken)return;

 // IMPORTANT: selected count is also the searched count. No hidden 15-source search.
 const sourcePriority=s=>(verifiedMangaDirect(s,aliases)?2000:0)+(s._installed?500:0)+mangaSourceHistoryScore(s)+(mangaSourceHealth()[s.homeUrl]?.okAt?20:0);
 const candidates=[...all]
  .sort((a,b)=>sourcePriority(b)-sourcePriority(a)||(a.name||"").localeCompare(b.name||""))
  .slice(0,sourceCount);

 if(!candidates.length){
  $("#mangaMatchStatus").textContent="Nenhuma fonte PT/PT-BR foi retornada pelo repositório.";
  $("#mangaMatchList").innerHTML='<div class="mangaEmpty">Tente novamente mais tarde.</div>';return
 }

 $("#mangaMatchStatus").innerHTML=`Buscando <b>${esc(aliases.slice(0,4).join(" • "))}</b> em exatamente <b>${candidates.length}</b> fontes PT-BR.`;
 const results=new Map(),states=new Map(candidates.map(s=>[s.homeUrl,"loading"]));

 const render=()=>{
  if(token!==S.mangaMatchToken)return;
  $("#mangaMatchProgress").innerHTML=`<div class="m24SourceProgress">${candidates.map(s=>m25SourceChip(s,states.get(s.homeUrl)||"loading")).join("")}</div>`;
  const confirmed=candidates
   .filter(s=>results.has(s.homeUrl))
   .map(s=>({source:s,result:results.get(s.homeUrl)}))
   .sort((a,b)=>mangaMatchScore(b.result,b.source,title)-mangaMatchScore(a.result,a.source,title));
  const fallback=candidates
   .filter(s=>!results.has(s.homeUrl)&&states.get(s.homeUrl)!=="loading")
   .sort((a,b)=>mangaSourceHistoryScore(b)-mangaSourceHistoryScore(a));
  $("#mangaMatchList").innerHTML=`
   <section class="m25BestBlock">
    <div class="m25BestHead"><h3>Fontes encontradas</h3><small>links retornados pela própria fonte</small><span class="count">${confirmed.length}/${candidates.length}</span></div>
    <div class="m24SourceGrid">${confirmed.length?confirmed.map((x,i)=>m25SourceCard(x.source,x.result,i+1,title)).join(""):'<div class="mangaEmpty">Procurando resultados confirmados…</div>'}</div>
   </section>
   ${fallback.length?`<section class="m25BestBlock m25FallbackHead"><div class="m25BestHead"><h3>Fontes não confirmadas</h3><small>abrem a pesquisa do próprio site; sem URL inventada</small></div><div class="m24SourceGrid">${fallback.map((s,i)=>m25SourceCard(s,null,confirmed.length+i+1,title)).join("")}</div></section>`:""}`;
  bindM25SourceOpen($("#mangaMatchList"),candidates)
 };
 render();

 let cursor=0;
 const worker=async()=>{
  while(cursor<candidates.length&&token===S.mangaMatchToken){
   const s=candidates[cursor++];
   try{
     let items=await smartMangaDirectCandidates(s,title,media,aliases); // links fornecidos e validados primeiro
     if(!items?.length)items=await searchOneInstalledSource(s,title,false,media,aliases);
    const ranked=(items||[]).map(x=>({x,sim:Math.max(...aliases.map(a=>titleSimilarity(x.title,a)),0)})).sort((a,b)=>b.sim-a.sim);
    const best=ranked[0];
    if(best&&best.x?.url&&(best.x._verifiedKnown||best.sim>=30)){
     results.set(s.homeUrl,best.x);states.set(s.homeUrl,"ok");rememberMangaAlias(media,best.x.title,title)
    }else states.set(s.homeUrl,"fail")
   }catch{states.set(s.homeUrl,"fail")}
   render()
  }
 };
 await Promise.all(Array.from({length:Math.min(5,candidates.length)},worker));
 if(token===S.mangaMatchToken){
  const ok=[...results].length;
  $("#mangaMatchStatus").innerHTML=`Concluído: <b>${ok}</b> resultado(s) confirmado(s) em <b>${candidates.length}</b> fontes pesquisadas.`
 }
}

async function mangaPage(){
 S.currentPage="manga";setActiveNav("manga");unlockMobileDocument();scrollPageTop();toggleCategoryMega(false);
 $("#page").classList.remove("searchPage","mangaPageModern","musicPageModern","booksPageModern");$("#page").classList.add("mangaPageV24");$("#hero").classList.add("hidden");$("#main").classList.add("hidden");$("#page").classList.remove("hidden");$("#pageTitle").textContent="Mangás";
 $("#pageBody").innerHTML=`<div class="m24Shell"><div class="m24Header"><div class="m24HeaderText"><div class="m24Eyebrow">MANGÁS</div><h2>Encontre e abra na fonte original</h2><p>O ResenhaFlix procura as melhores fontes em português e, quando consegue confirmar o resultado, abre diretamente na página daquele mangá.</p></div><div class="m24Tabs" id="mangaTabs"><button type="button" data-manga-tab="explore">Explorar</button><button type="button" data-manga-tab="library">Biblioteca</button><button type="button" data-manga-tab="extensions">Extensões</button></div></div><div class="m24Search"><input id="mangaTitleSearch" placeholder="Pesquisar mangá em português ou inglês…" autocomplete="off" value="${esc(S.mangaQuery)}"><select id="mangaSourceLimit">${[5,8,10,12,15].map(n=>`<option value="${n}" ${Number(S.mangaSourceLimit)===n?"selected":""}>Buscar em ${n}</option>`).join("")}</select><button type="button" id="mangaSearchBtn">Buscar</button></div><div class="m24Hint">Fontes instaladas têm prioridade. Sem instalações, a busca usa o catálogo PT-BR dos repositórios configurados. Aliases e nomes alternativos encontram versões como “The Infinite Mage” → “Mago do Infinito”.</div><div id="mangaContent"><div class="loading">Carregando…</div></div></div>`;
 const input=$("#mangaTitleSearch");let timer;const sync=()=>{$$("#mangaTabs [data-manga-tab]").forEach(b=>b.classList.toggle("active",b.dataset.mangaTab===S.mangaTab))};const go=()=>{S.mangaQuery=input.value.trim();S.mangaTab="explore";sync();renderMangaExplore()};
 input.oninput=()=>{clearTimeout(timer);timer=setTimeout(go,520)};input.onkeydown=e=>{if(e.key==="Enter"){clearTimeout(timer);go();input.blur()}};$("#mangaSearchBtn").onclick=go;$("#mangaSourceLimit").onchange=e=>{S.mangaSourceLimit=Math.max(5,Math.min(15,Number(e.target.value)||10));localStorage.setItem("rf24_manga_source_limit",String(S.mangaSourceLimit))};$$("#mangaTabs [data-manga-tab]").forEach(b=>b.onclick=()=>{S.mangaTab=b.dataset.mangaTab;sync();renderMangaCurrentTab()});sync();renderMangaCurrentTab()
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
 const present=new Set();
 for(const m of items)for(const g of (m.genres||[])){
  const def=PAGE_GENRES.find(x=>normText(x[0])===normText(g));
  if(def)present.add(def[0]);
 }
 for(const def of PAGE_GENRES.slice(1))if(present.has(def[0]))cats.push(def);
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
  target.innerHTML=`<div class="grid">${items.map(card).join("")}</div>`;
 }
 bindCards(target);
}

async function aniListTrendingMedia(type="ANIME",perPage=18){
 const gql=`query($type:MediaType,$n:Int){Page(page:1,perPage:$n){media(type:$type,sort:TRENDING_DESC){id title{romaji english native}coverImage{large extraLarge}averageScore status format genres}}}`;
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),7000);
 try{const r=await fetch(ANILIST_API,{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify({query:gql,variables:{type,n:perPage}}),signal:ctl.signal});if(!r.ok)throw Error("AniList "+r.status);const d=await r.json();return d.data?.Page?.media||[]}finally{clearTimeout(timer)}
}
function socialSearchUrl(kind,title){const q=encodeURIComponent(`"${title}"`);if(kind==="tiktok")return`https://www.google.com/search?q=site%3Atiktok.com+${q}`;if(kind==="instagram")return`https://www.google.com/search?q=site%3Ainstagram.com+${q}`;return`https://trends.google.com/trends/explore?q=${encodeURIComponent(title)}`}
function socialBuzzCard(item){const title=item.name||item._rfTitle||mangaDisplayTitle(item)||"Título",type=item._trendType||"Em alta";return`<article class="socialBuzz"><b>${esc(title)}</b><small>${esc(type)}</small><div class="socialLinks"><button type="button" data-social-kind="tiktok" data-social-title="${esc(title)}">TikTok</button><button type="button" data-social-kind="instagram" data-social-title="${esc(title)}">Instagram</button><button type="button" data-social-kind="google" data-social-title="${esc(title)}">Google Trends</button></div></article>`}
function bindSocialBuzz(root){root.querySelectorAll("[data-social-kind]").forEach(b=>b.onclick=()=>window.open(socialSearchUrl(b.dataset.socialKind,b.dataset.socialTitle),"_blank","noopener,noreferrer"))}
function aniTrendCard(m,type){const title=m.title?.english||m.title?.romaji||m.title?.native||"Anime",cover=m.coverImage?.extraLarge||m.coverImage?.large||"";return`<article class="mangaNativeResultCard aniTrendCard" data-ani-trend-title="${esc(title)}"><div class="mangaNativeResultCover" style="background-image:url('${esc(cover)}')"><div class="mangaCatalogOnlyBadge">Em alta</div></div><div class="mangaNativeResultBody"><div class="mangaNativeResultTitle">${esc(title)}</div><div class="mangaNativeResultMeta">${esc(type)}${m.averageScore?` • ★ ${(m.averageScore/10).toFixed(1)}`:""}</div><div class="mangaNativeResultActions"><button type="button" data-ani-search>Buscar no ResenhaFlix</button></div></div></article>`}
function bindAniTrendCards(root){root.querySelectorAll("[data-ani-trend-title]").forEach(card=>card.querySelector("[data-ani-search]").onclick=()=>search(card.dataset.aniTrendTitle,true))}
async function trendingPage(){
 S.currentPage="trending";setActiveNav("trending");unlockMobileDocument();scrollPageTop();toggleCategoryMega(false);
 $("#hero").classList.add("hidden");$("#main").classList.add("hidden");$("#page").classList.remove("hidden","searchPage","mangaPageModern");$("#pageTitle").textContent="Em alta";$("#pageBody").innerHTML='<div class="loading">Atualizando o radar…</div>';
 try{
  const [movies,series,animeCatalog,aniAnime,mangaData]=await Promise.all([freshCatalog("movie","top","",cfg.meta,"trend-movies"),freshCatalog("series","top","",cfg.meta,"trend-series"),freshCatalog("series","top",{genre:"Animation"},cfg.meta,"trend-anime-catalog"),aniListTrendingMedia("ANIME",14).catch(()=>[]),aniListManga("",1).then(x=>(x.media||[]).map(normalizeAniMedia)).catch(()=>[])]);
  const anime=animeCatalog.slice(0,16),mangas=mangaData.slice(0,16),buzz=[...movies.slice(0,3).map(x=>({...x,_trendType:"Filme"})),...series.slice(0,3).map(x=>({...x,_trendType:"Série"})),...anime.slice(0,2).map(x=>({...x,_trendType:"Anime"})),...mangas.slice(0,2).map(x=>({...x,_trendType:"Mangá"}))];
  const updated=new Date().toLocaleString("pt-BR",{hour:"2-digit",minute:"2-digit",day:"2-digit",month:"2-digit"});
  $("#pageBody").innerHTML=`<div class="trendingShell"><section class="trendingHero"><div class="trendingHeroText"><div class="trendingEyebrow">RADAR RESENHAFLIX</div><h2>Em alta agora</h2><p>Filmes, séries, animes e mangás que estão ganhando atenção. O ranking usa catálogos atualizados e tendências do AniList; o Radar Social facilita conferir a repercussão no TikTok, Instagram e Google Trends.</p></div><div class="trendingUpdated">Atualizado ${updated}</div></section><section class="socialRadar"><div class="socialRadarHead"><div><h3>Radar social</h3><p>Confira a repercussão do título com um toque. O ResenhaFlix não inventa números de redes que não fornecem um feed público anônimo.</p></div><span class="socialRadarBadge">SOCIAL</span></div><div class="socialBuzzList" id="socialBuzzList">${buzz.map(socialBuzzCard).join("")}</div></section><section class="trendingSection"><div class="trendingSectionHead"><h3>Filmes</h3><p>Atualização automática</p></div><div class="trendingRow" id="trendMovies">${movies.slice(0,18).map(card).join("")}</div></section><section class="trendingSection"><div class="trendingSectionHead"><h3>Séries</h3><p>Atualização automática</p></div><div class="trendingRow" id="trendSeries">${series.slice(0,18).map(card).join("")}</div></section><section class="trendingSection"><div class="trendingSectionHead"><h3>Animes</h3><p>Tendências atuais</p></div>${aniAnime.length?`<div class="trendingRow" id="trendAniLive">${aniAnime.slice(0,14).map(x=>aniTrendCard(x,"Anime")).join("")}</div>`:`<div class="trendingRow" id="trendAnime">${anime.map(card).join("")}</div>`}</section><section class="trendingSection"><div class="trendingSectionHead"><h3>Mangás</h3><p>Tendências atuais do AniList</p></div><div class="trendingRow" id="trendManga">${mangas.map(nativeMangaCard).join("")}</div></section></div>`;
  bindSocialBuzz($("#socialBuzzList"));bindCards($("#trendMovies"));bindCards($("#trendSeries"));if($("#trendAnime"))bindCards($("#trendAnime"));if($("#trendAniLive"))bindAniTrendCards($("#trendAniLive"));if($("#trendManga"))bindNativeMangaCards($("#trendManga"),mangas);
 }catch(e){console.error(e);$("#pageBody").innerHTML='<div class="empty">Não foi possível atualizar o radar agora.</div>'}
}

/* Música V24 */


let soundcloudWidgetLoader=null;
function soundcloudSearchUrl(q){
 return `https://soundcloud.com/search?q=${encodeURIComponent(q||"")}`;
}
function ensureSoundCloudWidgetApi(){
 if(window.SC?.Widget)return Promise.resolve(window.SC);
 if(soundcloudWidgetLoader)return soundcloudWidgetLoader;
 soundcloudWidgetLoader=new Promise((resolve,reject)=>{
  const s=document.createElement("script");s.src="https://w.soundcloud.com/player/api.js";s.async=true;
  s.onload=()=>resolve(window.SC);s.onerror=()=>reject(new Error("Falha ao carregar SoundCloud Widget API"));
  document.head.appendChild(s)
 });
 return soundcloudWidgetLoader
}
function normalizeSoundCloudProxyTrack(x){
 const user=x.user||{};
 const permalink=safeHttpUrl(x.permalink_url||x.permalink||"");
 return{
  kind:"track",id:String(x.id||permalink||Math.random()),title:String(x.title||"Faixa"),
  artist:String(user.username||user.full_name||x.artist||""),
  album:"",image:safeHttpUrl(x.artwork_url||user.avatar_url||""),
  previewUrl:"",externalUrl:permalink,genre:String(x.genre||""),
  source:"SoundCloud",fullTrack:x.access!=="preview",soundcloudUrl:permalink,
  duration:Number(x.duration||0)/1000
 }
}
function normalizeSoundCloudProxyUser(x){
 return{
  kind:"artist",id:String(x.id||x.permalink_url||Math.random()),title:String(x.username||x.full_name||"Artista"),
  artist:String(x.username||x.full_name||""),album:"",image:safeHttpUrl(x.avatar_url||""),
  previewUrl:"",externalUrl:safeHttpUrl(x.permalink_url||""),genre:"SoundCloud",source:"SoundCloud"
 }
}
async function searchSoundCloudProxy(q,type="tracks"){
 const base=safeHttpUrl(mediaCfg.soundcloudProxyUrl||"");if(!base||!q)return[];
 const url=`${base.replace(/\/+$/,"")}/search?q=${encodeURIComponent(q)}&type=${encodeURIComponent(type)}`;
 const data=await getJSONTimeout(url,7500);
 const items=Array.isArray(data?.items)?data.items:[];
 return type==="users"?items.map(normalizeSoundCloudProxyUser):items.map(normalizeSoundCloudProxyTrack).filter(x=>x.soundcloudUrl)
}
async function soundcloudItemFromUrl(url){
 const u=safeHttpUrl(url);if(!u||!/(^|\.)soundcloud\.com$/i.test(new URL(u).hostname.replace(/^www\./,"")))return null;
 const data=await getJSONTimeout(`https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(u)}`,6500);
 const title=String(data?.title||"SoundCloud");
 const bits=title.split(" by ");
 return{
  kind:"track",id:u,title:bits[0]||title,artist:bits.slice(1).join(" by ")||"SoundCloud",
  album:"",image:safeHttpUrl(data?.thumbnail_url||""),previewUrl:"",externalUrl:u,genre:"",
  source:"SoundCloud",fullTrack:true,soundcloudUrl:u,duration:0
 }
}
function pauseOtherMusicBackend(nextBackend){
 const a=$("#musicPreviewAudio");
 if(nextBackend!=="audio")a.pause();
 if(nextBackend!=="soundcloud"&&S.soundcloudWidget){try{S.soundcloudWidget.pause()}catch{}}
}
async function playSoundCloudItem(x,queue=null,index=-1){
 if(!x?.soundcloudUrl)return;
 if(queue){S.musicQueue=queue;S.musicQueueIndex=index}
 S.musicCurrentItem=x;S.musicBackend="soundcloud";pauseOtherMusicBackend("soundcloud");
 const frame=$("#soundcloudWidgetFrame");
 frame.src=`https://w.soundcloud.com/player/?url=${encodeURIComponent(x.soundcloudUrl)}&auto_play=true&show_artwork=false&show_comments=false&show_user=false&show_reposts=false&visual=false`;
 $("#musicMiniCover").style.backgroundImage=`url('${x.image||""}')`;
 $("#musicMiniTitle").textContent=x.title||"SoundCloud";
 $("#musicMiniArtist").textContent=`${x.artist||""} • SoundCloud`;
 $("#musicMiniStore").style.display="none";
 $("#musicMiniStore").onclick=null;
 $("#musicFullBadge").classList.remove("preview");$("#musicFullBadge").title="SoundCloud";
 $("#musicMiniPlayer").classList.add("show");
 try{
  const SC=await ensureSoundCloudWidgetApi();
  const widget=SC.Widget(frame);S.soundcloudWidget=widget;S.soundcloudWidgetReady=false;
  widget.unbind(SC.Widget.Events.READY);widget.unbind(SC.Widget.Events.PLAY_PROGRESS);
  widget.unbind(SC.Widget.Events.PLAY);widget.unbind(SC.Widget.Events.PAUSE);widget.unbind(SC.Widget.Events.FINISH);
  widget.bind(SC.Widget.Events.READY,()=>{
   S.soundcloudWidgetReady=true;S.soundcloudPaused=false;
   widget.getDuration(ms=>{S.soundcloudDuration=Number(ms||0)/1000;updateSpotifyPlayer()});
   widget.setVolume(Math.round(Number($("#musicVolume")?.value||SITE_DEFAULT_VOLUME)*100));widget.play()
  });
  widget.bind(SC.Widget.Events.PLAY_PROGRESS,e=>{S.soundcloudPosition=Number(e?.currentPosition||0)/1000;S.soundcloudDuration=Math.max(S.soundcloudDuration,S.soundcloudPosition/(Number(e?.relativePosition)||1));updateSpotifyPlayer()});
  widget.bind(SC.Widget.Events.PLAY,()=>{S.soundcloudPaused=false;updateSpotifyPlayer()});
  widget.bind(SC.Widget.Events.PAUSE,()=>{S.soundcloudPaused=true;updateSpotifyPlayer()});
  widget.bind(SC.Widget.Events.FINISH,()=>{S.soundcloudPaused=true;if(S.musicRepeat){widget.seekTo(0);widget.play()}else musicNext(1)});
 }catch(e){console.warn("SoundCloud widget",e);toast("Não consegui iniciar o player do SoundCloud.");}
}
let audiusSdkLoader=null,audiusSdkClient=null;
function ensureAudiusSdk(){
 if(window.audiusSdk)return Promise.resolve(window.audiusSdk);
 if(audiusSdkLoader)return audiusSdkLoader;
 audiusSdkLoader=new Promise((resolve,reject)=>{
  const s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/@audius/sdk@latest/dist/sdk.min.js";s.async=true;
  s.onload=()=>resolve(window.audiusSdk);s.onerror=()=>reject(new Error("Falha ao carregar Audius SDK"));document.head.appendChild(s)
 });
 return audiusSdkLoader
}
async function getAudiusClient(){
 if(!mediaCfg.audiusApiKey)return null;
 if(audiusSdkClient)return audiusSdkClient;
 const factory=await ensureAudiusSdk();
 audiusSdkClient=factory({apiKey:mediaCfg.audiusApiKey});
 return audiusSdkClient
}
function audiusArtwork(x){
 const art=x.artwork||x._artwork||{};
 return safeHttpUrl(art["1000x1000"]||art["480x480"]||art["150x150"]||x.image||"")
}
function normalizeAudiusTrack(x){
 const user=x.user||{};
 return{
  kind:"track",id:String(x.id||""),title:String(x.title||"Faixa"),artist:String(user.name||user.handle||x.artist||""),
  album:String(x.album_name||x.albumName||""),image:audiusArtwork(x),
  previewUrl:"",externalUrl:(()=>{const p=String(x.permalink||x.permalink_url||x.url||"");return safeHttpUrl(p)||`https://audius.co/${p.replace(/^\/+/, "")}`})(),
  genre:String(x.genre||""),source:"Audius",fullTrack:true,duration:Number(x.duration||0),
  streamUrl:`${String(mediaCfg.audiusApi||MEDIA_DEFAULT.audiusApi).replace(/\/+$/,"")}/v1/tracks/${encodeURIComponent(String(x.id||""))}/stream?app_name=ResenhaFlix`
 }
}
function unwrapAudiusData(r){return r?.data?.data||r?.data||r?.results||r||[]}
async function searchAudiusTracks(q){
 if(!q)return[];
 if(mediaCfg.audiusApiKey){
  try{
   const client=await getAudiusClient();
   if(client?.tracks?.searchTracks){
    const r=await client.tracks.searchTracks({query:q,limit:35});
    const d=unwrapAudiusData(r);return (Array.isArray(d)?d:[]).map(normalizeAudiusTrack)
   }
   if(client?.tracks?.search){
    const r=await client.tracks.search({query:q,limit:35});
    const d=unwrapAudiusData(r);return (Array.isArray(d)?d:[]).map(normalizeAudiusTrack)
   }
  }catch(e){console.warn("Audius SDK search",e)}
 }
 // Compatibilidade com endpoint público/read-only quando disponível.
 try{
  const base=String(mediaCfg.audiusApi||MEDIA_DEFAULT.audiusApi).replace(/\/+$/,"");
  const r=await fetch(`${base}/v1/tracks/search?query=${encodeURIComponent(q)}&limit=35&app_name=ResenhaFlix`,{headers:mediaCfg.audiusApiKey?{"x-api-key":mediaCfg.audiusApiKey}:{}});
  if(!r.ok)throw Error("Audius "+r.status);
  const d=await r.json(),arr=unwrapAudiusData(d);
  return (Array.isArray(arr)?arr:[]).map(normalizeAudiusTrack)
 }catch(e){console.warn("Audius REST search",e);return[]}
}
function formatMusicTime(sec){sec=Math.max(0,Math.floor(Number(sec)||0));return`${Math.floor(sec/60)}:${String(sec%60).padStart(2,"0")}`}
function musicQueueItems(){return S.musicQueue||[]}
function updateSpotifyPlayer(){
 const x=S.musicCurrentItem;if(!x)return;
 if(S.musicBackend==="soundcloud"){
  const dur=Number(S.soundcloudDuration||x.duration||0),cur=Number(S.soundcloudPosition||0);
  $("#musicMainPlay").textContent=S.soundcloudPaused?"▶":"❚❚";
  $("#musicFullBadge").classList.remove("preview");$("#musicFullBadge").title="SoundCloud";
  $("#musicCurrentTime").textContent=formatMusicTime(cur);$("#musicDuration").textContent=formatMusicTime(dur);
  $("#musicSeek").value=dur?Math.round(cur/dur*1000):0;
 }else{
  const a=$("#musicPreviewAudio");
  $("#musicMainPlay").textContent=a.paused?"▶":"❚❚";
  $("#musicFullBadge").classList.toggle("preview",!x.fullTrack);
  $("#musicFullBadge").title=x.fullTrack?"Faixa completa via Audius":"Prévia";
  $("#musicCurrentTime").textContent=formatMusicTime(a.currentTime);
  $("#musicDuration").textContent=formatMusicTime(isFinite(a.duration)&&a.duration?a.duration:(x.duration||0));
  const max=isFinite(a.duration)&&a.duration?a.duration:(x.duration||0);
  $("#musicSeek").value=max?Math.round(a.currentTime/max*1000):0;
 }
 $("#musicShuffle").style.color=S.musicShuffle?"#1ed760":"";
 $("#musicRepeat").style.color=S.musicRepeat?"#1ed760":""
}
function playMusicItem(x,queue=null,index=-1){
 if(x?.soundcloudUrl)return playSoundCloudItem(x,queue,index);
 const url=safeHttpUrl(x?.streamUrl||x?.previewUrl||"");if(!url)return toast("Essa faixa não possui áudio reproduzível.");
 if(queue){S.musicQueue=queue;S.musicQueueIndex=index}
 S.musicCurrentItem=x;S.musicBackend="audio";pauseOtherMusicBackend("audio");
 const a=$("#musicPreviewAudio");a.pause();a.src=url;a.load();a.volume=Number($("#musicVolume")?.value||SITE_DEFAULT_VOLUME);
 $("#musicMiniCover").style.backgroundImage=`url('${x.image||""}')`;$("#musicMiniTitle").textContent=x.title||"Música";
 $("#musicMiniArtist").textContent=`${x.artist||""}${x.fullTrack?" • Audius":" • Prévia"}`;
 $("#musicMiniStore").style.display=x.source==="SoundCloud"?"none":(x.externalUrl?"":"none");$("#musicMiniStore").onclick=x.source==="SoundCloud"?null:(()=>{if(x.externalUrl)window.open(x.externalUrl,"_blank","noopener,noreferrer")});
 $("#musicMiniPlayer").classList.add("show");updateSpotifyPlayer();a.play().catch(()=>{})
}
function musicNext(delta=1){
 const q=musicQueueItems();if(!q.length)return;
 if(S.musicShuffle)S.musicQueueIndex=Math.floor(Math.random()*q.length);
 else S.musicQueueIndex=(S.musicQueueIndex+delta+q.length)%q.length;
 playMusicItem(q[S.musicQueueIndex],q,S.musicQueueIndex)
}
function musicImportedNormalized(){return mediaImported("music").map(normalizeCustomMusic).filter(Boolean)}
function normalizeCustomMusic(x){if(!x||typeof x!=="object")return null;const kind=String(x.kind||x.type||"track").toLowerCase(),title=x.title||x.name||x.track||x.album||x.artist;if(!title)return null;return{kind:["track","album","artist"].includes(kind)?kind:"track",id:String(x.id||`${kind}:${title}:${x.artist||""}`),title:String(title),artist:String(x.artist||x.artistName||""),album:String(x.album||x.collectionName||""),image:safeHttpUrl(x.image||x.artwork||x.cover||""),previewUrl:safeHttpUrl(x.previewUrl||x.preview||""),externalUrl:safeHttpUrl(x.url||x.externalUrl||""),genre:String(x.genre||""),source:String(x.source||"JSON personalizado")}}
function normalizeItunes(x,kind){if(kind==="tracks")return{kind:"track",id:String(x.trackId||x.collectionId||x.artistId||Math.random()),title:x.trackName||x.collectionName||"Faixa",artist:x.artistName||"",album:x.collectionName||"",image:(x.artworkUrl100||"").replace("100x100bb","600x600bb").replace("100x100","600x600"),previewUrl:safeHttpUrl(x.previewUrl||""),externalUrl:safeHttpUrl(x.trackViewUrl||x.collectionViewUrl||x.artistViewUrl||""),genre:x.primaryGenreName||"",source:"iTunes"};if(kind==="albums")return{kind:"album",id:String(x.collectionId||Math.random()),title:x.collectionName||"Álbum",artist:x.artistName||"",album:x.collectionName||"",image:(x.artworkUrl100||"").replace("100x100bb","600x600bb").replace("100x100","600x600"),previewUrl:"",externalUrl:safeHttpUrl(x.collectionViewUrl||""),genre:x.primaryGenreName||"",source:"iTunes"};return{kind:"artist",id:String(x.artistId||Math.random()),title:x.artistName||"Artista",artist:x.artistName||"",album:"",image:"",previewUrl:"",externalUrl:safeHttpUrl(x.artistLinkUrl||x.artistViewUrl||""),genre:x.primaryGenreName||"",source:"iTunes"}}
async function searchItunes(q,tab){const entity=tab==="tracks"?"song":tab==="albums"?"album":"musicArtist",base=safeHttpUrl(mediaCfg.musicApi)||MEDIA_DEFAULT.musicApi,sep=base.includes("?")?"&":"?",url=`${base}${sep}term=${encodeURIComponent(q)}&country=BR&media=music&entity=${entity}&limit=40`;const data=await getJSONTimeout(url,7000);return(data.results||[]).map(x=>normalizeItunes(x,tab))}
async function customMusicResults(q,tab){const want=tab==="tracks"?"track":tab==="albums"?"album":"artist",out=musicImportedNormalized().filter(x=>x.kind===want&&(!q||normText(JSON.stringify(x)).includes(normText(q)))),urls=String(mediaCfg.musicJsonUrls||"").split(/\n+/).map(x=>x.trim()).filter(Boolean).slice(0,6),settled=await Promise.allSettled(urls.map(u=>fetchCustomJson(u,q)));for(const r of settled)if(r.status==="fulfilled")for(const x of r.value){const n=normalizeCustomMusic(x);if(n&&n.kind===want)out.push(n)}return out}
function dedupeMusic(items){const map=new Map();for(const x of items){const k=normText(`${x.kind}|${x.title}|${x.artist}`);if(!map.has(k))map.set(k,x)}return[...map.values()]}
function musicTrackHtml(x,i){
 const sc=!!x.soundcloudUrl,full=!!x.fullTrack;
 return`<article class="musicTrack ${sc?"soundcloudTrack":(full?"fullTrack":"")}"><div class="musicTrackCover" style="background-image:url('${esc(x.image)}')"></div><div><div class="musicTrackTitle">${esc(x.title)}${sc?'<span class="soundcloudTag">SOUNDCLOUD</span>':(full?'<span class="musicFullTag">COMPLETA</span>':"")}</div><div class="musicTrackArtist">${esc(x.artist)}${x.album?` • ${esc(x.album)}`:""} • ${esc(x.source||"")}</div></div><div class="musicTrackActions">${sc?`<button type="button" class="soundcloudPlay" data-music-play="${i}">▶ Ouvir inteira</button>`:(full?`<button type="button" class="fullPlay" data-music-play="${i}">▶ Ouvir</button>`:(x.previewUrl?`<button type="button" class="preview" data-music-preview="${i}">▶ Prévia</button>`:""))}${(!sc&&x.externalUrl)?`<button type="button" data-music-open="${i}">Abrir</button>`:""}</div></article>`
}
function musicAlbumHtml(x,i){return`<article class="musicAlbum"><div class="musicAlbumCover" style="background-image:url('${esc(x.image)}')"></div><div class="musicAlbumTitle">${esc(x.title)}</div><div class="musicAlbumArtist">${esc(x.artist)}</div>${x.externalUrl?`<button type="button" data-music-open="${i}">Ver álbum ↗</button>`:""}</article>`}
function musicArtistHtml(x,i){const initials=x.title.split(/\s+/).slice(0,2).map(s=>s[0]).join("").toUpperCase();return`<article class="musicArtist"><div class="musicArtistAvatar">${esc(initials||"♪")}</div><div class="musicArtistName">${esc(x.title)}</div><div class="musicArtistGenre">${esc(x.genre||"Artista")}</div>${x.externalUrl?`<button type="button" data-music-open="${i}">Abrir artista ↗</button>`:""}</article>`}
function bindMusicResults(root,items){
 root.querySelectorAll("[data-music-open]").forEach(b=>b.onclick=()=>{const x=items[Number(b.dataset.musicOpen)],u=safeHttpUrl(x?.externalUrl);if(u)window.open(u,"_blank","noopener,noreferrer")});
 root.querySelectorAll("[data-music-preview]").forEach(b=>b.onclick=()=>playMusicItem(items[Number(b.dataset.musicPreview)],items,Number(b.dataset.musicPreview)));
 root.querySelectorAll("[data-music-play]").forEach(b=>b.onclick=()=>playMusicItem(items[Number(b.dataset.musicPlay)],items,Number(b.dataset.musicPlay)))
}
function playMusicPreview(x){return playMusicItem(x,[x],0)}
async function runMusicSearch(q=S.musicQuery){
 const root=$("#musicResults");if(!root)return;
 q=String(q||"").trim();S.musicQuery=q;
 if(q.length<2){root.innerHTML='<div class="mediaEmpty"><b>Pesquise sua música.</b>Use nome da faixa, artista ou cole uma URL do SoundCloud.</div>';return}
 const token=++S.searchToken;root.innerHTML='<div class="loading">Buscando música…</div>';
 try{
  if(/^https?:\/\/(www\.)?soundcloud\.com\//i.test(q)){
   const direct=await soundcloudItemFromUrl(q);
   if(token!==S.searchToken)return;
   const items=direct?[direct]:[];S.musicResults=items;
   $("#musicResultMeta").textContent=items.length?"Link do SoundCloud reconhecido":"Não consegui reconhecer esse link.";
   root.innerHTML=items.length?`<div class="musicTrackList">${items.map(musicTrackHtml).join("")}</div>`:'<div class="mediaEmpty">Cole o link público de uma faixa do SoundCloud.</div>';
   if(items.length)bindMusicResults(root,items);return
  }
  const [sc,audius,main,custom]=await Promise.all([
   S.musicTab==="tracks"?searchSoundCloudProxy(q,"tracks").catch(()=>[]):Promise.resolve([]),
   S.musicTab==="tracks"?searchAudiusTracks(q).catch(()=>[]):Promise.resolve([]),
   searchItunes(q,S.musicTab).catch(()=>[]),
   customMusicResults(q,S.musicTab).catch(()=>[])
  ]);
  if(token!==S.searchToken)return;
  const items=dedupeMusic([...sc,...audius,...main,...custom]);S.musicResults=items;
  $("#musicResultMeta").textContent=`${items.length} resultado(s) • ${S.musicTab==="tracks"?"Faixas":S.musicTab==="albums"?"Álbuns":"Artistas"}`;
  const scShortcut=!mediaCfg.soundcloudProxyUrl&&S.musicTab==="tracks"?`<div class="musicSoundcloudBar"><div><b>SoundCloud dentro do ResenhaFlix</b><small>Para pesquisar faixas do SoundCloud por nome e tocá-las inteiras sem sair do site, configure o Worker em ⚙ Fontes. Você também pode colar uma URL pública de faixa na busca.</small></div></div>`:"";
  if(S.musicTab==="tracks")root.innerHTML=scShortcut+`<div class="musicTrackList">${items.map(musicTrackHtml).join("")}</div>`;
  else if(S.musicTab==="albums")root.innerHTML=`<div class="musicAlbumGrid">${items.map(musicAlbumHtml).join("")}</div>`;
  else root.innerHTML=`<div class="musicArtistGrid">${items.map(musicArtistHtml).join("")}</div>`;
  if(!items.length)root.innerHTML=scShortcut+'<div class="mediaEmpty"><b>Nada encontrado.</b>Tente outro nome, SoundCloud ou uma fonte JSON.</div>';
  bindMusicResults(root,items)
 }catch(e){console.error(e);root.innerHTML='<div class="mediaEmpty"><b>A busca falhou.</b>Confira as Fontes de música.</div>'}
}
async function musicPage(){S.currentPage="music";setActiveNav("music");unlockMobileDocument();scrollPageTop();toggleCategoryMega(false);$("#page").classList.remove("searchPage","mangaPageModern","mangaPageV24","booksPageModern");$("#page").classList.add("musicPageModern");$("#hero").classList.add("hidden");$("#main").classList.add("hidden");$("#page").classList.remove("hidden");$("#pageTitle").textContent="Música";$("#pageBody").innerHTML=`<div class="mediaHub"><div class="mediaHubHero"><div class="mediaHubTitle"><small>MÚSICA</small><h2>Faixas, álbuns e artistas</h2><p>Pesquise faixas, álbuns e artistas. O ResenhaFlix prioriza SoundCloud/Audius para reprodução completa e usa iTunes como catálogo e prévia.</p></div><button type="button" class="mediaSourcesBtn" id="openMusicSources">⚙ Fontes</button></div>${mediaCfg.audiusApiKey?'<div class="musicAudiusNotice">✓ Audius configurado: faixas completas aparecem com o selo COMPLETA.</div>':'<div class="musicAudiusNotice warn">Para aumentar a compatibilidade com músicas completas, abra ⚙ Fontes e adicione sua API Key gratuita do Audius. Sem ela, o ResenhaFlix ainda tenta o endpoint público e mantém as prévias da iTunes como fallback.</div>'}<div class="mediaSearchBar"><input id="musicSearchInput" placeholder="Buscar música, álbum ou artista…" value="${esc(S.musicQuery)}" autocomplete="off"><button id="musicSearchBtn">Buscar</button></div><div class="mediaTabs" id="musicTabs"><button data-music-tab="tracks">Faixas</button><button data-music-tab="albums">Álbuns</button><button data-music-tab="artists">Artistas</button></div><div class="mediaQuick">${["MPB","Rock","Rap","Pop","Sertanejo","K-pop","Jazz"].map(q=>`<button type="button" data-music-quick="${q}">${q}</button>`).join("")}</div><div class="mediaResultMeta" id="musicResultMeta"></div><div id="musicResults"></div></div>`;const input=$("#musicSearchInput"),sync=()=>{$$("#musicTabs [data-music-tab]").forEach(b=>b.classList.toggle("active",b.dataset.musicTab===S.musicTab))};$("#openMusicSources").onclick=()=>openMediaSources("music");$("#musicSearchBtn").onclick=()=>runMusicSearch(input.value);input.onkeydown=e=>{if(e.key==="Enter"){runMusicSearch(input.value);input.blur()}};$$("#musicTabs [data-music-tab]").forEach(b=>b.onclick=()=>{S.musicTab=b.dataset.musicTab;sync();runMusicSearch(input.value)});$$("#pageBody [data-music-quick]").forEach(b=>b.onclick=()=>{input.value=b.dataset.musicQuick;runMusicSearch(input.value)});sync();runMusicSearch(S.musicQuery)}

/* Livros V24 */
function bookLibrary(){try{return JSON.parse(localStorage.getItem("rf24_book_library")||"[]")}catch{return[]}}
function saveBookLibrary(x){localStorage.setItem("rf24_book_library",JSON.stringify(x.slice(0,300)))}
function bookKey(x){return String(x?.key||x?.id||`${x?.title}|${x?.authors}`)}
function bookSaved(x){return bookLibrary().some(b=>bookKey(b)===bookKey(x))}
function toggleBookSaved(x){let a=bookLibrary(),i=a.findIndex(b=>bookKey(b)===bookKey(x));if(i>=0){a.splice(i,1);toast("Livro removido da estante.")}else{a.unshift(x);toast("Livro adicionado à estante.")}saveBookLibrary(a)}
function openLibraryCover(id){return id?`https://covers.openlibrary.org/b/id/${id}-M.jpg`:""}
function normalizeOpenLibraryBook(x){
 const publicAccess=x.ebook_access==="public"||x.public_scan_b===true;
 const editions=x.editions?.docs||[];
 const ptEdition=editions.find(e=>(e.language||[]).some(l=>["por","pt"].includes(String(l).toLowerCase())));
 const title=ptEdition?.title||x.title||"Livro";
 return{kind:"book",source:"Open Library / Internet Archive",key:x.key||"",id:x.key||x.cover_edition_key||title,title,authors:(x.author_name||[]).join(", "),image:openLibraryCover(x.cover_i),year:x.first_publish_year||"",languages:(x.language||[]).slice(0,6),externalUrl:ptEdition?.key?`https://openlibrary.org${ptEdition.key}`:(x.key?`https://openlibrary.org${x.key}`:""),publicDomain:publicAccess,publicAccess,ia:Array.isArray(x.ia)?x.ia:[],ebookAccess:x.ebook_access||"",formats:{},description:""}
}
function normalizeGutendexBook(x){return{kind:"book",source:"Project Gutenberg",key:`gutenberg:${x.id}`,id:String(x.id),title:x.title||"Livro",authors:(x.authors||[]).map(a=>a.name).join(", "),image:safeHttpUrl(x.formats?.["image/jpeg"]||""),year:"",languages:x.languages||[],externalUrl:`https://www.gutenberg.org/ebooks/${x.id}`,publicDomain:x.copyright===false,formats:x.formats||{},description:(x.summaries||[])[0]||"",downloads:Number(x.download_count||0)}}
function normalizeCustomBook(x){if(!x||typeof x!=="object"||!(x.title||x.name))return null;const pd=x.publicDomain===true||x.license==="public-domain";return{kind:"book",source:String(x.source||"JSON personalizado"),key:String(x.key||x.id||`custom:${x.title||x.name}`),id:String(x.id||""),title:String(x.title||x.name),authors:Array.isArray(x.authors)?x.authors.join(", "):String(x.authors||x.author||""),image:safeHttpUrl(x.image||x.cover||""),year:x.year||"",languages:x.languages||[],externalUrl:safeHttpUrl(x.url||x.externalUrl||""),publicDomain:pd,formats:x.formats&&typeof x.formats==="object"?x.formats:{},readUrl:safeHttpUrl(x.readUrl||""),downloadUrl:pd?safeHttpUrl(x.downloadUrl||""):"",description:String(x.description||"")}}
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
 const targets=items.filter(x=>x.publicAccess&&x.ia?.length&&!x._archiveHydrated).slice(0,8);
 if(!targets.length)return;
 await Promise.allSettled(targets.map(hydrateArchiveBookFormats));
 if(!root?.isConnected)return;
 if(S.currentPage==="books"&&S.bookResults===items){
  root.innerHTML=`<div class="bookGrid">${items.map(bookCardHtml).join("")}</div>`;bindBookCards(root,items)
 }
}
function dlivrosSearchUrl(book){
 const title=String(book?.title||"").trim(),author=String(book?.authors||"").trim();
 const terms=[title&&`"${title}"`,author&&`"${author.split(",")[0].trim()}"`].filter(Boolean).join(" ");
 return `https://www.google.com/search?q=${encodeURIComponent(`site:dlivros.com/livro ${terms}`)}`;
}
function openBookOnDlivros(book){
 // Do not invent a dLivros slug: real slugs remove/keep words inconsistently and guessed URLs caused 404.
 // A site-restricted exact search lands on the real /livro/ page when it exists.
 window.open(dlivrosSearchUrl(book),"_blank","noopener,noreferrer")
}

function bookCardHtml(b,i){
 const saved=bookSaved(b),read=bestBookRead(b),formats=bookFormatChoices(b),download=bestBookDownload(b);
 return`<article class="bookCard"><div class="bookCover" style="background-image:url('${esc(b.image)}')"></div><div class="bookInfo"><div class="bookTitle">${esc(b.title)}</div><div class="bookAuthor">${esc(b.authors||"Autor não informado")}${b.year?` • ${esc(b.year)}`:""}</div><div class="bookBadges"><span>${esc(b.source)}</span>${b.publicDomain?`<span class="free ${b.publicAccess?'publicAccess':''}">${b.publicAccess?'Acesso público':'Domínio público'}</span>`:""}${read?`<span class="bookPreferredBadge">Preferência: ${esc(read.label)}</span>`:""}</div><div class="bookSourceLine">${formats.length?`Formatos: ${esc([...new Set(formats.map(x=>x.label))].join(" • "))}`:"Formatos não informados"}</div>${b.publicDomain&&formats.length?`<div class="bookFormatRow">${formats.filter(x=>["pdf","epub","mobi"].includes(x.kind)).slice(0,4).map((x,j)=>`<button type="button" class="${j===0?"preferred":""} ${x.readable?"readable":""}" data-book-format="${i}" data-book-format-kind="${esc(x.kind)}" data-book-format-url="${esc(x.url)}">${x.readable?"▶":"⬇"} ${esc(x.label)}</button>`).join("")}</div>`:""}<div class="bookActions">${read&&b.publicDomain?`<button type="button" class="read" data-book-read="${i}">▶ Ler ${esc(read.label)}</button>`:""}${download?`<button type="button" data-book-download="${i}">⬇ Melhor download</button>`:""}${b.externalUrl?`<button type="button" data-book-open="${i}">Página original ↗</button>`:""}<button type="button" class="dlivrosBtn" data-book-dlivros="${i}">🔎 Procurar no dLivros</button><button type="button" class="${saved?"saved":""}" data-book-save="${i}">${saved?"✓ Estante":"＋ Estante"}</button></div></div></article>`
}
function bindBookCards(root,items){
 root.querySelectorAll("[data-book-read]").forEach(b=>b.onclick=()=>openBookReader(items[Number(b.dataset.bookRead)]));
 root.querySelectorAll("[data-book-format]").forEach(btn=>btn.onclick=()=>{
  const book=items[Number(btn.dataset.bookFormat)],choice={kind:btn.dataset.bookFormatKind,url:btn.dataset.bookFormatUrl,label:btn.textContent.trim().replace(/^▶|^⬇/,"").trim()};
  if(choice.kind==="pdf"||choice.kind==="epub")openBookReader(book,choice);else downloadBookChoice(book,choice)
 });
 root.querySelectorAll("[data-book-download]").forEach(b=>b.onclick=()=>downloadBook(items[Number(b.dataset.bookDownload)]));
 root.querySelectorAll("[data-book-open]").forEach(b=>b.onclick=()=>{const u=safeHttpUrl(items[Number(b.dataset.bookOpen)]?.externalUrl);if(u)window.open(u,"_blank","noopener,noreferrer")});
 root.querySelectorAll("[data-book-dlivros]").forEach(b=>b.onclick=()=>openBookOnDlivros(items[Number(b.dataset.bookDlivros)]));
 root.querySelectorAll("[data-book-save]").forEach(b=>b.onclick=()=>{const x=items[Number(b.dataset.bookSave)];toggleBookSaved(x);b.textContent=bookSaved(x)?"✓ Estante":"＋ Estante";b.classList.toggle("saved",bookSaved(x));if(S.booksTab==="library"&&!bookSaved(x))runBookSearch(S.booksQuery)})
}
async function runBookSearch(q=S.booksQuery){const root=$("#bookResults");if(!root)return;S.booksQuery=String(q||"").trim();if(S.booksTab==="library"){const items=bookLibrary();S.bookResults=items;$("#bookResultMeta").textContent=`${items.length} livro(s) na estante`;root.innerHTML=items.length?`<div class="bookGrid">${items.map(bookCardHtml).join("")}</div>`:'<div class="mediaEmpty"><b>Sua estante está vazia.</b>Adicione livros pelos resultados da busca.</div>';if(items.length)bindBookCards(root,items);return}const token=++S.searchToken;root.innerHTML='<div class="loading">Buscando livros…</div>';try{let items=[];if(S.booksTab==="free"){items=dedupeBooks([...(await searchGutendexBooks(S.booksQuery).catch(()=>[])),...(await customBookResults(S.booksQuery).catch(()=>[])).filter(x=>x.publicDomain)])}else{if(S.booksQuery.length<2){root.innerHTML='<div class="mediaEmpty"><b>Pesquise um livro.</b>Use título, autor ou palavra-chave. A aba Grátis também mostra obras em domínio público.</div>';$("#bookResultMeta").textContent="";return}const[ol,gut,custom]=await Promise.all([searchOpenLibraryBooks(S.booksQuery).catch(()=>[]),searchGutendexBooks(S.booksQuery).catch(()=>[]),customBookResults(S.booksQuery).catch(()=>[])]);items=dedupeBooks([...gut,...ol,...custom])}if(token!==S.searchToken)return;S.bookResults=items;$("#bookResultMeta").textContent=`${items.length} resultado(s) • ${S.booksTab==="free"?"Grátis":"Todos os livros"}`;root.innerHTML=items.length?`<div class="bookGrid">${items.map(bookCardHtml).join("")}</div>`:'<div class="mediaEmpty"><b>Nenhum livro encontrado.</b>Tente outro título ou uma fonte JSON.</div>';if(items.length){bindBookCards(root,items);runWhenIdle(()=>hydrateBookFormatsProgressively(items,root))}}catch(e){console.error(e);root.innerHTML='<div class="mediaEmpty"><b>A busca falhou.</b>Confira as fontes de livros.</div>'}}
const BOOK_CATEGORIES=[
 ["romance","Romance"],["biography","Biografias"],["adventure","Ficção e aventura"],
 ["fantasy","Fantasia"],["science fiction","Ficção científica"],["mystery","Policial e mistério"],
 ["poetry","Poesia"],["history","História"],["juvenile literature","Infantojuvenil"]
];
async function booksPage(){
 S.currentPage="books";setActiveNav("books");unlockMobileDocument();scrollPageTop();toggleCategoryMega(false);
 $("#page").classList.remove("searchPage","mangaPageModern","mangaPageV24","musicPageModern");$("#page").classList.add("booksPageModern");
 $("#hero").classList.add("hidden");$("#main").classList.add("hidden");$("#page").classList.remove("hidden");$("#pageTitle").textContent="Livros";
 $("#pageBody").innerHTML=`<div class="mediaHub">
  <div class="mediaHubHero"><div class="mediaHubTitle"><small>LIVROS</small><h2>Livros em português para ler online</h2><p>A pesquisa agora prioriza e filtra edições em português. PDF continua em primeiro lugar quando estiver disponível.</p></div><button type="button" class="mediaSourcesBtn" id="openBookSources">⚙ Fontes</button></div>
  <div class="bookFastHint"><b>Leitura rápida:</b> o ResenhaFlix tenta PDF primeiro; se não existir, abre HTML antes do EPUB para evitar aquela espera longa. EPUB continua disponível e o leitor é pré-carregado em segundo plano.</div>
  <div class="mediaSearchBar"><input id="bookSearchInput" placeholder="O que está procurando?" value="${esc(S.booksQuery)}" autocomplete="off"><button id="bookSearchBtn">Buscar</button></div>
  <div class="bookCategoryStrip" id="bookCategoryStrip">${BOOK_CATEGORIES.map(([q,n])=>`<button type="button" data-book-category="${esc(q)}">${esc(n)}</button>`).join("")}</div>
  <div class="mediaTabs" id="bookTabs"><button data-book-tab="all">Explorar</button><button data-book-tab="free">Grátis</button><button data-book-tab="library">Minha estante</button></div>
  <div class="mediaResultMeta" id="bookResultMeta"></div><div id="bookResults"></div>
 </div>`;
 const input=$("#bookSearchInput"),sync=()=>{$$("#bookTabs [data-book-tab]").forEach(b=>b.classList.toggle("active",b.dataset.bookTab===S.booksTab))};
 $("#openBookSources").onclick=()=>openMediaSources("books");$("#bookSearchBtn").onclick=()=>runBookSearch(input.value);
 input.onkeydown=e=>{if(e.key==="Enter"){runBookSearch(input.value);input.blur()}};
 $$("#bookTabs [data-book-tab]").forEach(b=>b.onclick=()=>{S.booksTab=b.dataset.bookTab;sync();runBookSearch(input.value)});
 $$("#bookCategoryStrip [data-book-category]").forEach(b=>b.onclick=()=>{S.booksTab="all";sync();input.value=b.dataset.bookCategory;S.booksQuery=input.value;runBookSearch(input.value)});
 sync();runBookSearch(S.booksQuery);
 runWhenIdle(()=>ensureEpubJs().catch(()=>{}))
}

let epubLibPromise=null,bookReaderBookObject=null;
function ensureEpubJs(){if(window.ePub)return Promise.resolve(window.ePub);if(epubLibPromise)return epubLibPromise;epubLibPromise=new Promise((resolve,reject)=>{const load=(src,done)=>{const s=document.createElement("script");s.src=src;s.async=true;s.onload=done;s.onerror=()=>reject(new Error("Falha ao carregar leitor EPUB"));document.head.appendChild(s)},next=()=>load("https://cdn.jsdelivr.net/npm/epubjs@0.3.93/dist/epub.min.js",()=>resolve(window.ePub));if(window.JSZip)next();else load("https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js",next)});return epubLibPromise}
function resetBookReader(){if(S.bookReaderRendition){try{S.bookReaderRendition.destroy()}catch{}S.bookReaderRendition=null}if(bookReaderBookObject){try{bookReaderBookObject.destroy()}catch{}bookReaderBookObject=null}$("#bookEpubArea").innerHTML="";$("#bookEpubArea").classList.remove("active");$("#bookHtmlFrame").classList.remove("active");$("#bookHtmlFrame").src="about:blank";$("#bookTextReader").classList.remove("active");$("#bookTextReader").textContent=""}
async function openBookReader(b,forcedChoice=null){const choice=forcedChoice||bestBookRead(b);if(!choice)return b.externalUrl&&window.open(b.externalUrl,"_blank","noopener,noreferrer");S.bookReaderBook=b;resetBookReader();$("#bookReaderTitle").textContent=b.title;$("#bookReaderMeta").textContent=`${b.authors||"Autor não informado"} • ${choice.label}`;$("#bookReaderExternal").onclick=()=>window.open(b.externalUrl||choice.url,"_blank","noopener,noreferrer");$("#bookReaderLoading").textContent="Preparando livro…";$("#bookReaderLoading").classList.remove("hidden");$("#bookReaderModal").classList.add("open");document.body.classList.add("bookReaderOpen");try{if(choice.kind==="epub"){await ensureEpubJs();$("#bookEpubArea").classList.add("active");bookReaderBookObject=ePub(choice.url);S.bookReaderRendition=bookReaderBookObject.renderTo("bookEpubArea",{width:"100%",height:"100%",spread:"none"});await S.bookReaderRendition.display();$("#bookReaderStatus").textContent="EPUB"}else if(choice.kind==="text"){const r=await fetch(choice.url);if(!r.ok)throw Error("Texto "+r.status);$("#bookTextReader").textContent=await r.text();$("#bookTextReader").classList.add("active");$("#bookReaderStatus").textContent="Texto"}else{$("#bookHtmlFrame").src=choice.url;$("#bookHtmlFrame").classList.add("active");$("#bookReaderStatus").textContent=choice.kind.toUpperCase()}$("#bookReaderLoading").classList.add("hidden")}catch(e){console.warn(e);$("#bookReaderLoading").textContent="Não consegui abrir dentro do leitor. Use “Abrir original”."}}
function closeBookReader(){resetBookReader();$("#bookReaderModal").classList.remove("open");document.body.classList.remove("bookReaderOpen")}
function downloadBookChoice(b,d){if(!b?.publicDomain||!d?.url)return toast("Este formato não está liberado para download.");const u=safeHttpUrl(d.url);if(!u)return;const a=document.createElement("a");a.href=u;a.target="_blank";a.rel="noopener noreferrer";a.download="";document.body.appendChild(a);a.click();a.remove()}
function downloadBook(b){const d=bestBookDownload(b);if(!d)return toast("Este livro não possui download liberado.");downloadBookChoice(b,d)}

function openMediaSources(tab="music"){S.mediaSourceTab=tab;$("#audiusApiKey").value=mediaCfg.audiusApiKey||"";$("#audiusApiUrl").value=mediaCfg.audiusApi||MEDIA_DEFAULT.audiusApi;$("#soundcloudProxyUrl").value=mediaCfg.soundcloudProxyUrl||"";$("#musicApiUrl").value=mediaCfg.musicApi;$("#musicJsonUrls").value=mediaCfg.musicJsonUrls;$("#booksOpenLibraryUrl").value=mediaCfg.booksOpenLibrary;$("#booksGutendexUrl").value=mediaCfg.booksGutendex;$("#booksJsonUrls").value=mediaCfg.booksJsonUrls;$$("[data-media-source-tab]").forEach(b=>b.classList.toggle("active",b.dataset.mediaSourceTab===tab));$$("[data-media-source-pane]").forEach(x=>x.classList.toggle("active",x.dataset.mediaSourcePane===tab));$("#mediaSourcesModal").classList.add("open");document.body.classList.add("mediaSourcesOpen")}
function closeMediaSources(){$("#mediaSourcesModal").classList.remove("open");document.body.classList.remove("mediaSourcesOpen")}
function saveMediaSourceSettings(){mediaCfg.audiusApiKey=$("#audiusApiKey").value.trim();mediaCfg.audiusApi=$("#audiusApiUrl").value.trim()||MEDIA_DEFAULT.audiusApi;mediaCfg.soundcloudProxyUrl=$("#soundcloudProxyUrl").value.trim();mediaCfg.musicApi=$("#musicApiUrl").value.trim()||MEDIA_DEFAULT.musicApi;mediaCfg.musicJsonUrls=$("#musicJsonUrls").value.trim();mediaCfg.booksOpenLibrary=$("#booksOpenLibraryUrl").value.trim()||MEDIA_DEFAULT.booksOpenLibrary;mediaCfg.booksGutendex=$("#booksGutendexUrl").value.trim()||MEDIA_DEFAULT.booksGutendex;mediaCfg.booksJsonUrls=$("#booksJsonUrls").value.trim();localStorage.setItem("rf25_audius_key",mediaCfg.audiusApiKey);localStorage.setItem("rf25_audius_api",mediaCfg.audiusApi);localStorage.setItem("rf26_soundcloud_proxy",mediaCfg.soundcloudProxyUrl);audiusSdkClient=null;localStorage.setItem("rf24_music_api",mediaCfg.musicApi);localStorage.setItem("rf24_music_json_urls",mediaCfg.musicJsonUrls);localStorage.setItem("rf24_books_openlibrary",mediaCfg.booksOpenLibrary);localStorage.setItem("rf24_books_gutendex",mediaCfg.booksGutendex);localStorage.setItem("rf24_books_json_urls",mediaCfg.booksJsonUrls);closeMediaSources();toast("Fontes de mídia salvas.")}
async function importJsonFile(kind,file){if(!file)return;const status=$(kind==="music"?"#musicImportStatus":"#booksImportStatus");if(file.size>1.5*1024*1024){status.textContent="Arquivo maior que 1,5 MB.";return}try{const data=JSON.parse(await file.text()),items=genericJsonItems(data);if(!items.length)throw Error("O JSON não contém um array reconhecível.");saveMediaImported(kind,items);status.textContent=`${Math.min(items.length,500)} item(ns) importado(s) e salvo(s) neste dispositivo.`}catch(e){status.textContent=`Erro: ${e.message||"JSON inválido"}`}}
async function page(type,initialCategory="all"){
 if(type==="trending")return trendingPage();
 if(type==="manga")return mangaPage();
 if(type==="music")return musicPage();
 if(type==="books")return booksPage();
 S.currentPage=type;S.pageTypeForCategories=type;S.pageCategory=initialCategory||"all";
 setActiveNav(type);unlockMobileDocument();scrollPageTop();toggleCategoryMega(false);
 $("#page").classList.remove("searchPage","mangaPageModern","mangaPageV24","musicPageModern","booksPageModern","hk-manga-page");
 $("#hero").classList.add("hidden");$("#main").classList.add("hidden");$("#page").classList.remove("hidden");
 const titles={movies:"Filmes",series:"Séries",anime:"Animes",manga:"Mangás",list:"Minha lista"};
 $("#pageTitle").textContent=titles[type]||"Catálogo";
 $("#pageBody").innerHTML='<div class="loading">Carregando...</div>';
 try{
  const allItems=await fetchCatalogPageItems(type,S.pageCategory);
  S.pageItems=type==="list"?allItems:allItems;
  const shown=type==="list"?filterListCategory(allItems,S.pageCategory):allItems;
  $("#pageBody").innerHTML=renderCategoryBar(type,allItems)+`<div id="pageCatalogResults"></div>`;
  renderPageCatalogResults(shown);bindCategoryBar();renderCategoryMega();
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
     <input id="pageSearchInput" placeholder="Buscar filmes, música, mangá, livros..." autocomplete="off" inputmode="search" aria-label="Buscar em todo o ResenhaFlix">
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
function globalSearchMusicHtml(items,q){
 return items.length?`<div class="globalMusicList">${items.slice(0,7).map(musicTrackHtml).join("")}</div>`:'<div class="mediaEmpty">Nenhuma música encontrada.</div>'
}
function globalSearchArtistsHtml(items){
 return items.length?`<div class="musicArtistGrid">${items.slice(0,8).map(musicArtistHtml).join("")}</div>`:'<div class="mediaEmpty">Nenhum artista encontrado.</div>'
}
function globalEngineMangaCard(manga){
 const key=`${manga.connector||"mangadex"}|${manga.id||""}`,cover=safeHttpUrl(manga.cover||"");
 return `<article class="m24Card" data-global-hk-manga="${esc(key)}"><div class="m24Cover" style="background-image:url('${esc(cover)}')"></div><div class="m24CardTitle">${esc(manga.title||"Mangá")}</div><div class="m24CardMeta">${esc(manga.source||"MangaDex")}${manga.year?` • ${esc(manga.year)}`:""}</div><div class="m24Actions"><button type="button" class="find" data-global-hk-open>Capítulos</button></div></article>`
}
function bindGlobalEngineMangaCards(root,items){
 const byKey=new Map(items.map(item=>[`${item.connector||"mangadex"}|${item.id||""}`,item]));
 root.querySelectorAll("[data-global-hk-manga]").forEach(card=>{
  const manga=byKey.get(card.dataset.globalHkManga);if(!manga)return;
  card.querySelector("[data-global-hk-open]")?.addEventListener("click",()=>window.ResenhaMangaEngine?.openManga(manga));
 });
}
function globalSearchMangaHtml(items){
 return items.length?`<div class="globalSearchRow" data-carousel tabindex="0" aria-label="Resultados de mangás; deslize para ver mais">${items.slice(0,12).map(globalEngineMangaCard).join("")}</div>`:'<div class="mediaEmpty">Nenhum mangá encontrado.</div>'
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
 $("#page").classList.add("searchPage");setActiveNav("");ensureSearchShell();
 const displayValue=(sourceId==="pageSearchInput"||sourceId==="search")?raw:q;
 syncSearchField($("#pageSearchInput"),displayValue);
 syncSearchField($("#search"),displayValue);
 if(q.length<2){
  ++S.searchToken;
  S.lastGlobalSearchQuery="";
  $("#searchTabs").innerHTML="";$("#searchMeta").textContent="Pesquisa global";
  $("#searchResultsArea").innerHTML='<div class="mediaEmpty"><b>Pesquise em todo o ResenhaFlix.</b>Filmes, séries, animes, mangás, músicas, artistas e livros aparecem juntos.</div>';
  return
 }
 if(!force&&S.lastGlobalSearchQuery===q&&$("#globalVideos"))return;
 S.lastGlobalSearchQuery=q;
 const token=++S.searchToken;
 S.globalVideoResults=[];S.globalVideosExpanded=false;
 $("#searchTabs").innerHTML="";
 $("#searchMeta").textContent=`Resultados globais para “${q}”`;
 $("#searchResultsArea").innerHTML=`<div class="globalSearchIntro"><div><h2>${esc(q)}</h2><p>Resultados de todas as áreas do ResenhaFlix, carregados em paralelo para a tela responder mais rápido.</p></div></div>
  ${globalSectionShell("globalVideos","Filmes, séries e animes","",{carousel:true,videoToggle:true})}
  ${globalSectionShell("globalMusic","Músicas","SoundCloud • Audius • iTunes")}
  ${globalSectionShell("globalArtists","Artistas")}
  ${globalSectionShell("globalManga","Mangás","",{carousel:true})}
  ${globalSectionShell("globalBooks","Livros")}`;

 const jobs=[
  (async()=>{try{const items=await searchAllCatalogs(q);if(token!==S.searchToken)return;S.globalVideoResults=items;renderGlobalVideoResults()}catch{$("#globalVideos").innerHTML='<div class="globalSearchError">Falha ao buscar vídeos.</div>'}})(),
  (async()=>{try{
    const [sc,aud,it]=await Promise.all([searchSoundCloudProxy(q,"tracks").catch(()=>[]),searchAudiusTracks(q).catch(()=>[]),searchItunes(q,"tracks").catch(()=>[])]);
    if(token!==S.searchToken)return;const items=dedupeMusic([...sc,...aud,...it]);const el=$("#globalMusic");el.innerHTML=globalSearchMusicHtml(items,q);bindMusicResults(el,items)
   }catch{$("#globalMusic").innerHTML='<div class="globalSearchError">Falha ao buscar músicas.</div>'}})(),
  (async()=>{try{
    const [sc,it]=await Promise.all([searchSoundCloudProxy(q,"users").catch(()=>[]),searchItunes(q,"artists").catch(()=>[])]);
    if(token!==S.searchToken)return;const items=dedupeMusic([...sc,...it]);const el=$("#globalArtists");el.innerHTML=globalSearchArtistsHtml(items);bindMusicResults(el,items)
   }catch{$("#globalArtists").innerHTML='<div class="globalSearchError">Falha ao buscar artistas.</div>'}})(),
  (async()=>{
   const el=$("#globalManga");
   try{
    const mangaEngine=window.ResenhaMangaEngine;
    if(!mangaEngine)throw Error("Motor de mangás ainda não carregado");
    const items=await mangaEngine.search(q,{language:"pt-br",source:"all",limit:40});
    if(token!==S.searchToken)return;
    el.innerHTML=globalSearchMangaHtml(items);if(items.length)bindGlobalEngineMangaCards(el,items);initCarousels(el);
   }catch(engineError){
    try{
     const page=await aniListManga(q,1);if(token!==S.searchToken)return;
     const items=(page.media||[]).map(normalizeAniMedia);
     el.innerHTML=items.length?`<div class="globalSearchRow" data-carousel tabindex="0" aria-label="Resultados de mangás; deslize para ver mais">${items.slice(0,12).map(mangaV24Card).join("")}</div>`:'<div class="mediaEmpty">Nenhum mangá encontrado.</div>';
     if(items.length)bindMangaV24Cards(el,items);initCarousels(el);
    }catch{el.innerHTML='<div class="globalSearchError">Falha ao buscar mangás.</div>'}
   }
  })(),
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
 requestAnimationFrame(()=>{try{window.scrollTo({top:0,left:0,behavior:"auto"})}catch{window.scrollTo(0,0)}});
}
function repairTouchState(){
 const body=document.body;
 if(!$("#playerModal").classList.contains("open"))body.classList.remove("playerOpen");
 if(!$("#detailModal").classList.contains("open"))body.classList.remove("detailOpen");
 if(!$("#settingsModal").classList.contains("open"))body.classList.remove("settingsOpen");
 if(!$("#mangaReaderModal").classList.contains("open"))body.classList.remove("mangaReaderOpen");if(!$("#mangaDetailModal").classList.contains("open"))body.classList.remove("mangaDetailOpen");if(!$("#mangaMatchModal").classList.contains("open"))body.classList.remove("mangaMatchOpen");if(!$("#mangaWebModal").classList.contains("open"))body.classList.remove("mangaWebOpen");if(!$("#mangaMarketModal").classList.contains("open"))body.classList.remove("mangaMarketOpen");if(!$("#mediaSourcesModal").classList.contains("open"))body.classList.remove("mediaSourcesOpen");if(!$("#bookReaderModal").classList.contains("open"))body.classList.remove("bookReaderOpen");
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
 const more=$("#mobileNavMore"),moreActive=MOBILE_NAV_IDS.has(target)&&!mobileNavPreferences.includes(target);
 if(more){more.classList.toggle("active",moreActive);if(moreActive)more.setAttribute("aria-current","page");else more.removeAttribute("aria-current")}
}
$("#closeMediaSources").onclick=closeMediaSources;
$("#mediaSourcesModal").onclick=e=>{if(e.target.id==="mediaSourcesModal")closeMediaSources()};
$$("#mediaSourcesModal [data-media-source-tab]").forEach(b=>b.onclick=()=>openMediaSources(b.dataset.mediaSourceTab));
$("#saveMediaSources").onclick=saveMediaSourceSettings;
$("#resetMediaSources").onclick=()=>{mediaCfg.audiusApi=MEDIA_DEFAULT.audiusApi;mediaCfg.audiusApiKey="";mediaCfg.soundcloudProxyUrl="";mediaCfg.musicApi=MEDIA_DEFAULT.musicApi;mediaCfg.musicJsonUrls="";mediaCfg.booksOpenLibrary=MEDIA_DEFAULT.booksOpenLibrary;mediaCfg.booksGutendex=MEDIA_DEFAULT.booksGutendex;mediaCfg.booksJsonUrls="";localStorage.removeItem("rf25_audius_key");localStorage.removeItem("rf25_audius_api");localStorage.removeItem("rf26_soundcloud_proxy");localStorage.removeItem("rf24_music_api");localStorage.removeItem("rf24_music_json_urls");localStorage.removeItem("rf24_books_openlibrary");localStorage.removeItem("rf24_books_gutendex");localStorage.removeItem("rf24_books_json_urls");openMediaSources(S.mediaSourceTab);toast("Fontes padrão restauradas.")};
$("#musicJsonFile").onchange=e=>importJsonFile("music",e.target.files?.[0]);
$("#booksJsonFile").onchange=e=>importJsonFile("books",e.target.files?.[0]);
$("#closeBookReader").onclick=closeBookReader;$("#bookReaderCloseX").onclick=closeBookReader;
$("#bookReaderModal").onclick=e=>{if(e.target.id==="bookReaderModal")closeBookReader()};
$("#bookPrevPage").onclick=()=>{if(S.bookReaderRendition)S.bookReaderRendition.prev()};
$("#bookNextPage").onclick=()=>{if(S.bookReaderRendition)S.bookReaderRendition.next()};
$("#musicMiniClose").onclick=()=>{$("#musicPreviewAudio").pause();$("#musicMiniPlayer").classList.remove("show")};
$("#musicMainPlay").onclick=()=>{
 if(S.musicBackend==="soundcloud"&&S.soundcloudWidget){S.soundcloudPaused?S.soundcloudWidget.play():S.soundcloudWidget.pause();return}
 const a=$("#musicPreviewAudio");if(!a.src)return;a.paused?a.play().catch(()=>{}):a.pause()
};
$("#musicPrev").onclick=()=>musicNext(-1);$("#musicNext").onclick=()=>musicNext(1);
$("#musicShuffle").onclick=()=>{S.musicShuffle=!S.musicShuffle;updateSpotifyPlayer()};
$("#musicRepeat").onclick=()=>{S.musicRepeat=!S.musicRepeat;updateSpotifyPlayer()};
$("#musicVolume").oninput=e=>{const v=Number(e.target.value);$("#musicPreviewAudio").volume=v;if(S.musicBackend==="soundcloud"&&S.soundcloudWidget)try{S.soundcloudWidget.setVolume(Math.round(v*100))}catch{}};
$("#musicSeek").oninput=e=>{
 const ratio=Number(e.target.value)/1000;
 if(S.musicBackend==="soundcloud"&&S.soundcloudWidget&&S.soundcloudDuration){try{S.soundcloudWidget.seekTo(Math.round(ratio*S.soundcloudDuration*1000))}catch{};return}
 const a=$("#musicPreviewAudio");if(isFinite(a.duration)&&a.duration)a.currentTime=ratio*a.duration
};
$("#musicPreviewAudio").addEventListener("timeupdate",updateSpotifyPlayer);
$("#musicPreviewAudio").addEventListener("play",updateSpotifyPlayer);
$("#musicPreviewAudio").addEventListener("pause",updateSpotifyPlayer);
$("#musicPreviewAudio").addEventListener("loadedmetadata",updateSpotifyPlayer);
$("#musicPreviewAudio").addEventListener("ended",()=>{if(S.musicRepeat){$("#musicPreviewAudio").currentTime=0;$("#musicPreviewAudio").play().catch(()=>{})}else musicNext(1)});


$("#logoHome").onclick=()=>{closeTransientUI();home()};
$("#categoriesNavBtn").onclick=e=>{e.stopPropagation();toggleCategoryMega()};
$("#categoryMegaBackdrop").onclick=()=>toggleCategoryMega(false);
$$("#categoryMega [data-category-page]").forEach(b=>b.onclick=()=>{toggleCategoryMega(false);page(b.dataset.categoryPage)});

$$("[data-page]").forEach(b=>b.onclick=()=>{closeTransientUI();setActiveNav(b.dataset.page);if(b.dataset.page==="home")home();else page(b.dataset.page)});
$("#mobileBottomNav").onclick=e=>{
 const destination=e.target.closest("[data-mobile-page]");
 if(destination){navigateMobileDestination(destination.dataset.mobilePage);return}
 if(e.target.closest("[data-mobile-more]"))openMobileNavMenu();
};
$("#mobileNavMenuBackdrop").onclick=()=>closeMobileNavMenu();
$("#mobileNavMenuClose").onclick=()=>closeMobileNavMenu();
$("#mobileNavEditToggle").onclick=()=>{mobileNavEditorOpen=!mobileNavEditorOpen;renderMobileNavMenu()};
$("#mobileNavMenu").onclick=e=>{
 const destination=e.target.closest("[data-mobile-destination]");
 if(destination){navigateMobileDestination(destination.dataset.mobileDestination);return}
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
 search(S.searchQuery||"",false);
 requestAnimationFrame(()=>{
  const input=$("#pageSearchInput");
  if(input){
   try{input.focus({preventScroll:true})}catch{input.focus()}
   const n=input.value.length;
   try{input.setSelectionRange(n,n)}catch{}
  }
 });
}
function closeMobileSearch(){mobileSearchPanel.classList.remove("open");mobileSearchInput.blur()}
$("#mobileSearchBtn").onclick=openMobileSearch;
$("#mobileSearchClose").onclick=closeMobileSearch;
let mobileSearchTimer;
mobileSearchInput.addEventListener("keydown",e=>{
 if(e.key==="Enter"){
  e.preventDefault();
  search(e.target.value,true);
  closeMobileSearch();
 }
 if(e.key==="Escape")closeMobileSearch();
});
$("#closeMangaReader").onclick=closeMangaReader;
$("#closeMangaWeb").onclick=closeMangaWeb;
$("#mangaWebModal").onclick=e=>{if(e.target.id==="mangaWebModal")closeMangaWeb()};
$("#closeMangaMatch").onclick=closeMangaMatch;
$("#mangaMatchModal").onclick=e=>{if(e.target.id==="mangaMatchModal")closeMangaMatch()};
$("#closeMangaDetail").onclick=closeMangaDetail;
$("#mangaDetailModal").onclick=e=>{if(e.target.id==="mangaDetailModal")closeMangaDetail()};
$("#mangaContinueRead").onclick=()=>{if(!S.mangaChapters.length)return;const last=S.mangaChapters.slice().reverse().find(c=>getChapterProgress(c)?.percent>0&&!getChapterProgress(c)?.completed);openNativeChapter(last||S.mangaChapters[0])};
$("#mangaSaveNative").onclick=toggleNativeMangaSave;
$("#mangaWhereBuy").onclick=()=>openMangaMarket("buy");
$("#mangaWhereFree").onclick=()=>openMangaMarket("free");
$("#closeMangaMarket").onclick=closeMangaMarket;
$("#mangaMarketModal").onclick=e=>{if(e.target.id==="mangaMarketModal")closeMangaMarket()};
$$("#mangaMarketModal [data-market-tab]").forEach(b=>b.onclick=()=>renderMangaMarket(b.dataset.marketTab));
$("#mangaChapterFilter").oninput=renderMangaChapterList;
$("#mangaChapterOrder").onclick=()=>{S.mangaChapterOrder=S.mangaChapterOrder==="desc"?"asc":"desc";renderMangaChapterList()};
$("#mangaReaderSettingsBtn").onclick=()=>{$("#nativeReaderSettings").classList.toggle("open");showReaderUi(true)};
$("#closeMangaReaderSettings").onclick=()=>{$("#nativeReaderSettings").classList.remove("open");showReaderUi()};
$("#mangaReaderMode").onchange=e=>{const p=readerPrefs();p.mode=e.target.value;saveMangaReaderPrefs(p);applyNativeReaderPrefs();if(p.mode==="vertical")observeVerticalPages()};
$("#mangaReaderFit").onchange=e=>{const p=readerPrefs();p.fit=e.target.value;saveMangaReaderPrefs(p);applyNativeReaderPrefs()};
$("#mangaReaderGap").onchange=e=>{const p=readerPrefs();p.gap=e.target.value;saveMangaReaderPrefs(p);applyNativeReaderPrefs()};
$("#mangaReaderBrightness").oninput=e=>{const p=readerPrefs();p.brightness=Number(e.target.value);saveMangaReaderPrefs(p);applyNativeReaderPrefs()};
$("#mangaReaderRestart").onclick=()=>{S.mangaReaderPageIndex=0;$("#mangaReaderCanvas").scrollTop=0;updatePagedReader();showReaderUi()};
$("#mangaPrevPage").onclick=()=>readerNextPage(-1);$("#mangaNextPage").onclick=()=>readerNextPage(1);
$("#mangaPrevChapter").onclick=()=>nextNativeChapter(-1);$("#mangaNextChapter").onclick=()=>nextNativeChapter(1);
$("#mangaReaderCanvas").onclick=e=>{if(e.target.closest(".nativeReaderTapZone"))return;showReaderUi()};
$("#mangaReaderModal").onclick=e=>{if(e.target.id==="mangaReaderModal")closeMangaReader()};
$("#closeDetail").onclick=()=>{$("#detailModal").classList.remove("open");document.body.classList.remove("detailOpen");unlockMobileDocument()};
$("#closePlayer").onclick=()=>{$("#playerSide")?.classList.remove("drawerOpen");$("#sourcePanelBackdrop")?.classList.remove("open");$("#skipIntroBtn").classList.remove("show");stopSourceAttempt();clearPlaybackStallMonitor();persistPlaybackProgress(true);clearTimeout(S._ctlTimer);$("#playerMenu").classList.remove("open");$("#playerMenuBackdrop").classList.remove("open");S.playerMenuKind=null;resetVideo();$("#playerModal").classList.remove("open");document.body.classList.remove("playerOpen")};
$("#bigPlay").onclick=togglePlayback;$("#playPause").onclick=togglePlayback;
$("#back10").onclick=()=>{$("#video").currentTime=Math.max(0,$("#video").currentTime-10);showPlayerUI()};
$("#forward10").onclick=()=>{const v=$("#video");v.currentTime=Math.min(v.duration||Infinity,v.currentTime+10);showPlayerUI()};
$("#muteBtn").onclick=()=>{const v=$("#video");v.muted=!v.muted;$("#muteBtn").textContent=v.muted?"🔇":"🔊";showPlayerUI()};
$("#volume").oninput=e=>{const v=$("#video");v.volume=Number(e.target.value);v.muted=v.volume===0;$("#muteBtn").textContent=v.muted?"🔇":"🔊";showPlayerUI()};
$("#speed").onchange=e=>{$("#video").playbackRate=Number(e.target.value);showPlayerUI()};
$("#seek").oninput=e=>{const v=$("#video"),n=Number(e.target.value);e.target.style.setProperty("--seek-fill",`${n/10}%`);if(isFinite(v.duration)&&v.duration)v.currentTime=n/1000*v.duration;showPlayerUI()};
$("#fullBtn").onclick=()=>{const el=$("#videoShell");if(!document.fullscreenElement)el.requestFullscreen?.();else document.exitFullscreen?.();showPlayerUI()};
$("#pipBtn").onclick=async()=>{const v=$("#video");try{if(document.pictureInPictureElement)await document.exitPictureInPicture();else if(document.pictureInPictureEnabled)await v.requestPictureInPicture()}catch{toast("Picture-in-Picture não disponível neste navegador.")}showPlayerUI()};
$("#downloadCurrent").onclick=()=>S.selectedStream?browserDownload(S.selectedStream):toast("Escolha uma fonte primeiro.");
$("#skipIntroBtn").onclick=skipIntro;
$("#sourceToolsToggle").onclick=()=>{S.sourceToolsOpen=!S.sourceToolsOpen;$("#sourceTools").classList.toggle("open",S.sourceToolsOpen);$("#sourceToolsToggle").classList.toggle("active",S.sourceToolsOpen)};
function setSourceDrawer(open){$("#playerSide").classList.toggle("drawerOpen",!!open);$("#sourcePanelBackdrop").classList.toggle("open",!!open);showPlayerUI(!!open)}
function setPlayerSideTab(tab){
 S.playerSideTab=tab;
 $$(".playerSideTab").forEach(b=>b.classList.toggle("active",b.dataset.sideTab===tab));
 $("#playerSidePanelFontes").hidden=tab!=="fontes";
 $("#playerSidePanelEpisodes").hidden=tab!=="episodios";
 if(tab==="episodios")renderPlayerEpisodes();
}
$$(".playerSideTab").forEach(b=>b.onclick=()=>setPlayerSideTab(b.dataset.sideTab));
$("#sourceDrawerHandle").onclick=()=>{const opening=!$("#playerSide").classList.contains("drawerOpen");if(opening)setPlayerSideTab("fontes");setSourceDrawer(opening)};
$("#sourcePanelBackdrop").onclick=()=>setSourceDrawer(false);
$("#primeSourceBtn").onclick=()=>{const opening=!$("#playerSide").classList.contains("drawerOpen");if(opening)setPlayerSideTab("fontes");setSourceDrawer(opening)};
$("#episodesBtn").onclick=()=>{setPlayerSideTab("episodios");setSourceDrawer(true)};
$("#centerPlay").onclick=togglePlayback;
$("#centerBack10").onclick=()=>{$("#video").currentTime=Math.max(0,$("#video").currentTime-10);showPlayerUI()};
$("#centerForward10").onclick=()=>{const v=$("#video");v.currentTime=Math.min(v.duration||Infinity,v.currentTime+10);showPlayerUI()};
$("#primeNextFloat").onclick=()=>{persistPlaybackProgress(true);if(S.currentShow&&S.nextEpisode){const carry=nextEpisodeCarry();playEpisode(S.currentShow,S.nextEpisode,carry)}};
$("#otherPlayerBtn").onclick=()=>openOtherPlayerMenu(S.selectedStream);
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
updateAspectButton();updateAutoFallbackButton();
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
let playerMoveRAF=0;
$("#videoShell").addEventListener("mousemove",()=>{
 if(playerMoveRAF)return;
 playerMoveRAF=requestAnimationFrame(()=>{playerMoveRAF=0;showPlayerUI()});
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
$("#settingsBtn").onclick=()=>{$("#frostUrl").value=cfg.frost;$("#metaUrl").value=cfg.meta;$("#catalogUrls").value=cfg.catalogs;$("#subtitleAddon").value=cfg.subtitleAddon;$("#audioPref").value=cfg.audioPref;$("#subtitlePref").value=cfg.subtitlePref;$("#mangaRepoUrls").value=cfg.mangaRepos;$("#mangaBridgeUrl").value=cfg.mangaBridge;$("#corsProxyUrl").value=localStorage.getItem("rf40_cors_proxy")||"";$("#lang").value=cfg.lang;$("#settingsModal").classList.add("open");document.body.classList.add("settingsOpen");openSettingsTab("geral")};
$("#closeSettings").onclick=()=>{$("#settingsModal").classList.remove("open");document.body.classList.remove("settingsOpen");unlockMobileDocument()};
$("#saveSettings").onclick=()=>{cfg.frost=$("#frostUrl").value.trim()||CFG_DEFAULT.frost;cfg.meta=$("#metaUrl").value.trim()||CFG_DEFAULT.meta;cfg.catalogs=$("#catalogUrls").value.trim()||CFG_DEFAULT.catalogs;cfg.subtitleAddon=$("#subtitleAddon").value.trim()||CFG_DEFAULT.subtitleAddon;cfg.audioPref=$("#audioPref").value;cfg.subtitlePref=$("#subtitlePref").value;cfg.mangaRepos=$("#mangaRepoUrls").value.trim()||CFG_DEFAULT.mangaRepos;cfg.mangaBridge=$("#mangaBridgeUrl").value.trim();cfg.lang=$("#lang").value;localStorage.setItem("cf2_frost",cfg.frost);localStorage.setItem("cf2_meta",cfg.meta);localStorage.setItem("cf4_catalogs",cfg.catalogs);localStorage.setItem("cf5_subtitle_addon",cfg.subtitleAddon);localStorage.setItem("cf5_audio_pref",cfg.audioPref);localStorage.setItem("cf5_subtitle_pref",cfg.subtitlePref);localStorage.setItem("rf15_manga_repos",cfg.mangaRepos);localStorage.setItem("rf14_manga_bridge",cfg.mangaBridge);localStorage.setItem("rf40_cors_proxy",($("#corsProxyUrl")?.value||"").trim());localStorage.setItem("cf2_lang",cfg.lang);S.manifestCache.clear();S.catalogCache.clear();$("#settingsModal").classList.remove("open");document.body.classList.remove("settingsOpen");toast("Configurações salvas.");home()};
function openSettingsTab(name="geral"){
 $$("#settingsTabs [data-settings-tab]").forEach(b=>b.classList.toggle("active",b.dataset.settingsTab===name));
 $$("#settingsBody [data-settings-pane]").forEach(p=>p.classList.toggle("active",p.dataset.settingsPane===name));
 $("#settingsBody").scrollTop=0;
}
$$("[data-settings-tab]").forEach(b=>b.onclick=()=>openSettingsTab(b.dataset.settingsTab));
$("#resetSettings").onclick=()=>{$("#frostUrl").value=CFG_DEFAULT.frost;$("#metaUrl").value=CFG_DEFAULT.meta;$("#catalogUrls").value=CFG_DEFAULT.catalogs;$("#subtitleAddon").value=CFG_DEFAULT.subtitleAddon;$("#audioPref").value=CFG_DEFAULT.audioPref;$("#subtitlePref").value=CFG_DEFAULT.subtitlePref;$("#mangaRepoUrls").value=CFG_DEFAULT.mangaRepos;$("#mangaBridgeUrl").value=CFG_DEFAULT.mangaBridge;if($("#corsProxyUrl"))$("#corsProxyUrl").value="";$("#lang").value=CFG_DEFAULT.lang};
let scrollRAF=0,scrollEndTimer=0;
window.addEventListener("scroll",()=>{
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
 window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js?v=36",{updateViaCache:"none"}).catch(e=>console.warn("Service Worker",e)));
}
window.addEventListener("scroll",()=>hideCardPreview(),{passive:true,capture:true});
window.addEventListener("resize",()=>hideCardPreview());
home();
