import os, re, json, time, hmac, hashlib, base64, asyncio, unicodedata, ipaddress, socket
from collections import deque
from urllib.parse import urljoin, urlparse, urlencode, parse_qs, urlunparse

import httpx
from bs4 import BeautifulSoup
from fastapi import FastAPI, HTTPException, Request, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, ConfigDict, Field

try:
    # Lycan Toons rejects regular HTTP stacks by their TLS fingerprint.  This is
    # the server-side equivalent of the WebView interceptor used by Keiyoushi.
    from curl_cffi import CurlOpt
    from curl_cffi import requests as tls_requests
except ImportError:  # Keeps local/unit-test imports useful before dependencies are installed.
    CurlOpt=None;tls_requests=None

VERSION="34.0.0"
app=FastAPI(title=f"ResenhaFlix Manga Bridge v{VERSION}")
origins=[x.strip() for x in os.getenv("ALLOWED_ORIGIN","https://dip7ridu-exe.github.io").split(",") if x.strip()]
local_dev_origin_regex=r"https?://(?:localhost|127\.0\.0\.1)(?::\d+)?"
configured_secret=os.getenv("BRIDGE_SECRET","").strip()
secret=configured_secret.encode() or os.urandom(32)
public_base=os.getenv("PUBLIC_BASE_URL","").rstrip("/")
MAX_QUERY_LENGTH=200
MAX_URL_LENGTH=4096
MAX_POST_BODY_BYTES=32_768
MAX_IMAGE_BYTES=max(1_048_576,int(os.getenv("MAX_IMAGE_BYTES","26214400")))
DETAIL_DEADLINE_SECONDS=max(15.0,float(os.getenv("DETAIL_DEADLINE_SECONDS","40")))
EXPENSIVE_CONCURRENCY=max(1,int(os.getenv("EXPENSIVE_CONCURRENCY","6")))
EXPENSIVE_RATE_LIMIT=max(5,int(os.getenv("EXPENSIVE_RATE_LIMIT","40")))
RATE_WINDOW_SECONDS=60.0
ALLOWED_IMAGE_TYPES={
    "image/jpeg","image/jpg","image/png","image/x-png","image/apng",
    "image/webp","image/gif","image/avif","image/bmp","image/tiff",
}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if "*" in origins else origins,
    allow_origin_regex=local_dev_origin_regex,
    allow_methods=["GET","POST","OPTIONS"],
    allow_headers=["*"],
    allow_credentials=False,
)

def _cors_headers_for(request):
    origin=request.headers.get("origin","")
    if not origin:return {}
    if "*" in origins:return {"Access-Control-Allow-Origin":"*"}
    if origin in origins or re.fullmatch(local_dev_origin_regex,origin):
        return {"Access-Control-Allow-Origin":origin,"Vary":"Origin"}
    return {}

@app.middleware("http")
async def reject_oversized_request(request,call_next):
    if request.method in ("POST","PUT","PATCH"):
        raw_length=request.headers.get("content-length")
        if raw_length:
            try:length=int(raw_length)
            except ValueError:
                return JSONResponse({"detail":"Content-Length inválido"},status_code=400,headers=_cors_headers_for(request))
            if length<0 or length>MAX_POST_BODY_BYTES:
                return JSONResponse({"detail":"Corpo da requisição excede 32 KiB"},status_code=413,headers=_cors_headers_for(request))
    return await call_next(request)

DEFAULT_HTTP_HEADERS={
    "User-Agent":os.getenv("MANGA_USER_AGENT","Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/131 Mobile Safari/537.36"),
    "Accept-Language":"pt-BR,pt;q=0.9,en;q=0.7",
}
client=httpx.AsyncClient(
    follow_redirects=False,
    trust_env=False,
    timeout=httpx.Timeout(9.0,connect=5.0),
    headers=DEFAULT_HTTP_HEADERS,
)
_safe_clients={}
_safe_clients_lock=asyncio.Lock()
_safe_client_override=None
_dns_cache={}
_dns_cache_ttl=60.0
_json_cache={}
_cache_tasks={}
_cache_tasks_lock=asyncio.Lock()
_expensive_semaphore=asyncio.Semaphore(EXPENSIVE_CONCURRENCY)
_image_semaphore=asyncio.Semaphore(max(4,EXPENSIVE_CONCURRENCY*2))
_rate_buckets={}
_rate_lock=asyncio.Lock()

MANGADEX_API="https://api.mangadex.org"
MANGADEX_UPLOADS="https://uploads.mangadex.org"
KEIYOUSHI_REPO="https://raw.githubusercontent.com/keiyoushi/extensions/repo/index.json"
CURATED_SOURCES=[
    {"id":"saikai-scan","name":"Saikai Scan","lang":"pt-BR","homeUrl":"https://housesaikai.net","extension":"Saikai Scan","pkg":"eu.kanade.tachiyomi.extension.pt.saikaiscan","repo":KEIYOUSHI_REPO,"contentWarning":"safe"},
    {"id":"lycan-toons","name":"Lycan Toons","lang":"pt-BR","homeUrl":"https://lycantoons.com","extension":"Lycan Toons","pkg":"eu.kanade.tachiyomi.extension.pt.lycantoons","repo":KEIYOUSHI_REPO,"contentWarning":"safe"},
    {"id":"astra-toons","name":"AstraToons","lang":"pt-BR","homeUrl":"https://new.astratoons.com","extension":"AstraToons","pkg":"eu.kanade.tachiyomi.extension.pt.astratoons","repo":KEIYOUSHI_REPO,"contentWarning":"safe"},
    {"id":"mangas-brasuka","name":"Mangas Brasuka","lang":"pt-BR","homeUrl":"https://mangasbrasuka.com.br","extension":"Mangas Brasuka","pkg":"eu.kanade.tachiyomi.extension.pt.mangasbrasuka","repo":KEIYOUSHI_REPO,"contentWarning":"mixed"},
    {"id":"boruto-explorer","name":"Boruto Explorer","lang":"pt-BR","homeUrl":"https://leitor.borutoexplorer.com.br","extension":"Boruto Explorer","pkg":"eu.kanade.tachiyomi.extension.pt.borutoexplorer","repo":KEIYOUSHI_REPO,"contentWarning":"safe"},
]
DEFAULT_ALLOWED_HOSTS={
    "api.mangadex.org","uploads.mangadex.org","mangadex.org",
    "housesaikai.net","api.housesaikai.net","s3-beta.housesaikai.net",
    "lycantoons.com","new.astratoons.com","mangasbrasuka.com.br","leitor.borutoexplorer.com.br",
}
DEFAULT_ALLOWED_HOSTS.update(x.strip().lower() for x in os.getenv("SOURCE_ALLOWLIST","").split(",") if x.strip())
MANGADEX_CHAPTER_LIMIT=2000

LOOKISM_ID="596191eb-69ee-4401-983e-cc07e277fa17"
TITLE_OVERRIDES={
    LOOKISM_ID:{
        "title":"Lookism",
        "altTitle":"Aparências",
        "aliases":["Lookism","Aparências","Aparencias","Oemo Jisangjuui","Oemojisangjuui","외모지상주의"],
        "search":"Lookism",
    },
}

class Source(BaseModel):
    model_config=ConfigDict(extra="forbid")
    id:str=Field(default="",max_length=80)
    name:str=Field(default="Fonte",max_length=120)
    lang:str=Field(default="all",max_length=16)
    homeUrl:str=Field(max_length=512)
    extension:str=Field(default="",max_length=120)
    pkg:str=Field(default="",max_length=200)
    repo:str=Field(default="",max_length=512)
    contentWarning:str=Field(default="safe",max_length=24)

class SearchBody(BaseModel):
    model_config=ConfigDict(extra="forbid")
    source:Source
    query:str=Field(default="",max_length=MAX_QUERY_LENGTH)

class UrlBody(BaseModel):
    model_config=ConfigDict(extra="forbid")
    source:Source
    url:str=Field(max_length=MAX_URL_LENGTH)

class BatchSearchBody(BaseModel):
    model_config=ConfigDict(extra="forbid")
    sources:list[Source]=Field(default_factory=list,max_length=5)
    query:str=Field(default="",max_length=MAX_QUERY_LENGTH)

def host(url):
    return (urlparse(url).hostname or "").lower().removeprefix("www.")

def is_public_http_url(url):
    try:
        parsed=urlparse(str(url))
        if len(str(url))>MAX_URL_LENGTH or parsed.scheme not in ("http","https") or not parsed.hostname:return False
        if parsed.username is not None or parsed.password is not None:return False
        hostname=parsed.hostname.lower().strip(".")
        if hostname in ("localhost","localhost.localdomain") or hostname.endswith(".local"):return False
        try:
            ip=ipaddress.ip_address(hostname)
            return ip.is_global and not (ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast or ip.is_unspecified)
        except ValueError:
            return True
    except Exception:
        return False

def _is_public_ip(address):
    try:
        value=ipaddress.ip_address(str(address).split("%",1)[0])
        return value.is_global and not (
            value.is_private or value.is_loopback or value.is_link_local or
            value.is_reserved or value.is_multicast or value.is_unspecified
        )
    except ValueError:
        return False

