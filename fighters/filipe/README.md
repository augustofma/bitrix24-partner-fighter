# FILIPE GOMES — arte jogável

- sprite.png: 1536×1120, grade 8×5, 40 células de 192×224, PNG com alpha real.
- portrait.png: 240×300, busto pixel-art com alpha real.
- Config: pixelArt true, scale 1, offsetX 0, offsetY 8.
- Baseline terrestre: 216; margem inferior: 8 px; margens mínimas: 4 px.

| Estado                      | Frames |
| --------------------------- | ------ |
| idle                        | 0–3    |
| walk                        | 4–9    |
| jump (subida/ápice/descida) | 10–12  |
| crouch                      | 13     |
| punch                       | 14–16  |
| kick                        | 17–19  |
| crouchPunch                 | 20–22  |
| crouchKick                  | 23–25  |
| airPunch                    | 26–28  |
| airKick                     | 29–31  |
| block                       | 32     |
| crouchBlock                 | 33     |
| hurt                        | 34–35  |
| knockout                    | 36–38  |
| victory                     | 39     |

Ataques: um frame visual por fase (startup/active/recovery). Pulo: um frame por fase vertical.
Frame data próprio no config do Filipe; nenhum sistema de gameplay foi alterado.

Produção e reprodução: [fontes e prompts](../../../scripts/filipe-art/README.md).
Direção visual e autoria: [ART_DIRECTION.md](../../../docs/ART_DIRECTION.md#filipe).
