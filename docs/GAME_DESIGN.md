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
- **Defesa (D):** segurar defende tudo pela frente. Bloquear um golpe causa _blockstun_ e
  empurra; o chute causa 1 de dano residual (_chip_), que nunca nocauteia.
- **Agachar** abaixa a hurtbox: o **soco (alto) passa por cima**, o **chute (médio) acerta**.
- **Hitstun:** quem é atingido fica atordoado por alguns frames e é empurrado (_knockback_).
- **Hitstop:** o jogo congela por poucos frames no impacto (24 no KO) para dar peso ao golpe.
- **Buffer:** um ataque apertado até 6 frames antes de o lutador ficar livre é executado assim
  que possível.
- Os lutadores se viram automaticamente para o oponente quando estão livres no chão.
- Os corpos não se atravessam; as paredes limitam a arena; a distância máxima entre os dois é
  limitada para ambos caberem na tela.

### Frame data provisório

| Lutador   | Golpe | Dano | Startup | Ativo | Recovery | Hitstun | Blockstun |
| --------- | ----- | ---- | ------- | ----- | -------- | ------- | --------- |
| FIGHTER_A | Soco  | 7    | 5       | 3     | 9        | 14      | 9         |
| FIGHTER_A | Chute | 11   | 9       | 4     | 15       | 18      | 12        |
| FIGHTER_B | Soco  | 8    | 6       | 3     | 11       | 14      | 9         |
| FIGHTER_B | Chute | 12   | 10      | 4     | 17       | 18      | 12        |

Vida: 100 para ambos. `FIGHTER_A` é mais rápido (andar 3,2 px/frame); `FIGHTER_B` é mais
lento (2,7) e bate mais forte. A fonte da verdade são os arquivos `src/fighters/*.ts`.

## Estados dos lutadores

| Estado     | Entra quando                          | Sai quando                     |
| ---------- | ------------------------------------- | ------------------------------ |
| `idle`     | Livre, sem input                      | Qualquer input                 |
| `walk`     | ← ou → no chão                        | Soltar / outra ação            |
| `jump`     | ↑ no chão (com ← ou →: pulo diagonal) | Tocar o chão → `idle`          |
| `crouch`   | ↓ segurado                            | Soltar ↓                       |
| `punch`    | A (borda ou buffer)                   | Fim do recovery                |
| `kick`     | S (borda ou buffer)                   | Fim do recovery                |
| `block`    | D segurado, ou ao bloquear um golpe   | Soltar D (depois do blockstun) |
| `hurt`     | Atingido sem bloquear                 | Fim do hitstun e no chão       |
| `knockout` | Vida chega a 0                        | Terminal (fim do round)        |
| `victory`  | Vencedor, ~1,2 s após KO ou tempo     | Terminal                       |

Prioridade de input quando livre: **ataque > defesa > pulo > agachar > andar > idle**.

Ataques só saem do chão na v0.1 (ataques aéreos estão no backlog).

## CPU (FIGHTER_B)

State machine simples (sem aprendizado de máquina), com modos: `approach`, `retreat`, `attack`,
`guard`, `jump`, `wait`.

- **Longe:** aproxima-se (às vezes pula na direção do jogador).
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

| Ação     | Teclado | Touch                  |
| -------- | ------- | ---------------------- |
| Andar    | ← →     | ◀ ▶ (esquerda da tela) |
| Pular    | ↑       | ▲                      |
| Agachar  | ↓       | ▼                      |
| Soco     | A       | SOCO (direita da tela) |
| Chute    | S       | CHUTE                  |
| Defender | D       | DEF                    |

Touch suporta vários dedos ao mesmo tempo (andar e socar juntos). O jogo é landscape; em
celulares na vertical aparece "Gire o dispositivo para jogar".
