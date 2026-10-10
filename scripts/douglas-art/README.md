# Douglas — Dohko Technology

Arte original criada com **ImageGen integrado**, usando a foto real e o pôster aprovado
fornecidos pelo usuário. Foto como referência de identidade; pôster como direção artística.
Cabelo preto penteado, cavanhaque, terno carvão, camisa branca, gravata cinza listrada,
relógio e sapatos sociais escuros. Nenhum asset de franquia ou logo foi copiado.

## Fontes e montagem reproduzível

`sheet-source.png`: geração de 40 poses, RGBA 1468×1071.
`portrait-source.png`: retrato original.
`idle-source.png`: quatro poses de guarda discreta em 2×2, substituindo os gestos amplos
da primeira geração. Prompts completos em `prompts.json` e `idle-prompt.txt`.
A geração é não determinística; a montagem usa as fontes versionadas.

```powershell
python scripts/douglas-art/prepare.py
python scripts/douglas-art/prepare.py --validate-only
```

Pillow/NumPy já usados pelo projeto, somente offline. O script isola cada componente opaco,
remove ruído de alpha da geração, recorta bounds revisados, redimensiona proporcionalmente
com nearest e ancora a base do corpo. Pés no baseline 216, margem mínima 4 px; poses aéreas
têm elevação explícita, com ajustes de altura para soco/chute acompanharem as hitboxes.
Poses horizontais de KO são reduzidas para caber na célula sem cortar o corpo.

Saídas: `public/fighters/douglas/sprite.png` (1536×1120 RGBA, 8×5 células 192×224),
`public/fighters/douglas/portrait.png` (240×300 RGBA). Escala 1, offsetX 0, offsetY 8.
Todos os frames base voltados à direita; flipX e carregamento vêm do pipeline genérico.

## Frame map

| Frames       | Animação                                |
| ------------ | --------------------------------------- |
| 0–3          | idle                                    |
| 4–9          | walk                                    |
| 10 / 11 / 12 | jump rise / apex / fall                 |
| 13           | crouch                                  |
| 14 / 15 / 16 | punch startup / active / recovery       |
| 17 / 18 / 19 | kick startup / active / recovery        |
| 20 / 21 / 22 | crouchPunch startup / active / recovery |
| 23 / 24 / 25 | crouchKick startup / active / recovery  |
| 26 / 27 / 28 | airPunch startup / active / recovery    |
| 29 / 30 / 31 | airKick startup / active / recovery     |
| 32 / 33      | block / crouchBlock                     |
| 34 / 35      | hurt                                    |
| 36 / 37 / 38 | knockout start / fall / ground          |
| 39           | victory, ajustando a gravata            |

## Validação

Assets: dimensões, alpha real, 40 células não vazias, isolamento, margens e baseline.
Testes de config, índices/fases, roster, seleção, simulação, controle por CPU e determinismo.
Playtest visual com F2 em Chromium/SwiftShader, poses e confrontos com todos os parceiros.
Doze partidas completas com seeds 41/91: Douglas perdeu para Augusto (0–2), Filipe (1–2),
João (1–2), Romualdo (0–2), Isaque (1–2), Aislan (0–2), Rômulo (0–2), Gabriel (0–2),
Gabriele (0–2), Amanda (0–2) e Dmitry (1–2). Como CPU contra Augusto, perdeu 1–2.
São amostras de smoke test, não avaliação estatística de balanceamento.

Teclado: caminhada, agachamento, seis ataques, defesas e alternância F2 conferidos.
Mobile emulado (844×390): seleção, salto diagonal com cross-up/flip e movimento + soco
simultâneos via multi-touch passaram, sem erros no console.

Limitações: transições curtas do atlas e redução do KO horizontal. Mobile landscape emulado
não substitui teste de desempenho em aparelhos físicos.

## Base Git

Branch criada sobre `58e5b3b` (Amanda), necessária ao confronto Douglas VS Amanda solicitado.
Não inclui o trabalho paralelo de especial da Amanda e não faz merge na main.
