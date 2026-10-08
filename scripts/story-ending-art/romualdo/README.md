# Arte do final do Romualdo no Modo História

`source.webp` é a arte oficial (1672×941) fornecida pelo usuário: o Romualdo, de costas, num
mirante olhando o pôr do sol sobre Joinville, com o pórtico da cidade à direita.

`prepare_romualdo_ending.py` faz o mesmo preparo do final do Augusto (recorte 16:9 centralizado)
e gera `public/story/endings/romualdo.jpg` (1440×810).

A arte é ligada ao lutador em `STORY_ENDING_ART` (`src/story/storyEndings.ts`) e só aparece
na `CampaignCompleteScene`, ao zerar o Modo História com o Romualdo.

Uso (ferramenta offline, fora do build; requer Python 3 e Pillow):

```bash
python scripts/story-ending-art/romualdo/prepare_romualdo_ending.py
```