async def resolve_public_addresses(hostname,port):
    """Resolve once, reject mixed/private answers, and return IPs to pin the socket."""
    hostname=str(hostname or "").lower().strip(".")
    if not hostname:raise HTTPException(400,"Host ausente")
    try:
        literal=ipaddress.ip_address(hostname.split("%",1)[0])
        if not _is_public_ip(literal):raise HTTPException(400,"Host privado ou reservado bloqueado")
        return [str(literal)]
    except ValueError:
        pass

    cache_key=(hostname,int(port))
    now=time.monotonic();cached=_dns_cache.get(cache_key)
    if cached and cached[0]>now:return list(cached[1])
    loop=asyncio.get_running_loop()
    try:
        records=await asyncio.wait_for(
            loop.run_in_executor(None,lambda:socket.getaddrinfo(hostname,port,type=socket.SOCK_STREAM)),
            timeout=4.0,
        )
    except asyncio.TimeoutError as exc:
        raise HTTPException(504,"DNS da fonte excedeu o tempo limite") from exc
    except socket.gaierror as exc:
        raise HTTPException(502,"Não foi possível resolver o host da fonte") from exc
    addresses=[]
    for record in records:
        address=record[4][0]
        if address not in addresses:addresses.append(address)
    # Rejecting a mixed answer prevents a resolver from selecting a private
    # fallback after validation of only the first public record.
    if not addresses or any(not _is_public_ip(address) for address in addresses):
        raise HTTPException(400,"DNS privado ou reservado bloqueado")
    addresses.sort(key=lambda value:(":" in value,value))
    _dns_cache[cache_key]=(now+_dns_cache_ttl,tuple(addresses))
    if len(_dns_cache)>256:
        for key,value in list(_dns_cache.items()):
            if value[0]<=now:_dns_cache.pop(key,None)
    return addresses

async def _safe_client_for(hostname):
    if _safe_client_override is not None:return _safe_client_override
    async with _safe_clients_lock:
        active=_safe_clients.get(hostname)
        if active is None or active.is_closed:
            active=httpx.AsyncClient(
                follow_redirects=False,trust_env=False,
                timeout=httpx.Timeout(9.0,connect=5.0),headers=DEFAULT_HTTP_HEADERS,
            )
            _safe_clients[hostname]=active
        return active

def _pinned_url(parsed,address):
    literal=f"[{address}]" if ":" in address else address
    try:port=parsed.port
    except ValueError as exc:raise HTTPException(400,"Porta inválida") from exc
    if port is not None:literal+=f":{port}"
    return urlunparse(parsed._replace(netloc=literal,fragment=""))

async def safe_request(method,url,headers=None,json_data=None,form_data=None,timeout=9,stream=False,max_redirects=5):
    """Fetch a public URL without a DNS-rebinding/redirect SSRF gap."""
    current=str(url or "");request_method=str(method or "GET").upper()
    body_json=json_data;body_form=form_data
    for redirect_count in range(max_redirects+1):
        if not is_public_http_url(current):raise HTTPException(400,"URL pública inválida")
        parsed=urlparse(current)
        try:port=parsed.port or (443 if parsed.scheme=="https" else 80)
        except ValueError as exc:raise HTTPException(400,"Porta inválida") from exc
        hostname=parsed.hostname.lower().strip(".")
        addresses=await resolve_public_addresses(hostname,port)
        host_header=f"[{hostname}]" if ":" in hostname else hostname
        default_port=443 if parsed.scheme=="https" else 80
        if parsed.port is not None and parsed.port!=default_port:
            host_header+=f":{parsed.port}"
        request_headers=dict(headers or {});request_headers["Host"]=host_header
        active=await _safe_client_for(hostname)
        kwargs={"headers":request_headers,"timeout":timeout}
        if body_json is not None:kwargs["json"]=body_json
        if body_form is not None:kwargs["data"]=body_form
        response=None;last_network_error=None
        for address in addresses[:3]:
            request=active.build_request(request_method,_pinned_url(parsed,address),**kwargs)
            request.extensions["sni_hostname"]=hostname
            try:
                response=await active.send(request,stream=stream);break
            except httpx.TransportError as exc:
                last_network_error=exc
        if response is None:raise HTTPException(502,"Falha ao conectar à fonte") from last_network_error
        response.extensions["safe_original_url"]=current
        location=response.headers.get("location")
        if response.status_code not in (301,302,303,307,308) or not location:
            return response
        await response.aclose()
        if redirect_count>=max_redirects:raise HTTPException(502,"Redirecionamentos demais na fonte")
        current=urljoin(current,location)
        # Match browser semantics while retaining bodies for 307/308.
        if response.status_code==303 or (response.status_code in (301,302) and request_method=="POST"):
            request_method="GET";body_json=None;body_form=None
    raise HTTPException(502,"Redirecionamentos demais na fonte")

def allowed_source(source):
    h=host(source.homeUrl)
    return bool(h and is_public_http_url(source.homeUrl) and h in DEFAULT_ALLOWED_HOSTS)

def source_base(source):
    return source.homeUrl.rstrip("/")

def same_source(source,url):
    a=host(source.homeUrl);b=host(url)
    return bool(allowed_source(source) and a and b and (a==b or b.endswith("."+a)))

def text(el):
    return " ".join(el.stripped_strings).strip() if el else ""

def image_attr(img):
    if not img:return ""
    for k in ("data-src","data-lazy-src","data-original","data-url","src"):
        v=(img.get(k) or "").strip()
        if v and not v.startswith("data:"):return v
    return ""

def chapter_number(name):
    s=(name or "").replace(",",".")
    m=re.search(r"(?:cap(?:ítulo|itulo|\.)?|chapter|ch\.?)\s*#?\s*(\d+(?:\.\d+)?)",s,re.I)
    if not m:m=re.search(r"(\d+(?:\.\d+)?)",s)
    return float(m.group(1)) if m else None

def request_client_key(request):
    peer=request.client.host if request.client else ""
    try:
        peer_ip=ipaddress.ip_address(peer)
        trusted_proxy=not peer_ip.is_global
    except ValueError:
        trusted_proxy=False
    candidates=[]
    if trusted_proxy:
        forwarded=request.headers.get("x-forwarded-for","")
        if forwarded:candidates.append(forwarded.split(",")[-1].strip())
        candidates.extend([request.headers.get("cf-connecting-ip",""),request.headers.get("x-real-ip","")])
    candidates.append(peer)
    value=next((item.strip() for item in candidates if item and len(item.strip())<=128),"unknown")
    return hashlib.sha256(value.encode()).hexdigest()[:24]

async def expensive_guard(request:Request):
    raw_length=request.headers.get("content-length")
    if raw_length:
        try:length=int(raw_length)
        except ValueError:raise HTTPException(400,"Content-Length inválido")
        if length<0 or length>MAX_POST_BODY_BYTES:raise HTTPException(413,"Corpo da requisição excede 32 KiB")
    key=request_client_key(request);now=time.monotonic()
    async with _rate_lock:
        if len(_rate_buckets)>2048:
            for old_key,bucket in list(_rate_buckets.items()):
                while bucket and bucket[0]<=now-RATE_WINDOW_SECONDS:bucket.popleft()
                if not bucket:_rate_buckets.pop(old_key,None)
        if key not in _rate_buckets and len(_rate_buckets)>=4096:key="overflow"
        bucket=_rate_buckets.setdefault(key,deque())
        while bucket and bucket[0]<=now-RATE_WINDOW_SECONDS:bucket.popleft()
        if len(bucket)>=EXPENSIVE_RATE_LIMIT:
            retry=max(1,int(RATE_WINDOW_SECONDS-(now-bucket[0])))
            raise HTTPException(429,"Limite temporário de consultas atingido",headers={"Retry-After":str(retry)})
        bucket.append(now)
    try:
        await asyncio.wait_for(_expensive_semaphore.acquire(),timeout=2.0)
    except asyncio.TimeoutError as exc:
        raise HTTPException(503,"Bridge ocupado; tente novamente em instantes",headers={"Retry-After":"2"}) from exc
    try:
        yield
    finally:
        _expensive_semaphore.release()

async def run_with_deadline(awaitable,seconds=DETAIL_DEADLINE_SECONDS):
    try:return await asyncio.wait_for(awaitable,timeout=seconds)
    except asyncio.TimeoutError as exc:raise HTTPException(504,"A fonte excedeu o tempo limite global") from exc

async def get_html(url,referer=None,timeout=7):
    if not is_public_http_url(url):raise HTTPException(400,"URL de fonte inválida")
    headers={"Accept":"text/html,application/xhtml+xml"}
    if referer:headers["Referer"]=referer
    r=await safe_request("GET",url,headers=headers,timeout=timeout)
    if r.status_code>=400:raise HTTPException(502,f"Fonte HTTP {r.status_code}")
    return r.text,str(r.extensions.get("safe_original_url") or url)

async def post_form(url,data,referer=None,timeout=7):
    if not is_public_http_url(url):raise HTTPException(400,"URL de fonte inválida")
    headers={"Accept":"text/html,*/*","X-Requested-With":"XMLHttpRequest"}
    if referer:headers["Referer"]=referer
    r=await safe_request("POST",url,headers=headers,form_data=data,timeout=timeout)
    if r.status_code>=400:raise HTTPException(r.status_code,f"Fonte HTTP {r.status_code}")
    return r.text,str(r.extensions.get("safe_original_url") or url)

def source_dict(source):
    return source.model_dump()

async def cached_json(key,ttl,loader):
    now=time.time();cached=_json_cache.get(key)
    if cached and cached[0]>now:return cached[1]
    async with _cache_tasks_lock:
        now=time.time();cached=_json_cache.get(key)
        if cached and cached[0]>now:return cached[1]
        task=_cache_tasks.get(key)
        if task is None:
            async def run():
                async with asyncio.timeout(DETAIL_DEADLINE_SECONDS+5):
                    value=await loader()
                _json_cache[key]=(time.time()+ttl,value)
                if len(_json_cache)>300:
                    for old_key in sorted(_json_cache,key=lambda k:_json_cache[k][0])[:80]:_json_cache.pop(old_key,None)
                return value
            task=asyncio.create_task(run());_cache_tasks[key]=task
            def complete(done,cache_key=key):
                if _cache_tasks.get(cache_key) is done:_cache_tasks.pop(cache_key,None)
                try:done.exception()
                except (asyncio.CancelledError,Exception):pass
            task.add_done_callback(complete)
    return await asyncio.shield(task)

