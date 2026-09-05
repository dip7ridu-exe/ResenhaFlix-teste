# ResenhaFLIX Manga Engine v34

Modulo de mangas inspirado na separacao de responsabilidades do HakuNeko:

1. **Connector** consulta uma fonte e normaliza os dados.
2. **Manga** contem metadados e a biblioteca local.
3. **Chapter** lista idioma, grupo, data e paginas.
4. **Reader** exibe as paginas e salva o progresso.
5. **Download job** baixa as imagens com limite de concorrencia e monta um arquivo CBZ no navegador.

## Recursos

- Busca por titulo e nomes alternativos, com ranking de correspondencia.
- Fluxo visual inspirado no HakuNeko: Fonte → Obra → Capítulos → Leitura.
- Seletor de conector individual: catálogo combinado, MangaDex, todas as fontes PT-BR ou uma fonte específica.
- PT-BR como idioma padrao e troca rapida de idioma.
- Catálogo, capítulos e páginas do MangaDex pelo bridge, com fallback direto.
- Busca adicional em cinco fontes PT-BR curadas a partir do Keiyoushi, incluindo Lycan Toons e AstraToons.
- Alias legível para obras como Lookism/Aparências e prioridade real para resultados de fontes PT-BR.
- AstraToons pagina todos os capítulos de Aparências, em vez de depender dos poucos capítulos disponíveis no MangaDex.
- Tela Fontes para configurar e testar o Manga Bridge no próprio site.
- Fallback automatico para o MangaDex direto quando um Bridge configurado fica offline.
- Bridge oficial automática no GitHub Pages, com três tentativas e reconexão em segundo plano durante cold start.
- Link de configuração para substituir a Bridge ou levar uma URL personalizada para outro aparelho.
- Leitor vertical ou página a página, com botão **Ocultar** e botão flutuante **Mostrar controles** no celular.
- Qualidade economica ou original, ajuste de largura, espacamento e brilho.
- Progresso salvo localmente por capitulo.
- Acao rapida para marcar um capitulo como lido ou nao lido.
- Biblioteca local.
- Fila e historico de downloads.
- Download CBZ sem biblioteca externa; imagens passam pelo proxy assinado quando o bridge está ativo.
- Interface responsiva para celular e desktop.

## Arquivos

- `manga-hakuneko.js`: motor, conector, leitor e gerenciador de downloads.
- `manga-hakuneko.css`: interface isolada pelo prefixo `hk-`.
- `index.html`: carrega o modulo depois do codigo principal e substitui somente a pagina de mangas.
- `service-worker.js`: inclui os arquivos do modulo no shell offline.
- `manga-bridge/server.py`: proxy FastAPI para MangaDex e adaptadores PT-BR.
- `Dockerfile` e `railway.toml`: deploy do bridge sem alterar o GitHub Pages.

## PC e celular

No GitHub Pages, a Bridge oficial `https://resenhaflix-production.up.railway.app` é usada automaticamente em aparelhos novos. Uma URL manual continua sendo uma preferência local e tem prioridade sobre o padrão. A opção **Usar modo direto** desativa explicitamente o padrão naquele navegador.

O backend v34 aceita o site publicado e, para desenvolvimento, origens `localhost` e `127.0.0.1` em qualquer porta. Não abra o `index.html` diretamente por `file://`; use um servidor local.

## Observacoes

O download é montado em memória no aparelho. Capítulos muito grandes podem usar bastante RAM, principalmente em qualidade original. O índice Keiyoushi descreve extensões Android em Kotlin; o navegador não executa APKs e depende dos adaptadores reimplementados na Bridge. A Lycan usa proteção Cloudflare e recebe uma tentativa com impressão TLS de navegador; a AstraToons funciona como alternativa PT-BR para Lookism/Aparências. A disponibilidade ainda depende de cada fonte. O usuário deve baixar somente material que tenha permissão para armazenar.
