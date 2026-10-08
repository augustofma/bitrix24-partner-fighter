# Arte do cenário CURITIBA, luta do Gabriel Mattozo

`source.webp` é a arte oficial (1672×941) fornecida pelo usuário: o Jardim Botânico de Curitiba
(a cidade do Gabriel Mattozo), com a estufa de vidro, o chafariz e os jardins, os prédios da
cidade ao fundo, estandartes e tendas da GMC, a torcida atrás da grade roxa "Gabriel Mattozo" e
um avião roxo rebocando a faixa "GMC".

`prepare_curitiba.py` usa o preparo compartilhado `scripts/stage-art/flyover_art.py` e gera em
`public/stages/curitiba/`:

| Arquivo          | Conteúdo                                                           |
| ---------------- | ------------------------------------------------------------------ |
| `background.jpg` | 1075×605, sem o avião, as linhas e a faixa (céu preenchido)        |
| `plane.png`      | Corpo do avião, com alpha                                          |
| `propeller.png`  | Hélice, com alpha (gira em código)                                 |
| `banner.png`     | Faixa "GMC", com alpha (cortada em tiras que ondulam)              |
| `skyline.png`    | 250 linhas do topo: estufa, prédios, árvores, postes e estandartes |

Particularidade desta arte: os prédios ao fundo são claros e pouco saturados, como as nuvens, e
contavam como céu. `pale_solid_from` (opção nova do preparo compartilhado, sem efeito nos outros
cenários) faz o claro contar como sólido a partir da linha 118, então os prédios passam na frente
do avião e as nuvens acima continuam céu. Como a arte ocupa quase todo o céu, o avião voa menor e
alto, logo abaixo das barras do HUD.

Uso (ferramenta offline, fora do build; requer Python 3, Pillow e NumPy):

```bash
python scripts/stage-art/curitiba/prepare_curitiba.py
```
