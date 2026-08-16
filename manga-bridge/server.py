import os, re, json, time, hmac, hashlib, base64, asyncio, unicodedata, ipaddress
from urllib.parse import urljoin, urlparse, urlencode, parse_qs

import httpx
from bs4 import BeautifulSoup
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

VERSION="32.0.0"
app=FastAPI(title=f"ResenhaFlix Manga Bridge v{VERSION}")
origins=[x.strip() for x in os.getenv("ALLOWED_ORIGIN","https://dip7ridu-exe.github.io").split(",") if x.strip()]
secret=os.getenv("BRIDGE_SECRET","").encode() or os.urandom(32)
public_base=os.getenv("PUBLIC_BASE_URL","").rstrip("/")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if "*" in origins else origins,
    allow_methods=["GET","POST","OPTIONS"],
    allow_headers=["*"],
    allow_credentials=False,
)

client=httpx.AsyncClient(
    follow_redirects=True,
    trust_env=False,
    timeout=httpx.Timeout(9.0,connect=5.0),
    headers={
      "User-Agent":os.getenv("MANGA_USER_AGENT","Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/131 Mobile Safari/537.36"),
      "Accept-Language":"pt-BR,pt;q=0.9,en;q=0.7",
    },
)

MANGADEX_API="https://api.mangadex.org"
MANGADEX_UPLOADS="https://uploads.mangadex.org"
KEIYOUSHI_REPO="https://raw.githubusercontent.com/keiyoushi/extensions/repo/index.json"
CURATED_SOURCES=[
    {"id":"saikai-scan","name":"Saikai Scan","lang":"pt-BR","homeUrl":"https://housesaikai.net","extension":"Saikai Scan","pkg":"eu.kanade.tachiyomi.extension.pt.saikaiscan","repo":KEIYOUSHI_REPO,"contentWarning":"safe"},
    {"id":"lycan-toons","name":"Lycan Toons","lang":"pt-BR","homeUrl":"https://lycantoons.com","extension":"Lycan Toons","pkg":"eu.kanade.tachiyomi.extension.pt.lycantoons","repo":KEIYOUSHI_REPO,"contentWarning":"safe"},
    {"id":"mangas-brasuka","name":"Mangas Brasuka","lang":"pt-BR","homeUrl":"https://mangasbrasuka.com.br","extension":"Mangas Brasuka","pkg":"eu.kanade.tachiyomi.extension.pt.mangasbrasuka","repo":KEIYOUSHI_REPO,"contentWarning":"mixed"},
    {"id":"boruto-explorer","name":"Boruto Explorer","lang":"pt-BR","homeUrl":"https://leitor.borutoexplorer.com.br","extension":"Boruto Explorer","pkg":"eu.kanade.tachiyomi.extension.pt.borutoexplorer","repo":KEIYOUSHI_REPO,"contentWarning":"safe"},
]
DEFAULT_ALLOWED_HOSTS={
    "api.mangadex.org","uploads.mangadex.org","mangadex.org",
    "housesaikai.net","api.housesaikai.net","s3-beta.housesaikai.net",
    "lycantoons.com","mangasbrasuka.com.br","leitor.borutoexplorer.com.br",
}
DEFAULT_ALLOWED_HOSTS.update(x.strip().lower() for x in os.getenv("SOURCE_ALLOWLIST","").split(",") if x.strip())
_json_cache={}

class Source(BaseModel):
    id:str=""
    name:str="Fonte"
    lang:str="all"
    homeUrl:str
    extension:str=""
    pkg:str=""
    repo:str=""
    contentWarning:str="safe"

class SearchBody(BaseModel):
    source:Source
    query:str=""

class UrlBody(BaseModel):
    source:Source
    url:str

class BatchSearchBody(BaseModel):
    sources:list[Source]
    query:str=""

def host(url):
    return (urlparse(url).hostname or "").lower().removeprefix("www.")

