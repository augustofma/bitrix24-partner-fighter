# Arte do cenário MADRI (Espanha), luta do Isaque Ferreira

`source.webp` é a arte oficial (1672×941) fornecida pelo usuário: a Puerta de Alcalá, em Madri,
com estandartes da Bitrix24, chafarizes e flores, a cúpula do Metrópolis e palácios ao fundo, um
telão, bandeiras da Espanha, a torcida atrás das grades da Bitrix24 e um jato pequeno rebocando a
faixa "Bitrix24".

`prepare_spain.py` usa o preparo compartilhado `scripts/stage-art/flyover_art.py` e gera em
`public/stages/spain/` o `background.jpg`, `plane.png`, `banner.png` e `skyline.png`. Por ser um
jato, não há camada de hélice (`propeller_max_x=None`; no jogo a hélice é opcional). A faixa é de
um azul do mesmo tom do céu, só mais escuro: `sky_min_value` separa pelo brilho.

Uso (ferramenta offline, fora do build; requer Python 3, Pillow e NumPy):

```bash
python scripts/stage-art/spain/prepare_spain.py
```
