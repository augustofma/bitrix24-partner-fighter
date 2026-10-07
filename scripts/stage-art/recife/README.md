# Arte do cenário RECIFE (Marco Zero)

`source.png` é a arte oficial (1672×941) do Marco Zero em pixel art: prédios históricos,
palmeiras, bandeiras azuis da Arrecife Digital, a torcida atrás da grade, o piso de mosaico e
um avião rebocando a faixa "Arrecife Digital".

`prepare_recife.py` descreve a arte num `FlyoverStage` e usa o preparo compartilhado
`scripts/stage-art/flyover_art.py` (também usado por Joinville), que gera em
`public/stages/recife/`:

| Arquivo          | Conteúdo                                                                                     |
| ---------------- | -------------------------------------------------------------------------------------------- |
| `background.jpg` | 1075×605 (mesma escala do Partner Summit), sem o avião, as cordas e a faixa (céu preenchido) |
| `plane.png`      | Corpo do avião, com alpha                                                                    |
| `propeller.png`  | Pá da hélice, com alpha (gira em código)                                                     |
| `banner.png`     | Faixa "Arrecife Digital", com alpha (cortada em tiras que ondulam em código)                 |
| `skyline.png`    | 200 linhas do topo do fundo com céu e nuvens transparentes: prédios na frente do avião       |

Como funciona:

1. **Separação por cor:** numa caixa do céu, tudo que não é azul-céu claro é o grupo voador;
   buracos fechados (letras azul-escuras da faixa, janelas do avião) entram no grupo por
   preenchimento a partir da borda da caixa. Depois da dobra da cauda só o vermelho da faixa
   fica (as nuvens encostam nela).
2. **Divisão:** pelo eixo x, avião (hélice à parte), cordas e faixa. As cordas não viram
   arquivo: são redesenhadas em código para a faixa poder ondular.
3. **Céu limpo:** o grupo, com 3 px de margem, é preenchido por difusão
   (`scripts/art_tools.py`) com o mesmo grão leve dos outros cenários.
4. **Recorte do horizonte (`skyline.png`):** no fundo já reduzido, o céu (azul) e as nuvens
   (claras, pouco saturadas) alcançados a partir da borda de cima ficam transparentes; do que
   sobra, só o que nasce da base da faixa (prédios, cúpulas, palmeiras, antenas) fica opaco,
   então nuvens soltas nunca escondem a faixa. Alpha duro: os pixels são os do próprio fundo.
5. **Escala:** tudo é reduzido com Lanczos para o tamanho de exibição, e o script imprime as
   posições (hélice, faixa, gancho das cordas, faixas do público e grade) que vão para
   `src/stages/recife.ts`.

A torcida não precisa de arquivo próprio: a `IllustratedStageView` anima colunas recortadas do
próprio fundo (veja docs/ARCHITECTURE.md).

Uso (ferramenta offline, fora do build; requer Python 3, Pillow e NumPy):

```bash
python scripts/stage-art/recife/prepare_recife.py
```
