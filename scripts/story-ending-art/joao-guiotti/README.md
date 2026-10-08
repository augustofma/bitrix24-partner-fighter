# Arte do final do João Guiotti no Modo História

`source.webp` é a arte oficial (1672×941) fornecida pelo usuário: o João Guiotti, de costas, de
óculos e blazer escuro, numa sacada olhando o pôr do sol sobre uma cidade à beira do rio, com
catedral de tijolos, pontes e guindastes do porto.

`prepare_joao_guiotti_ending.py` faz o mesmo preparo dos outros finais 16:9 (recorte centralizado)
e gera `public/story/endings/joao-guiotti.jpg` (1440×810).

A arte é ligada ao lutador em `STORY_ENDING_ART` (`src/story/storyEndings.ts`) e só aparece na
`CampaignCompleteScene`, ao zerar o Modo História com o João Guiotti.

Uso (ferramenta offline, fora do build; requer Python 3 e Pillow):

```bash
python scripts/story-ending-art/joao-guiotti/prepare_joao_guiotti_ending.py
```
