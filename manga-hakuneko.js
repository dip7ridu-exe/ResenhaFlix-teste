/*
 * ResenhaFLIX Manga Engine v34
 *
 * Arquitetura inspirada no fluxo do HakuNeko:
 * connector -> manga -> chapters -> pages -> download job.
 */
(() => {
  "use strict";

  const VERSION = "34.0.0";
  const OFFICIAL_BRIDGE = "https://resenhaflix-production.up.railway.app";
  const KEYS = {
    library: "rf_hk_library_v1",
    progress: "rf_hk_progress_v1",
    preferences: "rf_hk_preferences_v1",
    query: "rf_hk_last_query_v1",
    language: "rf_hk_language_v1",
    downloads: "rf_hk_download_history_v1",
    source: "rf_hk_source_v1",
    bridge: "rf14_manga_bridge",
    bridgeDisabled: "rf_hk_bridge_disabled_v1"
  };
  function sourcePreference(value) {
    const source = String(value || "");
    return ["all", "mangadex", "bridge"].includes(source) || /^bridge:[a-z0-9-]+$/i.test(source) ? source : "all";
  }
  const state = {
    tab: "explore",
    query: localStorage.getItem(KEYS.query) || "",
    language: localStorage.getItem(KEYS.language) || "pt-br",
    source: sourcePreference(localStorage.getItem(KEYS.source)),
    results: [],
    resultMap: new Map(),
    requestId: 0,
    currentManga: null,
    currentChapters: [],
    currentChapter: null,
    pages: [],
    pageIndex: 0,
    readerObserver: null,
    uiTimer: 0,
    saveTimer: 0,
    downloads: readStorage(KEYS.downloads, []).slice(0, 20),
    bridgeStatus: "checking",
    bridgeRetryTimer: 0,
    bridgeRetryAttempt: 0,
    bridgeCheckToken: 0,
    bridgeHealthController: null,
    sourceReport: null,
    bridgeSourceReports: []
  };

  function normalizeBridgeURL(value = "") {
    const raw = String(value || "").trim().replace(/\/+$/, "");
    if (!raw) return "";
    try {
      const url = new URL(raw);
      if (url.protocol === "https:" || ((url.hostname === "localhost" || url.hostname === "127.0.0.1") && url.protocol === "http:")) return url.origin + url.pathname.replace(/\/+$/, "");
    } catch {}
    return "";
  }
  const queryBridge = (() => {
    try { return normalizeBridgeURL(new URLSearchParams(location.search).get("mangaBridge")); }
    catch { return ""; }
  })();
  if (queryBridge) {
    localStorage.setItem(KEYS.bridge, queryBridge);
    localStorage.removeItem(KEYS.bridgeDisabled);
    try { if (typeof cfg !== "undefined") cfg.mangaBridge = queryBridge; } catch {}
  }
  function isOfficialSite() {
    try { return String(location.hostname || "").toLowerCase() === "dip7ridu-exe.github.io"; }
    catch { return false; }
  }
  function bridgeBase() {
    const configured = normalizeBridgeURL(localStorage.getItem(KEYS.bridge) || "");
    if (configured) return configured;
    return isOfficialSite() && localStorage.getItem(KEYS.bridgeDisabled) !== "1" ? OFFICIAL_BRIDGE : "";
  }
  function bridgeReady() { return Boolean(bridgeBase() && state.bridgeStatus === "ready"); }
  function cancelBridgeHealthActivity() {
    state.bridgeCheckToken++;
    try { state.bridgeHealthController?.abort(); } catch {}
    state.bridgeHealthController = null;
    if (state.bridgeRetryTimer) clearTimeout(state.bridgeRetryTimer);
    state.bridgeRetryTimer = 0;
    state.bridgeRetryAttempt = 0;
  }
  function saveBridge(value) {
    const normalized = normalizeBridgeURL(value);
    if (value && !normalized) throw new Error("Use uma URL HTTPS valida para o Manga Bridge");
    cancelBridgeHealthActivity();
    if (normalized) {
      localStorage.setItem(KEYS.bridge, normalized);
      localStorage.removeItem(KEYS.bridgeDisabled);
    } else {
      localStorage.removeItem(KEYS.bridge);
      localStorage.setItem(KEYS.bridgeDisabled, "1");
      if (state.source === "bridge" || state.source.startsWith("bridge:")) {
        state.source = "mangadex";
        localStorage.setItem(KEYS.source, state.source);
      }
    }
    try { if (typeof cfg !== "undefined") cfg.mangaBridge = normalized; } catch {}
    state.bridgeStatus = normalized ? "checking" : "off";
    state.bridgeHealth = normalized ? null : { disabled: true };
    try { updateSourceSelector(); updateEngineStatus(); } catch {}
    return normalized;
  }
  function bridgeURL(path) {
    const base = bridgeBase();
    if (!base) throw new Error("Manga Bridge ainda nao foi configurado");
    return base + (String(path).startsWith("/") ? path : "/" + path);
  }
  function bridgeShareURL() {
    const base = bridgeBase();
    if (!base) return "";
    try {
      const url = new URL(location.href);
      url.searchParams.set("mangaBridge", base);
      url.hash = "";
      return url.toString();
    } catch { return ""; }
  }

  function readStorage(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value == null ? fallback : value;
    } catch {
      return fallback;
    }
  }
  function writeStorage(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (error) { console.warn("ResenhaFLIX Manga storage", error); }
  }
  function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
  }
  function normalize(value = "") {
    return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
      .replace(/[^a-z0-9]+/g, " ").trim();
  }
  const MANGA_TITLE_OVERRIDES = new Map([
    ["596191eb-69ee-4401-983e-cc07e277fa17", {
      title: "Lookism", altTitle: "Aparências", search: "Lookism",
      aliases: ["Lookism", "Aparências", "Aparencias", "Oemo Jisangjuui", "Oemojisangjuui", "외모지상주의"]
    }]
  ]);
  function uniqueTitles(values = []) {
    const seen = new Set();
    return values.map(value => String(value || "").replace(/\s+/g, " ").trim()).filter(value => {
      const key = normalize(value);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  function mangaTitleInfo(attributes = {}, mangaId = "") {
    const titles = attributes.title || {};
    const localizedAliases = (attributes.altTitles || []).flatMap(item => Object.entries(item || {}));
    const aliases = uniqueTitles(localizedAliases.map(([, value]) => value));
    const override = MANGA_TITLE_OVERRIDES.get(String(mangaId || ""));
    if (override) return {
      title: override.title, altTitle: override.altTitle,
      aliases: uniqueTitles([...override.aliases, ...aliases, ...Object.values(titles)])
    };
    const aliasFor = (...languages) => localizedAliases.find(([language, value]) => languages.includes(String(language).toLowerCase()) && value)?.[1] || "";
    const title = aliasFor("pt-br", "pt") || titles["pt-br"] || titles.pt || aliasFor("en") ||
      titles.en || titles.ja || Object.values(titles)[0] || aliases[0] || "Mangá";
    const altTitle = uniqueTitles([
      titles["pt-br"], titles.pt, aliasFor("pt-br", "pt"), titles.en, aliasFor("en"),
      ...Object.values(titles), ...aliases
    ]).find(value => normalize(value) !== normalize(title)) || "";
    return { title, altTitle, aliases };
  }
  function canonicalMangaQuery(query = "") {
    const key = normalize(query);
    if (!key) return "";
    for (const override of MANGA_TITLE_OVERRIDES.values()) {
      if (override.aliases.some(alias => normalize(alias) === key)) return override.search || override.title;
    }
    return String(query).trim();
  }
  function safeImageURL(value = "") {
    try {
      const url = new URL(String(value || ""), typeof location !== "undefined" ? location.href : "https://invalid.local/");
      return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
    } catch { return ""; }
  }
  function safeCSSUrl(value = "") { return safeImageURL(value).replace(/["'()\\\n\r]/g, ""); }
  function chapterLabel(chapter) {
    const number = chapter?.number && chapter.number !== "none" ? chapter.number : "?";
    const title = chapter?.title ? " — " + chapter.title : "";
    const volume = chapter?.volume ? "Vol. " + chapter.volume + " · " : "";
    return `${volume}Capitulo ${number}${title}`;
  }
  function languageLabel(language) {
    return ({ "pt-br": "PT-BR", en: "Ingles", "es-la": "Espanhol", ja: "Japones", all: "Todos" })[language]
      || String(language || "Outro").toUpperCase();
  }
  function statusLabel(status) {
    return ({ ongoing: "Em andamento", completed: "Completo", hiatus: "Em hiato", cancelled: "Cancelado" })[status] || "Manga";
  }
  function formatDate(value) {
    if (!value) return "";
    try { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(value)); }
    catch { return ""; }
  }
  function smartScore(manga, query) {
    const wanted = normalize(query);
    if (!wanted) return Number(manga.followedCount || 0);
    const candidates = [manga.title, manga.altTitle, ...(manga.aliases || [])].map(normalize).filter(Boolean);
    let score = 0;
    for (const candidate of candidates) {
      if (candidate === wanted) score = Math.max(score, 10000);
      else if (candidate.startsWith(wanted)) score = Math.max(score, 8000 - candidate.length);
      else if (candidate.includes(wanted)) score = Math.max(score, 6500 - candidate.length);
      else {
        const wantedTokens = new Set(wanted.split(" "));
        const candidateTokens = new Set(candidate.split(" "));
        let intersection = 0;
        for (const token of wantedTokens) if (candidateTokens.has(token)) intersection++;
        score = Math.max(score, intersection * 900 / Math.max(1, wantedTokens.size));
      }
    }
    const portugueseSourceBonus = state.language === "pt-br" && manga.connector === "bridge" ? 2500 : 0;
    return score + portugueseSourceBonus + Math.min(500, Number(manga.followedCount || 0) / 1000);
  }
  async function fetchJSON(url, options = {}, timeout = 12000) {
    const controller = new AbortController();
    const externalSignal = options.signal;
    let timedOut = false;
    const relayAbort = () => controller.abort();
    if (externalSignal?.aborted) relayAbort();
    else externalSignal?.addEventListener?.("abort", relayAbort, { once: true });
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeout);
    const { signal: _externalSignal, ...requestOptions } = options;
    try {
      const response = await fetch(url, {
        ...requestOptions,
        signal: controller.signal,
        headers: { Accept: "application/json", ...(options.headers || {}) }
      });
      if (!response.ok) {
        const httpError = new Error("Servidor respondeu HTTP " + response.status);
        httpError.code = "HTTP_ERROR";
        httpError.status = response.status;
        throw httpError;
      }
      return await response.json();
    } catch (error) {
      if (error?.name === "AbortError") {
        const cancelled = Boolean(externalSignal?.aborted && !timedOut);
        const abortError = new Error(cancelled ? "Operacao cancelada" : "A fonte demorou demais para responder");
        abortError.code = cancelled ? "ABORTED" : "TIMEOUT";
        abortError.cause = error;
        throw abortError;
      }
      if (error instanceof TypeError && /fetch|network|load/i.test(error.message || "")) {
        const friendly = new Error("O navegador bloqueou a conexao com a fonte");
        friendly.code = "NETWORK_BLOCKED";
        friendly.cause = error;
        throw friendly;
      }
      throw error;
    } finally {
      clearTimeout(timer);
      externalSignal?.removeEventListener?.("abort", relayAbort);
    }
  }

  function bridgeFailureMessage(error) {
    const message = String(error?.message || "Falha de conexao");
    if (error?.code === "NETWORK_BLOCKED") {
      return "O Bridge nao respondeu neste navegador. Em desenvolvimento, confirme se o PC usa http://localhost e se o servidor permite essa origem.";
    }
    if (/HTTP 403|HTTP 401/i.test(message)) return "O Bridge recusou esta origem. Revise ALLOWED_ORIGIN no servidor.";
    if (/HTTP 404/i.test(message)) return "A URL configurada nao parece ser um Manga Bridge (endpoint /api/health ausente).";
    return message;
  }
  function markBridgeOffline(error) {
    state.bridgeStatus = "offline";
    state.bridgeHealth = { error: bridgeFailureMessage(error), rawError: String(error?.message || "") };
    try { updateEngineStatus(); updateSourceSelector(); } catch {}
  }
  function isBridgeTransportFailure(error) {
    return error?.code === "NETWORK_BLOCKED" || error?.code === "TIMEOUT";
  }
  function bridgeRetryAllowed() {
    if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
    return typeof document === "undefined" || document.visibilityState !== "hidden";
  }
  function scheduleBridgeRetry({ immediate = false } = {}) {
    if (typeof document === "undefined" || !bridgeBase() || state.bridgeRetryTimer || state.bridgeStatus === "ready") return;
    const delays = [18000, 60000, 300000];
    const delay = immediate ? 250 : delays[Math.min(state.bridgeRetryAttempt++, delays.length - 1)];
    state.bridgeRetryTimer = window.setTimeout(async () => {
      state.bridgeRetryTimer = 0;
      if (!document.getElementById("hkEngineStatus") || state.bridgeStatus === "ready") return;
      if (!bridgeRetryAllowed()) { scheduleBridgeRetry(); return; }
      await checkBridgeStatus({ retry: true });
      updateEngineStatus();
      if (state.bridgeStatus === "ready" && state.tab === "explore") loadExplore();
    }, delay);
  }
  function revalidateBridgeAfterTransportFailure(error, requestBase = bridgeBase()) {
    if (!isBridgeTransportFailure(error) || !requestBase || requestBase !== bridgeBase()) return;
    markBridgeOffline(error);
    scheduleBridgeRetry({ immediate: true });
  }
  function resumeBridgeRetry() {
    if (!bridgeBase() || state.bridgeStatus === "ready" || !bridgeRetryAllowed()) return;
    if (state.bridgeRetryTimer) clearTimeout(state.bridgeRetryTimer);
    state.bridgeRetryTimer = 0;
    scheduleBridgeRetry({ immediate: true });
  }
  if (typeof window !== "undefined" && typeof window.addEventListener === "function") window.addEventListener("online", resumeBridgeRetry);
  if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") resumeBridgeRetry(); });
  }

  class MangaConnector {
    constructor(id, label) { this.id = id; this.label = label; }
    async search() { throw new Error("Busca nao implementada"); }
    async manga() { throw new Error("Detalhes nao implementados"); }
    async chapters() { throw new Error("Capitulos nao implementados"); }
    async pages() { throw new Error("Paginas nao implementadas"); }
  }

  class MangaDexConnector extends MangaConnector {
    constructor() {
      super("mangadex", "MangaDex");
      this.apiBase = "https://api.mangadex.org";
      this.uploadBase = "https://uploads.mangadex.org";
    }
    async bridgeGet(path, parameters = {}, timeout = 15000) {
      const requestBase = bridgeBase();
      if (!requestBase) throw new Error("Manga Bridge ainda nao foi configurado");
      const url = new URL(requestBase + (String(path).startsWith("/") ? path : "/" + path));
      for (const [key, value] of Object.entries(parameters)) if (value != null && value !== "") url.searchParams.set(key, String(value));
      try { return await fetchJSON(url, {}, timeout); }
      catch (error) {
        revalidateBridgeAfterTransportFailure(error, requestBase);
        throw error;
      }
    }
    buildURL(path, parameters = {}) {
      const url = new URL(path, this.apiBase);
      for (const [key, raw] of Object.entries(parameters)) {
        if (raw == null || raw === "") continue;
        for (const value of (Array.isArray(raw) ? raw : [raw])) url.searchParams.append(key, String(value));
      }
      return url;
    }
    mapManga(resource) {
      const attributes = resource?.attributes || {};
      const relationships = resource?.relationships || [];
      const cover = relationships.find(item => item.type === "cover_art")?.attributes?.fileName || "";
      const author = relationships.find(item => item.type === "author")?.attributes?.name || "";
      const { title, altTitle, aliases } = mangaTitleInfo(attributes, resource.id);
      const descriptions = attributes.description || {};
      return {
        id: resource.id,
        connector: this.id,
        source: this.label,
        title,
        altTitle,
        aliases,
        description: descriptions["pt-br"] || descriptions.en || Object.values(descriptions)[0] || "Sem sinopse disponivel.",
        cover: cover ? `${this.uploadBase}/covers/${resource.id}/${cover}.512.jpg` : "",
        originalCover: cover ? `${this.uploadBase}/covers/${resource.id}/${cover}` : "",
        status: attributes.status || "",
        year: attributes.year || "",
        demographic: attributes.publicationDemographic || "",
        contentRating: attributes.contentRating || "safe",
        availableLanguages: attributes.availableTranslatedLanguages || [],
        tags: (attributes.tags || []).map(tag => tag.attributes?.name?.["pt-br"] || tag.attributes?.name?.en).filter(Boolean),
        author,
        followedCount: attributes.followedCount || 0
      };
    }
    async search(query = "", options = {}) {
      const language = options.language || "pt-br";
      if (bridgeReady()) {
        try {
          const payload = await this.bridgeGet("/api/v2/manga/search", {
            query, language, limit: Math.min(40, Math.max(1, Number(options.limit || 30)))
          });
          const items = (payload.items || []).map(item => ({ ...item, connector: this.id, tags: (item.tags || []).filter(Boolean) }));
          items.sort((a, b) => smartScore(b, query) - smartScore(a, query));
          return items;
        } catch {}
      }
      const parameters = {
        limit: Math.min(48, Math.max(1, Number(options.limit || 30))),
        offset: 0,
        "includes[]": ["cover_art", "author", "artist"],
        "contentRating[]": ["safe", "suggestive"],
        hasAvailableChapters: true
      };
      if (query) {
        parameters.title = canonicalMangaQuery(query);
        parameters["order[relevance]"] = "desc";
      } else parameters["order[followedCount]"] = "desc";
      if (language !== "all") parameters["availableTranslatedLanguage[]"] = [language];
      const payload = await fetchJSON(this.buildURL("/manga", parameters));
      const items = (payload.data || []).map(resource => this.mapManga(resource));
      items.sort((a, b) => smartScore(b, query) - smartScore(a, query));
      return items;
    }
    async manga(id) {
      if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Identificador de manga invalido");
      if (bridgeReady()) {
        try { return await this.bridgeGet("/api/v2/manga/" + id, {}, 15000); }
        catch {}
      }
      const payload = await fetchJSON(this.buildURL("/manga/" + id, { "includes[]": ["cover_art", "author", "artist"] }));
      return this.mapManga(payload.data);
    }
    async chapters(mangaId, options = {}) {
      if (!/^[0-9a-f-]{36}$/i.test(mangaId)) throw new Error("Identificador de manga invalido");
      const language = options.language || "pt-br";
      if (bridgeReady()) {
        try {
          const payload = await this.bridgeGet("/api/v2/manga/" + mangaId + "/chapters", { language }, 20000);
          return payload.chapters || [];
        } catch {}
      }
      const all = [];
      const limit = 100;
      let offset = 0;
      let total = 1;
      while (offset < total && offset < 2000) {
        const parameters = {
          manga: mangaId,
          limit,
          offset,
          "includes[]": ["scanlation_group"],
          "contentRating[]": ["safe", "suggestive"],
          "order[publishAt]": "desc"
        };
        if (language !== "all") parameters["translatedLanguage[]"] = [language];
        const payload = await fetchJSON(this.buildURL("/chapter", parameters), {}, 15000);
        total = Number(payload.total || 0);
        all.push(...(payload.data || []));
        offset += limit;
        if (!(payload.data || []).length) break;
      }
      const mapped = all.filter(resource => Number(resource.attributes?.pages || 0) > 0 && !resource.attributes?.externalUrl)
        .map(resource => {
          const attributes = resource.attributes || {};
          const group = resource.relationships?.find(item => item.type === "scanlation_group")?.attributes?.name || "";
          return {
            id: resource.id,
            mangaId,
            connector: this.id,
            number: attributes.chapter || "none",
            volume: attributes.volume || "",
            title: attributes.title || "",
            language: attributes.translatedLanguage || "",
            pageCount: Number(attributes.pages || 0),
            publishedAt: attributes.publishAt || attributes.readableAt || "",
            group
          };
        });
      const unique = new Map(mapped.filter(chapter => chapter.id).map(chapter => [chapter.id, chapter]));
      return [...unique.values()].sort((a, b) => {
        const volumeA = Number.parseFloat(a.volume || 0);
        const volumeB = Number.parseFloat(b.volume || 0);
        const chapterA = Number.parseFloat(a.number || -1);
        const chapterB = Number.parseFloat(b.number || -1);
        return volumeB - volumeA || chapterB - chapterA || String(b.publishedAt).localeCompare(String(a.publishedAt));
      });
    }
    async pages(chapterId, options = {}) {
      if (!/^[0-9a-f-]{36}$/i.test(chapterId)) throw new Error("Identificador de capitulo invalido");
      if (bridgeReady()) {
        try {
          const payload = await this.bridgeGet("/api/v2/chapter/" + chapterId + "/pages", {
            quality: options.quality === "original" ? "original" : "data-saver"
          }, 20000);
          return payload.pages || [];
        } catch {}
      }
      const payload = await fetchJSON(this.buildURL("/at-home/server/" + chapterId), {}, 15000);
      const chapter = payload.chapter || {};
      const original = options.quality === "original";
      const files = original ? chapter.data : chapter.dataSaver;
      const folder = original ? "data" : "data-saver";
      if (!payload.baseUrl || !chapter.hash || !Array.isArray(files) || !files.length) {
        throw new Error("A fonte nao retornou paginas para este capitulo");
      }
      return files.map((file, index) => ({ index, file, url: `${payload.baseUrl}/${folder}/${chapter.hash}/${file}` }));
    }
  }

  const CURATED_BRIDGE_SOURCES = [
    { id: "astra-toons", name: "AstraToons", lang: "pt-BR", homeUrl: "https://new.astratoons.com", extension: "Astratoons", pkg: "eu.kanade.tachiyomi.extension.pt.astratoons", repo: "https://raw.githubusercontent.com/keiyoushi/extensions/repo/index.json", contentWarning: "safe" },
    { id: "saikai-scan", name: "Saikai Scan", lang: "pt-BR", homeUrl: "https://housesaikai.net", extension: "Saikai Scan", pkg: "eu.kanade.tachiyomi.extension.pt.saikaiscan", repo: "https://raw.githubusercontent.com/keiyoushi/extensions/repo/index.json", contentWarning: "safe" },
    { id: "lycan-toons", name: "Lycan Toons", lang: "pt-BR", homeUrl: "https://lycantoons.com", extension: "Lycan Toons", pkg: "eu.kanade.tachiyomi.extension.pt.lycantoons", repo: "https://raw.githubusercontent.com/keiyoushi/extensions/repo/index.json", contentWarning: "safe" },
    { id: "mangas-brasuka", name: "Mangas Brasuka", lang: "pt-BR", homeUrl: "https://mangasbrasuka.com.br", extension: "Mangas Brasuka", pkg: "eu.kanade.tachiyomi.extension.pt.mangasbrasuka", repo: "https://raw.githubusercontent.com/keiyoushi/extensions/repo/index.json", contentWarning: "mixed" },
    { id: "boruto-explorer", name: "Boruto Explorer", lang: "pt-BR", homeUrl: "https://leitor.borutoexplorer.com.br", extension: "Boruto Explorer", pkg: "eu.kanade.tachiyomi.extension.pt.borutoexplorer", repo: "https://raw.githubusercontent.com/keiyoushi/extensions/repo/index.json", contentWarning: "safe" }
  ];
  function encodeBridgeRecord(value) {
    const bytes = new TextEncoder().encode(JSON.stringify(value));
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
    return "bridge:" + btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function decodeBridgeRecord(value) {
    if (!String(value).startsWith("bridge:")) throw new Error("Registro da fonte invalido");
    let encoded = String(value).slice(7).replace(/-/g, "+").replace(/_/g, "/");
    encoded += "=".repeat((4 - encoded.length % 4) % 4);
    const binary = atob(encoded);
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, character => character.charCodeAt(0))));
  }
  class BridgeSourcesConnector extends MangaConnector {
    constructor() {
      super("bridge", "Fontes PT-BR");
      this.detailsCache = new Map();
      this.sourcesCache = null;
    }
    async post(path, body, timeout = 16000) {
      const requestBase = bridgeBase();
      if (!requestBase) throw new Error("Manga Bridge ainda nao foi configurado");
      try {
        return await fetchJSON(requestBase + (String(path).startsWith("/") ? path : "/" + path), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        }, timeout);
      } catch (error) {
        revalidateBridgeAfterTransportFailure(error, requestBase);
        throw error;
      }
    }
    async sources() {
      if (this.sourcesCache) return this.sourcesCache;
      const requestBase = bridgeBase();
      if (!requestBase) return CURATED_BRIDGE_SOURCES;
      try {
        const payload = await fetchJSON(requestBase + "/api/sources", {}, 8000);
        this.sourcesCache = (payload.sources || CURATED_BRIDGE_SOURCES).slice(0, 5);
      } catch (error) {
        revalidateBridgeAfterTransportFailure(error, requestBase);
        this.sourcesCache = CURATED_BRIDGE_SOURCES;
      }
      return this.sourcesCache;
    }
    mapResult(item, source) {
      const record = { source: item.source || source, url: item.url };
      return {
        id: encodeBridgeRecord(record), connector: this.id, source: (item.source || source).name || "Fonte PT-BR",
        sourceUrl: item.url, title: item.title || "Mangá", altTitle: item.altTitle || "",
        aliases: uniqueTitles(item.aliases || []), description: item.description || "Detalhes fornecidos pela fonte.",
        cover: item.thumbnail || "", originalCover: item.thumbnail || "", status: "", year: "", author: "",
        contentRating: (item.source || source).contentWarning === "safe" ? "safe" : "suggestive",
        availableLanguages: ["pt-br"], tags: ["Português"], followedCount: 0
      };
    }
    async search(query = "", options = {}) {
      if (!bridgeReady() || options.language === "en") return [];
      const selectedSourceId = String(options.source || "").startsWith("bridge:")
        ? String(options.source).slice("bridge:".length) : "";
      let sources = await this.sources();
      if (selectedSourceId) sources = sources.filter(source => source.id === selectedSourceId);
      if (!sources.length) throw new Error("A fonte PT-BR selecionada nao esta disponivel neste Bridge.");
      const items = [];
      const normalizedQuery = query.trim();
      if (sources.length === 1) {
        const source = sources[0];
        const payload = await this.post(normalizedQuery ? "/api/search" : "/api/popular", { source, query: normalizedQuery }, 24000);
        state.bridgeSourceReports = [{ source, ok: Boolean(payload.ok), count: (payload.items || []).length, error: payload.error || "" }];
        for (const item of payload.items || []) items.push(this.mapResult(item, source));
      } else if (normalizedQuery) {
        const payload = await this.post("/api/batch/search", { sources, query: normalizedQuery }, 26000);
        state.bridgeSourceReports = (payload.results || []).map(result => ({
          source: result.source, ok: Boolean(result.ok), count: (result.items || []).length, error: result.error || ""
        }));
        for (const result of payload.results || []) for (const item of result.items || []) items.push(this.mapResult(item, result.source));
      } else {
        const settled = await Promise.allSettled(sources.map(source =>
          this.post("/api/popular", { source, query: "" }, 24000).then(payload => ({ source, payload }))
        ));
        state.bridgeSourceReports = settled.map((result, index) => result.status === "fulfilled"
          ? { source: result.value.source, ok: Boolean(result.value.payload.ok), count: (result.value.payload.items || []).length, error: result.value.payload.error || "" }
          : { source: sources[index], ok: false, count: 0, error: result.reason?.message || "Falha" });
        for (const result of settled) if (result.status === "fulfilled") {
          for (const item of result.value.payload.items || []) items.push(this.mapResult(item, result.value.source));
        }
      }
      return items.sort((a, b) => smartScore(b, query) - smartScore(a, query)).slice(0, 30);
    }
    async manga(id) {
      if (this.detailsCache.has(id)) return this.detailsCache.get(id).manga;
      const record = decodeBridgeRecord(id);
      const details = await this.post("/api/manga", { source: record.source, url: record.url }, 45000);
      const manga = {
        id, connector: this.id, source: record.source.name || "Fonte PT-BR", sourceUrl: details.url || record.url,
        title: details.title || "Mangá", altTitle: details.altTitle || "", aliases: uniqueTitles(details.aliases || []),
        description: details.description || "Sem sinopse disponivel.",
        cover: details.cover || "", originalCover: details.cover || "", status: "", year: "", author: "",
        contentRating: record.source.contentWarning === "safe" ? "safe" : "suggestive",
        availableLanguages: ["pt-br"], tags: ["Português"]
      };
      this.detailsCache.set(id, { manga, details, record });
      return manga;
    }
    async chapters(id) {
      if (!this.detailsCache.has(id)) await this.manga(id);
      const cached = this.detailsCache.get(id);
      return (cached.details.chapters || []).map((chapter, index) => ({
        id: encodeBridgeRecord({ source: cached.record.source, url: chapter.url, mangaId: id }), mangaId: id,
        connector: this.id, number: chapter.number == null ? String(index + 1) : String(chapter.number), volume: "",
        title: chapter.name || "", language: "pt-br", pageCount: Number(chapter.pageCount || 0),
        publishedAt: chapter.publishedAt || "", group: cached.record.source.name || ""
      }));
    }
    async pages(chapterId) {
      const record = decodeBridgeRecord(chapterId);
      const payload = await this.post("/api/chapter", { source: record.source, url: record.url }, 22000);
      return (payload.pages || []).map((page, index) => ({ index, file: String(index + 1), url: page.image, original: page.original || "" }));
    }
  }

  class MangaEngine {
    constructor(connectors) {
      this.connectors = connectors;
      this.connectorMap = new Map(connectors.map(connector => [connector.id, connector]));
    }
    connector(id) {
      const connector = this.connectorMap.get(id);
      if (!connector) throw new Error("Fonte de manga indisponivel");
      return connector;
    }
    async search(query, options = {}) {
      const requestedSource = options.source || "all";
      const requestedConnector = String(requestedSource).startsWith("bridge:") ? "bridge" : requestedSource;
      const active = this.connectors.filter(connector => {
        if (requestedConnector !== "all" && connector.id !== requestedConnector) return false;
        return connector.id !== "bridge" || (bridgeReady() && options.language !== "en");
      });
      if (!active.length) {
        const bridgeRequested = requestedConnector === "bridge";
        const error = new Error(bridgeRequested
          ? "Conecte o Manga Bridge para pesquisar nas fontes PT-BR."
          : "Nenhuma fonte esta disponivel com estes filtros.");
        error.code = bridgeRequested ? "BRIDGE_REQUIRED" : "NO_SOURCE";
        throw error;
      }
      const settled = await Promise.allSettled(active.map(connector => connector.search(query, options)));
      const items = []; const errors = []; const sources = [];
      settled.forEach((result, index) => {
        const connector = active[index];
        if (result.status === "fulfilled") { items.push(...result.value); sources.push({ id: connector.id, ok: true, count: result.value.length }); }
        else { errors.push(result.reason); sources.push({ id: connector.id, ok: false, count: 0, error: result.reason?.message || "Falha" }); }
      });
      state.sourceReport = { sources, bridge: bridgeBase(), errors: errors.map(error => error?.message || "Falha") };
      if (!settled.some(result => result.status === "fulfilled")) {
        const error = new Error(errors.map(item => item?.message).filter(Boolean).join(" · ") || "Nenhuma fonte respondeu");
        error.code = bridgeBase() ? "BRIDGE_OFFLINE" : "BRIDGE_REQUIRED";
        throw error;
      }
      const unique = new Map();
      for (const item of items.sort((a, b) => smartScore(b, query) - smartScore(a, query))) {
        const key = item.connector + "|" + item.source + "|" + normalize(item.title);
        if (!unique.has(key)) unique.set(key, item);
      }
      return [...unique.values()];
    }
  }
  const engine = new MangaEngine([new MangaDexConnector(), new BridgeSourcesConnector()]);

  function library() { return readStorage(KEYS.library, []); }
  function isSaved(id, connector = null) { return library().some(item => item.id === id && (!connector || item.connector === connector)); }
  function toggleSaved(manga) {
    const items = library();
    const index = items.findIndex(item => item.id === manga.id && item.connector === manga.connector);
    if (index >= 0) items.splice(index, 1);
    else items.unshift({
      id: manga.id, connector: manga.connector, source: manga.source, title: manga.title,
      altTitle: manga.altTitle, aliases: manga.aliases || [], cover: manga.cover,
      status: manga.status, year: manga.year, author: manga.author, sourceUrl: manga.sourceUrl || "",
      contentRating: manga.contentRating || "safe", availableLanguages: manga.availableLanguages || []
    });
    writeStorage(KEYS.library, items);
    return index < 0;
  }
  function progressMap() { return readStorage(KEYS.progress, {}); }
  function getProgress(chapterId) { return progressMap()[chapterId] || null; }
  function setProgress(chapterId, value) {
    const progress = progressMap();
    progress[chapterId] = { ...value, updatedAt: Date.now() };
    const entries = Object.entries(progress).sort((a, b) => Number(b[1]?.updatedAt || 0) - Number(a[1]?.updatedAt || 0)).slice(0, 600);
    writeStorage(KEYS.progress, Object.fromEntries(entries));
  }
  function clearProgress(chapterId) {
    const progress = progressMap();
    delete progress[chapterId];
    writeStorage(KEYS.progress, progress);
  }
  function preferences() {
    return {
      mode: "vertical",
      quality: innerWidth <= 760 ? "data-saver" : "original",
      fit: "width",
      direction: "rtl",
      gap: "0",
      brightness: 100,
      ...readStorage(KEYS.preferences, {})
    };
  }
  function updatePreferences(patch) {
    const next = { ...preferences(), ...patch };
    writeStorage(KEYS.preferences, next);
    return next;
  }

  let readerReturnFocus = null;
  let readerReturnChapterId = "";
  let readerBackgroundState = [];
  const READER_FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"]),[contenteditable="true"]';

  function readerFocusableElements(reader) {
    return [...reader.querySelectorAll(READER_FOCUSABLE)].filter(element => {
      if (element.closest("[inert],[aria-hidden=\"true\"]")) return false;
      return element.getClientRects().length > 0;
    });
  }

  function trapReaderFocus(event, reader) {
    const focusable = readerFocusableElements(reader);
    if (!focusable.length) {
      event.preventDefault();
      reader.focus({ preventScroll: true });
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !reader.contains(active))) {
      event.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!event.shiftKey && (active === last || !reader.contains(active))) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  }

  function setReaderBackgroundInert(active) {
    const reader = document.getElementById("hkMangaReader");
    const toastElement = document.getElementById("hkMangaToast");
    if (!reader) return;
    if (active) {
      if (readerBackgroundState.length) return;
      readerBackgroundState = [...document.body.children]
        .filter(element => element !== reader && element !== toastElement && !["SCRIPT", "STYLE"].includes(element.tagName))
        .map(element => ({
          element,
          hadInert: element.hasAttribute("inert"),
          ariaHidden: element.getAttribute("aria-hidden")
        }));
      readerBackgroundState.forEach(({ element }) => {
        element.setAttribute("inert", "");
        element.setAttribute("aria-hidden", "true");
      });
      return;
    }
    readerBackgroundState.forEach(({ element, hadInert, ariaHidden }) => {
      if (!element.isConnected) return;
      if (!hadInert) element.removeAttribute("inert");
      if (ariaHidden == null) element.removeAttribute("aria-hidden");
      else element.setAttribute("aria-hidden", ariaHidden);
    });
    readerBackgroundState = [];
  }

  function rememberReaderFocus() {
    const active = document.activeElement;
    readerReturnFocus = active instanceof HTMLElement && active !== document.body ? active : null;
    readerReturnChapterId = active?.closest?.("[data-hk-chapter]")?.dataset.hkChapter || "";
  }

  function restoreReaderFocus() {
    let target = readerReturnFocus?.isConnected ? readerReturnFocus : null;
    if (!target && readerReturnChapterId) {
      const row = [...document.querySelectorAll("[data-hk-chapter]")]
        .find(element => element.dataset.hkChapter === readerReturnChapterId);
      target = row?.querySelector("[data-hk-read]") || row;
    }
    readerReturnFocus = null;
    readerReturnChapterId = "";
    target?.focus?.({ preventScroll: true });
  }

  function setReaderSettingsOpen(open, restoreButton = false) {
    const settings = document.getElementById("hkReaderSettings");
    if (!settings) return;
    settings.classList.toggle("open", open);
    settings.setAttribute("aria-hidden", String(!open));
    if ("inert" in settings) settings.inert = !open;
    if (open) document.getElementById("hkReaderSettingsClose")?.focus({ preventScroll: true });
    else if (restoreButton) document.getElementById("hkReaderSettingsButton")?.focus({ preventScroll: true });
  }

  function ensureOverlays() {
    if (document.getElementById("hkMangaDetailModal")) return;
    document.body.insertAdjacentHTML("beforeend", `
      <div class="hk-modal" id="hkMangaDetailModal" role="dialog" aria-modal="true" aria-label="Detalhes do manga">
        <div class="hk-detail" id="hkMangaDetail"></div>
      </div>
      <section class="hk-reader" id="hkMangaReader" role="dialog" aria-modal="true" aria-labelledby="hkReaderTitle" aria-hidden="true" tabindex="-1">
        <div class="hk-reader-top">
          <button class="hk-reader-icon" id="hkReaderClose" type="button" aria-label="Voltar">‹</button>
          <div class="hk-reader-heading">
            <div class="hk-reader-title" id="hkReaderTitle">Manga</div>
            <div class="hk-reader-chapter" id="hkReaderChapter">Capitulo</div>
          </div>
          <button class="hk-reader-icon hk-reader-download" id="hkReaderDownload" type="button" aria-label="Baixar capitulo">⇩</button>
          <button class="hk-reader-ui-hide" id="hkReaderUIToggle" type="button" aria-label="Ocultar controles">Ocultar</button>
          <button class="hk-reader-icon" id="hkReaderSettingsButton" type="button" aria-label="Configuracoes">⚙</button>
        </div>
        <div class="hk-reader-progress"><i id="hkReaderProgress"></i></div>
        <div class="hk-reader-canvas vertical" id="hkReaderCanvas" tabindex="0" role="region" aria-label="Paginas do capitulo; toque no centro para mostrar ou ocultar os controles">
          <div class="hk-reader-loading" id="hkReaderLoading">Carregando paginas...</div>
          <div class="hk-reader-pages" id="hkReaderPages"></div>
          <div class="hk-tap left" id="hkReaderTapLeft"></div>
          <div class="hk-tap right" id="hkReaderTapRight"></div>
        </div>
        <div class="hk-reader-bottom">
          <button type="button" id="hkPreviousChapter">Cap. anterior</button>
          <select id="hkReaderMode" aria-label="Modo de leitura">
            <option value="vertical">Rolagem vertical</option>
            <option value="paged">Pagina por pagina</option>
          </select>
          <button class="hk-reader-download-mobile" type="button" id="hkReaderDownloadMobile" aria-label="Baixar este capitulo em CBZ">⇩ CBZ</button>
          <button type="button" id="hkNextChapter">Proximo cap.</button>
        </div>
        <button class="hk-reader-ui-reveal" id="hkReaderUIReveal" type="button" aria-label="Mostrar controles" aria-hidden="true">Mostrar controles</button>
        <aside class="hk-reader-settings" id="hkReaderSettings" aria-hidden="true" inert>
          <div class="hk-reader-settings-head"><b>Configuracoes do leitor</b><button type="button" id="hkReaderSettingsClose">×</button></div>
          <label>Qualidade
            <select id="hkReaderQuality">
              <option value="data-saver">Economica e rapida</option>
              <option value="original">Original</option>
            </select>
          </label>
          <label>Ajuste da imagem
            <select id="hkReaderFit">
              <option value="width">Largura da tela</option>
              <option value="contain">Conter na tela</option>
              <option value="original">Tamanho original</option>
            </select>
          </label>
          <label>Direcao no modo paginado
            <select id="hkReaderDirection">
              <option value="rtl">Manga · direita para esquerda</option>
              <option value="ltr">Ocidental · esquerda para direita</option>
            </select>
          </label>
          <label>Espaco entre paginas
            <select id="hkReaderGap">
              <option value="0">Sem espaco</option>
              <option value="8">8 px</option>
              <option value="16">16 px</option>
            </select>
          </label>
          <label>Brilho <span id="hkBrightnessLabel">100%</span>
            <input id="hkReaderBrightness" type="range" min="35" max="125" step="5" value="100">
          </label>
        </aside>
      </section>
      <div class="hk-toast" id="hkMangaToast" role="status" aria-live="polite"></div>
    `);

    document.getElementById("hkMangaDetailModal").addEventListener("click", event => {
      if (event.target.id === "hkMangaDetailModal") closeDetails();
    });
    document.getElementById("hkReaderClose").addEventListener("click", closeReader);
    document.getElementById("hkReaderSettingsButton").addEventListener("click", () => {
      const settings = document.getElementById("hkReaderSettings");
      const open = !settings.classList.contains("open");
      setReaderSettingsOpen(open, !open);
      if (open) showReaderUI(true);
      else showReaderUI();
    });
    document.getElementById("hkReaderSettingsClose").addEventListener("click", () => {
      setReaderSettingsOpen(false, true);
      showReaderUI();
    });
    document.getElementById("hkReaderDownload").addEventListener("click", () => {
      if (state.currentManga && state.currentChapter) queueDownload(state.currentManga, state.currentChapter);
    });
    document.getElementById("hkReaderDownloadMobile").addEventListener("click", () => {
      if (state.currentManga && state.currentChapter) queueDownload(state.currentManga, state.currentChapter);
    });
    document.getElementById("hkReaderUIToggle").addEventListener("click", hideReaderUI);
    document.getElementById("hkReaderUIReveal").addEventListener("click", () => showReaderUI());
    document.getElementById("hkPreviousChapter").addEventListener("click", () => moveChapter(-1));
    document.getElementById("hkNextChapter").addEventListener("click", () => moveChapter(1));
    document.getElementById("hkReaderTapLeft").addEventListener("click", event => { event.stopPropagation(); movePage(preferences().direction === "rtl" ? 1 : -1); });
    document.getElementById("hkReaderTapRight").addEventListener("click", event => { event.stopPropagation(); movePage(preferences().direction === "rtl" ? -1 : 1); });
    const readerCanvas = document.getElementById("hkReaderCanvas");
    let readerTap = null;
    readerCanvas.addEventListener("pointerdown", event => {
      if ((event.pointerType === "mouse" && event.button !== 0) || event.target.closest(".hk-tap,button,a,input,select,label")) {
        readerTap = null;
        return;
      }
      readerTap = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        at: performance.now(),
        scrollTop: readerCanvas.scrollTop,
        scrollLeft: readerCanvas.scrollLeft
      };
    }, { passive: true });
    readerCanvas.addEventListener("pointerup", event => {
      if (!readerTap || readerTap.id !== event.pointerId) return;
      const tap = readerTap;
      readerTap = null;
      const moved = Math.hypot(event.clientX - tap.x, event.clientY - tap.y);
      const scrolled = Math.hypot(readerCanvas.scrollTop - tap.scrollTop, readerCanvas.scrollLeft - tap.scrollLeft);
      if (moved <= 14 && scrolled <= 8 && performance.now() - tap.at <= 700) toggleReaderUI();
    }, { passive: true });
    readerCanvas.addEventListener("pointercancel", () => { readerTap = null; }, { passive: true });
    readerCanvas.addEventListener("keydown", event => {
      if ((event.key === "Enter" || event.key === " ") && event.target === readerCanvas) {
        event.preventDefault();
        toggleReaderUI();
      }
    });
    readerCanvas.addEventListener("focusin", () => showReaderUI());
    [document.querySelector(".hk-reader-top"), document.querySelector(".hk-reader-bottom")].forEach(element => {
      element?.addEventListener("pointerdown", () => showReaderUI(), { passive: true });
      element?.addEventListener("focusin", () => showReaderUI(true));
    });
    document.getElementById("hkReaderMode").addEventListener("change", event => {
      updatePreferences({ mode: event.target.value }); applyReaderPreferences();
    });
    document.getElementById("hkReaderQuality").addEventListener("change", async event => {
      updatePreferences({ quality: event.target.value });
      if (state.currentChapter) await openReader(state.currentChapter, { preservePage: true });
    });
    document.getElementById("hkReaderFit").addEventListener("change", event => {
      updatePreferences({ fit: event.target.value }); applyReaderPreferences();
    });
    document.getElementById("hkReaderDirection").addEventListener("change", event => {
      updatePreferences({ direction: event.target.value }); applyReaderPreferences();
    });
    document.getElementById("hkReaderGap").addEventListener("change", event => {
      updatePreferences({ gap: event.target.value }); applyReaderPreferences();
    });
    document.getElementById("hkReaderBrightness").addEventListener("input", event => {
      updatePreferences({ brightness: Number(event.target.value) }); applyReaderPreferences();
    });
    document.addEventListener("keydown", event => {
      const reader = document.getElementById("hkMangaReader");
      const detail = document.getElementById("hkMangaDetailModal");
      const readerOpen = reader?.classList.contains("open");
      if (readerOpen && event.key === "Tab") {
        trapReaderFocus(event, reader);
        return;
      }
      if (event.key === "Escape") {
        if (readerOpen && document.getElementById("hkReaderSettings")?.classList.contains("open")) {
          event.preventDefault();
          setReaderSettingsOpen(false, true);
          showReaderUI(true);
        } else if (readerOpen) closeReader();
        else if (detail?.classList.contains("open")) closeDetails();
      }
      const editing = event.target?.closest?.('input,select,textarea,[contenteditable]:not([contenteditable="false"])');
      if (readerOpen && !editing && preferences().mode === "paged") {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          movePage(preferences().direction === "rtl" ? 1 : -1);
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          movePage(preferences().direction === "rtl" ? -1 : 1);
        }
      }
    });
  }

  function toast(message) {
    const element = document.getElementById("hkMangaToast");
    if (!element) return;
    element.textContent = message;
    element.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => element.classList.remove("show"), 3600);
  }

  async function checkBridgeStatus({ retry = false } = {}) {
    const requestBase = bridgeBase();
    if (!requestBase) {
      cancelBridgeHealthActivity();
      state.bridgeStatus = "off";
      state.bridgeHealth = null;
      updateSourceSelector();
      return state.bridgeStatus;
    }
    if (!retry) state.bridgeRetryAttempt = 0;
    if (state.bridgeRetryTimer) clearTimeout(state.bridgeRetryTimer);
    state.bridgeRetryTimer = 0;
    const checkToken = ++state.bridgeCheckToken;
    try { state.bridgeHealthController?.abort(); } catch {}
    const healthController = new AbortController();
    state.bridgeHealthController = healthController;
    state.bridgeStatus = "checking";
    updateEngineStatus();
    const startedAt = performance.now();
    let lastError = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const timeout = attempt === 1 ? 8000 : attempt === 2 ? 10000 : 12000;
        const health = await fetchJSON(requestBase + "/api/health?check=" + Date.now(), {
          cache: "no-store", signal: healthController.signal
        }, timeout);
        if (checkToken !== state.bridgeCheckToken || requestBase !== bridgeBase()) return state.bridgeStatus;
        state.bridgeStatus = health?.ok ? "ready" : "offline";
        state.bridgeHealth = {
          ...(health || {}), url: requestBase, attempt,
          latencyMs: Math.round(performance.now() - startedAt), testedAt: new Date().toISOString()
        };
        if (state.bridgeStatus === "ready") break;
      } catch (error) {
        if (checkToken !== state.bridgeCheckToken || requestBase !== bridgeBase() || error?.code === "ABORTED") return state.bridgeStatus;
        lastError = error;
        if (attempt < 3) await new Promise(resolve => setTimeout(resolve, attempt === 1 ? 350 : 900));
      }
    }
    if (checkToken !== state.bridgeCheckToken || requestBase !== bridgeBase()) return state.bridgeStatus;
    if (state.bridgeHealthController === healthController) state.bridgeHealthController = null;
    if (state.bridgeStatus !== "ready") markBridgeOffline(lastError || new Error("O Bridge respondeu sem confirmar disponibilidade"));
    else state.bridgeRetryAttempt = 0;
    updateSourceSelector();
    if (state.bridgeStatus === "offline") scheduleBridgeRetry();
    return state.bridgeStatus;
  }
  function updateSourceSelector() {
    if (typeof document === "undefined") return;
    const select = document.getElementById("hkSource");
    const option = select?.querySelector('option[value="bridge"]');
    if (!option) return;
    if (select.querySelector(`option[value="${state.source}"]`)) select.value = state.source;
    option.textContent = bridgeReady() ? "Fontes PT-BR (conectadas)" : "Fontes PT-BR (requer Bridge)";
    select.querySelectorAll('option[value^="bridge:"]').forEach(sourceOption => {
      sourceOption.disabled = !bridgeReady();
    });
    select.setAttribute("aria-describedby", "hkSourceHint");
  }
  function updateEngineStatus() {
    if (typeof document === "undefined") return;
    const element = document.getElementById("hkEngineStatus");
    if (!element) return;
    element.classList.toggle("off", state.bridgeStatus !== "ready");
    element.classList.toggle("checking", state.bridgeStatus === "checking");
    const text = state.bridgeStatus === "ready"
      ? `Bridge conectado · MangaDex + catálogos PT-BR · v${VERSION}`
      : state.bridgeStatus === "checking"
        ? `Testando Manga Bridge · v${VERSION}`
      : state.bridgeStatus === "offline"
        ? `Bridge sem resposta · MangaDex direto · v${VERSION}`
        : `MangaDex direto · conecte fontes PT-BR · v${VERSION}`;
    element.querySelector("span").textContent = text;
    element.title = state.bridgeHealth?.error || "Abrir configuracao das fontes";
  }
  function bridgeSetupMarkup(message = "") {
    const configured = bridgeBase();
    const automatic = isOfficialSite() && configured === OFFICIAL_BRIDGE && !localStorage.getItem(KEYS.bridge);
    return `
      <div class="hk-bridge-setup">
        <div><b>Conectar o Manga Bridge</b><p>${escapeHTML(message || "O bridge evita bloqueios do navegador e libera fontes PT-BR e download CBZ.")}</p></div>
        <div class="hk-bridge-form">
          <input id="hkBridgeInput" value="${escapeHTML(configured)}" placeholder="https://seu-servico.up.railway.app" inputmode="url" autocomplete="url" aria-label="URL do Manga Bridge">
          <button type="button" id="hkBridgeSave">Salvar e testar</button>
        </div>
        <div class="hk-bridge-actions">
          ${configured ? '<button type="button" id="hkBridgeCopyLink">Copiar link para outro aparelho</button><button type="button" id="hkBridgeClear">Usar modo direto</button>' : ""}
          ${!configured && isOfficialSite() ? '<button type="button" id="hkBridgeDefault">Usar Bridge oficial</button>' : ""}
        </div>
        <small>${automatic ? "O GitHub Pages usa esta Bridge automaticamente em aparelhos novos. " : "A configuracao manual e local a cada navegador. "}O teste faz ate tres tentativas para aguardar a inicializacao do servidor. O endpoint precisa responder em <code>/api/health</code>.</small>
      </div>
    `;
  }
  async function copyBridgeLink() {
    const value = bridgeShareURL();
    if (!value) { toast("Configure o Manga Bridge primeiro."); return; }
    try {
      await navigator.clipboard.writeText(value);
      toast("Link do Bridge copiado. Abra-o no outro aparelho.");
    } catch {
      window.prompt("Copie este link e abra no outro aparelho:", value);
    }
  }
  function bindBridgeSetup(root, onSuccess = null) {
    root?.querySelector("#hkBridgeSave")?.addEventListener("click", async event => {
      const button = event.currentTarget;
      try {
        button.disabled = true; button.textContent = "Testando...";
        saveBridge(root.querySelector("#hkBridgeInput")?.value || "");
        await checkBridgeStatus(); updateEngineStatus();
        engine.connector("bridge").sourcesCache = null;
        if (state.bridgeStatus !== "ready") throw new Error(state.bridgeHealth?.error || "O servidor nao respondeu como Manga Bridge");
        toast("Manga Bridge conectado.");
        if (onSuccess) onSuccess(); else renderSources();
      } catch (error) {
        toast(error.message || "Nao foi possivel conectar o bridge.");
        button.disabled = false; button.textContent = "Salvar e testar";
      }
    });
    root?.querySelector("#hkBridgeCopyLink")?.addEventListener("click", copyBridgeLink);
    root?.querySelector("#hkBridgeDefault")?.addEventListener("click", async () => {
      saveBridge(OFFICIAL_BRIDGE);
      await checkBridgeStatus();
      updateEngineStatus();
      if (onSuccess) onSuccess(); else renderSources();
    });
    root?.querySelector("#hkBridgeClear")?.addEventListener("click", () => {
      saveBridge("");
      updateEngineStatus();
      toast("Modo direto ativado neste aparelho.");
      if (onSuccess) onSuccess(); else renderSources();
    });
  }
  function renderSources() {
    const root = document.getElementById("hkContent");
    if (!root) return;
    updateWorkflow("source");
    const ready = state.bridgeStatus === "ready";
    root.innerHTML = `
      <div class="hk-section-head"><div><h3>Fontes de manga</h3><p>Somente a area de mangas usa estas configuracoes.</p></div><button type="button" id="hkRetestBridge">Testar conexao</button></div>
      <div class="hk-source-health ${ready ? "ok" : "warn"}">
        <b>${ready ? "Manga Bridge conectado" : bridgeBase() ? "Manga Bridge sem resposta" : "Manga Bridge nao configurado"}</b>
        <span>${ready ? escapeHTML(state.bridgeHealth?.version || "online") : escapeHTML(state.bridgeHealth?.error || "O MangaDex direto continua disponivel; fontes PT-BR exigem o Bridge.")}</span>
      </div>
      <div class="hk-source-picker" role="group" aria-label="Escolher conector do catalogo">
        <button type="button" data-hk-source-choice="all" aria-pressed="${state.source === "all"}" class="${state.source === "all" ? "active" : ""}"><small>Catalogo combinado</small><b>Todas as fontes</b></button>
        <button type="button" data-hk-source-choice="mangadex" aria-pressed="${state.source === "mangadex"}" class="${state.source === "mangadex" ? "active" : ""}"><small>Conector direto</small><b>MangaDex</b></button>
        <button type="button" data-hk-source-choice="bridge" aria-pressed="${state.source === "bridge"}" class="${state.source === "bridge" ? "active" : ""}" ${ready ? "" : "disabled"}><small>${ready ? "Bridge conectado" : "Conecte o Bridge"}</small><b>Fontes PT-BR</b></button>
        ${CURATED_BRIDGE_SOURCES.map(source => `<button type="button" data-hk-source-choice="bridge:${escapeHTML(source.id)}" aria-pressed="${state.source === "bridge:" + source.id}" class="${state.source === "bridge:" + source.id ? "active" : ""}" ${ready ? "" : "disabled"}><small>${ready ? "Conector PT-BR" : "Bridge necessario"}</small><b>${escapeHTML(source.name)}</b></button>`).join("")}
      </div>
      ${bridgeSetupMarkup()}
      <div class="hk-source-list">
        <article><b>MangaDex</b><span>Catalogo internacional, PT-BR primeiro, leitura e CBZ pelo proxy.</span></article>
        ${CURATED_BRIDGE_SOURCES.map(source => `<article><b>${escapeHTML(source.name)}</b><span>${escapeHTML(source.lang)} · Keiyoushi · ${source.contentWarning === "safe" ? "conteudo geral" : "catalogo misto"}</span></article>`).join("")}
      </div>
      <div class="hk-source-note">O Keiyoushi fornece metadados e codigo Kotlin para aplicativos Mihon. O ResenhaFLIX nao instala APKs: o bridge implementa adaptadores web proprios para ate cinco fontes.</div>
    `;
    bindBridgeSetup(root, renderSources);
    root.querySelectorAll("[data-hk-source-choice]").forEach(button => {
      button.addEventListener("click", () => {
        state.source = button.dataset.hkSourceChoice;
        localStorage.setItem(KEYS.source, state.source);
        const selector = document.getElementById("hkSource");
        if (selector) selector.value = state.source;
        state.tab = "explore";
        loadExplore();
      });
    });
    document.getElementById("hkRetestBridge")?.addEventListener("click", async () => {
      state.bridgeStatus = "checking"; updateEngineStatus(); await checkBridgeStatus(); updateEngineStatus(); renderSources();
    });
  }

  function selectedSourceLabel() {
    if (state.source === "mangadex") return "MangaDex";
    if (state.source === "bridge") return bridgeReady() ? "Fontes PT-BR" : "Conectar PT-BR";
    if (state.source.startsWith("bridge:")) {
      return CURATED_BRIDGE_SOURCES.find(source => source.id === state.source.slice(7))?.name || "Fonte PT-BR";
    }
    return bridgeReady() ? "Todas conectadas" : "MangaDex direto";
  }

  function updateWorkflow(step = "work") {
    const workflow = document.getElementById("hkWorkflow");
    if (!workflow) return;
    const steps = ["source", "work", "chapters", "reader"];
    const activeIndex = Math.max(0, steps.indexOf(step));
    workflow.querySelectorAll("[data-hk-flow]").forEach((item, index) => {
      item.classList.toggle("done", index < activeIndex);
      item.classList.toggle("active", index === activeIndex);
      if (index === activeIndex) item.setAttribute("aria-current", "step");
      else item.removeAttribute("aria-current");
    });
    const sourceValue = document.getElementById("hkFlowSource");
    const workValue = document.getElementById("hkFlowWork");
    const chapterValue = document.getElementById("hkFlowChapters");
    const readerValue = document.getElementById("hkFlowReader");
    if (sourceValue) sourceValue.textContent = selectedSourceLabel();
    if (workValue) workValue.textContent = step === "work"
      ? (state.query || "Escolha uma obra")
      : (state.currentManga?.title || state.query || "Escolha uma obra");
    if (chapterValue) chapterValue.textContent = state.currentManga ? `${state.currentChapters.length} disponiveis` : "Abra a lista";
    if (readerValue) readerValue.textContent = state.currentChapter ? chapterLabel(state.currentChapter) : "Visualizar";
  }

  function mount() {
    ensureOverlays();
    try {
      if (typeof S !== "undefined") S.currentPage = "manga";
      if (typeof setActiveNav === "function") setActiveNav("manga");
      if (typeof unlockMobileDocument === "function") unlockMobileDocument();
      if (typeof scrollPageTop === "function") scrollPageTop();
      if (typeof toggleCategoryMega === "function") toggleCategoryMega(false);
    } catch (error) { console.warn("Manga page helpers", error); }

    const hero = document.getElementById("hero");
    const main = document.getElementById("main");
    const pageElement = document.getElementById("page");
    const pageBody = document.getElementById("pageBody");
    const pageTitle = document.getElementById("pageTitle");
    if (!pageElement || !pageBody) return;
    hero?.classList.add("hidden");
    main?.classList.add("hidden");
    pageElement.classList.remove("hidden", "searchPage", "mangaPageModern", "mangaPageV24", "musicPageModern", "booksPageModern");
    pageElement.classList.add("hk-manga-page");
    if (pageTitle) pageTitle.textContent = "Mangás";

    pageBody.innerHTML = `
      <div class="hk-shell">
        <header class="hk-hero">
          <div>
            <div class="hk-eyebrow">RESENHAFLIX MANGA ENGINE</div>
            <h2>Leia. Continue. Baixe.</h2>
            <p>Busca inteligente com prioridade para PT-BR, leitor nativo otimizado para celular, progresso automatico e download de capitulos em CBZ.</p>
          </div>
          <button type="button" class="hk-engine-status" id="hkEngineStatus" aria-label="Abrir fontes de manga"><i></i><span>${bridgeBase() ? "Verificando Manga Bridge" : "Modo direto · bridge nao configurado"}</span></button>
        </header>
        <nav class="hk-tabs" id="hkTabs" aria-label="Secoes de manga">
          <button type="button" data-hk-tab="explore">Explorar</button>
          <button type="button" data-hk-tab="library">Biblioteca</button>
          <button type="button" data-hk-tab="downloads">Downloads</button>
          <button type="button" data-hk-tab="sources">Fontes</button>
        </nav>
        <ol class="hk-workflow" id="hkWorkflow" aria-label="Etapas para ler manga">
          <li data-hk-flow="source"><span>1</span><div><small>Fonte</small><b id="hkFlowSource">${escapeHTML(selectedSourceLabel())}</b></div></li>
          <li data-hk-flow="work"><span>2</span><div><small>Obra</small><b id="hkFlowWork">Escolha uma obra</b></div></li>
          <li data-hk-flow="chapters"><span>3</span><div><small>Capitulos</small><b id="hkFlowChapters">Abra a lista</b></div></li>
          <li data-hk-flow="reader"><span>4</span><div><small>Leitura</small><b id="hkFlowReader">Visualizar</b></div></li>
        </ol>
        <form class="hk-searchbar" id="hkSearchForm">
          <label class="hk-sr" for="hkMangaSearch">Pesquisar manga</label>
          <input id="hkMangaSearch" value="${escapeHTML(state.query)}" placeholder="Ex.: Mago do Infinito, One Piece..." autocomplete="off">
          <select id="hkSource" aria-label="Fonte do catalogo">
            <option value="all" ${state.source === "all" ? "selected" : ""}>Todas as fontes</option>
            <option value="mangadex" ${state.source === "mangadex" ? "selected" : ""}>MangaDex</option>
            <option value="bridge" ${state.source === "bridge" ? "selected" : ""}>Fontes PT-BR</option>
            <optgroup label="Conectores PT-BR">
              ${CURATED_BRIDGE_SOURCES.map(source => `<option value="bridge:${escapeHTML(source.id)}" ${state.source === "bridge:" + source.id ? "selected" : ""} ${bridgeReady() ? "" : "disabled"}>${escapeHTML(source.name)}</option>`).join("")}
            </optgroup>
          </select>
          <span class="hk-sr" id="hkSourceHint">Escolha o catalogo combinado, MangaDex ou uma fonte PT-BR conectada pelo Manga Bridge.</span>
          <select id="hkLanguage" aria-label="Idioma dos capitulos">
            <option value="pt-br" ${state.language === "pt-br" ? "selected" : ""}>PT-BR primeiro</option>
            <option value="en" ${state.language === "en" ? "selected" : ""}>Ingles</option>
            <option value="all" ${state.language === "all" ? "selected" : ""}>Todos os idiomas</option>
          </select>
          <button type="submit">Buscar</button>
        </form>
        <main class="hk-content" id="hkContent"></main>
      </div>
    `;

    pageBody.querySelector("#hkTabs").addEventListener("click", event => {
      const button = event.target.closest("[data-hk-tab]");
      if (!button) return;
      state.tab = button.dataset.hkTab;
      renderTab();
    });
    pageBody.querySelector("#hkEngineStatus").addEventListener("click", () => {
      state.tab = "sources";
      renderTab();
    });
    pageBody.querySelector("#hkSearchForm").addEventListener("submit", event => {
      event.preventDefault();
      state.query = pageBody.querySelector("#hkMangaSearch").value.trim();
      localStorage.setItem(KEYS.query, state.query);
      state.tab = "explore";
      loadExplore();
    });
    pageBody.querySelector("#hkLanguage").addEventListener("change", event => {
      state.language = event.target.value;
      localStorage.setItem(KEYS.language, state.language);
      if (state.tab === "explore") loadExplore();
    });
    pageBody.querySelector("#hkSource").addEventListener("change", event => {
      state.source = event.target.value;
      localStorage.setItem(KEYS.source, state.source);
      state.tab = "explore";
      loadExplore();
    });
    let debounce = 0;
    pageBody.querySelector("#hkMangaSearch").addEventListener("input", event => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        state.query = event.target.value.trim();
        localStorage.setItem(KEYS.query, state.query);
        state.tab = "explore";
        loadExplore();
      }, 520);
    });
    if (!bridgeBase()) state.bridgeStatus = "off";
    updateEngineStatus();
    updateSourceSelector();
    renderTab();
    if (bridgeBase()) checkBridgeStatus().then(status => {
      updateEngineStatus();
      if (status === "ready" && state.tab === "explore") loadExplore();
      else if (state.tab === "sources") renderSources();
    });
  }

  function setActiveTab() {
    document.querySelectorAll("#hkTabs [data-hk-tab]").forEach(button => {
      button.classList.toggle("active", button.dataset.hkTab === state.tab);
    });
    const form = document.getElementById("hkSearchForm");
    if (form) form.style.display = ["downloads", "sources"].includes(state.tab) ? "none" : "";
  }
  function renderTab() {
    setActiveTab();
    if (state.tab === "library") { updateWorkflow("work"); renderLibrary(); }
    else if (state.tab === "downloads") renderDownloads();
    else if (state.tab === "sources") renderSources();
    else if (state.results.length) renderResults();
    else loadExplore();
  }

  async function loadExplore() {
    const root = document.getElementById("hkContent");
    if (!root) return;
    state.tab = "explore";
    setActiveTab();
    updateWorkflow("work");
    const requestId = ++state.requestId;
    root.innerHTML = '<div class="hk-loading">Consultando o catalogo e os capitulos disponiveis...</div>';
    try {
      let items = await engine.search(state.query, { language: state.language, source: state.source, limit: state.query ? 36 : 30 });
      if (!items.length && state.language === "pt-br" && state.query) {
        items = await engine.search(state.query, { language: "all", source: state.source, limit: 24 });
      }
      if (requestId !== state.requestId) return;
      state.results = items;
      state.resultMap = new Map(items.map(item => [item.id, item]));
      renderResults();
    } catch (error) {
      if (requestId !== state.requestId) return;
      root.innerHTML = `
        <div class="hk-error">
          <div><b>Nao foi possivel abrir o catalogo.</b>${escapeHTML(error.message || "Falha de conexao")}<br>
          <button type="button" id="hkRetryExplore">Tentar novamente</button></div>
        </div>
        ${bridgeSetupMarkup(bridgeBase() ? "Confira se o deploy do bridge esta ativo e se ALLOWED_ORIGIN permite o GitHub Pages." : "A conexao direta falhou. Configure o bridge para liberar busca, leitura e download.")}
      `;
      document.getElementById("hkRetryExplore")?.addEventListener("click", loadExplore);
      bindBridgeSetup(root, loadExplore);
    }
  }

  function cardHTML(manga) {
    const saved = isSaved(manga.id, manga.connector);
    const hasPortuguese = manga.connector === "bridge";
    const cover = safeImageURL(manga.cover);
    return `
      <article class="hk-card" data-hk-manga="${escapeHTML(manga.id)}">
        <div class="hk-cover">
          ${cover ? '<img src="' + escapeHTML(cover) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">' : ""}
          <span class="hk-cover-badge">${escapeHTML(manga.source || "MangaDex")}</span>
          ${hasPortuguese ? '<span class="hk-cover-lang">PT-BR</span>' : ""}
        </div>
        <div class="hk-card-body">
          <div class="hk-card-title">${escapeHTML(manga.title)}</div>
          <div class="hk-card-alt">${escapeHTML(manga.altTitle || manga.author || "")}</div>
          <div class="hk-card-meta"><span>${escapeHTML(statusLabel(manga.status))}</span><span>${escapeHTML(manga.year || "")}</span></div>
          <div class="hk-card-actions">
            <button type="button" class="hk-open" data-hk-open>Capitulos</button>
            <button type="button" class="${saved ? "saved" : ""}" data-hk-save aria-label="${saved ? "Remover da biblioteca" : "Adicionar a biblioteca"}">${saved ? "✓" : "＋"}</button>
          </div>
        </div>
      </article>
    `;
  }

  function bindCards(root, items) {
    const map = new Map(items.map(item => [item.id, item]));
    root.querySelectorAll("[data-hk-manga]").forEach(card => {
      const manga = map.get(card.dataset.hkManga);
      card.querySelector("[data-hk-open]")?.addEventListener("click", () => openDetails(manga));
      card.querySelector("[data-hk-save]")?.addEventListener("click", event => {
        const saved = toggleSaved(manga);
        event.currentTarget.textContent = saved ? "✓" : "＋";
        event.currentTarget.classList.toggle("saved", saved);
        toast(saved ? "Adicionado a sua biblioteca." : "Removido da biblioteca.");
        if (state.tab === "library") renderLibrary();
      });
    });
  }

  function renderResults() {
    const root = document.getElementById("hkContent");
    if (!root) return;
    updateWorkflow("work");
    const title = state.query ? 'Resultados para “' + state.query + '”' : "Populares com capitulos disponiveis";
    const successfulSources = (state.sourceReport?.sources || []).filter(source => source.ok && source.count).length;
    const subtitle = state.language === "pt-br"
      ? "Resultados com PT-BR primeiro; se nao houver correspondencia, mostramos outras linguas."
      : "Catalogo filtrado por " + languageLabel(state.language) + ".";
    const sourceWarnings = state.bridgeSourceReports.filter(report => !report.ok && report.error);
    if (!state.results.length) {
      root.innerHTML = `
        <div class="hk-empty"><div><b>Nenhum manga encontrado.</b>Tente o nome em portugues, ingles ou japones.</div></div>
        ${sourceWarnings.length ? `<div class="hk-source-report"><b>Diagnostico das fontes:</b>${sourceWarnings.map(report => `<span>${escapeHTML(report.source?.name || "Fonte")}: ${escapeHTML(report.error)}</span>`).join("")}</div>` : ""}
      `;
      return;
    }
    root.innerHTML = `
      <div class="hk-section-head">
        <div><h3>${escapeHTML(title)}</h3><p>${escapeHTML(subtitle)} · ${state.results.length} titulos · ${successfulSources || 1} fonte(s)</p></div>
        <button type="button" id="hkRefresh">Atualizar</button>
      </div>
      ${sourceWarnings.length ? `<div class="hk-source-report"><b>Algumas fontes nao responderam:</b>${sourceWarnings.map(report => `<span>${escapeHTML(report.source?.name || "Fonte")}: ${escapeHTML(report.error)}</span>`).join("")}</div>` : ""}
      <div class="hk-grid" id="hkResultGrid">${state.results.map(cardHTML).join("")}</div>
    `;
    document.getElementById("hkRefresh")?.addEventListener("click", loadExplore);
    bindCards(document.getElementById("hkResultGrid"), state.results);
  }

  function renderLibrary() {
    const root = document.getElementById("hkContent");
    if (!root) return;
    const query = normalize(document.getElementById("hkMangaSearch")?.value || "");
    const items = library().filter(item => !query || normalize([item.title, item.altTitle, ...(item.aliases || [])].join(" ")).includes(query));
    if (!items.length) {
      root.innerHTML = `
        <div class="hk-empty">
          <div><b>Sua biblioteca esta vazia.</b>Adicione mangas pelo Explorar para continuar rapidamente depois.<br>
          <button type="button" id="hkGoExplore">Explorar mangas</button></div>
        </div>
      `;
      document.getElementById("hkGoExplore")?.addEventListener("click", () => { state.tab = "explore"; renderTab(); });
      return;
    }
    root.innerHTML = `
      <div class="hk-section-head"><div><h3>Sua biblioteca</h3><p>${items.length} titulos salvos neste aparelho</p></div></div>
      <div class="hk-grid" id="hkLibraryGrid">${items.map(cardHTML).join("")}</div>
    `;
    bindCards(document.getElementById("hkLibraryGrid"), items);
  }

  async function openDetails(item) {
    if (!item) return;
    ensureOverlays();
    const modal = document.getElementById("hkMangaDetailModal");
    const detail = document.getElementById("hkMangaDetail");
    modal.classList.add("open");
    document.body.classList.add("hk-lock");
    state.currentManga = item;
    state.currentChapters = [];
    updateWorkflow("chapters");
    detail.innerHTML = '<div class="hk-loading">Carregando detalhes e capitulos...</div>';
    try {
      const connector = engine.connector(item.connector || "mangadex");
      const manga = await connector.manga(item.id);
      state.currentManga = manga;
      state.currentChapters = await connector.chapters(manga.id, { language: state.language });
      updateWorkflow("chapters");
      renderDetails();
    } catch (error) {
      detail.innerHTML = `
        <button class="hk-close" type="button" id="hkDetailClose">×</button>
        <div class="hk-error"><div><b>Falha ao carregar este manga.</b>${escapeHTML(error.message || "Erro desconhecido")}</div></div>
      `;
      document.getElementById("hkDetailClose")?.addEventListener("click", closeDetails);
    }
  }

  function renderDetails() {
    const detail = document.getElementById("hkMangaDetail");
    const manga = state.currentManga;
    if (!detail || !manga) return;
    const saved = isSaved(manga.id, manga.connector);
    detail.innerHTML = `
      <div class="hk-detail-hero">
        <button class="hk-close" type="button" id="hkDetailClose" aria-label="Fechar">×</button>
        <div class="hk-detail-cover" style="background-image:url('${safeCSSUrl(manga.originalCover || manga.cover)}')"></div>
        <div class="hk-detail-info">
          <div class="hk-detail-path"><span>1 · ${escapeHTML(manga.source)}</span><i>›</i><span>2 · Obra</span><i>›</i><strong>3 · Capitulos</strong></div>
          <div class="hk-detail-source">${escapeHTML(manga.source)} · ${escapeHTML(languageLabel(state.language))}</div>
          <h2>${escapeHTML(manga.title)}</h2>
          <div class="hk-detail-alt">${escapeHTML(manga.altTitle || manga.author || "")}</div>
          <p class="hk-detail-description">${escapeHTML(manga.description)}</p>
          <div class="hk-chips">
            <span class="hk-chip">${escapeHTML(statusLabel(manga.status))}</span>
            ${manga.year ? '<span class="hk-chip">' + escapeHTML(manga.year) + "</span>" : ""}
            ${(manga.tags || []).slice(0, 5).map(tag => '<span class="hk-chip">' + escapeHTML(tag) + "</span>").join("")}
          </div>
          <div class="hk-detail-actions">
            <button class="primary" type="button" id="hkContinueManga">▶ Ler do inicio / continuar</button>
            <button type="button" id="hkSaveManga">${saved ? "✓ Na biblioteca" : "☆ Adicionar a biblioteca"}</button>
            <button type="button" id="hkOpenMangaSource">Abrir fonte</button>
          </div>
        </div>
      </div>
      <div class="hk-chapter-tools">
        <input id="hkChapterSearch" placeholder="Filtrar capitulo..." autocomplete="off">
        <select id="hkChapterLanguage">
          <option value="pt-br" ${state.language === "pt-br" ? "selected" : ""}>PT-BR</option>
          <option value="en" ${state.language === "en" ? "selected" : ""}>Ingles</option>
          <option value="all" ${state.language === "all" ? "selected" : ""}>Todos</option>
        </select>
      </div>
      <div class="hk-chapter-summary" id="hkChapterSummary"></div>
      <div class="hk-chapters" id="hkChapterList"></div>
    `;

    document.getElementById("hkDetailClose").addEventListener("click", closeDetails);
    document.getElementById("hkSaveManga").addEventListener("click", event => {
      const nowSaved = toggleSaved(manga);
      event.currentTarget.textContent = nowSaved ? "✓ Na biblioteca" : "☆ Adicionar a biblioteca";
      toast(nowSaved ? "Adicionado a sua biblioteca." : "Removido da biblioteca.");
    });
    document.getElementById("hkOpenMangaSource").addEventListener("click", () => {
      const target = manga.sourceUrl || (manga.connector === "mangadex" ? "https://mangadex.org/title/" + manga.id : "");
      if (target) window.open(target, "_blank", "noopener,noreferrer");
    });
    document.getElementById("hkContinueManga").addEventListener("click", continueManga);
    document.getElementById("hkChapterSearch").addEventListener("input", renderChapterList);
    document.getElementById("hkChapterLanguage").addEventListener("change", async event => {
      state.language = event.target.value;
      localStorage.setItem(KEYS.language, state.language);
      const globalLanguage = document.getElementById("hkLanguage");
      if (globalLanguage) globalLanguage.value = state.language;
      document.getElementById("hkChapterList").innerHTML = '<div class="hk-loading">Carregando capitulos...</div>';
      try {
        state.currentChapters = await engine.connector(manga.connector).chapters(manga.id, { language: state.language });
        renderChapterList();
      } catch (error) {
        document.getElementById("hkChapterList").innerHTML = '<div class="hk-error">' + escapeHTML(error.message) + "</div>";
      }
    });
    renderChapterList();
  }

  function renderChapterList() {
    const root = document.getElementById("hkChapterList");
    const summary = document.getElementById("hkChapterSummary");
    if (!root || !summary) return;
    const filter = normalize(document.getElementById("hkChapterSearch")?.value || "");
    const chapters = state.currentChapters.filter(chapter => !filter || normalize(chapterLabel(chapter) + " " + chapter.group).includes(filter));
    summary.textContent = `${state.currentChapters.length} capitulos · ${languageLabel(state.language)} · ordem mais recente primeiro`;
    if (!chapters.length) {
      const suggestion = state.language === "pt-br" ? '<button type="button" id="hkShowAllLanguages">Ver outros idiomas</button>' : "";
      root.innerHTML = `
        <div class="hk-empty"><div><b>Nenhum capitulo neste idioma.</b>A disponibilidade depende das publicacoes da fonte.<br>${suggestion}</div></div>
      `;
      document.getElementById("hkShowAllLanguages")?.addEventListener("click", async () => {
        state.language = "all";
        document.getElementById("hkChapterLanguage").value = "all";
        state.currentChapters = await engine.connector(state.currentManga.connector).chapters(state.currentManga.id, { language: "all" });
        renderChapterList();
      });
      return;
    }
    root.innerHTML = chapters.map(chapter => {
      const progress = getProgress(chapter.id);
      const percent = Math.max(0, Math.min(100, Number(progress?.percent || 0)));
      return `
        <article class="hk-chapter ${progress?.completed ? "read" : ""}" data-hk-chapter="${escapeHTML(chapter.id)}">
          <div class="hk-chapter-main">
            <div class="hk-chapter-title">${escapeHTML(chapterLabel(chapter))}</div>
            <div class="hk-chapter-meta">
              <span>${escapeHTML(languageLabel(chapter.language))}</span>
              <span>${chapter.pageCount} paginas</span>
              ${chapter.group ? "<span>" + escapeHTML(chapter.group) + "</span>" : ""}
              ${chapter.publishedAt ? "<span>" + escapeHTML(formatDate(chapter.publishedAt)) + "</span>" : ""}
              ${progress?.completed ? '<span class="hk-read-state">✓ Lido</span>' : percent ? '<span class="hk-read-state">' + Math.round(percent) + "%</span>" : ""}
            </div>
            ${percent ? '<div class="hk-read-progress"><i style="width:' + percent + '%"></i></div>' : ""}
          </div>
          <div class="hk-chapter-actions">
            <button type="button" data-hk-read>${progress?.completed ? "Reler" : percent > 1 ? "Continuar" : "Ler"}</button>
            <button type="button" data-hk-toggle-read aria-label="${progress?.completed ? "Marcar como nao lido" : "Marcar como lido"}" title="${progress?.completed ? "Marcar como nao lido" : "Marcar como lido"}">${progress?.completed ? "↺" : "✓"}</button>
            <button type="button" data-hk-download>⇩ CBZ</button>
          </div>
        </article>
      `;
    }).join("");
    const map = new Map(chapters.map(chapter => [chapter.id, chapter]));
    root.querySelectorAll("[data-hk-chapter]").forEach(row => {
      const chapter = map.get(row.dataset.hkChapter);
      row.querySelector("[data-hk-read]").addEventListener("click", () => openReader(chapter));
      row.querySelector("[data-hk-toggle-read]").addEventListener("click", () => {
        const completed = Boolean(getProgress(chapter.id)?.completed);
        if (completed) clearProgress(chapter.id);
        else setProgress(chapter.id, {
          mangaId: state.currentManga?.id,
          mangaTitle: state.currentManga?.title,
          chapterTitle: chapterLabel(chapter),
          page: Math.max(0, Number(chapter.pageCount || 1) - 1), percent: 100,
          completed: true, scrollTop: 0, mode: preferences().mode
        });
        renderChapterList();
      });
      row.querySelector("[data-hk-download]").addEventListener("click", () => queueDownload(state.currentManga, chapter));
    });
  }

  function continueManga() {
    if (!state.currentChapters.length) { toast("Este manga ainda nao tem capitulos no idioma escolhido."); return; }
    const withProgress = state.currentChapters.map(chapter => ({ chapter, progress: getProgress(chapter.id) }))
      .filter(item => item.progress && !item.progress.completed)
      .sort((a, b) => Number(b.progress.updatedAt || 0) - Number(a.progress.updatedAt || 0));
    openReader(withProgress[0]?.chapter || state.currentChapters[state.currentChapters.length - 1]);
  }
  function closeDetails() {
    document.getElementById("hkMangaDetailModal")?.classList.remove("open");
    if (!document.getElementById("hkMangaReader")?.classList.contains("open")) document.body.classList.remove("hk-lock");
    updateWorkflow("work");
  }

  async function openReader(chapter, options = {}) {
    if (!chapter || !state.currentManga) return;
    const reader = document.getElementById("hkMangaReader");
    const loading = document.getElementById("hkReaderLoading");
    const pagesRoot = document.getElementById("hkReaderPages");
    const preserved = options.preservePage ? state.pageIndex : null;
    const opening = !reader.classList.contains("open");
    if (opening) rememberReaderFocus();
    state.currentChapter = chapter;
    state.pages = [];
    state.pageIndex = 0;
    disconnectReaderObserver();
    reader.classList.add("open");
    reader.classList.remove("ui-hidden");
    reader.setAttribute("aria-hidden", "false");
    setReaderBackgroundInert(true);
    document.body.classList.add("hk-lock");
    updateWorkflow("reader");
    document.getElementById("hkReaderTitle").textContent = state.currentManga.title;
    document.getElementById("hkReaderChapter").textContent = chapterLabel(chapter);
    pagesRoot.innerHTML = "";
    loading.classList.remove("hidden");
    loading.textContent = "Carregando paginas...";
    showReaderUI(true);
    if (opening) requestAnimationFrame(() => document.getElementById("hkReaderClose")?.focus({ preventScroll: true }));
    try {
      state.pages = await engine.connector(chapter.connector).pages(chapter.id, { quality: preferences().quality });
      pagesRoot.innerHTML = state.pages.map(page => `
        <img class="hk-reader-page" data-page="${page.index}" src="${escapeHTML(page.url)}" alt="Pagina ${page.index + 1}"
          loading="${page.index < 3 ? "eager" : "lazy"}" decoding="async" referrerpolicy="no-referrer">
      `).join("");
      pagesRoot.querySelectorAll("img").forEach(image => {
        image.addEventListener("error", () => {
          image.alt = "Falha ao carregar a pagina " + (Number(image.dataset.page) + 1);
          image.classList.add("hk-reader-error");
        }, { once: true });
      });
      loading.classList.add("hidden");
      const stored = getProgress(chapter.id);
      state.pageIndex = Math.min(state.pages.length - 1, Math.max(0, preserved == null ? Number(stored?.page || 0) : Number(preserved)));
      applyReaderPreferences();
      requestAnimationFrame(() => restoreReaderPosition(stored, options.preservePage));
    } catch (error) {
      loading.classList.add("hidden");
      pagesRoot.innerHTML = '<div class="hk-reader-error"><div><b>Nao foi possivel carregar este capitulo.</b><br>'
        + escapeHTML(error.message || "Falha na fonte") + "</div></div>";
      toast("Falha ao carregar as paginas.");
    }
  }

  function restoreReaderPosition(stored, preservePage) {
    const pref = preferences();
    if (pref.mode === "paged") { updatePagedPage(); return; }
    const canvas = document.getElementById("hkReaderCanvas");
    if (preservePage) {
      document.querySelector('.hk-reader-page[data-page="' + state.pageIndex + '"]')?.scrollIntoView({ block: "start" });
    } else if (Number(stored?.scrollTop || 0) > 0) canvas.scrollTop = Number(stored.scrollTop);
    else document.querySelector('.hk-reader-page[data-page="' + state.pageIndex + '"]')?.scrollIntoView({ block: "start" });
    observeVerticalPages();
    updateReaderProgress();
  }

  function applyReaderPreferences() {
    const pref = preferences();
    const canvas = document.getElementById("hkReaderCanvas");
    const pagesRoot = document.getElementById("hkReaderPages");
    if (!canvas || !pagesRoot) return;
    canvas.classList.toggle("vertical", pref.mode === "vertical");
    canvas.classList.toggle("paged", pref.mode === "paged");
    canvas.classList.toggle("allow-pan-x", pref.mode === "vertical" && pref.fit === "original");
    pagesRoot.style.gap = Number(pref.gap || 0) + "px";
    pagesRoot.style.filter = "brightness(" + Number(pref.brightness || 100) + "%)";
    pagesRoot.querySelectorAll(".hk-reader-page").forEach(image => {
      image.classList.remove("fit-width", "fit-contain", "fit-original");
      image.classList.add("fit-" + pref.fit);
    });
    document.getElementById("hkReaderMode").value = pref.mode;
    document.getElementById("hkReaderQuality").value = pref.quality;
    document.getElementById("hkReaderFit").value = pref.fit;
    document.getElementById("hkReaderDirection").value = pref.direction;
    document.getElementById("hkReaderGap").value = String(pref.gap);
    document.getElementById("hkReaderBrightness").value = Number(pref.brightness);
    document.getElementById("hkBrightnessLabel").textContent = Number(pref.brightness) + "%";
    disconnectReaderObserver();
    if (pref.mode === "vertical") observeVerticalPages();
    else updatePagedPage();
    updateReaderProgress();
  }

  function observeVerticalPages() {
    disconnectReaderObserver();
    const canvas = document.getElementById("hkReaderCanvas");
    const images = [...document.querySelectorAll("#hkReaderPages .hk-reader-page")];
    if (!images.length || preferences().mode !== "vertical") return;
    state.readerObserver = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible[0]) {
        state.pageIndex = Number(visible[0].target.dataset.page || 0);
        updateReaderProgress();
        scheduleProgressSave();
      }
    }, { root: canvas, threshold: [0.15, 0.35, 0.55, 0.75] });
    images.forEach(image => state.readerObserver.observe(image));
    canvas.onscroll = () => { hideReaderUI(); scheduleProgressSave(); };
  }
  function disconnectReaderObserver() { state.readerObserver?.disconnect(); state.readerObserver = null; }
  function updatePagedPage() {
    document.querySelectorAll("#hkReaderPages .hk-reader-page").forEach(image => {
      image.classList.toggle("active", Number(image.dataset.page) === state.pageIndex);
    });
    updateReaderProgress();
    scheduleProgressSave();
  }
  function movePage(delta) {
    if (!state.pages.length || preferences().mode !== "paged") return;
    const controlsWereHidden = document.getElementById("hkMangaReader")?.classList.contains("ui-hidden");
    const next = state.pageIndex + delta;
    if (next < 0 || next >= state.pages.length) { moveChapter(delta > 0 ? 1 : -1); return; }
    state.pageIndex = next;
    updatePagedPage();
    if (!controlsWereHidden) showReaderUI();
  }
  function updateReaderProgress() {
    const percent = state.pages.length ? ((state.pageIndex + 1) / state.pages.length) * 100 : 0;
    const bar = document.getElementById("hkReaderProgress");
    if (bar) bar.style.width = percent + "%";
  }
  function scheduleProgressSave() { clearTimeout(state.saveTimer); state.saveTimer = setTimeout(saveReaderProgress, 500); }
  function saveReaderProgress() {
    if (!state.currentChapter || !state.pages.length) return;
    const canvas = document.getElementById("hkReaderCanvas");
    const pref = preferences();
    let percent = ((state.pageIndex + 1) / state.pages.length) * 100;
    if (pref.mode === "vertical" && canvas.scrollHeight > canvas.clientHeight) {
      percent = (canvas.scrollTop / (canvas.scrollHeight - canvas.clientHeight)) * 100;
    }
    setProgress(state.currentChapter.id, {
      mangaId: state.currentManga?.id,
      mangaTitle: state.currentManga?.title,
      chapterTitle: chapterLabel(state.currentChapter),
      page: state.pageIndex,
      percent: Math.max(0, Math.min(100, percent)),
      completed: percent >= 96,
      scrollTop: canvas.scrollTop,
      mode: pref.mode
    });
  }
  function moveChapter(direction) {
    const index = state.currentChapters.findIndex(chapter => chapter.id === state.currentChapter?.id);
    if (index < 0) return;
    saveReaderProgress();
    const target = state.currentChapters[direction > 0 ? index - 1 : index + 1];
    if (!target) { toast(direction > 0 ? "Voce chegou ao capitulo mais recente." : "Este e o primeiro capitulo."); return; }
    openReader(target);
  }
  function setReaderUIHidden(hidden) {
    const reader = document.getElementById("hkMangaReader");
    if (!reader) return;
    const settings = document.getElementById("hkReaderSettings");
    const active = document.activeElement;
    const hiddenControlsHadFocus = Boolean(active && (
      reader.querySelector(".hk-reader-top")?.contains(active)
      || reader.querySelector(".hk-reader-bottom")?.contains(active)
      || settings?.contains(active)
    ));
    if (hidden) setReaderSettingsOpen(false);
    reader.classList.toggle("ui-hidden", hidden);
    [reader.querySelector(".hk-reader-top"), reader.querySelector(".hk-reader-bottom"), reader.querySelector(".hk-reader-progress")]
      .forEach(element => {
        if (!element) return;
        element.setAttribute("aria-hidden", String(hidden));
        if ("inert" in element) element.inert = hidden;
      });
    const hideButton = document.getElementById("hkReaderUIToggle");
    const revealButton = document.getElementById("hkReaderUIReveal");
    hideButton?.setAttribute("aria-pressed", String(hidden));
    revealButton?.setAttribute("aria-hidden", String(!hidden));
    if (revealButton && "inert" in revealButton) revealButton.inert = !hidden;
    if (hidden && hiddenControlsHadFocus) {
      requestAnimationFrame(() => {
        const focusTarget = revealButton?.getClientRects().length
          ? revealButton
          : document.getElementById("hkReaderCanvas");
        focusTarget?.focus({ preventScroll: true });
      });
    }
  }
  function showReaderUI(sticky = false) {
    const reader = document.getElementById("hkMangaReader");
    if (!reader) return;
    const revealHadFocus = document.activeElement === document.getElementById("hkReaderUIReveal");
    setReaderUIHidden(false);
    if (revealHadFocus) requestAnimationFrame(() => document.getElementById("hkReaderCanvas")?.focus({ preventScroll: true }));
    clearTimeout(state.uiTimer);
    if (!sticky) state.uiTimer = setTimeout(() => {
      const active = document.activeElement;
      const controlsHaveFocus = Boolean(active?.closest?.(".hk-reader-top,.hk-reader-bottom,.hk-reader-settings"));
      if (!controlsHaveFocus && !document.getElementById("hkReaderSettings")?.classList.contains("open")) hideReaderUI();
    }, 4300);
  }
  function hideReaderUI() {
    const reader = document.getElementById("hkMangaReader");
    if (!reader) return;
    clearTimeout(state.uiTimer);
    setReaderUIHidden(true);
  }
  function toggleReaderUI() {
    const reader = document.getElementById("hkMangaReader");
    if (!reader) return;
    if (reader.classList.contains("ui-hidden")) showReaderUI();
    else hideReaderUI();
  }
  function closeReader() {
    saveReaderProgress();
    disconnectReaderObserver();
    clearTimeout(state.uiTimer);
    setReaderUIHidden(false);
    const reader = document.getElementById("hkMangaReader");
    reader?.classList.remove("open");
    reader?.setAttribute("aria-hidden", "true");
    setReaderSettingsOpen(false);
    setReaderBackgroundInert(false);
    document.getElementById("hkReaderPages").innerHTML = "";
    state.pages = [];
    if (!document.getElementById("hkMangaDetailModal")?.classList.contains("open")) document.body.classList.remove("hk-lock");
    updateWorkflow("chapters");
    renderChapterList();
    requestAnimationFrame(restoreReaderFocus);
  }

  function renderDownloads() {
    const root = document.getElementById("hkContent");
    if (!root) return;
    const items = state.downloads;
    root.innerHTML = `
      <div class="hk-download-note">O arquivo CBZ e um ZIP de imagens compativel com Mihon, CDisplayEx e outros leitores. Baixe apenas capitulos que voce tem permissao para armazenar.</div>
      <div class="hk-section-head">
        <div><h3>Fila de downloads</h3><p>Os arquivos sao montados no seu aparelho; nada e enviado para o ResenhaFLIX.</p></div>
        ${items.length ? '<button type="button" id="hkClearDownloads">Limpar historico</button>' : ""}
      </div>
      <div class="hk-download-list" id="hkDownloadList">
        ${items.length ? items.map(downloadHTML).join("") : '<div class="hk-empty"><div><b>Nenhum download iniciado.</b>Abra um manga e toque em “CBZ” ao lado do capitulo.</div></div>'}
      </div>
    `;
    document.getElementById("hkClearDownloads")?.addEventListener("click", () => {
      state.downloads = state.downloads.filter(item => ["downloading", "preparing", "packaging"].includes(item.status));
      persistDownloads();
      renderDownloads();
    });
  }
  function downloadHTML(item) {
    const label = ({ queued: "Na fila", preparing: "Preparando", downloading: "Baixando", packaging: "Criando CBZ", completed: "Concluido", failed: "Falhou" })[item.status] || item.status;
    return `
      <article class="hk-download" data-download-id="${escapeHTML(item.id)}">
        <div>
          <div class="hk-download-title">${escapeHTML(item.mangaTitle)} · ${escapeHTML(item.chapterTitle)}</div>
          <div class="hk-download-meta">${item.done || 0} de ${item.total || "?"} paginas ${item.error ? "· " + escapeHTML(item.error) : ""}</div>
          <div class="hk-download-bar"><i style="width:${Math.max(0, Math.min(100, Number(item.progress || 0)))}%"></i></div>
        </div>
        <div class="hk-download-state">${escapeHTML(label)}</div>
      </article>
    `;
  }
  function persistDownloads() {
    writeStorage(KEYS.downloads, state.downloads.slice(0, 20).map(item => ({
      ...item,
      status: ["downloading", "preparing", "packaging"].includes(item.status) ? "failed" : item.status,
      error: item.status === "downloading" ? "Download interrompido" : item.error
    })));
  }
  function updateDownload(task, patch) {
    Object.assign(task, patch);
    if (state.tab === "downloads") renderDownloads();
    persistDownloads();
  }
  async function queueDownload(manga, chapter) {
    if (!manga || !chapter) return;
    const running = state.downloads.find(item => item.chapterId === chapter.id && ["queued", "preparing", "downloading", "packaging"].includes(item.status));
    if (running) { toast("Esse capitulo ja esta na fila."); return; }
    const task = {
      id: chapter.id + "-" + Date.now(),
      chapterId: chapter.id,
      mangaTitle: manga.title,
      chapterTitle: chapterLabel(chapter),
      status: "queued",
      progress: 0,
      done: 0,
      total: chapter.pageCount || 0,
      createdAt: Date.now(),
      error: ""
    };
    state.downloads.unshift(task);
    state.downloads = state.downloads.slice(0, 20);
    persistDownloads();
    toast("Download adicionado. Acompanhe na aba Downloads.");
    runDownload(task, manga, chapter);
  }
  async function runDownload(task, manga, chapter) {
    try {
      updateDownload(task, { status: "preparing" });
      const pages = await engine.connector(chapter.connector).pages(chapter.id, { quality: "original" });
      if (!pages.length) throw new Error("Nenhuma pagina encontrada");
      updateDownload(task, { status: "downloading", total: pages.length });
      const files = new Array(pages.length);
      let cursor = 0;
      let completed = 0;
      const worker = async () => {
        while (cursor < pages.length) {
          const index = cursor++;
          const page = pages[index];
          if (index) await new Promise(resolve => setTimeout(resolve, 90));
          const response = await fetch(page.url, { referrerPolicy: "no-referrer" });
          if (!response.ok) throw new Error("Pagina " + (index + 1) + " retornou HTTP " + response.status);
          const data = new Uint8Array(await response.arrayBuffer());
          const extension = fileExtension(page.file, response.headers.get("content-type"));
          files[index] = { name: String(index + 1).padStart(4, "0") + "." + extension, data };
          completed++;
          updateDownload(task, { done: completed, progress: Math.round((completed / pages.length) * 92) });
        }
      };
      await Promise.all(Array.from({ length: Math.min(3, pages.length) }, worker));
      updateDownload(task, { status: "packaging", progress: 95 });
      const blob = createCBZ(files);
      const filename = sanitizeFilename(manga.title + " - " + chapterLabel(chapter)) + ".cbz";
      downloadBlob(blob, filename);
      updateDownload(task, { status: "completed", progress: 100, done: pages.length });
      toast("CBZ concluido: " + filename);
    } catch (error) {
      console.error("Manga download", error);
      updateDownload(task, { status: "failed", error: error.message || "Falha no download" });
      toast("Nao foi possivel baixar o capitulo.");
    }
  }
  function fileExtension(filename, contentType = "") {
    const fromName = String(filename || "").split("?")[0].match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase();
    if (fromName && ["jpg", "jpeg", "png", "webp", "gif", "avif"].includes(fromName)) return fromName;
    if (contentType.includes("png")) return "png";
    if (contentType.includes("webp")) return "webp";
    if (contentType.includes("gif")) return "gif";
    if (contentType.includes("avif")) return "avif";
    return "jpg";
  }
  function sanitizeFilename(value) {
    return String(value || "manga").replace(/[<>:"/\\|?*\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim().slice(0, 150) || "manga";
  }
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  const crcTable = (() => {
    const table = new Uint32Array(256);
    for (let index = 0; index < 256; index++) {
      let value = index;
      for (let bit = 0; bit < 8; bit++) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
      table[index] = value >>> 0;
    }
    return table;
  })();
  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }
  function dosDateTime(date = new Date()) {
    const year = Math.max(1980, date.getFullYear());
    return {
      time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
      date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
    };
  }
  function createCBZ(files) {
    const encoder = new TextEncoder();
    const localParts = [];
    const centralParts = [];
    const timestamp = dosDateTime();
    let offset = 0;
    for (const file of files) {
      const name = encoder.encode(file.name);
      const data = file.data;
      const checksum = crc32(data);
      const local = new Uint8Array(30 + name.length);
      const localView = new DataView(local.buffer);
      localView.setUint32(0, 0x04034b50, true);
      localView.setUint16(4, 20, true);
      localView.setUint16(6, 0x0800, true);
      localView.setUint16(8, 0, true);
      localView.setUint16(10, timestamp.time, true);
      localView.setUint16(12, timestamp.date, true);
      localView.setUint32(14, checksum, true);
      localView.setUint32(18, data.length, true);
      localView.setUint32(22, data.length, true);
      localView.setUint16(26, name.length, true);
      localView.setUint16(28, 0, true);
      local.set(name, 30);
      localParts.push(local, data);

      const central = new Uint8Array(46 + name.length);
      const centralView = new DataView(central.buffer);
      centralView.setUint32(0, 0x02014b50, true);
      centralView.setUint16(4, 20, true);
      centralView.setUint16(6, 20, true);
      centralView.setUint16(8, 0x0800, true);
      centralView.setUint16(10, 0, true);
      centralView.setUint16(12, timestamp.time, true);
      centralView.setUint16(14, timestamp.date, true);
      centralView.setUint32(16, checksum, true);
      centralView.setUint32(20, data.length, true);
      centralView.setUint32(24, data.length, true);
      centralView.setUint16(28, name.length, true);
      centralView.setUint16(30, 0, true);
      centralView.setUint16(32, 0, true);
      centralView.setUint16(34, 0, true);
      centralView.setUint16(36, 0, true);
      centralView.setUint32(38, 0, true);
      centralView.setUint32(42, offset, true);
      central.set(name, 46);
      centralParts.push(central);
      offset += local.length + data.length;
    }
    const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
    const end = new Uint8Array(22);
    const endView = new DataView(end.buffer);
    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(4, 0, true);
    endView.setUint16(6, 0, true);
    endView.setUint16(8, files.length, true);
    endView.setUint16(10, files.length, true);
    endView.setUint32(12, centralSize, true);
    endView.setUint32(16, offset, true);
    endView.setUint16(20, 0, true);
    return new Blob([...localParts, ...centralParts, end], { type: "application/vnd.comicbook+zip" });
  }

  window.ResenhaMangaEngine = {
    version: VERSION,
    engine,
    state,
    mount,
    search: (query, options) => engine.search(query, options),
    openManga: openDetails,
    bridge: {
      get url() { return bridgeBase(); },
      configure: saveBridge,
      check: checkBridgeStatus
    },
    tools: { createCBZ, crc32 }
  };
  window.mangaPage = mount;
})();