def adapter_name(source):
    p=(source.pkg or "").lower()
    h=host(source.homeUrl)
    if p.endswith(".lycantoons") or h=="lycantoons.com":
        return "lycantoons"
    if p.endswith(".astratoons") or h=="new.astratoons.com":
        return "astratoons"
    if p.endswith(".mangasbrasuka") or h=="mangasbrasuka.com.br":
        return "mangasbrasuka"
    if p.endswith(".borutoexplorer") or h=="leitor.borutoexplorer.com.br":
        return "madara"
    if p.endswith(".saikaiscan") or "housesaikai" in h or source.name.lower()=="saikai scan":
        return "saikai"
    if p.endswith(".lermangas"):
        return "madara"
    if p.endswith(".mangotoons"):
        return "login-required"
    return "auto"

async def get_json(url,source,timeout=8):
    headers={
      "Accept":"application/json, text/plain, */*",
      "Origin":source.homeUrl,
      "Referer":source.homeUrl.rstrip("/")+"/",
    }
    r=await safe_request("GET",url,headers=headers,timeout=timeout)
    if r.status_code>=400:raise HTTPException(502,f"Fonte HTTP {r.status_code}")
    return r.json()

async def post_json(url,data,source,timeout=8):
    headers={
      "Accept":"application/json, text/plain, */*",
      "Content-Type":"application/json",
      "Origin":source.homeUrl,
      "Referer":source.homeUrl.rstrip("/")+"/",
    }
    r=await safe_request("POST",url,headers=headers,json_data=data,timeout=timeout)
    if r.status_code>=400:raise HTTPException(502,f"Fonte HTTP {r.status_code}")
    return r.json()

# ---------- signed image proxy ----------
def sign_image(url,referer):
    payload=json.dumps({"u":url,"r":referer,"e":int(time.time())+21600},separators=(",",":")).encode()
    token=base64.urlsafe_b64encode(payload).decode().rstrip("=")
    sig=hmac.new(secret,token.encode(),hashlib.sha256).hexdigest()
    return token,sig

def proxied_image(request,url,referer):
    token,sig=sign_image(url,referer)
    base=public_base or str(request.base_url).rstrip("/")
    return base+"/api/image?"+urlencode({"token":token,"sig":sig})

# ---------- Madara ----------
def parse_madara_cards(html,base,source):
    soup=BeautifulSoup(html,"html.parser")
    selectors=[
      "div.c-tabs-item__content",".manga__item",
      "div.page-item-detail",".page-item-detail",
      ".row.c-tabs-item__content"
    ]
    out=[];seen=set()
    for sel in selectors:
        for el in soup.select(sel):
            a=el.select_one("div.post-title a,h3 a,h4 a,a[href]")
            img=el.select_one("img")
            if not a:continue
            title=(a.get_text(" ",strip=True) or a.get("title") or (img.get("alt") if img else "") or "").strip()
            url=urljoin(base,a.get("href",""))
            if len(title)<2 or not url or url in seen:continue
            seen.add(url)
            out.append({"title":title,"url":url,"thumbnail":urljoin(base,image_attr(img)),"source":source_dict(source),"adapter":"madara"})
        if out:break
    return out[:30]

async def madara_search(source,query):
    base=source_base(source)
    urls=[
      f"{base}/?{urlencode({'s':query,'post_type':'wp-manga'})}",
      f"{base}/?{urlencode({'s':query})}",
    ]
    for u in urls:
        try:
            html,final=await get_html(u,base,6)
            items=parse_madara_cards(html,final,source)
            if items:return items
        except Exception:
            pass
    # Madara AJAX load-more search.
    try:
        form={
          "action":"madara_load_more","page":"0",
          "template":"madara-core/content/content-search",
          "vars[paged]":"1","vars[template]":"archive","vars[sidebar]":"right",
          "vars[post_type]":"wp-manga","vars[post_status]":"publish",
          "vars[manga_archives_item_layout]":"big_thumbnail","vars[s]":query,
          "vars[meta_query][0][key]":"_wp_manga_chapter_type",
          "vars[meta_query][0][value]":"manga",
        }
        html,final=await post_form(base+"/wp-admin/admin-ajax.php",form,base,6)
        return parse_madara_cards(html,base,source)
    except Exception:
        return []

async def madara_popular(source):
    base=source_base(source)
    for u in (f"{base}/manga/?m_orderby=views",base):
        try:
            html,final=await get_html(u,base,6)
            items=parse_madara_cards(html,final,source)
            if items:return items
        except Exception:pass
    return []

def parse_madara_chapters(soup,base):
    out=[];seen=set()
    for a in soup.select("li.wp-manga-chapter a,.wp-manga-chapter a,.chapter-link-item a,.chapter-name a,.eph-num a,#chapterlist li a"):
        u=urljoin(base,a.get("href",""));name=text(a)
        if not u or not name or u in seen:continue
        seen.add(u);out.append({"name":name,"url":u,"number":chapter_number(name)})
    return out

async def madara_details(source,url):
    html,final=await get_html(url,source.homeUrl,7)
    soup=BeautifulSoup(html,"html.parser")
    title=text(soup.select_one("div.post-title h1,.post-title h1,h1")) or "Mangá"
    cover=urljoin(final,image_attr(soup.select_one(".summary_image img,.summary-image img,.manga-thumb img,.tab-summary img")))
    desc=text(soup.select_one(".summary__content,.description-summary,.manga-excerpt,.description,.manga-summary"))
    chapters=parse_madara_chapters(soup,final)

    if not chapters:
        holder=soup.select_one("div[id^='manga-chapters-holder']")
        manga_id=(holder.get("data-id") if holder else "") or ""
        if manga_id:
            # Old Madara endpoint, then new endpoint.
            try:
                body,_=await post_form(source_base(source)+"/wp-admin/admin-ajax.php",{"action":"manga_get_chapters","manga":manga_id},final,7)
                chapters=parse_madara_chapters(BeautifulSoup(body,"html.parser"),final)
            except Exception:
                pass
        if not chapters:
            try:
                body,_=await post_form(final.rstrip("/")+"/ajax/chapters",{},final,7)
                chapters=parse_madara_chapters(BeautifulSoup(body,"html.parser"),final)
            except Exception:
                pass

    chapters.sort(key=lambda x:(x["number"] is None,x["number"] if x["number"] is not None else 999999))
    return {"title":title,"cover":cover,"description":desc,"url":final,"chapters":chapters,"source":source_dict(source),"adapter":"madara"}

async def madara_pages(source,url,request):
    # Many Madara sites expose all images with style=list.
    target=url
    if "style=" not in target:
        target += ("&" if "?" in target else "?")+"style=list"
    html,final=await get_html(target,source.homeUrl,8)
    soup=BeautifulSoup(html,"html.parser")
    selectors=[
      "div.page-break img","li.blocks-gallery-item img",
      ".reading-content .text-left img",".reading-content img",
      ".reader-area img","#readerarea img",".readercontent img",
      ".chapter-content img",".container-chapter-reader img"
    ]
    pages=[];seen=set()
    for sel in selectors:
        for img in soup.select(sel):
            raw=image_attr(img);u=urljoin(final,raw)
            if not u or u in seen:continue
            low=u.lower()
            if any(x in low for x in ("logo","avatar","icon","banner")):continue
            # Do not use a plain "ads" substring: every WordPress /uploads/ URL contains it.
            if re.search(r"/(?:ads?|adverts?|advertisements?)(?:/|[-_.])",urlparse(u).path.lower()):continue
            seen.add(u);pages.append({"image":proxied_image(request,u,final),"original":u})
        if pages:break
    return pages

# ---------- Saikai Scan exact API adapter ----------
def saikai_hosts(source):
    h=host(source.homeUrl)
    return f"https://api.{h}",f"https://s3-beta.{h}"

def saikai_story_item(story,source,storage):
    slug=str(story.get("slug") or "")
    title=str(story.get("title") or "Mangá")
    image=str(story.get("image") or "")
    return {
      "title":title,
      "url":source_base(source)+"/comics/"+slug,
      "thumbnail":storage.rstrip("/")+"/"+image.lstrip("/") if image else "",
      "source":source_dict(source),"adapter":"saikai","slug":slug
    }

async def saikai_json(url,source):
    headers={"Accept":"application/json, text/plain, */*","Origin":source.homeUrl,"Referer":source.homeUrl.rstrip("/")+"/"}
    r=await safe_request("GET",url,headers=headers,timeout=8)
    if r.status_code>=400:raise HTTPException(502,f"Saikai HTTP {r.status_code}")
    return r.json()

async def saikai_search(source,query):
    api,storage=saikai_hosts(source)
    params={"format":"2","q":query,"sortProperty":"pageViews","sortDirection":"desc","page":"1","per_page":"24","relationships":"language,type,format"}
    data=await saikai_json(api+"/api/stories?"+urlencode(params),source)
    return [saikai_story_item(x,source,storage) for x in (data.get("data") or [])]

async def saikai_popular(source):
    api,storage=saikai_hosts(source)
    params={"format":"2","sortProperty":"pageviews","sortDirection":"desc","page":"1","per_page":"24","relationships":"language,type,format"}
    data=await saikai_json(api+"/api/stories?"+urlencode(params),source)
    return [saikai_story_item(x,source,storage) for x in (data.get("data") or [])]

async def saikai_details(source,url):
    api,storage=saikai_hosts(source)
    slug=url.rstrip("/").split("/")[-1]
    params={"format":"2","slug":slug,"per_page":"1","relationships":"language,type,format,artists,status,releases"}
    data=await saikai_json(api+"/api/stories?"+urlencode(params),source)
    stories=data.get("data") or []
    if not stories:raise HTTPException(404,"Mangá não encontrado")
    s=stories[0]
    chapters=[]
    for r in s.get("releases") or []:
        if int(r.get("is_active",1) or 1)!=1:continue
        ch=str(r.get("chapter") or "")
        rid=r.get("id")
        rslug=str(r.get("slug") or "")
        name=f"Capítulo {ch}"+(f" - {r.get('title')}" if r.get("title") else "")
        chapters.append({"name":name,"number":float(ch) if re.fullmatch(r"\d+(?:\.\d+)?",ch) else chapter_number(name),"url":source_base(source)+f"/ler/comics/{slug}/{rid}/{rslug}","releaseId":rid})
    chapters.sort(key=lambda x:(x["number"] is None,x["number"] if x["number"] is not None else 999999))
    synopsis=BeautifulSoup(str(s.get("synopsis") or ""),"html.parser").get_text("\n",strip=True)
    image=str(s.get("image") or "")
    return {"title":s.get("title") or "Mangá","cover":storage.rstrip("/")+"/"+image.lstrip("/") if image else "","description":synopsis,"url":url,"chapters":chapters,"source":source_dict(source),"adapter":"saikai"}