def is_public_http_url(url):
    try:
        parsed=urlparse(str(url))
        if parsed.scheme not in ("http","https") or not parsed.hostname:return False
        hostname=parsed.hostname.lower().strip(".")
        if hostname in ("localhost","localhost.localdomain") or hostname.endswith(".local"):return False
        try:
            ip=ipaddress.ip_address(hostname)
            return not (ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast)
        except ValueError:
            return True
    except Exception:
        return False

def allowed_source(source):
    h=host(source.homeUrl)
    return bool(h and is_public_http_url(source.homeUrl) and any(h==x or h.endswith("."+x) for x in DEFAULT_ALLOWED_HOSTS))

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

async def get_html(url,referer=None,timeout=7):
    if not is_public_http_url(url):raise HTTPException(400,"URL de fonte inválida")
    headers={"Accept":"text/html,application/xhtml+xml"}
    if referer:headers["Referer"]=referer
    r=await client.get(url,headers=headers,timeout=timeout)
    if r.status_code>=400:raise HTTPException(502,f"Fonte HTTP {r.status_code}")
    return r.text,str(r.url)

async def post_form(url,data,referer=None,timeout=7):
    if not is_public_http_url(url):raise HTTPException(400,"URL de fonte inválida")
    headers={"Accept":"text/html,*/*","X-Requested-With":"XMLHttpRequest"}
    if referer:headers["Referer"]=referer
    r=await client.post(url,data=data,headers=headers,timeout=timeout)
    if r.status_code>=400:raise HTTPException(r.status_code,f"Fonte HTTP {r.status_code}")
    return r.text,str(r.url)

def source_dict(source):
    return source.model_dump()

async def cached_json(key,ttl,loader):
    now=time.time();cached=_json_cache.get(key)
    if cached and cached[0]>now:return cached[1]
    value=await loader()
    _json_cache[key]=(now+ttl,value)
    if len(_json_cache)>300:
        for old_key in sorted(_json_cache,key=lambda k:_json_cache[k][0])[:80]:_json_cache.pop(old_key,None)
    return value

def adapter_name(source):
    p=(source.pkg or "").lower()
    h=host(source.homeUrl)
    if p.endswith(".lycantoons") or h=="lycantoons.com":
        return "lycantoons"
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
    r=await client.get(url,headers=headers,timeout=timeout)
    if r.status_code>=400:raise HTTPException(502,f"Fonte HTTP {r.status_code}")
    return r.json()

async def post_json(url,data,source,timeout=8):
    headers={
      "Accept":"application/json, text/plain, */*",
      "Content-Type":"application/json",
      "Origin":source.homeUrl,
      "Referer":source.homeUrl.rstrip("/")+"/",
    }
    r=await client.post(url,json=data,headers=headers,timeout=timeout)
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
    r=await client.get(url,headers=headers,timeout=8)
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
LYCAN_VERIFIED_SERIES=[
  ({"the infinite mage","infinite mage","mago do infinito","mago infinito"},"Mago do Infinito","mago-do-infinito"),
  ({"eleceed","veletric"},"Veletric - Eleceed","veletric"),
  ({"the stellar swordmaster","stellar swordmaster","mestre espadachim criado pelas estrelas"},"Mestre Espadachim Criado Pelas Estrelas","mestre-espadachim-criado-pelas-estrelas"),
]

def normalized_title(value):
    value=unicodedata.normalize("NFD",str(value or "").lower())
    value="".join(ch for ch in value if unicodedata.category(ch)!="Mn")
    return re.sub(r"[^a-z0-9]+"," ",value).strip()

def lycan_verified_items(source,query):
    q=normalized_title(query);out=[]
    for aliases,title,slug in LYCAN_VERIFIED_SERIES:
        if q in {normalized_title(x) for x in aliases}:
            out.append({"title":title,"url":source_base(source)+"/series/"+slug,"thumbnail":"","source":source_dict(source),"adapter":"lycantoons-verified","slug":slug})
    return out

def lycan_item(obj,source):
    slug=str(obj.get("slug") or "").strip("/")
    title=str(obj.get("title") or "").strip()
    if not slug or not title:return None
    return {
      "title":title,
      "url":source_base(source)+"/series/"+slug,
      "thumbnail":str(obj.get("coverUrl") or obj.get("cover_url") or ""),
      "source":source_dict(source),"adapter":"lycantoons","slug":slug,
    }

