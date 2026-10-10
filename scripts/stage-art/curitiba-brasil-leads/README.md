# Arte do cenário CURITIBA BRASIL LEADS

`source.webp` é a arte oficial (1672×941) fornecida pelo usuário: a praça de petit-pavé diante da
estufa do Jardim Botânico de Curitiba, com chafarizes, canteiros floridos, uma araucária, os
prédios ao fundo, bandeiras do Brasil e a torcida atrás das grades da Brasil Leads, com
bandeirolas e banners. É o cenário do Rodolfo (Brasil Leads) no Modo História; o Gabriel Mattozo
continua no cenário CURITIBA.

`prepare_curitiba_brasil_leads.py` escala a arte para o tamanho de exibição dos cenários
(1075×605) e gera `public/stages/curitiba-brasil-leads/background.jpg`. Cena parada, sem avião: a
torcida é animada a partir do próprio fundo (`art.crowd` em `src/stages/curitibaBrasilLeads.ts`).

Uso (ferramenta offline, fora do build; requer Python 3 e Pillow):

```bash
python scripts/stage-art/curitiba-brasil-leads/prepare_curitiba_brasil_leads.py
```