async def saikai_pages(source,url,request):
    api,storage=saikai_hosts(source)
    parts=url.rstrip("/").split("/")
    release_id=parts[-2] if len(parts)>=2 else ""
    data=await saikai_json(api+f"/api/releases/{release_id}?relationships=releaseImages",source)
    release=data.get("data") or {}
    pages=[]
    for obj in release.get("release_images") or release.get("releaseImages") or []:
        image=str(obj.get("image") or "")
        if not image:continue
        u=storage.rstrip("/")+"/"+image.lstrip("/")
        pages.append({"image":proxied_image(request,u,source.homeUrl),"original":u})
    return pages

# ---------- LycanToons Next.js JSON API ----------
_lycan_tls_mode=False
_lycan_tls_lock=asyncio.Lock()
_lycan_tls_cookies={}

def normalized_title(value):
    value=unicodedata.normalize("NFD",str(value or "").lower())
    value="".join(ch for ch in value if unicodedata.category(ch)!="Mn")
    return re.sub(r"[^a-z0-9]+"," ",value).strip()

def lycan_headers(source,path="/",rsc=False):
    headers={
        "Accept":"text/x-component,*/*;q=0.8" if rsc else "application/json, text/plain, */*",
        "Accept-Language":"pt-BR,pt;q=0.9,en;q=0.7",
        "Referer":source_base(source)+"/",
    }
    if rsc:
        headers.update({
            "RSC":"1","next-url":path,
            "next-router-state-tree":"%5B%22%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2Cnull%2Cnull%5D%7D%2Cnull%2Cnull%2Ctrue%5D",
        })
    return headers

def lycan_tls_request_sync(source,method,url,headers,json_data,timeout,addresses):
    if tls_requests is None:
        raise RuntimeError("curl-cffi não está instalado no Manga Bridge")
    parsed=urlparse(url);port=parsed.port or (443 if parsed.scheme=="https" else 80)
    resolve=[]
    for address in addresses:
        literal=f"[{address}]" if ":" in address else address
        resolve.append(f"{parsed.hostname}:{port}:{literal}")
    session=tls_requests.Session(
        impersonate="chrome",
        curl_options={CurlOpt.RESOLVE:resolve,CurlOpt.PROXY:""} if CurlOpt is not None else {},
    )
    try:
        if _lycan_tls_cookies:session.cookies.update(_lycan_tls_cookies)
        # Establish first-party cookies using the same browser fingerprint as the
        # API call. This mirrors the WebView warm-up in the Keiyoushi extension.
        try:
            session.get(source_base(source)+"/",headers={"Accept":"text/html,application/xhtml+xml"},timeout=timeout,allow_redirects=False)
        except Exception:
            pass
        # curl-cffi supplies a coherent Chrome header set. Adding httpx-style
        # Referer/Accept headers to ordinary API calls triggers Lycan's WAF.
        request_headers=headers if headers.get("RSC") else None
        response=session.request(method,url,headers=request_headers,json=json_data,timeout=timeout,allow_redirects=False)
        # The site's own Keiyoushi interceptor repeats a request once after 403;
        # Lycan rotates its edge state and commonly accepts the second attempt.
        if int(response.status_code)==403:
            response=session.request(method,url,headers=request_headers,json=json_data,timeout=timeout,allow_redirects=False)
        return int(response.status_code),str(response.text),dict(response.headers),str(response.url)
    finally:
        try:
            _lycan_tls_cookies.clear();_lycan_tls_cookies.update(session.cookies.get_dict())
        except Exception:pass
        try:session.close()
        except Exception:pass

async def lycan_request(source,method,path,json_data=None,timeout=12,rsc=False):
    """Fetch Lycan with a browser TLS fingerprint when regular httpx is blocked."""
    global _lycan_tls_mode
    clean_path="/"+str(path or "").lstrip("/")
    target=source_base(source)+clean_path
    if not same_source(source,target):raise HTTPException(400,"URL fora da fonte")
    parsed_target=urlparse(target);target_port=parsed_target.port or (443 if parsed_target.scheme=="https" else 80)
    addresses=await resolve_public_addresses(parsed_target.hostname,target_port)
    headers=lycan_headers(source,clean_path,rsc)
    if json_data is not None:headers["Content-Type"]="application/json"
    status=0;text_body="";response_headers={};final_url=target
    if not _lycan_tls_mode:
        try:
            response=await safe_request(method,target,headers=headers,json_data=json_data,timeout=timeout,max_redirects=0)
            status=response.status_code;text_body=response.text;response_headers=dict(response.headers);final_url=str(response.url)
            if status!=403:
                if status>=400:raise HTTPException(502,f"Lycan Toons HTTP {status}")
                return text_body,response_headers
            _lycan_tls_mode=True
        except HTTPException:
            raise
        except Exception:
            _lycan_tls_mode=True
    async with _lycan_tls_lock:
        try:
            status,text_body,response_headers,final_url=await asyncio.to_thread(
                lycan_tls_request_sync,source,method,target,headers,json_data,timeout,addresses,
            )
        except Exception as exc:
            raise HTTPException(502,"Lycan Toons bloqueou o Bridge; o transporte de navegador falhou") from exc
    if not same_source(source,final_url):raise HTTPException(502,"Lycan Toons redirecionou para um host não permitido")
    if status>=400:raise HTTPException(502,f"Lycan Toons HTTP {status} mesmo com transporte de navegador")
    if len(text_body)>16_000_000:raise HTTPException(502,"Resposta da Lycan Toons excedeu o limite seguro")
    return text_body,response_headers

async def lycan_json(source,method,path,json_data=None,timeout=12):
    body,_=await lycan_request(source,method,path,json_data,timeout,False)
    try:return json.loads(body)
    except Exception as exc:raise HTTPException(502,"Lycan Toons retornou JSON inválido") from exc

def lycan_item(obj,source):
    slug=str(obj.get("slug") or "").strip("/")
    title=str(obj.get("title") or "").strip()
    if not slug or not title:return None
    alternatives=unique_titles([
        obj.get("alternativeTitle"),obj.get("altTitle"),obj.get("original_title"),
        *((obj.get("alternativeTitles") or []) if isinstance(obj.get("alternativeTitles"),list) else []),
    ])
    return {
      "title":title,
      "altTitle":alternatives[0] if alternatives else "","aliases":alternatives,
      "url":source_base(source)+"/series/"+slug,
      "thumbnail":str(obj.get("coverUrl") or obj.get("cover_url") or ""),
      "description":str(obj.get("description") or ""),
      "source":source_dict(source),"adapter":"lycantoons","slug":slug,
    }

async def lycan_search(source,query):
    payload={"limit":20,"page":1,"search":query,"seriesType":"","status":"","tags":[]}
    async def load():
        data=await lycan_json(source,"POST","/api/series",payload,14)
        raw=data.get("series") or data.get("data") or data.get("items") or []
        return [item for obj in raw if isinstance(obj,dict) and (item:=lycan_item(obj,source))]
    return await cached_json("lycan:search:"+normalized_title(query),120,load)

async def lycan_popular(source):
    async def load():
        data=await lycan_json(source,"GET","/api/metrics/popular?limit=20&page=1",None,14)
        raw=data.get("data") or data.get("series") or data.get("items") or []
        return [item for obj in raw if isinstance(obj,dict) and (item:=lycan_item(obj,source))]
    return await cached_json("lycan:popular:1",300,load)

async def lycan_series_by_slug(source,slug):
    async def load():
        words=[word for word in slug.split("-") if word]
        queries=unique_titles([" ".join(words)," ".join(words[:2]),words[0] if words else ""])
        for query in queries:
            payload={"limit":20,"page":1,"search":query,"seriesType":"","status":"","tags":[]}
            data=await lycan_json(source,"POST","/api/series",payload,14)
            candidates=data.get("series") or data.get("data") or data.get("items") or []
            exact=next((item for item in candidates if isinstance(item,dict) and item.get("slug")==slug),None)
            if exact:return exact
        # Some titles are searchable only by an original/translated name not
        # present in the slug. Walk the compact catalogue as a final fallback.
        page=1;total_pages=1
        while page<=min(total_pages,25):
            payload={"limit":20,"page":page,"search":"","seriesType":"","status":"","tags":[]}
            data=await lycan_json(source,"POST","/api/series",payload,14)
            candidates=data.get("series") or data.get("data") or data.get("items") or []
            exact=next((item for item in candidates if isinstance(item,dict) and item.get("slug")==slug),None)
            if exact:return exact
            pagination=data.get("pagination") or {};total_pages=max(1,int(pagination.get("totalPages") or 1));page+=1
        return None
    return await cached_json("lycan:series:"+slug,300,load)

def walk_json(value):
    yield value
    if isinstance(value,dict):
        for child in value.values():yield from walk_json(child)
    elif isinstance(value,list):
        for child in value:yield from walk_json(child)

