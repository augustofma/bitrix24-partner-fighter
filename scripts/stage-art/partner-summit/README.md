# Arte do cenário Partner Summit

`source.webp` é a ilustração aprovada (1672×941) do palco "Bitrix24 Partner Summit": painel de
LED, palco com poltronas, o presidente sentado ao centro, público com lightsticks e o chão da
arena.

`prepare_partner_summit.py` gera em `public/stages/partner-summit/`:

| Arquivo              | Conteúdo                                                                                                                      |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `background.jpg`     | 1075×605 (a arena rola 480 px: a arte fica 12% maior que a tela e usa parallax), sem a cabeça e a mão levantada do presidente |
| `president-head.png` | Cabeça e pescoço do presidente, com alpha                                                                                     |
| `president-hand.png` | Mão levantada e punho, com alpha                                                                                              |

Como funciona:

1. **Recortes:** em caixas pequenas ao redor da cabeça e da mão, o presidente se separa do
   painel de LED (azul/violeta claro) por cor: pele e cabelo em tons quentes, roupa escura ou
   cabelo grisalho. A mão usa só os pixels de pele, mais 1 px de contorno.
2. **Fundo limpo:** a área dos recortes, com uma pequena margem, é preenchida por difusão a
   partir das bordas (`scripts/art_tools.py`, compartilhado com a tela inicial). Assim a cabeça
   pode girar e virar sem mostrar uma segunda cabeça parada atrás.
3. **Escala:** tudo é reduzido com Lanczos para o tamanho de exibição, e o script imprime os
   pivôs (base do pescoço e punho), as faixas do público e a barreira, que vão para
   `src/stages/partnerSummit.ts`.

O público não precisa de arquivo próprio: a `IllustratedStageView` anima colunas recortadas do
próprio fundo (veja docs/ARCHITECTURE.md).

Uso (ferramenta offline, fora do build; requer Python 3, Pillow e NumPy):

```bash
python scripts/stage-art/partner-summit/prepare_partner_summit.py
```
