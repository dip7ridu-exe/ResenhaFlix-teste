# ResenhaFlix

Atualização v52 focada em desempenho e reprodução:

- navegação sem o JavaScript duplicado no HTML;
- cache do aplicativo atualizado e carregamento assíncrono protegido contra trocas rápidas de página;
- busca paralela obrigatória no BestCine, FrostStream, FenixFlix e Torrentio;
- preferência por 1080p, tentativas alternadas entre addons e fallback automático;
- reprodução experimental dos torrents do Torrentio no navegador, carregada somente quando necessária;
- remoção de podcasts, trailers e outros extras promocionais da lista de episódios;
- modo de reprodução leve que suspende a pintura da interface escondida atrás do player;
- remoção da aba, player e integrações de música;
- CSS original preservado.

## Testes

```bash
node --check app.js
node --test tests/*.test.mjs
```

Os addons de vídeo são serviços de terceiros. A disponibilidade de um título ou resolução pode mudar sem alteração no ResenhaFlix.