def flight_documents(body):
    """Extract JSON rows from raw RSC or embedded self.__next_f payloads."""
    decoder=json.JSONDecoder();documents=[];payloads=[]
    if "<" in body and "self.__next_f.push" in body:
        soup=BeautifulSoup(body,"html.parser")
        for script in soup.select("script:not([src])"):
            data=script.string or script.get_text() or "";position=0;marker="self.__next_f.push("
            while True:
                start=data.find(marker,position)
                if start<0:break
                start+=len(marker)
                try:
                    array,end=decoder.raw_decode(data[start:]);position=start+end
                    if isinstance(array,list) and len(array)>1 and isinstance(array[1],str):payloads.append(array[1])
                except Exception:position=start+1
        next_data=soup.select_one("script#__NEXT_DATA__")
        if next_data:
            try:documents.append(json.loads(next_data.string or next_data.get_text() or "{}"))
            except Exception:pass
    else:payloads.append(body)

    for payload in payloads:
        position=0
        while position<len(payload):
            colon=payload.find(":",position)
            if colon<0:break
            chunk_id=payload[position:colon]
            if not chunk_id or not all(ch in "0123456789abcdefABCDEF" for ch in chunk_id):
                position+=1;continue
            start=colon+1
            if start<len(payload) and payload[start]=="T":
                comma=payload.find(",",start+1)
                if comma<0:break
                try:length=int(payload[start+1:comma],16)
                except ValueError:position=start+1;continue
                position=comma+1+length;continue
            try:
                value,end=decoder.raw_decode(payload[start:]);documents.append(value);position=start+end
            except Exception:position=start+1
    return documents

def rsc_documents(raw):
    documents=flight_documents(raw)
    if documents:return documents
    # Backward-compatible fallback for older/raw Next.js payload shapes.
    decoder=json.JSONDecoder();texts=[raw]
    if '\\"' in raw:texts.append(raw.replace('\\"','"').replace('\\\\','\\'))
    for candidate in texts:
        for line in candidate.splitlines():
            payload=line.split(":",1)[-1].strip()
            if payload.startswith(("{","[")):
                try:documents.append(json.loads(payload))
                except Exception:pass
        for start in [m.start() for m in re.finditer(r"[\[{]",candidate)][:500]:
            try:value,_=decoder.raw_decode(candidate[start:]);documents.append(value)
            except Exception:pass
    return documents

def rsc_find(raw,key):
    matches=[]
    for document in rsc_documents(raw):
        for value in walk_json(document):
            if isinstance(value,dict) and key in value:matches.append((value[key],value))
    if not matches:return None,None
    if key in ("capitulos","imageUrls"):
        return max(matches,key=lambda match:len(match[0]) if isinstance(match[0],list) else -1)
    return matches[0]

def rsc_series(raw,slug):
    candidates=[]
    for document in rsc_documents(raw):
        for value in walk_json(document):
            if not isinstance(value,dict) or str(value.get("slug") or "").strip("/")!=slug:continue
            score=sum(bool(value.get(key)) for key in ("title","coverUrl","description","author","genre"))
            candidates.append((score,value))
    return max(candidates,key=lambda pair:pair[0])[1] if candidates else None

async def lycan_rsc(source,path):
    target=source_base(source)+path
    separator="&" if "?" in target else "?";request_url=target+separator+"_rsc=rf32a"
    request_path=urlparse(request_url).path+(("?"+urlparse(request_url).query) if urlparse(request_url).query else "")
    try:
        body,_=await lycan_request(source,"GET",request_path,None,14,True)
    except HTTPException:
        # The current Cloudflare rule accepts browser navigation but rejects
        # direct RSC even with an identical TLS fingerprint. This is also the
        # fallback used by Keiyoushi's WebViewInterceptor.
        body,_=await lycan_request(source,"GET",path,None,14,False)
    return body

async def lycan_payload(source,path,key):
    raw=await lycan_rsc(source,path)
    value,obj=rsc_find(raw,key)
    if value is not None:return raw,value,obj
    # Keiyoushi falls back to a normal document in WebView; curl-cffi lets the
    # server do the same while retaining a real Chrome TLS/HTTP2 signature.
    body,_=await lycan_request(source,"GET",path,None,14,False)
    value,obj=rsc_find(body,key)
    return body,value,obj

async def lycan_details(source,url):
    slug=urlparse(url).path.rstrip("/").split("/")[-1]
    obj=await lycan_series_by_slug(source,slug)
    if not obj:raise HTTPException(404,"Obra não encontrada na Lycan Toons")
    title=obj.get("title") or slug.replace("-"," ").title()
    cover=obj.get("coverUrl") or "";description=obj.get("description") or ""
    chapter_data=await lycan_json(source,"GET",f"/api/series/{slug}/chapters",None,14)
    chapters_value=chapter_data.get("chapters") or chapter_data.get("data") or [];chapters=[]
    for chapter in chapters_value or []:
        if not isinstance(chapter,dict):continue
        number=str(chapter.get("numero") or "").strip()
        try:page_count=max(0,int(chapter.get("pageCount") or 0))
        except (TypeError,ValueError):page_count=0
        if not number:continue
        chapter_id=chapter.get("id")
        chapter_url=source_base(source)+f"/series/{slug}/{number}"
        if chapter_id:chapter_url+="?chapterId="+str(chapter_id)
        chapters.append({"name":f"Capítulo {number}","number":chapter_number(number),"url":chapter_url,"pageCount":page_count,"publishedAt":chapter.get("createdAt") or "","chapterId":chapter_id})
    chapters.sort(key=lambda x:(x["number"] is not None,x["number"] or -1),reverse=True)
    alternatives=unique_titles([obj.get("alternativeTitle"),obj.get("altTitle"),obj.get("original_title")])
    return {"title":title,"altTitle":alternatives[0] if alternatives else "","aliases":alternatives,"cover":cover,"description":description,"url":url,"chapters":chapters,"source":source_dict(source),"adapter":"lycantoons"}

async def lycan_pages(source,url,request):
    path=urlparse(url).path
    query=parse_qs(urlparse(url).query);chapter_id=(query.get("chapterId") or [""])[0]
    urls=None
    if chapter_id:
        try:
            data=await lycan_json(source,"GET",f"/api/chapters/{chapter_id}/pages",None,14)
            urls=data.get("imageUrls") or data.get("images") or data.get("pages")
        except HTTPException:
            urls=None
    if not urls:
        try:_,urls,_=await lycan_payload(source,path,"imageUrls")
        except HTTPException as exc:
            raise HTTPException(502,"A Lycan Toons exige uma sessão de navegador para abrir este capítulo; use AstraToons quando a obra estiver disponível lá") from exc
    pages=[]
    for image_url in urls or []:
        if not isinstance(image_url,str) or not is_public_http_url(image_url):continue
        pages.append({"image":proxied_image(request,image_url,url),"original":image_url})
    return pages

# ---------- AstraToons API/HTML adapter ----------
ASTRA_LOOKISM_ALIASES={"lookism","aparencias","aparencia","oemo jisangjuui","oemojisangjuui"}

def canonical_astra_query(query):
    return "aparencias" if normalized_title(query) in ASTRA_LOOKISM_ALIASES else str(query or "").strip()

def astra_alternatives(obj,slug=""):
    raw=obj.get("alternative_titles") or obj.get("alternativeTitles") or []
    values=[]
    for value in raw if isinstance(raw,list) else [raw]:
        if isinstance(value,dict):values.extend(value.values())
        else:values.append(value)
    if slug=="aparencias":values.insert(0,"Lookism")
    return unique_titles(values)

def astra_item(obj,source):
    slug=str(obj.get("slug") or "").strip("/");title=str(obj.get("title") or "").strip()
    if not slug or not title:return None
    cover=str(obj.get("cover_image") or obj.get("coverImage") or "").strip("/")
    alternatives=astra_alternatives(obj,slug)
    description=BeautifulSoup(str(obj.get("description") or ""),"html.parser").get_text(" ",strip=True)
    tags=[]
    for tag in obj.get("tags") or []:
        name=tag.get("name") if isinstance(tag,dict) else tag
        if isinstance(name,dict):name=name.get("pt_BR") or name.get("pt-br") or next(iter(name.values()),"")
        if name:tags.append(str(name))
    return {
        "title":title,"altTitle":alternatives[0] if alternatives else "","aliases":alternatives,
        "url":source_base(source)+"/comics/"+slug,
        "thumbnail":source_base(source)+"/storage/"+cover if cover else "",
        "description":description,"status":obj.get("status") or "","year":obj.get("release_year") or "",
        "tags":unique_titles(tags),"chapterCount":int(obj.get("chapters_count") or 0),
        "source":source_dict(source),"adapter":"astratoons","slug":slug,"comicId":obj.get("id"),
    }

async def astra_search(source,query):
    canonical=canonical_astra_query(query)
    async def load():
        data=await get_json(source_base(source)+"/api/comics?"+urlencode({"page":1,"search":canonical}),source,12)
        return [item for obj in (data.get("data") or []) if isinstance(obj,dict) and (item:=astra_item(obj,source))]
    return await cached_json("astra:search:"+normalized_title(canonical),120,load)

async def astra_popular(source):
    async def load():
        data=await get_json(source_base(source)+"/api/comics?"+urlencode({"sortBy":"updated_at","page":1}),source,12)
        return [item for obj in (data.get("data") or []) if isinstance(obj,dict) and (item:=astra_item(obj,source))]
    return await cached_json("astra:popular:1",300,load)

async def astra_chapter_page(source,comic_id,page):
    endpoint=source_base(source)+f"/api/comics/{comic_id}/chapters?"+urlencode({"search":"","order":"desc","page":page})
    data=await get_json(endpoint,source,12)
    fragment=BeautifulSoup(data.get("html") or "","html.parser");chapters=[]
    for link in fragment.select("a[href]"):
        url=urljoin(source_base(source)+"/",link.get("href") or "")
        if not same_source(source,url) or "/capitulo/" not in url:continue
        name=text(link.select_one(".text-lg")) or text(link) or "Capítulo"
        chapters.append({"name":name,"number":chapter_number(name),"url":url,"pageCount":0,"publishedAt":""})
    return chapters,bool(data.get("hasMore"))

