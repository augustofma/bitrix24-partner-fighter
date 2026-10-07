# Arte do cenário RÚSSIA (Praça Vermelha)

`source.png` é a arte oficial (1672×941) da Praça Vermelha ao pôr do sol em pixel art: torre
Spasskaya do Kremlin, Catedral de São Basílio, tendas e grades da Bitrix24, torcida e um
biplano rebocando a faixa "Bitrix24".

`prepare_russia.py` descreve a arte num `FlyoverStage` e usa o preparo compartilhado
`scripts/stage-art/flyover_art.py` (o mesmo do Recife e de Joinville), que gera em
`public/stages/russia/` `background.jpg`, `plane.png`, `propeller.png`, `banner.png` e
`skyline.png` (topo do fundo com o céu transparente: torres, cúpulas e postes na frente do
avião).

Particularidades: as nuvens do pôr do sol (rosa, laranja, violeta; claras e de saturação
média) contam como céu (`extra_sky`), tanto para separar o avião e a faixa quanto para o
recorte do horizonte; uma nuvem violeta encosta nas rodas do avião, então o avião termina na
linha 176 (`plane_max_y`).

Uso (ferramenta offline, fora do build; requer Python 3, Pillow e NumPy):

```bash
python scripts/stage-art/russia/prepare_russia.py
```
