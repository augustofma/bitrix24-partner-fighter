# Juliana — AxisPro

Arte original criada com ImageGen integrado a partir das três fotos reais e do pôster
aprovado fornecidos pelo usuário. Fotos como referência de identidade, pôster como direção
artística. Uso autorizado para o projeto; sem sprites de franquias ou logos copiados.

Cabelo longo castanho claro/loiro escuro, óculos de armação fina, expressão confiante,
blusa terracota, calça preta de cintura alta, cinto preto e sapatos discretos. Sem blazer
na sheet para manter as poses legíveis. Óculos presentes nas 40 poses.

## Fontes e montagem reproduzível

- `sheet-source.png`: fonte RGBA 1469×1071 com 40 poses.
- `portrait-source.png`: retrato original RGBA.
- `prompts.json`: prompts exatos das duas gerações integradas.

```powershell
python scripts/juliana-art/prepare.py
python scripts/juliana-art/prepare.py --validate-only
```

Pillow/NumPy offline, ferramentas já usadas no projeto. Recortes e âncoras revisados por pose,
isolamento da silhueta opaca com sua borda, remoção do halo de baixa opacidade e escala
proporcional com nearest. Guarda com 172 px de altura; baseline 216 e margem mínima 4 px.
Frames aéreos recebem elevação explícita. KO horizontal reduzido proporcionalmente para caber.
Geração não determinística; montagem reproduzível a partir das fontes versionadas.

Saídas: `public/fighters/juliana/sprite.png`, 1536×1120 RGBA, grade 8×5 de células 192×224;
`public/fighters/juliana/portrait.png`, 240×300 RGBA. Scale 1, offsetX 0, offsetY 8.
Base para a direita, flipX genérico. Arte não controla timing ou colisões.

## Frame map

| Frames       | Animação                       |
| ------------ | ------------------------------ |
| 0–3          | idle                           |
| 4–9          | walk                           |
| 10 / 11 / 12 | jump rise / apex / fall        |
| 13           | crouch                         |
| 14–16        | punch                          |
| 17–19        | kick                           |
| 20–22        | crouchPunch                    |
| 23–25        | crouchKick                     |
| 26–28        | airPunch                       |
| 29–31        | airKick                        |
| 32 / 33      | block / crouchBlock            |
| 34 / 35      | hurt                           |
| 36–38        | knockout start / fall / ground |
| 39           | victory                        |

## Validação e limites

Validação automática de dimensões, alpha, 40 células não vazias, margens e baseline.
Testes de config, roster, fases de animação, simulação, CPU e determinismo.
Transições curtas de três frames e KO horizontal reduzido são limitações desta versão.
Mobile emulado não substitui teste de desempenho em aparelho físico.

Playtest em Chromium: seleção → cenário → VS → luta, teclado com os seis golpes,
defesas, saltos e alternância F2 aprovados. Os 14 confrontos com Juliana no slot P1
(13 parceiros e Dmitry) e um com Juliana como CPU terminaram sem erro de runtime.
Ambos os lados usaram IA com seeds fixas: no slot P1, Juliana venceu quatro confrontos
(Romualdo, Aislan, Rômulo e Gabriel) e perdeu dez; como CPU, perdeu para Augusto.
O resultado valida integração, não comprova equilíbrio competitivo.
Em viewport touch 844×390, seleção, salto diagonal com troca de lado/flipX e
movimento + soco simultâneos funcionaram. Medição aproximada: 12 FPS com SwiftShader,
sem extrapolar esse desempenho para dispositivos físicos.

## Base Git

Branch criada sobre a main atualizada em `669e6be`. Sem merge na main nesta tarefa.
