# Game Design: Bitrix24 Partner Fighter

## Objetivo do jogo

Fighting game 2D 1x1 no estilo arcade dos anos 90. Cada luta é entre dois personagens numa arena
lateral; vence quem zerar a vida do oponente (KO) ou tiver mais vida quando o tempo acabar.

Visão futura: um elenco de 8 a 16 personagens caricaturais inspirados no ecossistema Bitrix24
(parceiros, CRM, automações, WhatsApp, IA, vendas), com golpes temáticos. A v0.1 tem apenas
`FIGHTER_A` (jogador) e `FIGHTER_B` (CPU), provisórios.

## Game loop (v0.1)

```
Menu → Seleção de personagem → Tela VS → Luta (1 round) → KO / Tempo → Tela de vitória → Menu
```

1. **Menu:** título e botão JOGAR (Enter, Espaço, clique ou toque).
2. **Seleção:** grade gerada a partir do roster. Na v0.1 só `FIGHTER_A` é selecionável;
   `FIGHTER_B` aparece com a marca "CPU".
3. **VS:** apresenta os dois lutadores e o cenário por cerca de 2,6 s (pode pular).
4. **Luta:** "ROUND 1" → "FIGHT!" (2 s sem controle) → combate → "K.O." ou "TIME OVER".
5. **Vitória:** vencedor (ou empate) e motivo; botão VOLTAR AO MENU.

## Sistema de combate

- Tempo em **frames a 60 fps**. Todo golpe tem três fases:
  **startup** (preparação) → **active** (hitbox ativa) → **recovery** (volta à guarda).
- Cada golpe acerta **uma vez**. Golpes simultâneos trocam dano.
- **Defesa (D):** segurar defende os golpes vindos de qualquer lado. Bloquear causa
  _blockstun_ e empurra; os chutes causam 1 de dano residual (_chip_), que nunca nocauteia.
- **Defesa agachada (↓ + D):** fica agachado, usa a hurtbox agachada e não anda. Por enquanto
  bloqueia exatamente os mesmos golpes que a defesa em pé (ainda não há golpes altos/baixos).
- **Agachar** abaixa a hurtbox: o **soco (alto) passa por cima**, o **chute (médio) acerta**.
- **Hitstun:** quem é atingido fica atordoado por alguns frames e é empurrado (_knockback_)
  **para longe do atacante**.
- **Hitstop:** o jogo congela por poucos frames no impacto (24 no KO) para dar peso ao golpe.
- **Buffer:** um ataque apertado até 6 frames antes de o lutador ficar livre é executado assim
  que possível (inclusive no ar).
- Os corpos não se atravessam no chão; as paredes limitam a arena; a distância máxima entre os
  dois é limitada para ambos caberem na tela.

### Ataques aéreos

- Durante o pulo, **A = soco aéreo** e **S = chute aéreo**, na subida ou na descida, em pulo
  neutro ou diagonal.
- A gravidade e o movimento horizontal do pulo continuam durante o golpe.
- **Um ataque aéreo por pulo:** segurar ou "metralhar" A/S não gera vários golpes.
- Cada golpe acerta uma vez. Se o recovery terminar no ar, o lutador volta ao estado de pulo.
- **Landing:** ao tocar o chão, o golpe aéreo termina na hora (a hitbox some no mesmo frame) e o
  lutador volta a `idle`; no frame seguinte já pode agir normalmente.
- O soco aéreo é rápido e acerta quando o lutador já está descendo perto do adversário; o chute
  aéreo é mais lento (precisa sair mais alto), tem mais alcance e pega levemente atrás do corpo,
  o que permite acertar no cross-up.

### Cross-up

- No chão, os corpos nunca se atravessam (andar contra o adversário não passa).
- No ar, o corpo que bloqueia passagem é o corpo aéreo. Quando o pulador está alto o bastante
  para ficar inteiro acima do corpo do adversário (cerca de 80 px de altura com o corpo padrão),
  ele passa por cima naturalmente, pela própria física do pulo, sem teleporte.
- Na prática: um pulo para a frente de perto ou de média distância aterrissa do outro lado; de
  longe, não alcança.
- Ao descer, os corpos voltam a colidir e cada um fica do lado em que seu centro estiver.

### Direção (facing)

- Lutadores livres no chão (parado, andando, agachado, defendendo) viram para o oponente.
- **No ar ninguém vira**, nem durante um golpe aéreo: o golpe (sprite e hitbox) mantém a direção
  com que começou, mesmo cruzando o adversário. Golpes terrestres também nunca viram no meio.
- Depois do landing (ou do fim do golpe no chão), a direção é corrigida no frame seguinte.

### Frame data provisório