async def lycan_search(source,query):
    payload={"limit":20,"page":1,"search":query,"seriesType":"","status":"","tags":[]}
    try:
        data=await post_json(source_base(source)+"/api/series",payload,source,9)
        raw=data.get("series") or data.get("data") or data.get("items") or []
        items=[item for obj in raw if (item:=lycan_item(obj,source))]
        if items:return items
    except Exception:
        pass
    # Cloudflare may reject server-side clients; keep user-verified routes available.
    return lycan_verified_items(source,query)

async def lycan_popular(source):
    data=await get_json(source_base(source)+"/api/metrics/popular?limit=20&page=1",source,9)
    raw=data.get("data") or data.get("series") or data.get("items") or []
    return [item for obj in raw if (item:=lycan_item(obj,source))]

def walk_json(value):
    yield value
    if isinstance(value,dict):
        for child in value.values():yield from walk_json(child)
    elif isinstance(value,list):
        for child in value:yield from walk_json(child)

def rsc_find(raw,key):
    decoder=json.JSONDecoder();texts=[raw]
    if '\\"' in raw:texts.append(raw.replace('\\"','"').replace('\\\\','\\'))
    for candidate in texts:
        documents=[]
        for line in candidate.splitlines():
            payload=line.split(":",1)[-1].strip()
            if payload.startswith(("{","[")):
                try:documents.append(json.loads(payload))
                except Exception:pass
        starts=[m.start() for m in re.finditer(r"[\[{]",candidate)][:700]
        for start in starts:
            try:
                value,_=decoder.raw_decode(candidate[start:]);documents.append(value)
            except Exception:pass
        for document in documents:
            for value in walk_json(document):
                if isinstance(value,dict) and key in value:return value[key],value
    return None,None

async def lycan_rsc(source,path):
    target=source_base(source)+path
    separator="&" if "?" in target else "?";request_url=target+separator+"_rsc=rf32a"
    headers={
        "Accept":"text/x-component,*/*;q=0.8","Referer":source_base(source)+"/","RSC":"1",
        "next-url":path,"next-router-state-tree":"%5B%22%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2Cnull%2Cnull%5D%7D%2Cnull%2Cnull%2Ctrue%5D",
    }
    r=await client.get(request_url,headers=headers,timeout=10)
    if r.status_code>=400:raise HTTPException(502,f"Lycan Toons HTTP {r.status_code}")
    return r.text

async def lycan_details(source,url):
    slug=urlparse(url).path.rstrip("/").split("/")[-1]
    raw=await lycan_rsc(source,f"/series/{slug}")
    _,obj=rsc_find(raw,"slug")
    title=(obj or {}).get("title") or slug.replace("-"," ").title()
    cover=(obj or {}).get("coverUrl") or "";description=(obj or {}).get("description") or ""
    chapter_raw=await lycan_rsc(source,f"/series/{slug}/1")
    chapters_value,_=rsc_find(chapter_raw,"capitulos");chapters=[]
    for chapter in chapters_value or []:
        if not isinstance(chapter,dict):continue
        number=str(chapter.get("numero") or "");page_count=int(chapter.get("pageCount") or 0)
        chapters.append({"name":f"Capítulo {number}","number":chapter_number(number),"url":source_base(source)+f"/series/{slug}/{number}","pageCount":page_count,"publishedAt":chapter.get("createdAt") or ""})
    chapters.sort(key=lambda x:(x["number"] is not None,x["number"] or -1),reverse=True)
    return {"title":title,"cover":cover,"description":description,"url":url,"chapters":chapters,"source":source_dict(source),"adapter":"lycantoons"}

