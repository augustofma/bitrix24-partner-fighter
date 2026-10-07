# Arte do cenário JOINVILLE (pórtico)

`source.png` é a arte oficial (1672×941) do pórtico de entrada de Joinville em pixel art:
telhado de madeira com o letreiro, enxaimel, palmeiras, bandeirinhas e banners da CRMThink, a
torcida atrás das grades e um avião rebocando a faixa laranja "CRMThink".

`prepare_joinville.py` descreve onde as coisas estão nesta arte (`FlyoverStage`) e chama o
preparo compartilhado `scripts/stage-art/flyover_art.py` (o mesmo do Recife), que gera em
`public/stages/joinville/`:

| Arquivo          | Conteúdo                                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `background.jpg` | 1075×605, sem o avião, as cordas e a faixa (céu preenchido)                                                                    |
| `plane.png`      | Corpo do avião, com alpha                                                                                                      |
| `propeller.png`  | Pá da hélice, com alpha (gira em código)                                                                                       |
| `banner.png`     | Faixa "CRMThink", com alpha (cortada em tiras que ondulam em código)                                                           |
| `skyline.png`    | 250 linhas do topo do fundo com céu e nuvens transparentes: telhado, palmeiras, bandeirinhas e postes ficam na frente do avião |

Particularidades desta arte: nuvens encostam na faixa por cima, por baixo e na ponta, então a
faixa inteira é separada pela cor laranja e os buracos fechados (letras e logo brancos) são
preenchidos de novo (`refill_after_tail`). As faixas da torcida começam depois do poste da
esquerda e terminam antes do poste da direita, para nenhum poste pular.

Uso (ferramenta offline, fora do build; requer Python 3, Pillow e NumPy):

```bash
python scripts/stage-art/joinville/prepare_joinville.py
```
