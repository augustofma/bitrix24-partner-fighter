# Arte do final do Filipe no Modo História

`source.webp` é a arte oficial (1448×1086, 4:3) fornecida pelo usuário: o Filipe, de costas, de
blazer escuro, num miradouro de Lisboa olhando o pôr do sol sobre a cidade, o Tejo e a ponte, com
o castelo e a bandeira de Portugal ao fundo. Na história o Filipe está em Portugal (o marcador de
Portugal no mapa fica em Lisboa).

`prepare_filipe_ending.py` faz o mesmo preparo do final do Aislan (fonte 4:3): o corte 16:9
começa `CROP_TOP` (100 px) abaixo do topo, mantendo a cabeça e o céu e tirando a parte de baixo
das pernas, que ficaria atrás do painel e dos botões. Gera `public/story/endings/filipe.jpg`
(1440×810).

A arte é ligada ao lutador em `STORY_ENDING_ART` (`src/story/storyEndings.ts`) e só aparece na
`CampaignCompleteScene`, ao zerar o Modo História com o Filipe.

Uso (ferramenta offline, fora do build; requer Python 3 e Pillow):

```bash
python scripts/story-ending-art/filipe/prepare_filipe_ending.py
```
