# ResenhaFlix


## Atualização de fontes (addons Stremio)

Addons adicionados aos padrões:
- Torrentio — https://torrentio.strem.fun/manifest.json
- Netflix Catalog — https://7a82163c306e-stremio-netflix-catalog-addon.baby-beamup.club/manifest.json
- MediaFusion — https://mediafusion.elfhosted.com/manifest.json
- TOP Streaming — https://top-streaming.stream/username=temporary_username/manifest.json
- Comet — https://comet.elfhosted.com/manifest.json
- Cinemeta — https://v3-cinemeta.strem.io/manifest.json
- Stremio Channels — https://v3-channels.strem.io/manifest.json
- Static Addon Example — https://stremio.github.io/stremio-static-addon-example/manifest.json
- Archive.org — https://stremio-archive-org-addon.fly.dev/manifest.json

Melhorias de compatibilidade:
- URLs de addon normalizadas (aceita `stremio://`, sem `https://`, sem `/manifest.json`, com barra final e caminhos de configuração como `/username=.../manifest.json`).
- Leitura do manifesto (`resources`, `types`, `idPrefixes`) antes de pedir streams: addons incompatíveis são ignorados em vez de gerar erro.
- Timeout maior (9s) + 1 nova tentativa automática por addon, com plano B via proxy CORS opcional (Configurações > Proxy CORS).
- Suporte a fontes que só retornam `infoHash` (Torrentio/Comet/MediaFusion sem debrid): viram link magnet aberto em player externo.
- Suporte a fontes `ytId` (canais do YouTube) abertas externamente.
