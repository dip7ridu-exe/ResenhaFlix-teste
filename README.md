# ResenhaFlix

## Catálogo e biblioteca (v62)

- Filmes, séries e animes usam o addon TMDB configurado para Português (Brasil), com IDs IMDb quando disponíveis.
- As coleções de Netflix, Max, Disney+, Prime Video e Apple TV+ são carregadas sob demanda pelo addon Streaming Catalogs.
- A biblioteca de livros mantém leitura e downloads autorizados, abre o dLivros diretamente e só carrega o leitor EPUB quando ele for realmente usado.
- O módulo de mangás e seus arquivos auxiliares foram removidos.

## Sala Resenha — assistir junto (v61)

A Sala Resenha sincroniza o player entre até 8 pessoas sem exigir conta ou servidor próprio. Título, episódio, tempo, comandos e a fonte escolhida pelo dono são enviados pela conexão ponto a ponto. Cada aparelho abre o vídeo localmente; se a fonte exata não estiver disponível para um convidado, o player mantém uma alternativa compatível sem interromper a sala.

### Como usar

1. Toque no ícone de pessoas da tela inicial, nos detalhes ou dentro do player.
2. Digite seu nome e escolha **Criar sala agora**. Não é necessário selecionar um título antes.
3. Envie o link ou o código de 5 caracteres para seus convidados.
4. O link compartilhado é um convite direto. Quem já informou um nome anteriormente entra automaticamente; no primeiro acesso, aparece somente o campo de nome e o botão **Entrar agora**.
5. Se preferir, ainda é possível abrir **Mais > Criar ou entrar em uma sala** e digitar o código.
6. O dono pesquisa e abre o filme ou a série. Todos recebem o mesmo conteúdo e a mesma fonte automaticamente.
7. O dono controla play, pausa, avanço, velocidade, abertura, episódios e fonte. Cada participante mantém volume, legenda e tela cheia no próprio aparelho.

A sala existe enquanto o dono estiver conectado. A conexão usa [PeerJS](https://peerjs.com/client/getting-started), confirma o convidado pelos dados do convite e faz até três tentativas automáticas antes de mostrar um erro, evitando carregamento infinito.

## Testes

```bash
node --check app.js
node --check watch-party.js
node --test tests/*.test.mjs
```

Os addons de vídeo são serviços de terceiros. A disponibilidade de um título ou resolução pode mudar sem alteração no ResenhaFlix.
