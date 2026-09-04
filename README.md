# ResenhaFlix

## Sala Resenha — assistir junto (v59)

A Sala Resenha sincroniza o player entre até 8 pessoas sem exigir conta ou servidor próprio. O vídeo continua sendo aberto pelas fontes já configuradas em cada aparelho; somente título, episódio, tempo e comandos de reprodução são enviados pela conexão ponto a ponto.

### Como usar

1. Abra os detalhes de qualquer filme ou série e toque no ícone de pessoas, ou use o mesmo ícone dentro do player.
2. Digite seu nome e escolha **Criar sala com este título**.
3. Envie o link ou o código de 5 caracteres para seus convidados.
4. O convidado abre o link, informa apenas o nome e entra. Também é possível abrir **Mais > Entrar em uma sala** e digitar o código.
5. O dono controla play, pausa, avanço, velocidade, abertura e episódios. Cada participante mantém volume, legenda, fonte e tela cheia no próprio aparelho.

A sala existe enquanto o dono estiver conectado. A comunicação usa [PeerJS](https://peerjs.com/client/getting-started) com sinalização gratuita do PeerServer Cloud e é carregada somente ao criar ou entrar em uma sala.

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
