# ResenhaFlix

Atualização v51 focada em desempenho e reprodução:

- navegação sem o JavaScript duplicado no HTML;
- cache do aplicativo atualizado e carregamento assíncrono protegido contra trocas rápidas de página;
- busca paralela em fontes de vídeo, com preferência por 1080p e fallback automático;
- integração do BestCine antes das fontes de fallback;
- remoção da aba, player e integrações de música;
- CSS original preservado.

## Testes

```bash
node --check app.js
node --test tests/*.test.mjs
```

Os addons de vídeo são serviços de terceiros. A disponibilidade de um título ou resolução pode mudar sem alteração no ResenhaFlix.
