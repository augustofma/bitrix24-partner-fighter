# Game Design: Bitrix24 Partner Fighter

## Objetivo do jogo

Fighting game 2D 1x1 no estilo arcade dos anos 90. Cada luta é entre dois personagens numa arena
lateral; vence quem zerar a vida do oponente (KO) ou tiver mais vida quando o tempo acabar.

Visão futura: um elenco de 8 a 16 personagens caricaturais inspirados no ecossistema Bitrix24
(parceiros, CRM, automações, WhatsApp, IA, vendas), com golpes temáticos. O elenco atual tem
`AUGUSTO` e `FIGHTER_A` selecionáveis, além de `FIGHTER_B` reservado à CPU.

## Game loop (v0.1)

```
Menu → Seleção de personagem → Tela VS → Luta (1 round) → KO / Tempo → Tela de vitória → Menu
```

1. **Menu:** título e botão JOGAR (Enter, Espaço, clique ou toque).
2. **Seleção:** cards gerados pelo roster, em páginas de até quatro. Augusto é a seleção
   inicial; FIGHTER_A permanece selecionável. FIGHTER_B aparece com a marca "CPU".
   Setas ou botões laterais percorrem os selecionáveis; tocar um card seleciona e tocar
   novamente confirma. O adversário prioriza os personagens reservados à CPU.
3. **VS:** apresenta os dois lutadores e o cenário por cerca de 2,6 s (pode pular).
4. **Luta:** "ROUND 1" → "FIGHT!" (2 s sem controle) → combate → "K.O." ou "TIME OVER".
5. **Vitória:** vencedor (ou empate) e motivo; botão VOLTAR AO MENU.

## Sistema de combate

### AUGUSTO

**Arrecife Digital.** Lutador móvel e ofensivo, voltado à pressão curta/média. Configuração
própria em `src/fighters/augusto.ts`; corpo padrão compartilhado, arte vazia e nenhum especial.

| Estatística                   | Valor         |
| ----------------------------- | ------------- |
| Vida                          | 100           |
| Andar para frente             | 3,45 px/frame |
| Andar para trás               | 2,85 px/frame |
| Impulso vertical do pulo      | 16,8 px/frame |
| Velocidade horizontal do pulo | 4,2 px/frame  |

Valores de tempo em frames, simulação a 60 Hz:

| Ataque      | Nível    | Dano / chip | Startup / ativo / recovery | Hitstun / blockstun | Knockback / pushback | Hitstop |
| ----------- | -------- | ----------- | -------------------------- | ------------------- | -------------------- | ------- |
| punch       | high     | 6 / 0       | 4 / 3 / 8                  | 14 / 9              | 4 / 3                | 6       |
| kick        | mid      | 11 / 1      | 10 / 4 / 16                | 18 / 12             | 6 / 4,5              | 8       |
| crouchPunch | mid      | 4 / 0       | 3 / 3 / 6                  | 13 / 8              | 3 / 2,5              | 5       |
| crouchKick  | low      | 9 / 1       | 8 / 4 / 18                 | 16 / 11             | 5 / 4                | 7       |
| airPunch    | overhead | 5 / 0       | 3 / 6 / 8                  | 14 / 9              | 3,5 / 3              | 6       |
| airKick     | overhead | 10 / 1      | 6 / 8 / 13                 | 17 / 12             | 5 / 4                | 8       |

Hitboxes locais `(x, y, largura, altura)`, em px relativos aos pés, olhando para a direita:

| Ataque      | Hitbox             |
| ----------- | ------------------ |
| punch       | (24, -142, 54, 22) |
| kick        | (30, -100, 70, 30) |
| crouchPunch | (22, -92, 48, 22)  |
| crouchKick  | (26, -28, 86, 24)  |
| airPunch    | (16, -118, 50, 28) |
| airKick     | (-12, -80, 88, 36) |

Em relação ao FIGHTER_A, anda aproximadamente 8% mais rápido para frente e 10% para trás.
O pulo tem 5% mais velocidade horizontal e impulso vertical ligeiramente menor. Os socos
começam um frame antes, mas causam um ponto a menos de dano; os socos terrestres também
perdem um pouco de alcance. Chute e rasteira ganham quatro pixels de alcance, com recovery
maior; o chute em pé também começa um frame depois. O chute aéreo começa antes, mas recupera
um frame depois. Esses compromissos são um ponto de partida, ainda sujeito a balanceamento
com pessoas reais. Os níveis permanecem semânticos: ambas as guardas ainda bloqueiam tudo.

