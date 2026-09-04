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

## Testes

```bash
node --check app.js
node --check watch-party.js
node --test tests/*.test.mjs
```

Os addons de vídeo são serviços de terceiros. A disponibilidade de um título ou resolução pode mudar sem alteração no ResenhaFlix.
