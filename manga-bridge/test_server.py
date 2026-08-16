import importlib.util
import pathlib
import unittest

import httpx
from fastapi.testclient import TestClient


MODULE_PATH = pathlib.Path(__file__).with_name("server.py")
SPEC = importlib.util.spec_from_file_location("resenhaflix_manga_bridge", MODULE_PATH)
server = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(server)

MANGA_ID = "11111111-1111-4111-8111-111111111111"
CHAPTER_ID = "22222222-2222-4222-8222-222222222222"


def upstream(request: httpx.Request) -> httpx.Response:
    path = request.url.path
    if path == "/manga":
        return httpx.Response(200, json={"data": [manga_resource()], "total": 1})
    if path == f"/manga/{MANGA_ID}":
        return httpx.Response(200, json={"data": manga_resource()})
    if path == "/chapter":
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


class BridgeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        server.client = httpx.AsyncClient(transport=httpx.MockTransport(upstream), follow_redirects=True)
        cls.client = TestClient(server.app)

    @classmethod
    def tearDownClass(cls):
        cls.client.close()

    def test_health_and_curated_sources(self):
        health = self.client.get("/api/health").json()
        self.assertTrue(health["ok"])
        self.assertEqual(health["version"], "32.0.0")
        sources = self.client.get("/api/sources").json()["sources"]
        self.assertEqual(len(sources), 4)
        self.assertTrue(all(item["lang"] == "pt-BR" for item in sources))

    def test_mangadex_search_is_normalized_and_proxied(self):
        response = self.client.get("/api/v2/manga/search", params={"query": "teste", "language": "pt-br"})
        self.assertEqual(response.status_code, 200)
        item = response.json()["items"][0]
        self.assertEqual(item["title"], "Mangá de Teste")
        self.assertEqual(item["connector"], "mangadex")
        self.assertIn("/api/image?", item["cover"])

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


if __name__ == "__main__":
    unittest.main()