### Regras comuns

- Tempo em **frames a 60 fps**. Todo golpe tem três fases:
  **startup** (preparação) → **active** (hitbox ativa) → **recovery** (volta à guarda).
- Cada golpe acerta **uma vez**. Golpes simultâneos trocam dano.
- **Defesa (D):** segurar defende os golpes vindos de qualquer lado. Bloquear causa
  _blockstun_ e empurra; os chutes causam 1 de dano residual (_chip_), que nunca nocauteia.
- **Defesa agachada (↓ + D):** fica agachado, usa a hurtbox agachada e não anda. Por enquanto
  bloqueia exatamente os mesmos golpes que a defesa em pé (os níveis de golpe ainda não são
  aplicados; veja "Níveis de ataque").
- **Agachar** abaixa a hurtbox: o **soco (alto) passa por cima**, o **chute (médio) acerta**.
- **Hitstun:** quem é atingido fica atordoado por alguns frames e é empurrado (_knockback_)
  **para longe do atacante**.
- **Hitstop:** o jogo congela por poucos frames no impacto (24 no KO) para dar peso ao golpe.
- **Buffer:** um ataque apertado até 6 frames antes de o lutador ficar livre é executado assim
  que possível (inclusive no ar).
- Os corpos não se atravessam no chão; as paredes limitam a arena; a distância máxima entre os
  dois é limitada para ambos caberem na tela.

### Ataques agachados

- **↓ + A = soco agachado** (`crouchPunch`) e **↓ + S = rasteira** (`crouchKick`). Vale
  segurar ↓ e apertar o botão, ou apertar os dois juntos; não é preciso soltar ↓.
- A postura é decidida no instante em que o golpe sai: ↓ segurado = golpe agachado.
- Durante o golpe o lutador **continua agachado o tempo todo** (hurtbox agachada), não anda e
  não vira.
- Ao terminar: com ↓ ainda segurado volta direto para `crouch` (sem nenhum frame em pé); com ↓
  solto, volta para `idle`. Soltar ↓ no meio do golpe não o interrompe.
- Segurar A ou S não repete o golpe (só o aperto conta, com o buffer de 6 frames).
- O **soco agachado** é rápido e acerta o tronco do adversário (em pé ou agachado). A
  **rasteira** é mais lenta, mais longa e acerta as canelas; tem o recovery mais longo, então é
  arriscada se for bloqueada.

### Níveis de ataque (registrados, ainda não aplicados)

Cada golpe tem um `level` no config:

| Golpe               | Nível      | Motivo                                                     |
| ------------------- | ---------- | ---------------------------------------------------------- |
| Soco                | `high`     | Altura da cabeça; já passa por cima de quem está agachado  |
| Chute               | `mid`      | Altura do tronco                                           |
| Soco agachado       | `mid`      | A hitbox (y −92 a −70) acerta o tronco, não as pernas      |
| Rasteira            | `low`      | Hitbox rente ao chão (y −28 a −4)                          |
| Soco e chute aéreos | `overhead` | "Jump-in": quando os níveis valerem, exigirão defesa em pé |

Regras planejadas: `high` e `mid` podem ser defendidos em pé ou agachado; `low` só agachado;
`overhead` só em pé. **Hoje qualquer defesa bloqueia tudo.**

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

| Lutador   | Golpe         | Dano | Startup | Ativo | Recovery | Hitstun | Blockstun | Alcance |
| --------- | ------------- | ---- | ------- | ----- | -------- | ------- | --------- | ------- |
| FIGHTER_A | Soco          | 7    | 5       | 3     | 9        | 14      | 9         | 80      |
| FIGHTER_A | Chute         | 11   | 9       | 4     | 15       | 18      | 12        | 96      |
| FIGHTER_A | Soco agachado | 5    | 4       | 3     | 7        | 13      | 8         | 72      |
| FIGHTER_A | Rasteira      | 9    | 8       | 4     | 16       | 16      | 11        | 108     |
| FIGHTER_A | Soco aéreo    | 6    | 4       | 6     | 8        | 14      | 9         | 66      |
| FIGHTER_A | Chute aéreo   | 10   | 7       | 8     | 12       | 17      | 12        | 76      |
| FIGHTER_B | Soco          | 8    | 6       | 3     | 11       | 14      | 9         | 82      |
| FIGHTER_B | Chute         | 12   | 10      | 4     | 17       | 18      | 12        | 98      |
| FIGHTER_B | Soco agachado | 6    | 5       | 3     | 9        | 13      | 8         | 74      |
| FIGHTER_B | Rasteira      | 10   | 9       | 4     | 18       | 16      | 11        | 110     |
| FIGHTER_B | Soco aéreo    | 7    | 5       | 5     | 9        | 14      | 9         | 68      |
| FIGHTER_B | Chute aéreo   | 11   | 8       | 8     | 13       | 17      | 12        | 78      |

