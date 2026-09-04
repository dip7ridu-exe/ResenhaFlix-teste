# ResenhaFlix

## Sala Resenha — assistir junto (v60)

A Sala Resenha sincroniza o player entre até 8 pessoas sem exigir conta ou servidor próprio. Título, episódio, tempo, comandos e a fonte escolhida pelo dono são enviados pela conexão ponto a ponto. Cada aparelho abre o vídeo localmente; se a fonte exata não estiver disponível para um convidado, o player mantém uma alternativa compatível sem interromper a sala.

### Como usar

1. Toque no ícone de pessoas da tela inicial, nos detalhes ou dentro do player.
2. Digite seu nome e escolha **Criar sala agora**. Não é necessário selecionar um título antes.
3. Envie o link ou o código de 5 caracteres para seus convidados.
4. O convidado abre o link, informa apenas o nome e entra. Também é possível abrir **Mais > Entrar em uma sala** e digitar o código.
5. O dono pesquisa e abre o filme ou a série. Todos recebem o mesmo conteúdo e a mesma fonte automaticamente.
6. O dono controla play, pausa, avanço, velocidade, abertura, episódios e fonte. Cada participante mantém volume, legenda e tela cheia no próprio aparelho.

A sala existe enquanto o dono estiver conectado. A comunicação usa [PeerJS](https://peerjs.com/client/getting-started) com sinalização gratuita do PeerServer Cloud e é carregada somente ao criar ou entrar em uma sala.

## Testes

```bash
node --check app.js
node --check watch-party.js
node --test tests/*.test.mjs
```

Os addons de vídeo são serviços de terceiros. A disponibilidade de um título ou resolução pode mudar sem alteração no ResenhaFlix.
