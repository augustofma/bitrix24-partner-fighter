# Arte do cenário BITRIX24 MOSCOU, luta final contra o Dmitry

`source.png` é a arte oficial fornecida pelo usuário: o salão da sede da Bitrix24 em Moscou, com
o Kremlin e o Moscow City atrás da parede de vidro, a estátua do urso, troféus, mesas e o logo da
Bitrix24 no piso.

É o cenário do Dmitry, chefe final do modo história (`STORY_FINAL_BOSS` em
`src/story/storyProfiles.ts`): na história ele só aparece na última luta de cada campanha, contra
o Dmitry; na luta rápida pode ser escolhido livremente na seleção de fase.

A arte não tem avião nem faixa: `prepare_bitrix24_moscow.py` só redimensiona para o tamanho de
exibição dos cenários e gera em `public/stages/bitrix24-moscow/`:

| Arquivo          | Conteúdo           |
| ---------------- | ------------------ |
| `background.jpg` | 1075×605, sem alfa |

Uso (ferramenta offline, fora do build; requer Python 3 e Pillow):

```bash
python scripts/stage-art/bitrix24-moscow/prepare_bitrix24_moscow.py
```
