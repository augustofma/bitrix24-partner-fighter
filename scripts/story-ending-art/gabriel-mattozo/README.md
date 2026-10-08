# Arte do final do Gabriel Mattozo no Modo História

`source.webp` é a arte oficial (1672×941) fornecida pelo usuário: o Gabriel Mattozo, de costas, de
moletom claro, num mirante de Curitiba olhando o pôr do sol sobre a cidade, com a estufa do Jardim
Botânico à esquerda, um lago no parque e a torre de telecomunicações ao fundo.

`prepare_gabriel_mattozo_ending.py` faz o mesmo preparo dos outros finais 16:9 (recorte centralizado)
e gera `public/story/endings/gabriel-mattozo.jpg` (1440×810).

A arte é ligada ao lutador em `STORY_ENDING_ART` (`src/story/storyEndings.ts`) e só aparece na
`CampaignCompleteScene`, ao zerar o Modo História com o Gabriel Mattozo.

Uso (ferramenta offline, fora do build; requer Python 3 e Pillow):

```bash
python scripts/story-ending-art/gabriel-mattozo/prepare_gabriel_mattozo_ending.py
```
