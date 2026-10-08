# Arte do cenário CASTELO BRANCO, luta do Rômulo

`source.webp` é a arte oficial (1672×941) fornecida pelo usuário: o terraço das muralhas sobre
Castelo Branco, em Portugal (a cidade onde mora o Rômulo, da Arrecife Digital), com os telhados
vermelhos e as serras ao fundo, uma torre de pedra com estandartes da Arrecife Digital, a torcida
atrás da grade com faixas da Arrecife Digital e um avião pequeno rebocando a faixa branca
"Arrecife Digital".

`prepare_castelo_branco.py` usa o preparo compartilhado `scripts/stage-art/flyover_art.py` (o
mesmo do Recife, do Joinville e da Rússia) e gera em `public/stages/castelo-branco/`:

| Arquivo          | Conteúdo                                                                      |
| ---------------- | ----------------------------------------------------------------------------- |
| `background.jpg` | 1075×605, sem o avião, as linhas e a faixa (céu preenchido)                   |
| `plane.png`      | Corpo do avião, com alpha                                                     |
| `propeller.png`  | Hélice, com alpha (gira em código)                                            |
| `banner.png`     | Faixa "Arrecife Digital", com alpha (cortada em tiras que ondulam)            |
| `skyline.png`    | 250 linhas do topo com o céu transparente: árvore, torre, bandeiras na frente |

Particularidades desta arte: a faixa é branca neutra e as nuvens são creme ou azul-claras, então
as nuvens contam como céu pela cor (`clouds`). As duas linhas de reboque são de um azul escuro que
a máscara de céu confunde com céu: saem do fundo por uma caixa (`clear_boxes`, opção nova do
preparo compartilhado, sem efeito nos outros cenários).

Uso (ferramenta offline, fora do build; requer Python 3, Pillow e NumPy):

```bash
python scripts/stage-art/castelo-branco/prepare_castelo_branco.py
```
