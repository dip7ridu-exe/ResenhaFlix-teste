# SoundCloud Worker opcional

A busca oficial atual do SoundCloud exige OAuth e Client Secret, então o segredo **não deve ficar no `index.html` do GitHub Pages**.

Este Worker guarda as credenciais no Cloudflare e o ResenhaFlix recebe apenas resultados públicos.

## 1. Crie credenciais SoundCloud
Registre um app SoundCloud e obtenha:
- Client ID
- Client Secret

## 2. Crie um Cloudflare Worker
Cole `worker.js`.

## 3. Configure Secrets
No Worker:
- `SOUNDCLOUD_CLIENT_ID`
- `SOUNDCLOUD_CLIENT_SECRET`

Nunca coloque o Client Secret no GitHub.

## 4. Deploy
Copie a URL do Worker, por exemplo:

`https://resenhaflix-soundcloud.seu-subdominio.workers.dev`

## 5. ResenhaFlix
Música → ⚙ Fontes → **SoundCloud Worker URL**

Cole a URL e salve.

O Worker só pesquisa recursos públicos. A reprodução continua sendo feita pelo player/widget oficial do SoundCloud no navegador.