"Alcance" = quanto a hitbox se estende à frente do centro do lutador (px).

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
| `crouchPunch` | A no chão com ↓ segurado              | Fim do recovery → `crouch` (↓ segurado) ou `idle` (↓ solto)                          |
| `crouchKick`  | S no chão com ↓ segurado              | Fim do recovery → `crouch` (↓ segurado) ou `idle` (↓ solto)                          |
| `airPunch`    | A no ar (1 ataque aéreo por pulo)     | Fim do recovery → `jump`, ou landing → `idle`                                        |
| `airKick`     | S no ar (1 ataque aéreo por pulo)     | Fim do recovery → `jump`, ou landing → `idle`                                        |
| `block`       | D segurado, ou ao bloquear em pé      | Soltar D (depois do blockstun)                                                       |
| `crouchBlock` | ↓ + D, ou ao bloquear agachado        | Soltar D → `crouch`; soltar ↓ → `block`; soltar ambos → `idle` (depois do blockstun) |
| `hurt`        | Atingido sem bloquear                 | Fim do hitstun e no chão                                                             |
| `knockout`    | Vida chega a 0                        | Terminal (fim do round)                                                              |
| `victory`     | Vencedor, ~1,2 s após KO ou tempo     | Terminal                                                                             |

Prioridade de input quando livre no chão:
**ataque (agachado se ↓ estiver segurado) > defesa agachada (↓+D) > defesa (D) > pulo > agachar

> andar > idle**.
> Por isso, apertar A junto com ↑ ainda no chão dá um soco terrestre; para o soco aéreo, pule e
> depois aperte A. No ar, ↓ não muda nada: A/S são sempre golpes aéreos. Com ↓ + D segurados,
> apertar A/S sai o golpe agachado assim que o lutador estiver livre (o buffer guarda o aperto
> feito no fim do blockstun); terminado o golpe, ele volta à defesa agachada.

## CPU (FIGHTER_B)

State machine simples (sem aprendizado de máquina), com modos: `approach`, `retreat`, `attack`,
`guard`, `jump`, `wait`.

- **Longe:** aproxima-se (às vezes pula na direção do jogador e, nesse pulo, pode soltar um
  chute aéreo na descida se o jogador estiver ao alcance).
- **No alcance, contra adversário em pé:** ataca (soco se perto, chute se a meia distância; o
  chute às vezes sai como rasteira, `lowKickChance`), com pausa entre ataques; ou recua, defende
  preventivamente ou espera.
- **Contra adversário em postura baixa** (`crouch`, `crouchBlock`, `crouchPunch`, `crouchKick`):
  - Na maioria das decisões (`lowPostureAwareness`, 85% no `NORMAL_AI`), a CPU percebe a
    postura e escolhe **só entre os golpes que realmente acertariam agora**: a hitbox precisa
    alcançar e estar na altura da hurtbox atual do adversário. O soco em pé (alto) fica de fora,
    porque passa por cima.
  - Entre os que acertam, sorteia com pesos (`lowPostureAttackWeights`): soco agachado (mais
    comum), rasteira, chute em pé (mid, que alcança quem está agachado) e raramente o soco.
  - Se nada alcança dali, ela se aproxima até o soco agachado conectar (de longe, pode pular).
  - Nas outras decisões ela "não percebe" e age como contra alguém em pé, então às vezes ainda
    erra um soco por cima. É imperfeita de propósito.
  - Contra `crouchBlock` ela continua pressionando no mesmo ritmo, com golpes que alcançam a
    guarda baixa (e são bloqueados, como qualquer golpe hoje).
- Os golpes são feitos com os mesmos inputs de um humano: soco agachado = ↓ + A, rasteira =
  ↓ + S.
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
| Soco agachado      | ↓ + A                                      | ▼ + SOCO               |
| Rasteira           | ↓ + S                                      | ▼ + CHUTE              |

Touch suporta vários dedos ao mesmo tempo (direção + pulo, direção + ataque aéreo, ▼ + DEF,
▼ + SOCO, ▼ + CHUTE).
O jogo é landscape; em celulares na vertical aparece "Gire o dispositivo para jogar".