| Lutador   | Golpe       | Dano | Startup | Ativo | Recovery | Hitstun | Blockstun |
| --------- | ----------- | ---- | ------- | ----- | -------- | ------- | --------- |
| FIGHTER_A | Soco        | 7    | 5       | 3     | 9        | 14      | 9         |
| FIGHTER_A | Chute       | 11   | 9       | 4     | 15       | 18      | 12        |
| FIGHTER_A | Soco aéreo  | 6    | 4       | 6     | 8        | 14      | 9         |
| FIGHTER_A | Chute aéreo | 10   | 7       | 8     | 12       | 17      | 12        |
| FIGHTER_B | Soco        | 8    | 6       | 3     | 11       | 14      | 9         |
| FIGHTER_B | Chute       | 12   | 10      | 4     | 17       | 18      | 12        |
| FIGHTER_B | Soco aéreo  | 7    | 5       | 5     | 9        | 14      | 9         |
| FIGHTER_B | Chute aéreo | 11   | 8       | 8     | 13       | 17      | 12        |

Vida: 100 para ambos. `FIGHTER_A` é mais rápido (andar 3,2 px/frame); `FIGHTER_B` é mais
lento (2,7) e bate mais forte. A fonte da verdade são os arquivos `src/fighters/*.ts`.

## Estados dos lutadores

| Estado        | Entra quando                          | Sai quando                                                                           |
| ------------- | ------------------------------------- | ------------------------------------------------------------------------------------ |
| `idle`        | Livre, sem input                      | Qualquer input                                                                       |
| `walk`        | ← ou → no chão                        | Soltar / outra ação                                                                  |
| `jump`        | ↑ no chão (com ← ou →: pulo diagonal) | Tocar o chão → `idle`                                                                |
| `crouch`      | ↓ segurado                            | Soltar ↓                                                                             |
| `punch`       | A no chão (borda ou buffer)           | Fim do recovery                                                                      |
| `kick`        | S no chão (borda ou buffer)           | Fim do recovery                                                                      |
| `airPunch`    | A no ar (1 ataque aéreo por pulo)     | Fim do recovery → `jump`, ou landing → `idle`                                        |
| `airKick`     | S no ar (1 ataque aéreo por pulo)     | Fim do recovery → `jump`, ou landing → `idle`                                        |
| `block`       | D segurado, ou ao bloquear em pé      | Soltar D (depois do blockstun)                                                       |
| `crouchBlock` | ↓ + D, ou ao bloquear agachado        | Soltar D → `crouch`; soltar ↓ → `block`; soltar ambos → `idle` (depois do blockstun) |
| `hurt`        | Atingido sem bloquear                 | Fim do hitstun e no chão                                                             |
| `knockout`    | Vida chega a 0                        | Terminal (fim do round)                                                              |
| `victory`     | Vencedor, ~1,2 s após KO ou tempo     | Terminal                                                                             |

Prioridade de input quando livre no chão:
**ataque > defesa agachada (↓+D) > defesa (D) > pulo > agachar > andar > idle**.
Por isso, apertar A junto com ↑ ainda no chão dá um soco terrestre; para o soco aéreo, pule e
depois aperte A.

## CPU (FIGHTER_B)

State machine simples (sem aprendizado de máquina), com modos: `approach`, `retreat`, `attack`,
`guard`, `jump`, `wait`.

- **Longe:** aproxima-se (às vezes pula na direção do jogador e, nesse pulo, pode soltar um
  chute aéreo na descida se o jogador estiver ao alcance).
- **No alcance:** ataca (soco se perto, chute se a meia distância), com pausa entre ataques; ou
  recua, defende preventivamente ou espera.
- **Reação:** ao ver um golpe do jogador vindo dentro do alcance, defende com certa chance, após
  um atraso de reação (3 frames).
- As decisões dependem da distância e do estado do oponente; o acaso só varia entre opções
  plausíveis. Parâmetros em `src/controllers/aiProfiles.ts` (`NORMAL_AI`).

## Rounds e vitória

- Um round de **99 segundos** (v0.1 tem apenas o ROUND 1).
- **KO:** vida 0 → "K.O." → vencedor faz a pose de vitória → tela de vitória.
- **Duplo KO** no mesmo frame → empate.
- **Tempo esgotado:** vence quem tiver mais vida; vida igual = **EMPATE**.
- O timer fica laranja nos últimos 10 segundos.

## Controles

| Ação               | Teclado                                    | Touch                  |
| ------------------ | ------------------------------------------ | ---------------------- |
| Andar              | ← →                                        | ◀ ▶ (esquerda da tela) |
| Pular              | ↑                                          | ▲                      |
| Agachar            | ↓                                          | ▼                      |
| Soco               | A                                          | SOCO (direita da tela) |
| Chute              | S                                          | CHUTE                  |
| Defender           | D                                          | DEF                    |
| Soco / chute aéreo | ↑, depois A / S (→ + ↑ para pulo diagonal) | ▲, depois SOCO / CHUTE |
| Defesa agachada    | ↓ + D                                      | ▼ + DEF                |

Touch suporta vários dedos ao mesmo tempo (direção + pulo, direção + ataque aéreo, ▼ + DEF).
O jogo é landscape; em celulares na vertical aparece "Gire o dispositivo para jogar".
