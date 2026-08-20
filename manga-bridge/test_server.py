import importlib.util
import asyncio
import os
import pathlib
import unittest
from unittest.mock import AsyncMock, patch

import httpx
from fastapi.testclient import TestClient


MODULE_PATH = pathlib.Path(__file__).with_name("server.py")
SPEC = importlib.util.spec_from_file_location("resenhaflix_manga_bridge", MODULE_PATH)
server = importlib.util.module_from_spec(SPEC)
with patch.dict(os.environ, {"ALLOWED_ORIGIN": "https://dip7ridu-exe.github.io"}):
    SPEC.loader.exec_module(server)

MANGA_ID = "11111111-1111-4111-8111-111111111111"
CHAPTER_ID = "22222222-2222-4222-8222-222222222222"
LOOKISM_ID = "596191eb-69ee-4401-983e-cc07e277fa17"
UPSTREAM_SEARCH_TITLES = []


def upstream(request: httpx.Request) -> httpx.Response:
    path = request.url.path
    if path == "/manga":
        query = request.url.params.get("title", "")
        UPSTREAM_SEARCH_TITLES.append(query)
        if query == "Lookism":
            return httpx.Response(200, json={"data": [lookism_resource()], "total": 1})
        return httpx.Response(200, json={"data": [manga_resource()], "total": 1})
    if path == f"/manga/{MANGA_ID}":
        return httpx.Response(200, json={"data": manga_resource()})
    if path == "/chapter":
        if request.url.params.get("manga") == LOOKISM_ID:
            releases = []
            for chapter_id, pages, published in (
                ("33333333-3333-4333-8333-333333333333", 19, "2026-06-24T20:41:36Z"),
                ("44444444-4444-4444-8444-444444444444", 105, "2026-03-12T17:14:23Z"),
            ):
                releases.append({
                    "id": chapter_id,
                    "attributes": {
                        "chapter": "598", "volume": None, "title": "", "translatedLanguage": "en",
                        "pages": pages, "publishAt": published, "externalUrl": None,
                    },
                    "relationships": [],
                })
            return httpx.Response(200, json={"total": len(releases), "data": releases})
        return httpx.Response(200, json={
            "total": 1,
            "data": [{
                "id": CHAPTER_ID,
                "attributes": {
                    "chapter": "7",
                    "volume": "2",
                    "title": "Teste",
                    "translatedLanguage": "pt-br",
                    "pages": 2,
                    "publishAt": "2026-08-14T00:00:00Z",
                    "externalUrl": None,
                },
                "relationships": [{"type": "scanlation_group", "attributes": {"name": "Grupo BR"}}],
            }],
        })
    if path == f"/at-home/server/{CHAPTER_ID}":
        return httpx.Response(200, json={
            "baseUrl": "https://uploads.mangadex.org",
            "chapter": {"hash": "abc", "data": ["1.jpg", "2.jpg"], "dataSaver": ["1-s.jpg", "2-s.jpg"]},
        })
    return httpx.Response(404, json={"error": path})


def manga_resource():
    return {
        "id": MANGA_ID,
        "attributes": {
            "title": {"en": "Test Manga", "pt-br": "Mangá de Teste"},
            "altTitles": [{"ja-ro": "Tesuto"}],
            "description": {"pt-br": "Sinopse"},
            "status": "ongoing",
            "year": 2026,
            "contentRating": "safe",
            "availableTranslatedLanguages": ["pt-br"],
            "tags": [{"attributes": {"name": {"pt-br": "Ação"}}}],
        },
        "relationships": [
            {"type": "cover_art", "attributes": {"fileName": "cover.jpg"}},
            {"type": "author", "attributes": {"name": "Autor"}},
        ],
    }


def lookism_resource():
    return {
        "id": LOOKISM_ID,
        "attributes": {
            "title": {"en": "Oemo Jisangjuui"},
            "altTitles": [{"en": "Lookism"}],
            "description": {"en": "Lookism test"},
            "status": "ongoing",
            "year": 2014,
            "contentRating": "safe",
            "availableTranslatedLanguages": ["en", "pt-br"],
            "tags": [],
        },
        "relationships": [],
    }