async def lycan_pages(source,url,request):
    path=urlparse(url).path
    raw=await lycan_rsc(source,path)
    urls,_=rsc_find(raw,"imageUrls");pages=[]
    for image_url in urls or []:
        if not isinstance(image_url,str) or not is_public_http_url(image_url):continue
        pages.append({"image":proxied_image(request,image_url,url),"original":image_url})
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
    titles=attributes.get("title") or {}
    aliases=[v for item in (attributes.get("altTitles") or []) for v in (item or {}).values() if v]
    title=titles.get("pt-br") or titles.get("en") or titles.get("ja") or next(iter(titles.values()),"Mangá")
    alt_title=next((x for x in [titles.get("en"),titles.get("pt-br"),*aliases] if x and x!=title),"")
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
async def mangadex_search(request:Request,query:str="",language:str="pt-br",limit:int=30):
    language=language if language in ("pt-br","en","all") else "pt-br";limit=max(1,min(40,limit))
    params=[("limit",str(limit)),("offset","0"),("includes[]","cover_art"),("includes[]","author"),("includes[]","artist"),("contentRating[]","safe"),("contentRating[]","suggestive"),("hasAvailableChapters","true")]
    if query.strip():params.extend([("title",query.strip()),("order[relevance]","desc")])
    else:params.append(("order[followedCount]","desc"))
    if language!="all":params.append(("availableTranslatedLanguage[]",language))
    payload=await mangadex_json("/manga",params,75 if query else 300)
    return {"items":[mangadex_manga_item(x,request) for x in (payload.get("data") or [])],"source":"MangaDex","language":language}

@app.get("/api/v2/manga/{manga_id}")
async def mangadex_manga(manga_id:str,request:Request):
    if not valid_uuid(manga_id):raise HTTPException(400,"Identificador de mangá inválido")
    params=[("includes[]","cover_art"),("includes[]","author"),("includes[]","artist")]
    payload=await mangadex_json("/manga/"+manga_id,params,900)
    return mangadex_manga_item(payload.get("data") or {},request)

@app.get("/api/v2/manga/{manga_id}/chapters")
async def mangadex_chapters(manga_id:str,language:str="pt-br"):
    if not valid_uuid(manga_id):raise HTTPException(400,"Identificador de mangá inválido")
    language=language if language in ("pt-br","en","all") else "pt-br"
    all_items=[];offset=0;total=1
    while offset<total and offset<500:
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
    unique={}
    for chapter in mapped:
        key=(chapter["volume"],chapter["number"],chapter["language"]);previous=unique.get(key)
        if not previous or chapter["pageCount"]>previous["pageCount"] or chapter["publishedAt"]>previous["publishedAt"]:unique[key]=chapter
    def order_value(chapter):
        try:volume=float(chapter["volume"] or 0)
        except:volume=0
        try:number=float(chapter["number"] or -1)
        except:number=-1
        return (volume,number,chapter["publishedAt"])
    return {"chapters":sorted(unique.values(),key=order_value,reverse=True),"language":language}

@app.get("/api/v2/chapter/{chapter_id}/pages")
async def mangadex_pages(chapter_id:str,request:Request,quality:str="data-saver"):
    if not valid_uuid(chapter_id):raise HTTPException(400,"Identificador de capítulo inválido")
    payload=await mangadex_json("/at-home/server/"+chapter_id,[],60)
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
    return {"ok":True,"name":"ResenhaFlix Manga Bridge","version":VERSION,"adapters":["mangadex","madara","saikai","lycantoons","mangasbrasuka","generic"],"sources":len(CURATED_SOURCES)}

@app.get("/api/sources")
async def sources():
    return {"repo":KEIYOUSHI_REPO,"limit":5,"sources":CURATED_SOURCES}

def proxy_result_images(result,request):
    for item in result.get("items") or []:
        image=item.get("thumbnail") or ""
        if is_public_http_url(image):item["thumbnail"]=proxied_image(request,image,item.get("url") or item.get("source",{}).get("homeUrl") or "")
    return result

@app.post("/api/search")
async def search(body:SearchBody,request:Request):
    r=await search_source(body.source,body.query,False)
    return proxy_result_images({"items":r["items"],"ok":r["ok"],"adapter":r.get("adapter"),"error":r.get("error")},request)

