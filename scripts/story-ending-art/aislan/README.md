# Arte do final do Aislan no Modo História

`source.webp` é a arte oficial (1448×1086, 4:3) fornecida pelo usuário: o Aislan, de costas, de
blazer xadrez azul e crachá do Partner Summit, no Mirante de Joinville olhando o pôr do sol sobre a
cidade.

`prepare_aislan_ending.py` gera `public/story/endings/aislan.jpg` (1440×810). Diferente dos outros
finais, a fonte é 4:3: o corte 16:9 perde ~270 px de altura e o Aislan é mais alto que isso. O
corte começa `CROP_TOP` (100 px) abaixo do topo, mantendo a cabeça e um pouco de céu acima dela (o
título fica à direita da cabeça) e deixando de fora a parte de baixo das pernas, que ficaria
atrás do painel e dos botões de qualquer forma.

A arte é ligada ao lutador em `STORY_ENDING_ART` (`src/story/storyEndings.ts`) e só aparece
na `CampaignCompleteScene`, ao zerar o Modo História com o Aislan.

Uso (ferramenta offline, fora do build; requer Python 3 e Pillow):

```bash
python scripts/story-ending-art/aislan/prepare_aislan_ending.py
```
