# CÓLERA DOS 100 DRAGÕES: arte dos dragões

`source.jpg` (1220×228) é a arte de dragões de energia fornecida pelo dono do projeto para o
especial do Douglas: dragões dourados com rastros verde-azulados, em pixel art, sobre fundo
preto. As linhas de cima e de baixo da imagem são outras artes cortadas; só a faixa do meio é
usada.

`prepare.py` gera as duas imagens do jogo em `public/vfx/`:

| Arquivo            | Recorte da fonte                        | Uso no especial                                                            |
| ------------------ | --------------------------------------- | -------------------------------------------------------------------------- |
| `dragon-flood.png` | faixa inteira (y 18–180)                | A enxurrada: várias cópias em escalas, alturas e transparências diferentes |
| `dragon-hero.png`  | x 600–1010 (o dragão maior com o bando) | O dragão líder (pequeno) e o dragão final (grande)                         |

O fundo preto vira transparência pela luminância (a arte é clara sobre preto), as cores são
"despremultiplicadas" para manter o dourado sobre qualquer cenário com blend normal, as pontas
ganham um degradê para as cópias não mostrarem borda e as cores são posterizadas (5 bits por
canal, 16 níveis de alpha) para o PNG ficar leve: as duas imagens entram no boot com os outros
emblemas (cerca de 255 KB juntas), então o primeiro uso do especial não carrega nada.

    python3 scripts/vfx-art/hundred-dragons/prepare.py