@app.post("/api/popular")
async def popular(body:SearchBody,request:Request):
    r=await search_source(body.source,body.query,True)
    return proxy_result_images({"items":r["items"],"ok":r["ok"],"adapter":r.get("adapter"),"error":r.get("error")},request)

@app.post("/api/batch/search")
async def batch_search(body:BatchSearchBody,request:Request):
    requested=body.sources or [Source(**x) for x in CURATED_SOURCES]
    ordered=sorted(requested[:5],key=lambda s:(0 if s.lang.lower().startswith("pt") else 1,s.name.lower()))
    tasks=[asyncio.wait_for(search_source(s,body.query,False),timeout=7.0) for s in ordered]
    raw=await asyncio.gather(*tasks,return_exceptions=True)
    results=[]
    for i,x in enumerate(raw):
        if isinstance(x,Exception):
            results.append({"source":source_dict(ordered[i]),"items":[],"ok":False,"error":str(x)})
        else:results.append(proxy_result_images(x,request))
    return {"results":results}

@app.post("/api/manga")
async def manga(body:UrlBody):
    if not same_source(body.source,body.url):raise HTTPException(400,"URL fora da fonte")
    adapter=adapter_name(body.source)
    if adapter=="saikai":return await saikai_details(body.source,body.url)
    if adapter=="madara":return await madara_details(body.source,body.url)
    if adapter=="mangasbrasuka":return await madara_details(body.source,body.url)
    if adapter=="lycantoons":return await lycan_details(body.source,body.url)
    # auto: Madara parser is more complete; generic is fallback.
    try:
        d=await madara_details(body.source,body.url)
        if d.get("chapters"):return d
    except Exception:pass
    return await generic_details(body.source,body.url)

@app.post("/api/chapter")
async def chapter(body:UrlBody,request:Request):
    if not same_source(body.source,body.url):raise HTTPException(400,"URL fora da fonte")
    adapter=adapter_name(body.source)
    if adapter=="saikai":pages=await saikai_pages(body.source,body.url,request)
    elif adapter=="madara":pages=await madara_pages(body.source,body.url,request)
    elif adapter=="lycantoons":pages=await lycan_pages(body.source,body.url,request)
    elif adapter=="mangasbrasuka":pages=await brasuka_pages(body.source,body.url,request)
    else:
        pages=await madara_pages(body.source,body.url,request)
        if not pages:pages=await generic_pages(body.source,body.url,request)
    if not pages:raise HTTPException(422,"Nenhuma página encontrada")
    return {"pages":pages,"adapter":adapter}

@app.get("/api/image")
async def image(token:str,sig:str):
    expected=hmac.new(secret,token.encode(),hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected,sig):raise HTTPException(403,"Assinatura inválida")
    try:
        token+= "="*((4-len(token)%4)%4)
        data=json.loads(base64.urlsafe_b64decode(token))
    except Exception:raise HTTPException(400,"Token inválido")
    if int(data.get("e",0))<time.time():raise HTTPException(403,"Token expirado")
    url=data.get("u","");referer=data.get("r","")
    if not is_public_http_url(url):raise HTTPException(400,"URL inválida")
    headers={"Accept":"image/avif,image/webp,image/apng,image/*,*/*;q=0.8"}
    if referer:headers["Referer"]=referer
    upstream=await client.send(client.build_request("GET",url,headers=headers),stream=True)
    if upstream.status_code>=400:
        await upstream.aclose();raise HTTPException(502,f"Imagem HTTP {upstream.status_code}")
    async def chunks():
        try:
            async for chunk in upstream.aiter_bytes(65536):yield chunk
        finally:await upstream.aclose()
    response_headers={"Cache-Control":"public,max-age=1800","X-Content-Type-Options":"nosniff"}
    if upstream.headers.get("content-length"):response_headers["Content-Length"]=upstream.headers["content-length"]
    return StreamingResponse(chunks(),media_type=upstream.headers.get("content-type","image/jpeg"),headers=response_headers)

@app.on_event("shutdown")
async def shutdown():
    await client.aclose()