async def astra_details(source,url):
    async def load():
        html,final=await get_html(url,source.homeUrl,12);soup=BeautifulSoup(html,"html.parser")
        comic_match=re.search(r"comicId:\s*(\d+)",html)
        if not comic_match:raise HTTPException(502,"AstraToons não informou o identificador da obra")
        comic_id=comic_match.group(1);slug=urlparse(final).path.rstrip("/").split("/")[-1]
        title=text(soup.select_one("h1")) or slug.replace("-"," ").title()
        raw_cover=image_attr(soup.select_one('img[class*="object-cover"]'))
        cover=urljoin(final,raw_cover) if raw_cover else ""
        description=text(soup.select_one("div.space-y-4 > p"))
        if not description:
            heading=soup.select_one("div:has(> h1)")
            description=text(heading.find_next_sibling("div")) if heading else ""
        alternatives=["Lookism"] if slug=="aparencias" else []

        chapters=[];page=1;has_more=True
        # Two concurrent pages keep the complete 600+ chapter catalogue under
        # frontend timeouts without creating an aggressive request burst.
        while has_more and page<=100:
            requested=[page,page+1]
            batch=await asyncio.gather(*(astra_chapter_page(source,comic_id,current) for current in requested))
            for page_chapters,page_has_more in batch:
                chapters.extend(page_chapters);has_more=page_has_more
                if not page_has_more:break
            page+=2
        if has_more:raise HTTPException(502,"AstraToons excedeu o limite de 1.600 capítulos")
        unique={chapter["url"]:chapter for chapter in chapters}
        return {
            "title":title,"altTitle":alternatives[0] if alternatives else "","aliases":alternatives,
            "cover":cover,"description":description,"url":final,"chapters":list(unique.values()),
            "source":source_dict(source),"adapter":"astratoons","comicId":comic_id,
        }
    return await cached_json("astra:details:"+url,300,load)

async def astra_pages(source,url,request):
    html,final=await get_html(url,source.homeUrl,12);soup=BeautifulSoup(html,"html.parser");pages=[];seen=set()
    for element in soup.select("#reader-container img[src],#reader-container canvas[data-src]"):
        image=urljoin(final,(element.get("src") or element.get("data-src") or "").strip())
        if image in seen or not is_public_http_url(image):continue
        seen.add(image);pages.append({"image":proxied_image(request,image,final),"original":image})
    return pages

# ---------- Mangas Brasuka Next.js API/RSC ----------
def brasuka_item(obj,source):
    slug=str(obj.get("slug") or "").strip("/")
    title=str(obj.get("title") or "").strip()
    if not slug or not title:return None
    kind=str(obj.get("type") or "manhwa").lower()
    if kind not in ("manga","manhwa","manhua","webtoon"):kind="manhwa"
    return {
      "title":title,
      "url":source_base(source)+f"/{kind}/{slug}",
      "thumbnail":str(obj.get("coverUrl") or obj.get("cover_url") or ""),
      "source":source_dict(source),"adapter":"mangasbrasuka","slug":slug,
    }

async def brasuka_search(source,query):
    data=await get_json(source_base(source)+"/api/search?"+urlencode({"q":query}),source,8)
    raw=data.get("items") or data.get("series") or data.get("data") or []
    return [item for obj in raw if (item:=brasuka_item(obj,source))]

def parse_brasuka_rsc_chapters(html,final):
    path=urlparse(final).path.rstrip("/").split("/")
    if len(path)<2:return []
    category,slug=path[-2],path[-1]
    out=[];seen=set()
    pattern=r'\{\\"id\\":\\"([^"\\]+)\\",\\"number\\":\\"([^"\\]+)\\",\\"title\\":\\"([^"\\]*)\\"'
    for match in re.finditer(pattern,html):
        _,number,title=match.groups()
        key=str(number).strip()
        if not key or key in seen:continue
        seen.add(key)
        suffix="" if not title or title=="$undefined" or title==key else f" — {title}"
        out.append({"name":f"Capítulo {key}{suffix}","number":chapter_number(key),"url":source_base_url(final)+f"/{category}/{slug}/{key}"})
    return out

def source_base_url(url):
    parsed=urlparse(url)
    return f"{parsed.scheme}://{parsed.netloc}"

async def brasuka_details(source,url):
    html,final=await get_html(url,source.homeUrl,9)
    soup=BeautifulSoup(html,"html.parser")
    title=text(soup.select_one("h1")) or "Mangá"
    cover=""
    meta=soup.select_one("meta[property='og:image'],meta[name='twitter:image']")
    if meta:cover=urljoin(final,meta.get("content","").strip())
    if not cover:
        cover=urljoin(final,image_attr(soup.select_one("main img[alt],main img")))
    desc=""
    description=soup.select_one("meta[name='description'],meta[property='og:description']")
    if description:desc=(description.get("content") or "").strip()
    chapters=parse_brasuka_rsc_chapters(html,final)
    if not chapters:
        seen=set()
        for a in soup.select("a[href]"):
            u=urljoin(final,a.get("href",""));name=text(a)
            if not u or not name or u in seen or chapter_number(name) is None:continue
            if not u.rstrip("/").startswith(final.rstrip("/")+"/"):continue
            seen.add(u);chapters.append({"name":name,"number":chapter_number(name),"url":u})
    chapters.sort(key=lambda x:(x["number"] is None,x["number"] if x["number"] is not None else 999999))
    return {"title":title,"cover":cover,"description":desc,"url":final,"chapters":chapters,"source":source_dict(source),"adapter":"mangasbrasuka"}

async def brasuka_pages(source,url,request):
    html,final=await get_html(url,source.homeUrl,9);soup=BeautifulSoup(html,"html.parser")
    redirect=soup.select_one("div.page-break a[href]")
    pages=[]
    if redirect:
        redirect_url=urljoin(final,redirect.get("href",""));auth=(parse_qs(urlparse(redirect_url).query).get("a") or [""])[0]
        if auth:
            campaign=source_base(source)+"/campanha.php?"+urlencode({"auth":auth})
            body,campaign_final=await get_html(campaign,final,10);campaign_soup=BeautifulSoup(body,"html.parser")
            for img in campaign_soup.select(".manga-content img"):
                image_url=urljoin(campaign_final,image_attr(img))
                if image_url:pages.append({"image":proxied_image(request,image_url,campaign_final),"original":image_url})
    if pages:return pages
    return await madara_pages(source,url,request)

# ---------- Generic fallback ----------
GENERIC_CARD_SELECTORS=[
 ".bs .bsx",".listupd .bs",".manga__item",".page-item-detail",
 ".c-tabs-item__content",".manga-item","article"
]
def generic_cards(html,base,source):
    soup=BeautifulSoup(html,"html.parser");out=[];seen=set()
    for sel in GENERIC_CARD_SELECTORS:
        for el in soup.select(sel):
            a=el.select_one("a[href]");img=el.select_one("img")
            if not a:continue
            title=text(el.select_one("h3,h4,.post-title,.tt,.manga-name")) or (a.get("title") or "") or (img.get("alt") if img else "")
            title=str(title).strip();u=urljoin(base,a.get("href",""))
            if len(title)<2 or not u or u in seen:continue
            seen.add(u);out.append({"title":title,"url":u,"thumbnail":urljoin(base,image_attr(img)),"source":source_dict(source),"adapter":"generic"})
        if out:break
    return out[:30]

async def generic_search(source,query):
    base=source_base(source);q=urlencode({"s":query})
    for u in [f"{base}/?{q}",f"{base}/search?{urlencode({'q':query})}",f"{base}/buscar?{urlencode({'q':query})}"]:
        try:
            h,f=await get_html(u,base,6);items=generic_cards(h,f,source)
            if items:return items
        except Exception:pass
    return []

async def generic_details(source,url):
    html,final=await get_html(url,source.homeUrl,7);soup=BeautifulSoup(html,"html.parser")
    title=text(soup.select_one("h1,.post-title h1,.manga-title h1")) or "Mangá"
    cover=urljoin(final,image_attr(soup.select_one(".summary_image img,.manga-thumb img,.tab-summary img,.thumb img")))
    desc=text(soup.select_one(".summary__content,.description-summary,.description,.entry-content,.manga-summary"))
    chapters=[];seen=set()
    for a in soup.select(".wp-manga-chapter a,.chapter-link-item a,.chapter-name a,.eph-num a,#chapterlist li a,.eplister li a,a[href*='/capitulo'],a[href*='/chapter']"):
        u=urljoin(final,a.get("href",""));name=text(a)
        if not u or not name or u in seen:continue
        seen.add(u);chapters.append({"name":name,"url":u,"number":chapter_number(name)})
    chapters.sort(key=lambda x:(x["number"] is None,x["number"] if x["number"] is not None else 999999))
    return {"title":title,"cover":cover,"description":desc,"url":final,"chapters":chapters,"source":source_dict(source),"adapter":"generic"}

async def generic_pages(source,url,request):
    html,final=await get_html(url,source.homeUrl,8);soup=BeautifulSoup(html,"html.parser")
    pages=[];seen=set()
    for img in soup.select(".reading-content img,.page-break img,.reader-area img,#readerarea img,.readercontent img,.chapter-content img,.container-chapter-reader img"):
        u=urljoin(final,image_attr(img))
        if not u or u in seen:continue
        seen.add(u);pages.append({"image":proxied_image(request,u,final),"original":u})
    return pages

# ---------- MangaDex API adapter ----------
def valid_uuid(value):
    return bool(re.fullmatch(r"[0-9a-f-]{36}",str(value or ""),re.I))

def unique_titles(values):
    output=[];seen=set()
    for value in values:
        clean=" ".join(str(value or "").split()).strip()
        key=normalized_title(clean)
        if clean and key and key not in seen:
            seen.add(key);output.append(clean)
    return output

