# ResenhaFlix para Android

Aplicativo Android pessoal que abre a versão publicada do ResenhaFlix:

`https://dip7ridu-exe.github.io/ResenhaFlix-teste/`

O site continua hospedado no GitHub Pages. Alterações publicadas no site aparecem no aplicativo sem gerar outro APK. Um novo APK só é necessário quando o código nativo dentro de `android-app/` mudar.

## Recursos

- pacote `com.dip7ridu.resenhaflix`;
- somente a permissão `INTERNET`;
- JavaScript, armazenamento local e reprodução de mídia habilitados;
- vídeo em tela cheia com rotação horizontal;
- botão voltar navega no histórico antes de fechar;
- links externos e downloads são enviados ao navegador/aplicativo apropriado;
- tela de erro com tentativa de recarregamento;
- HTTPS obrigatório, acesso local a arquivos desativado e depuração somente no APK de teste;
- ícone e tela inicial gerados a partir de `../icons/icon-512.png`.

## Gerar o APK no computador

1. Instale o Android Studio e o Android SDK 36.
2. Abra a pasta `android-app` no Android Studio.
3. Aguarde a sincronização do Gradle.
4. Use **Build > Build APK(s)**.

Pelo terminal:

```bash
./gradlew testDebugUnitTest assembleDebug
```

O APK será criado em:

`app/build/outputs/apk/debug/app-debug.apk`

## Assinar uma versão pessoal

Nunca envie a chave ou suas senhas ao GitHub. Crie a chave no seu computador:

```bash
keytool -genkeypair -v -keystore resenhaflix-release.jks -alias resenhaflix -keyalg RSA -keysize 4096 -validity 10000
```

Copie `keystore.properties.example` para `keystore.properties`, preencha as senhas e execute:

```bash
./gradlew assembleRelease
```

Guarde o arquivo `.jks`: futuras atualizações do aplicativo precisam ser assinadas com a mesma chave.

## APK automático

O workflow `.github/workflows/android-apk.yml` executa os testes, gera o APK de teste e publica o resultado como artefato privado da execução no GitHub Actions.

