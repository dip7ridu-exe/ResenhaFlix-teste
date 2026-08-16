# ResenhaFlix Manga Bridge V32

Backend opcional, mas recomendado, para o leitor de mangás do ResenhaFlix. Ele evita bloqueios CORS do navegador, protege as URLs das imagens e permite montar downloads CBZ no aparelho.

## Fontes

- MangaDex: catálogo, detalhes, capítulos e páginas por API pública;
- Saikai Scan: API usada pela extensão Keiyoushi atual;
- Lycan Toons: busca JSON e dados RSC do Next.js;
- Mangás Brasuka: Madara/WordPress e fluxo especial de páginas;
- Boruto Explorer: Madara/WordPress;
- parser Madara e HTML genérico mantidos como fallback.

O catálogo Keiyoushi é um índice de extensões Android em Kotlin/APK. O bridge usa seus metadados e reimplementa somente adaptadores web compatíveis; ele não instala nem executa APKs no servidor.

## Rodar localmente

```bash
python -m pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8787
```

Teste em `http://localhost:8787/api/health`.

## Railway

O `Dockerfile` e o `railway.toml` na raiz do repositório estão prontos para deploy. Conecte o repositório, gere um domínio HTTPS e configure:

- `ALLOWED_ORIGIN=https://dip7ridu-exe.github.io`
- `BRIDGE_SECRET` com uma sequência longa e aleatória
- `PUBLIC_BASE_URL=https://SEU-DOMINIO.up.railway.app`

Depois cole a URL HTTPS em **ResenhaFlix → Mangás → Fontes**. Também é possível abrir uma vez com `?mangaBridge=https://SEU-DOMINIO` para salvar a configuração no aparelho.

## Render

O `render.yaml` desta pasta continua disponível. Após o deploy, configure `PUBLIC_BASE_URL` com a URL pública do serviço.

## Segurança

- CORS limitado ao GitHub Pages do ResenhaFlix por padrão;
- fontes limitadas a uma lista de hosts conhecidos;
- proxy de imagem usa assinatura temporária;
- conteúdo MangaDex limitado a `safe` e `suggestive`;
- no máximo cinco fontes são consultadas em lote.