def mangadex_title_info(attributes,manga_id=""):
    """Prefer readable localized aliases over a romanized primary title.

    MangaDex stores aliases with their own locale. Flattening altTitles loses that
    signal and made titles such as Lookism appear only as "Oemo Jisangjuui".
    """
    titles=attributes.get("title") or {}
    localized_aliases=[]
    for item in attributes.get("altTitles") or []:
        if not isinstance(item,dict):continue
        localized_aliases.extend((str(lang or "").lower(),value) for lang,value in item.items() if value)
    aliases=unique_titles(value for _,value in localized_aliases)
    override=TITLE_OVERRIDES.get(str(manga_id or ""))
    if override:
        aliases=unique_titles([*override.get("aliases",[]),*aliases,*titles.values()])
        return override["title"],override["altTitle"],aliases

    def alias_for(*languages):
        wanted={x.lower() for x in languages}
        return next((value for lang,value in localized_aliases if lang in wanted and value),"")

    # A translated alternative is more useful to readers than the catalogue's
    # romanized main title. Preserve the latter as altTitle/search alias.
    title=(alias_for("pt-br","pt") or titles.get("pt-br") or titles.get("pt") or
           alias_for("en") or titles.get("en") or titles.get("ja") or
           next(iter(titles.values()),None) or next(iter(aliases),"Mangá"))
    alternate_candidates=[
        titles.get("pt-br"),titles.get("pt"),alias_for("pt-br","pt"),
        titles.get("en"),alias_for("en"),*titles.values(),*aliases,
    ]
    alt_title=next((value for value in unique_titles(alternate_candidates) if normalized_title(value)!=normalized_title(title)),"")
    return title,alt_title,aliases

def canonical_mangadex_query(query):
    normalized=normalized_title(query)
    if not normalized:return ""
    for override in TITLE_OVERRIDES.values():
        if normalized in {normalized_title(value) for value in override.get("aliases",[])}:
            return override.get("search") or override["title"]
    return str(query or "").strip()

async def mangadex_json(path,params=None,ttl=90):
    params=params or []
    key="md:"+path+":"+json.dumps(params,sort_keys=True,ensure_ascii=False)
    async def load():
        last_error=None
        for attempt in range(3):
            try:
                r=await client.get(MANGADEX_API+path,params=params,headers={"Accept":"application/json"},timeout=12)
                if r.status_code==429 or r.status_code>=500:
                    wait=min(2.5,max(.3,float(r.headers.get("Retry-After") or .45)*(attempt+1)))
                    await asyncio.sleep(wait);last_error=HTTPException(502,f"MangaDex HTTP {r.status_code}");continue
                if r.status_code>=400:raise HTTPException(502,f"MangaDex HTTP {r.status_code}")
                return r.json()
            except HTTPException:raise
            except Exception as exc:
                last_error=exc
                if attempt<2:await asyncio.sleep(.35*(attempt+1))
        raise HTTPException(502,"MangaDex indisponível no momento") from last_error
    return await cached_json(key,ttl,load)

def mangadex_manga_item(resource,request):
    attributes=resource.get("attributes") or {};relationships=resource.get("relationships") or []
    cover_rel=next((x for x in relationships if x.get("type")=="cover_art"),{})
    cover_file=(cover_rel.get("attributes") or {}).get("fileName") or ""
    author_rel=next((x for x in relationships if x.get("type")=="author"),{})
    author=(author_rel.get("attributes") or {}).get("name") or ""
    title,alt_title,aliases=mangadex_title_info(attributes,resource.get("id") or "")
    descriptions=attributes.get("description") or {}
    manga_id=resource.get("id") or ""
    cover_direct=f"{MANGADEX_UPLOADS}/covers/{manga_id}/{cover_file}.512.jpg" if cover_file else ""
    original_direct=f"{MANGADEX_UPLOADS}/covers/{manga_id}/{cover_file}" if cover_file else ""
    return {
        "id":manga_id,"connector":"mangadex","source":"MangaDex","sourceUrl":f"https://mangadex.org/title/{manga_id}",
        "title":title,"altTitle":alt_title,"aliases":aliases,
        "description":descriptions.get("pt-br") or descriptions.get("en") or next(iter(descriptions.values()),"Sem sinopse disponível."),
        "cover":proxied_image(request,cover_direct,"https://mangadex.org/") if cover_direct else "",
        "originalCover":proxied_image(request,original_direct,"https://mangadex.org/") if original_direct else "",
        "status":attributes.get("status") or "","year":attributes.get("year") or "",
        "demographic":attributes.get("publicationDemographic") or "","contentRating":attributes.get("contentRating") or "safe",
        "availableLanguages":attributes.get("availableTranslatedLanguages") or [],
        "tags":[name for x in (attributes.get("tags") or []) if (name:=(((x.get("attributes") or {}).get("name") or {}).get("pt-br") or ((x.get("attributes") or {}).get("name") or {}).get("en")))],
        "author":author,"followedCount":attributes.get("followedCount") or 0,
    }

@app.get("/api/v2/manga/search")
async def mangadex_search(
    request:Request,
    query:str=Query(default="",max_length=MAX_QUERY_LENGTH),
    language:str=Query(default="pt-br",max_length=16),
    limit:int=Query(default=30,ge=1,le=40),
    guard:None=Depends(expensive_guard),
):
    language=language if language in ("pt-br","en","all") else "pt-br";limit=max(1,min(40,limit))
    params=[("limit",str(limit)),("offset","0"),("includes[]","cover_art"),("includes[]","author"),("includes[]","artist"),("contentRating[]","safe"),("contentRating[]","suggestive"),("hasAvailableChapters","true")]
    query=canonical_mangadex_query(query)
    if query:params.extend([("title",query),("order[relevance]","desc")])
    else:params.append(("order[followedCount]","desc"))
    if language!="all":params.append(("availableTranslatedLanguage[]",language))
    payload=await run_with_deadline(mangadex_json("/manga",params,75 if query else 300),20)
    return {"items":[mangadex_manga_item(x,request) for x in (payload.get("data") or [])],"source":"MangaDex","language":language}

@app.get("/api/v2/manga/{manga_id}")
async def mangadex_manga(manga_id:str,request:Request,guard:None=Depends(expensive_guard)):
    if not valid_uuid(manga_id):raise HTTPException(400,"Identificador de mangá inválido")
    params=[("includes[]","cover_art"),("includes[]","author"),("includes[]","artist")]
    payload=await run_with_deadline(mangadex_json("/manga/"+manga_id,params,900),20)
    return mangadex_manga_item(payload.get("data") or {},request)

async def _mangadex_chapters(manga_id,language):
    if not valid_uuid(manga_id):raise HTTPException(400,"Identificador de mangá inválido")
    language=language if language in ("pt-br","en","all") else "pt-br"
    all_items=[];offset=0;total=1
    while offset<total and offset<MANGADEX_CHAPTER_LIMIT:
        params=[("manga",manga_id),("limit","100"),("offset",str(offset)),("includes[]","scanlation_group"),("contentRating[]","safe"),("contentRating[]","suggestive"),("order[publishAt]","desc")]
        if language!="all":params.append(("translatedLanguage[]",language))
        payload=await mangadex_json("/chapter",params,180)
        data=payload.get("data") or [];total=int(payload.get("total") or 0);all_items.extend(data);offset+=100
        if not data:break
    mapped=[]
    for resource in all_items:
        attributes=resource.get("attributes") or {}
        if int(attributes.get("pages") or 0)<=0 or attributes.get("externalUrl"):continue
        relationships=resource.get("relationships") or []
        group_rel=next((x for x in relationships if x.get("type")=="scanlation_group"),{})
        mapped.append({
            "id":resource.get("id"),"mangaId":manga_id,"connector":"mangadex",
            "number":attributes.get("chapter") or "none","volume":attributes.get("volume") or "",
            "title":attributes.get("title") or "","language":attributes.get("translatedLanguage") or "",
            "pageCount":int(attributes.get("pages") or 0),
            "publishedAt":attributes.get("publishAt") or attributes.get("readableAt") or "",
            "group":(group_rel.get("attributes") or {}).get("name") or "",
        })
    def order_value(chapter):
        try:volume=float(chapter["volume"] or 0)
        except:volume=0
        try:number=float(chapter["number"] or -1)
        except:number=-1
        return (volume,number,chapter["publishedAt"])
    # Different scanlation releases can share volume/chapter numbers. HakuNeko
    # exposes every available release, so only identical MangaDex IDs are folded.
    unique={chapter["id"]:chapter for chapter in mapped if chapter.get("id")}
    return {
        "chapters":sorted(unique.values(),key=order_value,reverse=True),"language":language,
        "total":len(unique),"upstreamTotal":total,"truncated":offset<total,
    }

@app.get("/api/v2/manga/{manga_id}/chapters")
async def mangadex_chapters(
    manga_id:str,
    language:str=Query(default="pt-br",max_length=16),
    guard:None=Depends(expensive_guard),
):
    return await run_with_deadline(_mangadex_chapters(manga_id,language),DETAIL_DEADLINE_SECONDS)

@app.get("/api/v2/chapter/{chapter_id}/pages")
async def mangadex_pages(
    chapter_id:str,request:Request,
    quality:str=Query(default="data-saver",max_length=16),
    guard:None=Depends(expensive_guard),
):
    if not valid_uuid(chapter_id):raise HTTPException(400,"Identificador de capítulo inválido")
    payload=await run_with_deadline(mangadex_json("/at-home/server/"+chapter_id,[],60),20)
    chapter=payload.get("chapter") or {};original=quality=="original"
    files=chapter.get("data" if original else "dataSaver") or []
    folder="data" if original else "data-saver";base_url=payload.get("baseUrl") or "";chapter_hash=chapter.get("hash") or ""
    if not base_url or not chapter_hash or not files:raise HTTPException(422,"A fonte não retornou páginas")
    pages=[]
    for index,file in enumerate(files):
        original_url=f"{base_url}/{folder}/{chapter_hash}/{file}"
        pages.append({"index":index,"file":file,"url":proxied_image(request,original_url,"https://mangadex.org/"),"original":original_url})
    return {"pages":pages,"quality":"original" if original else "data-saver"}

