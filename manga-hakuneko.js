/*
 * ResenhaFLIX Manga Engine v32
 *
 * Arquitetura inspirada no fluxo do HakuNeko:
 * connector -> manga -> chapters -> pages -> download job.
 */
(() => {
  "use strict";

  const VERSION = "32.0.0";
  const KEYS = {
    library: "rf_hk_library_v1",
    progress: "rf_hk_progress_v1",
    preferences: "rf_hk_preferences_v1",
    query: "rf_hk_last_query_v1",
    language: "rf_hk_language_v1",
    downloads: "rf_hk_download_history_v1",
    bridge: "rf14_manga_bridge"
  };
  const state = {
    tab: "explore",
    query: localStorage.getItem(KEYS.query) || "",
    language: localStorage.getItem(KEYS.language) || "pt-br",
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
    sourceReport: null
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
  if (queryBridge) localStorage.setItem(KEYS.bridge, queryBridge);
  function bridgeBase() { return normalizeBridgeURL(localStorage.getItem(KEYS.bridge) || ""); }
  function saveBridge(value) {
    const normalized = normalizeBridgeURL(value);
    if (value && !normalized) throw new Error("Use uma URL HTTPS valida para o Manga Bridge");
    if (normalized) localStorage.setItem(KEYS.bridge, normalized);
    else localStorage.removeItem(KEYS.bridge);
    state.bridgeStatus = normalized ? "checking" : "off";
    return normalized;
  }
  function bridgeURL(path) {
    const base = bridgeBase();
    if (!base) throw new Error("Manga Bridge ainda nao foi configurado");
    return base + (String(path).startsWith("/") ? path : "/" + path);
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
  function safeCSSUrl(value = "") { return String(value).replace(/["'()\\\n\r]/g, ""); }
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
    return score + Math.min(500, Number(manga.followedCount || 0) / 1000);
  }
  async function fetchJSON(url, options = {}, timeout = 12000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: { Accept: "application/json", ...(options.headers || {}) }
      });
      if (!response.ok) throw new Error("Servidor respondeu HTTP " + response.status);
      return await response.json();
    } catch (error) {
      if (error?.name === "AbortError") throw new Error("A fonte demorou demais para responder");
      if (error instanceof TypeError && /fetch|network|load/i.test(error.message || "")) {
        const friendly = new Error("O navegador bloqueou a conexao com a fonte");
        friendly.code = "NETWORK_BLOCKED";
        friendly.cause = error;
        throw friendly;
      }
      throw error;
    } finally { clearTimeout(timer); }
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
      const url = new URL(bridgeURL(path));
      for (const [key, value] of Object.entries(parameters)) if (value != null && value !== "") url.searchParams.set(key, String(value));
      return fetchJSON(url, {}, timeout);
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
      const titles = attributes.title || {};
      const aliases = (attributes.altTitles || []).flatMap(item => Object.values(item || {})).filter(Boolean);
      const title = titles["pt-br"] || titles.en || titles.ja || Object.values(titles)[0] || "Manga";
      const altTitle = [titles.en, titles["pt-br"], ...aliases].find(item => item && item !== title) || "";
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
      if (bridgeBase()) {
        const payload = await this.bridgeGet("/api/v2/manga/search", {
          query, language, limit: Math.min(40, Math.max(1, Number(options.limit || 30)))
        });
        const items = (payload.items || []).map(item => ({ ...item, connector: this.id, tags: (item.tags || []).filter(Boolean) }));
        items.sort((a, b) => smartScore(b, query) - smartScore(a, query));
        return items;
      }
      const parameters = {
        limit: Math.min(48, Math.max(1, Number(options.limit || 30))),
        offset: 0,
        "includes[]": ["cover_art", "author", "artist"],
        "contentRating[]": ["safe", "suggestive"],
        hasAvailableChapters: true
      };
      if (query) {
        parameters.title = query;
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
      if (bridgeBase()) return this.bridgeGet("/api/v2/manga/" + id, {}, 15000);
      const payload = await fetchJSON(this.buildURL("/manga/" + id, { "includes[]": ["cover_art", "author", "artist"] }));
      return this.mapManga(payload.data);
    }
    async chapters(mangaId, options = {}) {
      if (!/^[0-9a-f-]{36}$/i.test(mangaId)) throw new Error("Identificador de manga invalido");
      const language = options.language || "pt-br";
      if (bridgeBase()) {
        const payload = await this.bridgeGet("/api/v2/manga/" + mangaId + "/chapters", { language }, 20000);
        return payload.chapters || [];
      }
      const all = [];
      const limit = 100;
      let offset = 0;
      let total = 1;
      while (offset < total && offset < 500) {
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
      const unique = new Map();
      for (const chapter of mapped) {
        const key = [chapter.volume, chapter.number, chapter.language].join("|");
        const previous = unique.get(key);
        if (!previous || chapter.pageCount > previous.pageCount || chapter.publishedAt > previous.publishedAt) unique.set(key, chapter);
      }
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
      if (bridgeBase()) {
        const payload = await this.bridgeGet("/api/v2/chapter/" + chapterId + "/pages", {
          quality: options.quality === "original" ? "original" : "data-saver"
        }, 20000);
        return payload.pages || [];
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
      return fetchJSON(bridgeURL(path), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      }, timeout);
    }
    async sources() {
      if (this.sourcesCache) return this.sourcesCache;
      try {
        const payload = await fetchJSON(bridgeURL("/api/sources"), {}, 8000);
        this.sourcesCache = (payload.sources || CURATED_BRIDGE_SOURCES).slice(0, 4);
      } catch { this.sourcesCache = CURATED_BRIDGE_SOURCES; }
      return this.sourcesCache;
    }
    mapResult(item, source) {
      const record = { source: item.source || source, url: item.url };
      return {
        id: encodeBridgeRecord(record), connector: this.id, source: (item.source || source).name || "Fonte PT-BR",
        sourceUrl: item.url, title: item.title || "Manga", altTitle: "", aliases: [], description: "Detalhes fornecidos pela fonte.",
        cover: item.thumbnail || "", originalCover: item.thumbnail || "", status: "", year: "", author: "",
        contentRating: (item.source || source).contentWarning === "safe" ? "safe" : "suggestive",
        availableLanguages: ["pt-br"], tags: ["Português"], followedCount: 0
      };
    }
    async search(query = "", options = {}) {
      if (!bridgeBase() || !query.trim() || options.language === "en") return [];
      const sources = await this.sources();
      const payload = await this.post("/api/batch/search", { sources, query: query.trim() }, 22000);
      const items = [];
      for (const result of payload.results || []) for (const item of result.items || []) items.push(this.mapResult(item, result.source));
      return items.sort((a, b) => smartScore(b, query) - smartScore(a, query)).slice(0, 30);
    }
    async manga(id) {
      if (this.detailsCache.has(id)) return this.detailsCache.get(id).manga;
      const record = decodeBridgeRecord(id);
      const details = await this.post("/api/manga", { source: record.source, url: record.url }, 18000);
      const manga = {
        id, connector: this.id, source: record.source.name || "Fonte PT-BR", sourceUrl: details.url || record.url,
        title: details.title || "Manga", altTitle: "", aliases: [], description: details.description || "Sem sinopse disponivel.",
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
      const active = this.connectors.filter(connector => connector.id !== "bridge" || (bridgeBase() && query.trim() && options.language !== "en"));
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
  function preferences() {
    return {
      mode: "vertical",
      quality: innerWidth <= 760 ? "data-saver" : "original",
      fit: "width",
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

  function ensureOverlays() {
    if (document.getElementById("hkMangaDetailModal")) return;
    document.body.insertAdjacentHTML("beforeend", `
      <div class="hk-modal" id="hkMangaDetailModal" role="dialog" aria-modal="true" aria-label="Detalhes do manga">
        <div class="hk-detail" id="hkMangaDetail"></div>
      </div>
      <section class="hk-reader" id="hkMangaReader" aria-label="Leitor de manga">
        <div class="hk-reader-top">
          <button class="hk-reader-icon" id="hkReaderClose" type="button" aria-label="Voltar">‹</button>
          <div class="hk-reader-heading">
            <div class="hk-reader-title" id="hkReaderTitle">Manga</div>
            <div class="hk-reader-chapter" id="hkReaderChapter">Capitulo</div>
          </div>
          <button class="hk-reader-icon" id="hkReaderDownload" type="button" aria-label="Baixar capitulo">⇩</button>
          <button class="hk-reader-icon" id="hkReaderSettingsButton" type="button" aria-label="Configuracoes">⚙</button>
        </div>
        <div class="hk-reader-progress"><i id="hkReaderProgress"></i></div>
        <div class="hk-reader-canvas vertical" id="hkReaderCanvas">
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
          <button type="button" id="hkNextChapter">Proximo cap.</button>
        </div>
        <aside class="hk-reader-settings" id="hkReaderSettings">
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
      document.getElementById("hkReaderSettings").classList.toggle("open");
      showReaderUI(true);
    });
    document.getElementById("hkReaderSettingsClose").addEventListener("click", () => {
      document.getElementById("hkReaderSettings").classList.remove("open");
      showReaderUI();
    });
    document.getElementById("hkReaderDownload").addEventListener("click", () => {
      if (state.currentManga && state.currentChapter) queueDownload(state.currentManga, state.currentChapter);
    });
    document.getElementById("hkPreviousChapter").addEventListener("click", () => moveChapter(-1));
    document.getElementById("hkNextChapter").addEventListener("click", () => moveChapter(1));
    document.getElementById("hkReaderTapLeft").addEventListener("click", event => { event.stopPropagation(); movePage(-1); });
    document.getElementById("hkReaderTapRight").addEventListener("click", event => { event.stopPropagation(); movePage(1); });
    document.getElementById("hkReaderCanvas").addEventListener("click", event => {
      if (!event.target.closest(".hk-tap")) showReaderUI();
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
    document.getElementById("hkReaderGap").addEventListener("change", event => {
      updatePreferences({ gap: event.target.value }); applyReaderPreferences();
    });
    document.getElementById("hkReaderBrightness").addEventListener("input", event => {
      updatePreferences({ brightness: Number(event.target.value) }); applyReaderPreferences();
    });
    document.addEventListener("keydown", event => {
      const reader = document.getElementById("hkMangaReader");
      const detail = document.getElementById("hkMangaDetailModal");
      if (event.key === "Escape") {
        if (reader?.classList.contains("open")) closeReader();
        else if (detail?.classList.contains("open")) closeDetails();
      }
      if (reader?.classList.contains("open") && preferences().mode === "paged") {
        if (event.key === "ArrowLeft") movePage(-1);
        if (event.key === "ArrowRight") movePage(1);
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

  async function checkBridgeStatus() {
    if (!bridgeBase()) { state.bridgeStatus = "off"; return state.bridgeStatus; }
    try {
      const health = await fetchJSON(bridgeURL("/api/health"), {}, 8000);
      state.bridgeStatus = health?.ok ? "ready" : "offline";
      state.bridgeHealth = health || null;
    } catch (error) {
      state.bridgeStatus = "offline";
      state.bridgeHealth = { error: error.message || "Falha de conexao" };
    }
    return state.bridgeStatus;
  }
  function updateEngineStatus() {
    const element = document.getElementById("hkEngineStatus");
    if (!element) return;
    element.classList.toggle("off", state.bridgeStatus === "off" || state.bridgeStatus === "offline");
    const text = state.bridgeStatus === "ready"
      ? `Bridge conectado · MangaDex + ${Number(state.bridgeHealth?.sources || 4)} fontes PT-BR · v${VERSION}`
      : state.bridgeStatus === "offline"
        ? `Bridge indisponivel · modo direto · v${VERSION}`
        : `Modo direto · configure o bridge · v${VERSION}`;
    element.querySelector("span").textContent = text;
  }
  function bridgeSetupMarkup(message = "") {
    return `
      <div class="hk-bridge-setup">
        <div><b>Conectar o Manga Bridge</b><p>${escapeHTML(message || "O bridge evita bloqueios do navegador e libera fontes PT-BR e download CBZ.")}</p></div>
        <div class="hk-bridge-form">
          <input id="hkBridgeInput" value="${escapeHTML(bridgeBase())}" placeholder="https://seu-servico.up.railway.app" inputmode="url" autocomplete="url">
          <button type="button" id="hkBridgeSave">Salvar e testar</button>
        </div>
        <small>A URL fica salva somente neste aparelho. O servidor precisa responder em <code>/api/health</code>.</small>
      </div>
    `;
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
  }
  function renderSources() {
    const root = document.getElementById("hkContent");
    if (!root) return;
    const ready = state.bridgeStatus === "ready";
    root.innerHTML = `
      <div class="hk-section-head"><div><h3>Fontes de manga</h3><p>Somente a area de mangas usa estas configuracoes.</p></div><button type="button" id="hkRetestBridge">Testar conexao</button></div>
      <div class="hk-source-health ${ready ? "ok" : "warn"}">
        <b>${ready ? "Manga Bridge conectado" : bridgeBase() ? "Manga Bridge sem resposta" : "Manga Bridge nao configurado"}</b>
        <span>${ready ? escapeHTML(state.bridgeHealth?.version || "online") : "O modo direto pode ser bloqueado por CORS ou pela rede."}</span>
      </div>
      ${bridgeSetupMarkup()}
      <div class="hk-source-list">
        <article><b>MangaDex</b><span>Catalogo internacional, PT-BR primeiro, leitura e CBZ pelo proxy.</span></article>
        ${CURATED_BRIDGE_SOURCES.map(source => `<article><b>${escapeHTML(source.name)}</b><span>${escapeHTML(source.lang)} · Keiyoushi · ${source.contentWarning === "safe" ? "conteudo geral" : "catalogo misto"}</span></article>`).join("")}
      </div>
      <div class="hk-source-note">O Keiyoushi fornece metadados e codigo Kotlin para aplicativos Mihon. O ResenhaFLIX nao instala APKs: o bridge implementa adaptadores web proprios para ate cinco fontes.</div>
    `;
    bindBridgeSetup(root, renderSources);
    document.getElementById("hkRetestBridge")?.addEventListener("click", async () => {
      state.bridgeStatus = "checking"; updateEngineStatus(); await checkBridgeStatus(); updateEngineStatus(); renderSources();
    });
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
    pageElement.classList.remove("hidden", "searchPage", "mangaPageModern", "mangaPageV24");
    pageElement.classList.add("hk-manga-page");
    if (pageTitle) pageTitle.textContent = "Mangas";

    pageBody.innerHTML = `
      <div class="hk-shell">
        <header class="hk-hero">
          <div>
            <div class="hk-eyebrow">RESENHAFLIX MANGA ENGINE</div>
            <h2>Leia. Continue. Baixe.</h2>
            <p>Busca inteligente com prioridade para PT-BR, leitor nativo otimizado para celular, progresso automatico e download de capitulos em CBZ.</p>
          </div>
          <div class="hk-engine-status" id="hkEngineStatus"><i></i><span>${bridgeBase() ? "Verificando Manga Bridge" : "Modo direto · bridge nao configurado"}</span></div>
        </header>
        <nav class="hk-tabs" id="hkTabs" aria-label="Secoes de manga">
          <button type="button" data-hk-tab="explore">Explorar</button>
          <button type="button" data-hk-tab="library">Biblioteca</button>
          <button type="button" data-hk-tab="downloads">Downloads</button>
          <button type="button" data-hk-tab="sources">Fontes</button>
        </nav>
        <form class="hk-searchbar" id="hkSearchForm">
          <label class="hk-sr" for="hkMangaSearch">Pesquisar manga</label>
          <input id="hkMangaSearch" value="${escapeHTML(state.query)}" placeholder="Ex.: Mago do Infinito, One Piece..." autocomplete="off">
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
    checkBridgeStatus().then(updateEngineStatus);
    renderTab();
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
    if (state.tab === "library") renderLibrary();
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
    const requestId = ++state.requestId;
    root.innerHTML = '<div class="hk-loading">Consultando o catalogo e os capitulos disponiveis...</div>';
    try {
      let items = await engine.search(state.query, { language: state.language, limit: state.query ? 36 : 30 });
      if (!items.length && state.language === "pt-br" && state.query) {
        items = await engine.search(state.query, { language: "all", limit: 24 });
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
    const hasPortuguese = (manga.availableLanguages || []).includes("pt-br");
    return `
      <article class="hk-card" data-hk-manga="${escapeHTML(manga.id)}">
        <div class="hk-cover" style="background-image:url('${safeCSSUrl(manga.cover)}')">
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
    const title = state.query ? 'Resultados para “' + state.query + '”' : "Populares com capitulos disponiveis";
    const successfulSources = (state.sourceReport?.sources || []).filter(source => source.ok && source.count).length;
    const subtitle = state.language === "pt-br"
      ? "Resultados com PT-BR primeiro; se nao houver correspondencia, mostramos outras linguas."
      : "Catalogo filtrado por " + languageLabel(state.language) + ".";
    if (!state.results.length) {
      root.innerHTML = '<div class="hk-empty"><div><b>Nenhum manga encontrado.</b>Tente o nome em portugues, ingles ou japones.</div></div>';
      return;
    }
    root.innerHTML = `
      <div class="hk-section-head">
        <div><h3>${escapeHTML(title)}</h3><p>${escapeHTML(subtitle)} · ${state.results.length} titulos · ${successfulSources || 1} fonte(s)</p></div>
        <button type="button" id="hkRefresh">Atualizar</button>
      </div>
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
    detail.innerHTML = '<div class="hk-loading">Carregando detalhes e capitulos...</div>';
    try {
      const connector = engine.connector(item.connector || "mangadex");
      const manga = await connector.manga(item.id);
      state.currentManga = manga;
      state.currentChapters = await connector.chapters(manga.id, { language: state.language });
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
        <article class="hk-chapter" data-hk-chapter="${escapeHTML(chapter.id)}">
          <div class="hk-chapter-main">
            <div class="hk-chapter-title">${escapeHTML(chapterLabel(chapter))}</div>
            <div class="hk-chapter-meta">
              <span>${escapeHTML(languageLabel(chapter.language))}</span>
              <span>${chapter.pageCount} paginas</span>
              ${chapter.group ? "<span>" + escapeHTML(chapter.group) + "</span>" : ""}
              ${chapter.publishedAt ? "<span>" + escapeHTML(formatDate(chapter.publishedAt)) + "</span>" : ""}
            </div>
            ${percent ? '<div class="hk-read-progress"><i style="width:' + percent + '%"></i></div>' : ""}
          </div>
          <div class="hk-chapter-actions">
            <button type="button" data-hk-read>${percent > 1 && percent < 98 ? "Continuar" : "Ler"}</button>
            <button type="button" data-hk-download>⇩ CBZ</button>
          </div>
        </article>
      `;
    }).join("");
    const map = new Map(chapters.map(chapter => [chapter.id, chapter]));
    root.querySelectorAll("[data-hk-chapter]").forEach(row => {
      const chapter = map.get(row.dataset.hkChapter);
      row.querySelector("[data-hk-read]").addEventListener("click", () => openReader(chapter));
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
  }

  async function openReader(chapter, options = {}) {
    if (!chapter || !state.currentManga) return;
    const reader = document.getElementById("hkMangaReader");
    const loading = document.getElementById("hkReaderLoading");
    const pagesRoot = document.getElementById("hkReaderPages");
    const preserved = options.preservePage ? state.pageIndex : null;
    state.currentChapter = chapter;
    state.pages = [];
    state.pageIndex = 0;
    disconnectReaderObserver();
    reader.classList.add("open");
    reader.classList.remove("ui-hidden");
    document.body.classList.add("hk-lock");
    document.getElementById("hkReaderTitle").textContent = state.currentManga.title;
    document.getElementById("hkReaderChapter").textContent = chapterLabel(chapter);
    pagesRoot.innerHTML = "";
    loading.classList.remove("hidden");
    loading.textContent = "Carregando paginas...";
    showReaderUI(true);
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
    pagesRoot.style.gap = Number(pref.gap || 0) + "px";
    pagesRoot.style.filter = "brightness(" + Number(pref.brightness || 100) + "%)";
    pagesRoot.querySelectorAll(".hk-reader-page").forEach(image => {
      image.classList.remove("fit-width", "fit-contain", "fit-original");
      image.classList.add("fit-" + pref.fit);
    });
    document.getElementById("hkReaderMode").value = pref.mode;
    document.getElementById("hkReaderQuality").value = pref.quality;
    document.getElementById("hkReaderFit").value = pref.fit;
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
    canvas.onscroll = () => { showReaderUI(); scheduleProgressSave(); };
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
    const next = state.pageIndex + delta;
    if (next < 0 || next >= state.pages.length) { moveChapter(delta > 0 ? 1 : -1); return; }
    state.pageIndex = next;
    updatePagedPage();
    showReaderUI();
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
  function showReaderUI(sticky = false) {
    const reader = document.getElementById("hkMangaReader");
    if (!reader) return;
    reader.classList.remove("ui-hidden");
    clearTimeout(state.uiTimer);
    if (!sticky) state.uiTimer = setTimeout(() => {
      if (!document.getElementById("hkReaderSettings")?.classList.contains("open")) reader.classList.add("ui-hidden");
    }, 4300);
  }
  function closeReader() {
    saveReaderProgress();
    disconnectReaderObserver();
    clearTimeout(state.uiTimer);
    document.getElementById("hkMangaReader")?.classList.remove("open", "ui-hidden");
    document.getElementById("hkReaderSettings")?.classList.remove("open");
    document.getElementById("hkReaderPages").innerHTML = "";
    state.pages = [];
    if (!document.getElementById("hkMangaDetailModal")?.classList.contains("open")) document.body.classList.remove("hk-lock");
    renderChapterList();
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
