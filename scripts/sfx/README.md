# Efeitos sonoros originais

Todos os efeitos são **originais**, sintetizados do zero por `generate_sfx.py` (numpy + ffmpeg):
osciladores, ruído, varreduras de pitch, envelopes e filtros FIR. Nenhum sample, nenhum arquivo
baixado e nada copiado de Street Fighter, KOF, Tekken, Mortal Kombat ou outros jogos.

```
python3 scripts/sfx/generate_sfx.py              # todos
python3 scripts/sfx/generate_sfx.py punch kick   # só alguns
```

Gera `public/audio/sfx/<id>.ogg` (Vorbis) e `<id>.mp3` (fallback para Safari), mono, 44,1 kHz,
com pico abaixo de 0 dBFS depois da codificação. O gerador usa semente fixa por efeito
(arquivos reproduzíveis).

| Efeito                 | Quando toca                             | Som                                                              | Volume |
| ---------------------- | --------------------------------------- | ---------------------------------------------------------------- | ------ |
| `punch`                | Soco conecta                            | Impacto seco (corpo 210→85 Hz + estalo)                          | 0,65   |
| `kick`                 | Chute conecta (e especial que acerta)   | Impacto mais grave e longo                                       | 0,75   |
| `crouch-punch`         | Soco agachado conecta                   | Impacto curto e estalado                                         | 0,62   |
| `crouch-kick`          | Rasteira conecta                        | Impacto grave com raspado                                        | 0,72   |
| `air-punch`            | Soco aéreo conecta                      | Impacto brilhante                                                | 0,65   |
| `air-kick`             | Chute aéreo conecta                     | Impacto grave com estalo agudo                                   | 0,75   |
| `block`                | Golpe defendido                         | Baque abafado de antebraço + tapa e tecido                       | 0,60   |
| `hurt`                 | Quem apanha (junto do impacto)          | Baque corporal com formante, sem voz                             | 0,65   |
| `jump`                 | O pulo sai do chão                      | Swoosh curto para cima                                           | 0,35   |
| `landing`              | Contato real com o chão                 | Baque grave discreto                                             | 0,40   |
| `ko`                   | K.O. (uma vez por round)                | Explosão grave, cauda longa e anel metálico                      | 0,85   |
| `special`              | O especial começa (energia paga)        | Subida tecnológica, arpejo digital, zap                          | 0,85   |
| `special-ready`        | Barra entra em SPECIAL READY            | Sininho de duas notas com faíscas                                | 0,60   |
| `menu-move`            | Navegar entre opções                    | Blip quadrado curto                                              | 0,45   |
| `menu-confirm`         | Confirmar / selecionar                  | Dois tons subindo                                                | 0,45   |
| `menu-back`            | Voltar / sair                           | Dois tons descendo                                               | 0,45   |
| `round-start`          | "ROUND n" / "FINAL ROUND"               | Gongo arcade com swoosh                                          | 0,70   |
| `fight`                | "FIGHT!"                                | Golpe + acorde de synth + prato                                  | 0,80   |
| `perfect`              | Round vencido sem perder vida (PERFECT) | Fanfarra subindo, acorde brilhante, faíscas                      | 0,85   |
| `special-zap`          | Especial do 24zap começa (Augusto)      | Envio de mensagem, bolhas, sininho, impacto                      | 0,85   |
| `special-mind`         | Especial do Mindhub começa (Filipe)     | Blips digitais, ruído de dados, descarga                         | 0,85   |
| `special-vibe`         | ALAIO VIBECODE! começa (João, Isaque)   | Digitação, wobble synthwave, arpejo, glitch                      | 0,85   |
| `special-gpt`          | GPTMAKER! começa (Romualdo)             | Blocos encaixando, servo, bipe-bupe, raio                        | 0,85   |
| `special-fluidz`       | FLUIDZ! começa (Aislan)                 | Bolhas, jorro borbulhante, splash molhado                        | 0,85   |
| `special-alaio-strike` | ALAIO STRIKE! começa (Dmitry)           | Tempestade se formando, chiado elétrico, trovão e estrondo longo | 0,9    |
| `special-n8n`          | N8N! começa (Gabriel Mattozo)           | Blips digitais, fluxo de dados, acorde de sucesso e impacto      | 0,85   |
| `special-190`          | CHAMA O 190! começa (Gabriele)          | Sirene de dois tons, pneu cantando, rajada de tiros e impacto    | 0,85   |
| `victory`              | Pose de vitória do vencedor do round    | Arpejo vencedor curto                                            | 0,70   |

Licença: original do projeto (mesma licença do repositório).