@app.get("/api/v2/sources")
async def curated_sources():
    return {"repo":KEIYOUSHI_REPO,"limit":5,"sources":CURATED_SOURCES}

# ---------- routing ----------
async def search_source(source,query,popular=False):
    if not allowed_source(source):
        return {"source":source_dict(source),"items":[],"ok":False,"adapter":"blocked","error":"Fonte fora da lista permitida"}
    adapter=adapter_name(source)
    if adapter=="login-required":
        return {"source":source_dict(source),"items":[],"ok":False,"adapter":adapter,"error":"Essa fonte exige login no app original"}
    try:
        if adapter=="saikai":
            items=await (saikai_popular(source) if popular else saikai_search(source,query))
        elif adapter=="lycantoons":
            items=await (lycan_popular(source) if popular else lycan_search(source,query))
        elif adapter=="astratoons":
            items=await (astra_popular(source) if popular else astra_search(source,query))
        elif adapter=="mangasbrasuka":
            items=await (madara_popular(source) if popular else madara_search(source,query))
        elif adapter=="madara":
            items=await (madara_popular(source) if popular else madara_search(source,query))
        else:
            # Try Madara first because many Keiyoushi sources use this multisrc.
            items=await (madara_popular(source) if popular else madara_search(source,query))
            if not items:
                items=await generic_search(source,query)
        return {"source":source_dict(source),"items":items,"ok":bool(items),"adapter":adapter}
    except Exception as e:
        return {"source":source_dict(source),"items":[],"ok":False,"adapter":adapter,"error":str(e)}

@app.get("/api/health")
async def health():
    warnings=[]
    if not configured_secret:warnings.append("BRIDGE_SECRET ausente; tokens mudam a cada reinicialização ou instância")
    if not public_base:warnings.append("PUBLIC_BASE_URL ausente; links dependem dos cabeçalhos do proxy")
    elif not is_public_http_url(public_base) or not public_base.startswith("https://"):
        warnings.append("PUBLIC_BASE_URL deve ser uma URL HTTPS pública")
    if "*" in origins:warnings.append("ALLOWED_ORIGIN permite qualquer origem")
    return {
        "ok":True,"configured":not warnings,"warnings":warnings,
        "name":"ResenhaFlix Manga Bridge","version":VERSION,
        "adapters":["mangadex","madara","saikai","lycantoons","astratoons","mangasbrasuka","generic"],
        "sources":len(CURATED_SOURCES),
    }

@app.get("/api/sources")
async def sources():
    return {"repo":KEIYOUSHI_REPO,"limit":5,"sources":CURATED_SOURCES}

def proxy_result_images(result,request):
    for item in result.get("items") or []:
        image=item.get("thumbnail") or ""
        if is_public_http_url(image):item["thumbnail"]=proxied_image(request,image,item.get("url") or item.get("source",{}).get("homeUrl") or "")
    return result

@app.post("/api/search")
async def search(body:SearchBody,request:Request,guard:None=Depends(expensive_guard)):
    r=await run_with_deadline(search_source(body.source,body.query,False),20)
    return proxy_result_images({"items":r["items"],"ok":r["ok"],"adapter":r.get("adapter"),"error":r.get("error")},request)

@app.post("/api/popular")
async def popular(body:SearchBody,request:Request,guard:None=Depends(expensive_guard)):
    r=await run_with_deadline(search_source(body.source,body.query,True),20)
    return proxy_result_images({"items":r["items"],"ok":r["ok"],"adapter":r.get("adapter"),"error":r.get("error")},request)

@app.post("/api/batch/search")
async def batch_search(body:BatchSearchBody,request:Request,guard:None=Depends(expensive_guard)):
    requested=body.sources or [Source(**x) for x in CURATED_SOURCES]
    ordered=sorted(requested[:5],key=lambda s:(0 if s.lang.lower().startswith("pt") else 1,s.name.lower()))
    # Lycan may need a first-party TLS/browser warm-up before its JSON request.
    # Keep the whole batch parallel, but do not cancel that source at the old 7s cap.
    tasks=[asyncio.wait_for(search_source(s,body.query,False),timeout=18.0 if adapter_name(s)=="lycantoons" else 9.0) for s in ordered]
    raw=await run_with_deadline(asyncio.gather(*tasks,return_exceptions=True),22)
    results=[]
    for i,x in enumerate(raw):
        if isinstance(x,Exception):
            results.append({"source":source_dict(ordered[i]),"items":[],"ok":False,"error":str(x)})
        else:results.append(proxy_result_images(x,request))
    return {"results":results}

@app.post("/api/manga")
async def manga(body:UrlBody,guard:None=Depends(expensive_guard)):
    async def load():
        if not same_source(body.source,body.url):raise HTTPException(400,"URL fora da fonte")
        adapter=adapter_name(body.source)
        if adapter=="saikai":return await saikai_details(body.source,body.url)
        if adapter=="madara":return await madara_details(body.source,body.url)
        if adapter=="mangasbrasuka":return await madara_details(body.source,body.url)
        if adapter=="lycantoons":return await lycan_details(body.source,body.url)
        if adapter=="astratoons":return await astra_details(body.source,body.url)
        # auto: Madara parser is more complete; generic is fallback.
        try:
            details=await madara_details(body.source,body.url)
            if details.get("chapters"):return details
        except Exception:pass
        return await generic_details(body.source,body.url)
    identity=json.dumps({"source":source_dict(body.source),"url":body.url},sort_keys=True,ensure_ascii=False)
    key="details:"+hashlib.sha256(identity.encode()).hexdigest()
    return await run_with_deadline(cached_json(key,120,load),DETAIL_DEADLINE_SECONDS)

@app.post("/api/chapter")
async def chapter(body:UrlBody,request:Request,guard:None=Depends(expensive_guard)):
    async def load():
        if not same_source(body.source,body.url):raise HTTPException(400,"URL fora da fonte")
        adapter=adapter_name(body.source)
        if adapter=="saikai":result=await saikai_pages(body.source,body.url,request)
        elif adapter=="madara":result=await madara_pages(body.source,body.url,request)
        elif adapter=="lycantoons":result=await lycan_pages(body.source,body.url,request)
        elif adapter=="astratoons":result=await astra_pages(body.source,body.url,request)
        elif adapter=="mangasbrasuka":result=await brasuka_pages(body.source,body.url,request)
        else:
            result=await madara_pages(body.source,body.url,request)
            if not result:result=await generic_pages(body.source,body.url,request)
        return result,adapter
    pages,adapter=await run_with_deadline(load(),DETAIL_DEADLINE_SECONDS)
    if not pages:raise HTTPException(422,"Nenhuma página encontrada")
    return {"pages":pages,"adapter":adapter}

@app.get("/api/image")
async def image(
    token:str=Query(min_length=8,max_length=8192),
    sig:str=Query(min_length=64,max_length=64,pattern=r"^[0-9a-f]{64}$"),
):
    expected=hmac.new(secret,token.encode(),hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected,sig):raise HTTPException(403,"Assinatura inválida")
    try:
        token+= "="*((4-len(token)%4)%4)
        data=json.loads(base64.urlsafe_b64decode(token))
    except Exception:raise HTTPException(400,"Token inválido")
    if int(data.get("e",0))<time.time():raise HTTPException(403,"Token expirado")
    if not isinstance(data,dict):raise HTTPException(400,"Token inválido")
    url=data.get("u","");referer=data.get("r","")
    if not isinstance(url,str) or not isinstance(referer,str):raise HTTPException(400,"Token inválido")
    if not is_public_http_url(url):raise HTTPException(400,"URL inválida")
    headers={"Accept":"image/avif,image/webp,image/apng,image/*,*/*;q=0.8"}
    if referer and is_public_http_url(referer):headers["Referer"]=referer
    try:await asyncio.wait_for(_image_semaphore.acquire(),timeout=2.0)
    except asyncio.TimeoutError as exc:raise HTTPException(503,"Proxy de imagem ocupado",headers={"Retry-After":"2"}) from exc
    try:
        upstream=await asyncio.wait_for(safe_request("GET",url,headers=headers,timeout=12,stream=True),timeout=15)
    except asyncio.TimeoutError as exc:
        _image_semaphore.release();raise HTTPException(504,"Imagem excedeu o tempo limite") from exc
    except BaseException:
        _image_semaphore.release();raise
    if upstream.status_code>=400:
        await upstream.aclose();_image_semaphore.release();raise HTTPException(502,f"Imagem HTTP {upstream.status_code}")
    media_type=upstream.headers.get("content-type","").split(";",1)[0].strip().lower()
    if media_type not in ALLOWED_IMAGE_TYPES:
        await upstream.aclose();_image_semaphore.release();raise HTTPException(415,"O proxy aceita somente imagens raster")
    raw_length=upstream.headers.get("content-length")
    if raw_length:
        try:declared_length=int(raw_length)
        except ValueError:
            await upstream.aclose();_image_semaphore.release();raise HTTPException(502,"Tamanho de imagem inválido")
        if declared_length<0 or declared_length>MAX_IMAGE_BYTES:
            await upstream.aclose();_image_semaphore.release();raise HTTPException(413,"Imagem excede o limite permitido")
    async def chunks():
        transferred=0
        try:
            async for chunk in upstream.aiter_bytes(65536):
                transferred+=len(chunk)
                if transferred>MAX_IMAGE_BYTES:break
                yield chunk
        finally:
            await upstream.aclose();_image_semaphore.release()
    response_headers={
        "Cache-Control":"public,max-age=1800","X-Content-Type-Options":"nosniff",
        "Cross-Origin-Resource-Policy":"cross-origin",
    }
    return StreamingResponse(chunks(),media_type=media_type,headers=response_headers)

@app.on_event("shutdown")
async def shutdown():
    await client.aclose()
    async with _safe_clients_lock:
        active=list(_safe_clients.values());_safe_clients.clear()
    for safe_client in active:
        await safe_client.aclose()
