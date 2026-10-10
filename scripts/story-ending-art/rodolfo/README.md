# Arte do final do Rodolfo no Modo História

`source.webp` é a arte oficial (1448×1086, 4:3) fornecida pelo usuário: o Rodolfo (Brasil Leads),
de costas, camisa vinho e jeans, num mirante de Curitiba olhando o pôr do sol sobre a cidade e a
estufa do Jardim Botânico.

`prepare_rodolfo_ending.py` recorta em 16:9 a partir de `CROP_TOP` (como o final do Aislan, que
também é 4:3) e gera `public/story/endings/rodolfo.jpg` (1440×810).

A arte é ligada ao lutador em `STORY_ENDING_ART` (`src/story/storyEndings.ts`) e aparece na
`CampaignCompleteScene`, ao zerar o Modo História com ele, e na galeria de finais.

Uso (ferramenta offline, fora do build; requer Python 3 e Pillow):

```bash
python scripts/story-ending-art/rodolfo/prepare_rodolfo_ending.py
```
