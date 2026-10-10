# Arte do final da Amanda Konrad no Modo História

`source.webp` é a arte oficial (1672×941) fornecida pelo usuário: a Amanda Konrad (BR24), de
costas, cabelo acobreado ao vento e blusa off-white de babados, apoiada num mirante de
Florianópolis olhando o pôr do sol sobre a baía, com a Ponte Hercílio Luz.

`prepare_amanda_konrad_ending.py` faz o mesmo preparo dos outros finais 16:9 (recorte
centralizado) e gera `public/story/endings/amanda-konrad.jpg` (1440×810).

A arte é ligada à lutadora em `STORY_ENDING_ART` (`src/story/storyEndings.ts`) e aparece na
`CampaignCompleteScene`, ao zerar o Modo História com a Amanda, e na galeria de finais.

Uso (ferramenta offline, fora do build; requer Python 3 e Pillow):

```bash
python scripts/story-ending-art/amanda-konrad/prepare_amanda_konrad_ending.py
```