def lycan_source():
    return server.Source(
        id="lycan-toons", name="Lycan Toons", lang="pt-BR", homeUrl="https://lycantoons.com",
        pkg="eu.kanade.tachiyomi.extension.pt.lycantoons", contentWarning="safe",
    )


class BridgeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        server.client = httpx.AsyncClient(transport=httpx.MockTransport(upstream), follow_redirects=True)
        cls.client = TestClient(server.app)

    @classmethod
    def tearDownClass(cls):
        cls.client.close()

    def setUp(self):
        server._rate_buckets.clear()
        server._dns_cache.clear()

    def test_health_and_curated_sources(self):
        health = self.client.get("/api/health").json()
        self.assertTrue(health["ok"])
        self.assertEqual(health["version"], "34.0.0")
        self.assertFalse(health["configured"])
        self.assertTrue(any("BRIDGE_SECRET" in item for item in health["warnings"]))
        sources = self.client.get("/api/sources").json()["sources"]
        self.assertEqual(len(sources), 5)
        self.assertTrue(all(item["lang"] == "pt-BR" for item in sources))
        self.assertIn("AstraToons", {item["name"] for item in sources})

    def test_cors_allows_github_pages(self):
        origin = "https://dip7ridu-exe.github.io"
        response = self.client.get("/api/health", headers={"Origin": origin})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get("access-control-allow-origin"), origin)

    def test_cors_allows_local_development_origins(self):
        for origin in ("http://localhost:5500", "http://127.0.0.1:5173"):
            with self.subTest(origin=origin):
                response = self.client.get("/api/health", headers={"Origin": origin})
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.headers.get("access-control-allow-origin"), origin)

    def test_cors_blocks_arbitrary_origin(self):
        response = self.client.get("/api/health", headers={"Origin": "https://malicious.example"})
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("access-control-allow-origin", response.headers)

    def test_mangadex_search_is_normalized_and_proxied(self):
        response = self.client.get("/api/v2/manga/search", params={"query": "teste", "language": "pt-br"})
        self.assertEqual(response.status_code, 200)
        item = response.json()["items"][0]
        self.assertEqual(item["title"], "Mangá de Teste")
        self.assertEqual(item["connector"], "mangadex")
        self.assertIn("/api/image?", item["cover"])

    def test_lookism_uses_readable_alias_and_portuguese_name(self):
        UPSTREAM_SEARCH_TITLES.clear()
        response = self.client.get("/api/v2/manga/search", params={"query": "aparências", "language": "all"})
        self.assertEqual(response.status_code, 200)
        item = response.json()["items"][0]
        self.assertEqual(UPSTREAM_SEARCH_TITLES[-1], "Lookism")
        self.assertEqual(item["title"], "Lookism")
        self.assertEqual(item["altTitle"], "Aparências")
        self.assertIn("Oemo Jisangjuui", item["aliases"])

    def test_every_mangadex_scanlation_release_is_preserved(self):
        payload = self.client.get(
            f"/api/v2/manga/{LOOKISM_ID}/chapters", params={"language": "en"},
        ).json()
        self.assertEqual(payload["total"], 2)
        self.assertEqual(len(payload["chapters"]), 2)
        self.assertEqual({item["number"] for item in payload["chapters"]}, {"598"})

    def test_chapters_and_pages_are_reader_ready(self):
        chapters = self.client.get(f"/api/v2/manga/{MANGA_ID}/chapters", params={"language": "pt-br"}).json()["chapters"]
        self.assertEqual(chapters[0]["id"], CHAPTER_ID)
        self.assertEqual(chapters[0]["pageCount"], 2)
        pages = self.client.get(f"/api/v2/chapter/{CHAPTER_ID}/pages", params={"quality": "data-saver"}).json()["pages"]
        self.assertEqual(len(pages), 2)
        self.assertIn("/api/image?", pages[0]["url"])
        self.assertTrue(pages[0]["original"].endswith("1-s.jpg"))

    def test_untrusted_source_is_blocked(self):
        payload = {"source": {"name": "Local", "lang": "pt-BR", "homeUrl": "http://127.0.0.1:8000"}, "query": "x"}
        response = self.client.post("/api/search", json=payload)
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["ok"])
        self.assertIn("fora da lista", response.json()["error"])

    def test_rsc_extractor_understands_next_payload(self):
        raw = '1:{"capitulos":[{"numero":"3","pageCount":12}]}\n2:{"imageUrls":["https://img.example/1.jpg"]}'
        chapters, _ = server.rsc_find(raw, "capitulos")
        images, _ = server.rsc_find(raw, "imageUrls")
        self.assertEqual(chapters[0]["numero"], "3")
        self.assertEqual(images[0], "https://img.example/1.jpg")

    def test_rsc_extractor_understands_embedded_next_script(self):
        flight = '1:{"capitulos":[{"numero":"19","pageCount":31}]}\n2:{"imageUrls":["https://img.example/19-1.jpg"]}'
        html = f'<html><body><script>self.__next_f.push({server.json.dumps([1, flight])})</script></body></html>'
        chapters, _ = server.rsc_find(html, "capitulos")
        images, _ = server.rsc_find(html, "imageUrls")
        self.assertEqual(chapters[0]["numero"], "19")
        self.assertEqual(images, ["https://img.example/19-1.jpg"])

    def test_lycan_search_maps_live_api_shape(self):
        server._json_cache.pop("lycan:search:mago", None)
        upstream_payload = {"series": [{
            "title": "Mago do Infinito", "slug": "mago-do-infinito",
            "coverUrl": "https://cdn.example/cover.webp", "alternativeTitle": "Infinite Mage",
        }]}
        with patch.object(server, "lycan_json", new=AsyncMock(return_value=upstream_payload)):
            items = asyncio.run(server.lycan_search(lycan_source(), "mago"))
        self.assertEqual(items[0]["title"], "Mago do Infinito")
        self.assertEqual(items[0]["altTitle"], "Infinite Mage")
        self.assertTrue(items[0]["url"].endswith("/series/mago-do-infinito"))

    def test_lycan_details_keeps_complete_chapter_list(self):
        chapter_items = [{"numero": str(number), "pageCount": 10} for number in range(1, 182)]
        async def lycan_api(_source, method, path, *_args):
            if method == "POST":return {"series": [{"slug": "serie-teste", "title": "Série Teste", "coverUrl": "https://cdn.example/capa.webp"}]}
            self.assertEqual(path, "/api/series/serie-teste/chapters")
            return {"chapters": chapter_items}
        with patch.object(server, "lycan_json", side_effect=lycan_api):
            result = asyncio.run(server.lycan_details(lycan_source(), "https://lycantoons.com/series/serie-teste"))
        self.assertEqual(result["title"], "Série Teste")
        self.assertEqual(len(result["chapters"]), 181)
        self.assertEqual(result["chapters"][0]["number"], 181.0)

    def test_astratoons_maps_lookism_alias_to_aparencias(self):
        server._json_cache.pop("astra:search:aparencias", None)
        upstream_payload = {"data": [{
            "id": 125, "title": "Aparências", "slug": "aparencias",
            "cover_image": "covers/aparencias.webp", "chapters_count": 617,
            "description": "<p>Sinopse</p>", "alternative_titles": [],
        }]}
        mocked = AsyncMock(return_value=upstream_payload)
        with patch.object(server, "get_json", new=mocked):
            items = asyncio.run(server.astra_search(lycan_source().model_copy(update={
                "id": "astra-toons", "name": "AstraToons", "homeUrl": "https://new.astratoons.com",
                "pkg": "eu.kanade.tachiyomi.extension.pt.astratoons",
            }), "lookism"))
        requested_url = mocked.await_args.args[0]
        self.assertIn("search=aparencias", requested_url)
        self.assertEqual(items[0]["title"], "Aparências")
        self.assertEqual(items[0]["altTitle"], "Lookism")
        self.assertEqual(items[0]["chapterCount"], 617)

    def test_astratoons_details_paginates_until_has_more_is_false(self):
        source = lycan_source().model_copy(update={
            "id": "astra-toons", "name": "AstraToons", "homeUrl": "https://new.astratoons.com",
            "pkg": "eu.kanade.tachiyomi.extension.pt.astratoons",
        })
        url = "https://new.astratoons.com/comics/aparencias"
        server._json_cache.pop("astra:details:" + url, None)
        html = '<html><h1>Aparências</h1><img class="object-cover" src="/storage/capa.webp"><script>comicId: 125</script></html>'

        async def chapter_page(_source, _comic_id, page):
            if page == 1:return ([{"name": "Capítulo 617", "number": 617.0, "url": url + "/capitulo/617", "pageCount": 0, "publishedAt": ""}], True)
            if page == 2:return ([{"name": "Capítulo 616", "number": 616.0, "url": url + "/capitulo/616", "pageCount": 0, "publishedAt": ""}], False)
            return ([], False)

        with (
            patch.object(server, "get_html", new=AsyncMock(return_value=(html, url))),
            patch.object(server, "astra_chapter_page", side_effect=chapter_page),
        ):
            result = asyncio.run(server.astra_details(source, url))
        self.assertEqual(result["altTitle"], "Lookism")
        self.assertEqual([item["number"] for item in result["chapters"]], [617.0, 616.0])

    def test_astratoons_missing_cover_stays_empty(self):
        source = lycan_source().model_copy(update={
            "id": "astra-toons", "name": "AstraToons", "homeUrl": "https://new.astratoons.com",
            "pkg": "eu.kanade.tachiyomi.extension.pt.astratoons",
        })
        url = "https://new.astratoons.com/comics/sem-capa"
        server._json_cache.pop("astra:details:" + url, None)
        html = '<html><h1>Sem capa</h1><script>comicId: 999</script></html>'
        with (
            patch.object(server, "get_html", new=AsyncMock(return_value=(html, url))),
            patch.object(server, "astra_chapter_page", new=AsyncMock(return_value=([], False))),
        ):
            result = asyncio.run(server.astra_details(source, url))
        self.assertEqual(result["cover"], "")

    def test_astratoons_reader_images_are_proxied(self):
        source = {
            "id": "astra-toons", "name": "AstraToons", "lang": "pt-BR",
            "homeUrl": "https://new.astratoons.com", "pkg": "eu.kanade.tachiyomi.extension.pt.astratoons",
            "contentWarning": "safe",
        }
        chapter_url = "https://new.astratoons.com/comics/aparencias/capitulo/617"
        html = '<div id="reader-container"><img src="https://cdn.example/1.webp"><canvas data-src="/storage/2.webp"></canvas></div>'
        with patch.object(server, "get_html", new=AsyncMock(return_value=(html, chapter_url))):
            response = self.client.post("/api/chapter", json={"source": source, "url": chapter_url})
        self.assertEqual(response.status_code, 200)
        pages = response.json()["pages"]
        self.assertEqual(len(pages), 2)
        self.assertTrue(all("/api/image?" in page["image"] for page in pages))

    def test_dns_resolution_rejects_private_and_mixed_answers(self):
        private = [(2, 1, 6, "", ("127.0.0.1", 443))]
        mixed = [(2, 1, 6, "", ("93.184.216.34", 443)), (2, 1, 6, "", ("10.0.0.2", 443))]
        for records in (private, mixed):
            server._dns_cache.clear()
            with self.subTest(records=records), patch.object(server.socket, "getaddrinfo", return_value=records):
                with self.assertRaises(server.HTTPException) as raised:
                    asyncio.run(server.resolve_public_addresses("source.example", 443))
                self.assertEqual(raised.exception.status_code, 400)

    def test_safe_request_validates_every_redirect_and_preserves_public_redirects(self):
        requests = []

        def transport(request):
            requests.append((request.headers.get("host"), str(request.url)))
            if request.headers.get("host") == "source.example":
                return httpx.Response(302, headers={"Location": "https://cdn.example/final"})
            return httpx.Response(200, text="ok")

        async def public_resolver(hostname, _port):
            if hostname == "private.example":raise server.HTTPException(400, "DNS privado bloqueado")
            return ["93.184.216.34"]

        async def exercise():
            active = httpx.AsyncClient(transport=httpx.MockTransport(transport))
            server._safe_client_override = active
            try:
                with patch.object(server, "resolve_public_addresses", side_effect=public_resolver):
                    response = await server.safe_request("GET", "https://source.example/start")
                    self.assertEqual(response.text, "ok")
                    self.assertEqual(response.extensions["safe_original_url"], "https://cdn.example/final")

                def private_redirect(request):
                    return httpx.Response(302, headers={"Location": "https://private.example/admin"})

                await active.aclose()
                active = httpx.AsyncClient(transport=httpx.MockTransport(private_redirect))
                server._safe_client_override = active
                with patch.object(server, "resolve_public_addresses", side_effect=public_resolver):
                    with self.assertRaises(server.HTTPException) as raised:
                        await server.safe_request("GET", "https://source.example/start")
                    self.assertEqual(raised.exception.status_code, 400)
            finally:
                server._safe_client_override = None
                await active.aclose()

        asyncio.run(exercise())
        self.assertEqual([item[0] for item in requests], ["source.example", "cdn.example"])
        self.assertTrue(all("93.184.216.34" in item[1] for item in requests))

    def test_input_size_and_batch_count_are_bounded_with_cors(self):
        origin = "https://dip7ridu-exe.github.io"
        oversized = self.client.post(
            "/api/search", content=b"x" * (server.MAX_POST_BODY_BYTES + 1),
            headers={"Content-Type": "application/json", "Origin": origin},
        )
        self.assertEqual(oversized.status_code, 413)
        self.assertEqual(oversized.headers.get("access-control-allow-origin"), origin)
        long_query = self.client.get("/api/v2/manga/search", params={"query": "x" * (server.MAX_QUERY_LENGTH + 1)})
        self.assertEqual(long_query.status_code, 422)
        source = {"name": "AstraToons", "homeUrl": "https://new.astratoons.com"}
        batch = self.client.post("/api/batch/search", json={"query": "x", "sources": [source] * 6})
        self.assertEqual(batch.status_code, 422)

    def test_expensive_endpoint_rate_limit_is_per_client(self):
        with patch.object(server, "EXPENSIVE_RATE_LIMIT", 2):
            first = self.client.get("/api/v2/manga/search", params={"query": "rate-a"})
            second = self.client.get("/api/v2/manga/search", params={"query": "rate-b"})
            limited = self.client.get("/api/v2/manga/search", params={"query": "rate-c"})
        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(limited.status_code, 429)
        self.assertIn("retry-after", limited.headers)

    def test_cached_json_single_flight_calls_loader_once(self):
        key = "test:single-flight"
        server._json_cache.pop(key, None);server._cache_tasks.pop(key, None)
        calls = 0

        async def exercise():
            nonlocal calls
            async def loader():
                nonlocal calls
                calls += 1
                await asyncio.sleep(.01)
                return {"ok": True}
            return await asyncio.gather(
                server.cached_json(key, 30, loader),
                server.cached_json(key, 30, loader),
            )

        values = asyncio.run(exercise())
        self.assertEqual(calls, 1)
        self.assertEqual(values, [{"ok": True}, {"ok": True}])

    def test_image_proxy_rejects_non_images_and_oversized_files(self):
        url = "https://uploads.mangadex.org/test.jpg"
        token, signature = server.sign_image(url, "https://mangadex.org/")
        bad_type = httpx.Response(
            200, headers={"Content-Type": "text/html"}, content=b"not an image",
            request=httpx.Request("GET", url),
        )
        with patch.object(server, "safe_request", new=AsyncMock(return_value=bad_type)):
            response = self.client.get("/api/image", params={"token": token, "sig": signature})
        self.assertEqual(response.status_code, 415)

        too_large = httpx.Response(
            200, headers={"Content-Type": "image/jpeg", "Content-Length": str(server.MAX_IMAGE_BYTES + 1)},
            content=b"", request=httpx.Request("GET", url),
        )
        with patch.object(server, "safe_request", new=AsyncMock(return_value=too_large)):
            response = self.client.get("/api/image", params={"token": token, "sig": signature})
        self.assertEqual(response.status_code, 413)

        image = httpx.Response(
            200, headers={"Content-Type": "image/jpeg", "Content-Length": "4"}, content=b"test",
            request=httpx.Request("GET", url),
        )
        with patch.object(server, "safe_request", new=AsyncMock(return_value=image)):
            response = self.client.get("/api/image", params={"token": token, "sig": signature})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b"test")
        self.assertNotIn("content-length", response.headers)


if __name__ == "__main__":
    unittest.main()
