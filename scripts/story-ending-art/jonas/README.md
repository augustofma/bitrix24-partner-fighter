# Arte do final do Jonas no Modo História

`source.webp` é a arte oficial (1448×1086, 4:3) fornecida pelo usuário: o Jonas (Sapiens), de
costas, camiseta preta, num mirante de São Paulo com grafite olhando o pôr do sol sobre os
prédios e a ponte estaiada.

`prepare_jonas_ending.py` recorta em 16:9 a partir de `CROP_TOP` (como o final do Aislan, que
também é 4:3) e gera `public/story/endings/jonas.jpg` (1440×810).

A arte é ligada ao lutador (id `jonas`) em `STORY_ENDING_ART` (`src/story/storyEndings.ts`) e aparece na
`CampaignCompleteScene`, ao zerar o Modo História com ele, e na galeria de finais, assim que o lutador `jonas`
entrar no elenco (até lá a entrada fica registrada e não é carregada).

Uso (ferramenta offline, fora do build; requer Python 3 e Pillow):

```bash
python scripts/story-ending-art/jonas/prepare_jonas_ending.py
```
