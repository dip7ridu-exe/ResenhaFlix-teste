# ResenhaFlix Manga Bridge V34

Backend opcional, mas recomendado, para o leitor de mangás do ResenhaFlix. Ele evita bloqueios CORS do navegador, protege as URLs das imagens e permite montar downloads CBZ no aparelho.

## Fontes

- MangaDex: catálogo, detalhes, capítulos e páginas por API pública;
- Saikai Scan: API usada pela extensão Keiyoushi atual;
- Lycan Toons: busca JSON e dados RSC do Next.js com transporte TLS que imita navegador quando o HTTP comum recebe 403;
- AstraToons: API de catálogo, paginação integral de capítulos e páginas do leitor; usada também para Lookism/Aparências;
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

O CORS permite `http://localhost:PORTA` e `http://127.0.0.1:PORTA` para desenvolvimento no PC. Sirva o frontend por HTTP; paginas abertas diretamente com `file://` nao possuem uma origem web confiavel.

## Railway

O `Dockerfile` e o `railway.toml` na raiz do repositório estão prontos para deploy. Conecte o repositório, gere um domínio HTTPS e configure:

- `ALLOWED_ORIGIN=https://dip7ridu-exe.github.io`
- `BRIDGE_SECRET` com uma sequência longa e aleatória
- `PUBLIC_BASE_URL=https://SEU-DOMINIO.up.railway.app`

O endpoint `/api/health` continua respondendo HTTP 200 para o healthcheck do Railway, mas retorna `configured: false` e uma lista `warnings` quando `BRIDGE_SECRET`, `PUBLIC_BASE_URL` ou uma política segura de origem estão ausentes. Limites opcionais: `MAX_IMAGE_BYTES` (25 MiB), `DETAIL_DEADLINE_SECONDS` (40 s), `EXPENSIVE_CONCURRENCY` (6) e `EXPENSIVE_RATE_LIMIT` (40 consultas por cliente/minuto).

O GitHub Pages oficial já usa o domínio Railway deste projeto como padrão. Para substituir o endereço, cole outra URL HTTPS em **ResenhaFlix → Mangás → Fontes** ou abra uma vez com `?mangaBridge=https://SEU-DOMINIO`.

## Render

O `render.yaml` desta pasta continua disponível. Após o deploy, configure `PUBLIC_BASE_URL` com a URL pública do serviço.

## Segurança

- CORS limitado ao GitHub Pages do ResenhaFlix por padrão;
- fontes limitadas a hosts exatos conhecidos, com DNS público, conexão fixada no IP validado e nova validação a cada redirecionamento;
- proxy aceita somente imagens raster com assinatura temporária e limite de bytes;
- conteúdo MangaDex limitado a `safe` e `suggestive`;
- no máximo cinco fontes são consultadas em lote;
- corpo, taxa, concorrência e duração das consultas caras são limitados para um deploy pequeno no Railway.
