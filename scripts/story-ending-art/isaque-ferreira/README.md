# Arte do final do Isaque Ferreira no Modo História

`source.webp` é a arte oficial (1672×941) fornecida pelo usuário: o Isaque Ferreira, de costas, de
jaqueta bege, numa sacada de Madri olhando o pôr do sol sobre a cidade, com o Palácio Real, a
cúpula do edifício Metrópolis e as torres ao fundo. Na história o Isaque está na Espanha.

`prepare_isaque_ferreira_ending.py` faz o mesmo preparo dos outros finais 16:9 (recorte centralizado)
e gera `public/story/endings/isaque-ferreira.jpg` (1440×810).

A arte é ligada ao lutador em `STORY_ENDING_ART` (`src/story/storyEndings.ts`) e só aparece na
`CampaignCompleteScene`, ao zerar o Modo História com o Isaque Ferreira.

Uso (ferramenta offline, fora do build; requer Python 3 e Pillow):

```bash
python scripts/story-ending-art/isaque-ferreira/prepare_isaque_ferreira_ending.py
```
