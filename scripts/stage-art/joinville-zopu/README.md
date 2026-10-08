# Arte do cenário JOINVILLE (ZOPU), luta do Aislan

`source.png` é a arte oficial (1672×941) fornecida pelo usuário: o mesmo pórtico de Joinville do
cenário do Romualdo, agora com bandeirinhas, banners e floreiras da ZOPU, torcida de verde e um
avião rebocando a faixa branca "zopu". O cenário do Romualdo (`scripts/stage-art/joinville/`)
não muda.

`prepare_joinville_zopu.py` usa o preparo compartilhado `scripts/stage-art/flyover_art.py` (o
mesmo do Recife, do Joinville e da Rússia) e gera em `public/stages/joinville-zopu/`:

| Arquivo          | Conteúdo                                                                                       |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| `background.jpg` | 1075×605, sem o avião, as cordas e a faixa (céu preenchido)                                    |
| `plane.png`      | Corpo do avião, com alpha                                                                      |
| `propeller.png`  | Pá da hélice, com alpha (gira em código)                                                       |
| `banner.png`     | Faixa "zopu", com alpha (cortada em tiras que ondulam em código)                               |
| `skyline.png`    | 250 linhas do topo com céu e nuvens transparentes: telhado, palmeiras e bandeirinhas na frente |

Particularidade desta arte: a faixa é branca e encosta em nuvens brancas. Ela é separada pelo
branco "creme" do tecido (as nuvens são brancas puxadas para o azul), com um fechamento pequeno
para selar a borda sombreada; as letras escuras voltam no preenchimento de buracos e o quadrado
verde do logo, que encosta na borda de baixo, é mantido pela própria cor, só nas colunas dele
(as palmeiras abaixo da ponta também são verdes). Os nós das cordas na borda esquerda da faixa
ficam fora da máscara de cor, para saírem do céu.

A composição é a mesma do Joinville do Romualdo, então `src/stages/joinvilleZopu.ts` reaproveita
as faixas da torcida, a grade e o voo dele e troca só as imagens e os encaixes medidos aqui.

Uso (ferramenta offline, fora do build; requer Python 3, Pillow e NumPy):

```bash
python scripts/stage-art/joinville-zopu/prepare_joinville_zopu.py
```
