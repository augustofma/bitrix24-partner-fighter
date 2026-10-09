# Arte do cenário RIO DE JANEIRO

`source.webp` é a arte oficial (1672×941) fornecida pelo usuário: o calçadão de Copacabana com o
padrão de ondas, a Baía de Guanabara com veleiros, o Pão de Açúcar com o bondinho, o Cristo
Redentor, bandeiras do Brasil e a torcida atrás das grades da Inovar Consulting. É a cidade da
Gabriele (Inovar Consulting) no Modo História.

`prepare_rio_de_janeiro.py` escala a arte para o tamanho de exibição dos cenários (1075×605) e gera
`public/stages/rio-de-janeiro/background.jpg`. Cena parada, sem avião: a torcida é animada a partir
do próprio fundo (`art.crowd` em `src/stages/rioDeJaneiro.ts`).

Uso (ferramenta offline, fora do build; requer Python 3 e Pillow):

```bash
python scripts/stage-art/rio-de-janeiro/prepare_rio_de_janeiro.py
```
