# Arte do final da Gabriele no Modo História

`source.webp` é a arte oficial (1672×941) fornecida pelo usuário: a Gabriele (Inovar Consulting), de
costas, cabelo vermelho e óculos, apoiada num mirante do Rio de Janeiro olhando o pôr do sol sobre
a Baía de Guanabara, com o Pão de Açúcar e o Cristo Redentor.

`prepare_gabriele_ending.py` faz o mesmo preparo dos outros finais 16:9 (recorte centralizado) e
gera `public/story/endings/gabriele.jpg` (1440×810).

A arte é ligada à lutadora em `STORY_ENDING_ART` (`src/story/storyEndings.ts`) e aparece na
`CampaignCompleteScene`, ao zerar o Modo História com a Gabriele, e na galeria de finais.

Uso (ferramenta offline, fora do build; requer Python 3 e Pillow):

```bash
python scripts/story-ending-art/gabriele/prepare_gabriele_ending.py
```
