# ResenhaFlix

Atualização visual v54:

- nova paleta oficial aplicada em todo o site: `#6B5E90`, `#100502`, `#B5D0EC`, `#204995` e `#4B75FF`;
- nova identidade aplicada ao cabeçalho, destaques, cards, player, fontes, busca, configurações, mangás, livros e navegação móvel;
- todos os arquivos da pasta `icons` substituídos pelo novo ícone, mantendo os nomes e dimensões usados pelo site e pelo PWA;
- funcionalidades e lógica de reprodução da v53 preservadas sem alterações.

Atualização v53 focada em fluidez, navegação e fontes:

- tela inicial reorganizada em hero, Continuar assistindo, Top 10 e prateleiras de recomendações, usando as classes visuais já existentes;
- navegação vertical e carrosséis com rolagem suave, respeitando a preferência de movimento reduzido do sistema;
- catálogo e painel de fontes renderizados em lotes com carregamento progressivo ao rolar;
- atualização dos controles de carrossel e da interface do player agrupada por quadro para reduzir travamentos durante interações;
- busca paralela obrigatória no BestCine, FrostStream, FenixFlix, Torrentio, Comet e MediaFusion;
- Streaming Catalogs mantido como fonte obrigatória de catálogo e descoberta, sem tratá-lo incorretamente como fonte de vídeo;
- preferência por fontes diretas em 1080p, tentativas alternadas entre addons e fallback automático;
- reprodução experimental de torrents no navegador somente por escolha manual;
- download por magnet sempre disponível para Torrentio, Comet e MediaFusion, inclusive ao tocar no card após uma falha online;
- cards de fonte inteiros clicáveis e abas centralizadas por rolagem suave;
- remoção de podcasts, trailers e outros extras promocionais da lista de episódios;
- modo de reprodução leve que suspende a pintura da interface escondida atrás do player;
- remoção da aba, player e integrações de música.

## Testes

```bash
node --check app.js
node --test tests/*.test.mjs
```

Os addons de vídeo são serviços de terceiros. A disponibilidade de um título ou resolução pode mudar sem alteração no ResenhaFlix.
