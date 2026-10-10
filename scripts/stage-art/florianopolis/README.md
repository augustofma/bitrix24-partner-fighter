# Arte do cenário FLORIANÓPOLIS

`source.webp` é a arte oficial (1672×941) fornecida pelo usuário: um calçadão de pedras com
padrão de ondas à beira da baía, a Ponte Hercílio Luz, veleiros, a cidade e os morros, coqueiros,
bandeiras do Brasil e a torcida atrás das grades da BR24. É a cidade da Amanda Konrad (BR24) no
Modo História.

`prepare_florianopolis.py` escala a arte para o tamanho de exibição dos cenários (1075×605) e gera
`public/stages/florianopolis/background.jpg`. Cena parada, sem avião: a torcida é animada a partir
do próprio fundo (`art.crowd` em `src/stages/florianopolis.ts`).

Uso (ferramenta offline, fora do build; requer Python 3 e Pillow):

```bash
python scripts/stage-art/florianopolis/prepare_florianopolis.py
```
