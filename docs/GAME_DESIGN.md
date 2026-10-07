# Game Design: Bitrix24 Partner Fighter

## Objetivo do jogo

Fighting game 2D 1x1 no estilo arcade dos anos 90. Cada luta é entre dois personagens numa arena
lateral; vence quem zerar a vida do oponente (KO) ou tiver mais vida quando o tempo acabar.

Visão futura: um elenco de 8 a 16 personagens caricaturais inspirados no ecossistema Bitrix24
(parceiros, CRM, automações, WhatsApp, IA, vendas), com golpes temáticos. O elenco atual tem
`AUGUSTO`, `FILIPE` e `FIGHTER_A` selecionáveis, além de `FIGHTER_B` reservado à CPU.

## Game loop

```
Menu → Seleção → Tela VS → Luta (melhor de 3 rounds) → Tela de vitória → Menu
```

1. **Menu:** título e botão JOGAR (Enter, Espaço, clique ou toque).
2. **Seleção ("ESCOLHA SEU PARCEIRO"):** grade de cards gerada pelo roster (3 × 2 por
   página; slots "EM BREVE" completam a página). Augusto é a seleção inicial; FILIPE e
   FIGHTER_A também são selecionáveis. FIGHTER_B aparece esmaecido com a marca "CPU". O card
   escolhido ganha borda dourada, brilho pulsante e o marcador P1; ao lado, o painel de
   destaque mostra retrato ampliado, nome, descrição e barras PODER / VELOCIDADE / ALCANCE
   (só apresentação, calculadas do config em relação ao roster). ← → (ou ◀ ▶ no topo quando
   há várias páginas) percorrem os selecionáveis; tocar um card seleciona e tocar de novo
   confirma, assim como SELECIONAR ou Enter. VOLTAR ou Esc volta ao menu. O selo "VS ..."
   mostra o adversário, que prioriza os personagens reservados à CPU. Abaixo da grade, o
   painel "DIFICULDADE < FÁCIL NORMAL DIFÍCIL >" (↑ ↓ ou toque; veja "Dificuldade").
3. **VS:** apresenta os dois lutadores e o cenário por cerca de 2,6 s (pode pular).
   As lutas acontecem no **Bitrix24 Partner Summit**: o público pula em onda durante a luta e
   comemora mais rápido quando um round tem vencedor; o presidente, sentado no palco, olha ao
   redor e gesticula (e acena ao fim do round). É só visual: a arena é a mesma de antes.
4. **Luta:** melhor de 3. Cada round: "ROUND n" (ou "FINAL ROUND") → "FIGHT!" (2 s sem
   controle) → combate → "K.O." ou "TIME OVER". Quem vence 2 rounds vence a partida.
5. **Vitória:** vencedor da partida, motivo do último round e placar (ex.: 2 x 1); botão
   VOLTAR AO MENU.

## Sistema de combate

### AUGUSTO

**Arrecife Digital.** Lutador móvel e ofensivo, voltado à pressão curta/média. Configuração
própria em `src/fighters/augusto.ts`; corpo padrão compartilhado, arte pixel-art e o especial 24ZAP COMBO.

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
com pessoas reais. Os níveis valem na defesa: a rasteira (low) exige defesa agachada e os
golpes aéreos (overhead) exigem defesa em pé (veja "Níveis de ataque e guarda").

### FILIPE

**Filipe Gomes — Arrecife Digital.** Técnico e equilibrado, favorece golpes de média distância.
Vida 100; caminhada para frente/trás 3,25/2,65 px/frame; impulso de pulo 16,5 e velocidade
horizontal no ar 4 px/frame. Corpo padrão e o especial MINDHUB AGENT (veja "Especiais e energia").

Tem 8–10 px a mais de alcance que Augusto, mas anda cerca de 6% mais devagar e seus socos
levam dois frames extras para sair. Chutes causam um ponto a menos de dano e o recovery de
todos os golpes cresce 2–3 frames. Não ganha vida nem invulnerabilidade para compensar.

| Ataque      | Dano/chip | Startup/ativo/recovery | Hitstun/blockstun | Knockback/pushback | Hitstop | Hitbox (x,y,w,h) |
| ----------- | --------- | ---------------------- | ----------------- | ------------------ | ------- | ---------------- |
| punch       | 7/0       | 6/3/10                 | 14/9              | 4/3                | 6       | (24,-142,62,22)  |
| kick        | 10/1      | 11/4/18                | 18/12             | 6/4,5              | 8       | (30,-100,80,30)  |
| crouchPunch | 5/0       | 5/3/9                  | 13/8              | 3/2,5              | 5       | (22,-92,56,22)   |
| crouchKick  | 8/1       | 10/4/20                | 16/11             | 5/4                | 7       | (26,-28,94,24)   |
| airPunch    | 6/0       | 5/6/10                 | 14/9              | 3,5/3              | 6       | (16,-118,58,28)  |
| airKick     | 9/1       | 8/8/15                 | 17/12             | 5/4                | 8       | (-12,-80,96,36)  |

Níveis: punch high; kick e crouchPunch mid; crouchKick low; aéreos overhead, aplicados na
defesa como nos demais personagens. Guardas, cross-up, KO e vitória usam o motor compartilhado.

### Regras comuns

- Tempo em **frames a 60 fps**. Todo golpe tem três fases:
  **startup** (preparação) → **active** (hitbox ativa) → **recovery** (volta à guarda).
- Cada golpe acerta **uma vez**. Golpes simultâneos trocam dano.
- **Defesa (D):** segurar defende os golpes vindos de qualquer lado, exceto os baixos (`low`,
  a rasteira). Bloquear causa _blockstun_ e empurra; os chutes causam 1 de dano residual
  (_chip_), que nunca nocauteia.
- **Defesa agachada (↓ + D):** fica agachado, usa a hurtbox agachada e não anda. Defende
  `high`, `mid` e `low`, mas **não** os golpes aéreos (`overhead`). Veja "Níveis de ataque e
  guarda".
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

### Níveis de ataque e guarda

Cada golpe tem um `level` no config, e a defesa depende dele (`GUARD_COVERAGE` em
`src/core/fighter/fighterStates.ts`, aplicado num único ponto, `isAttackBlocked`):

| Golpe               | Nível      | Motivo                                                    |
| ------------------- | ---------- | --------------------------------------------------------- |
| Soco                | `high`     | Altura da cabeça; já passa por cima de quem está agachado |
| Chute               | `mid`      | Altura do tronco                                          |
| Soco agachado       | `mid`      | A hitbox (y −92 a −70) acerta o tronco, não as pernas     |
| Rasteira            | `low`      | Hitbox rente ao chão (y −28 a −4)                         |
| Soco e chute aéreos | `overhead` | "Jump-in": vem de cima, exige defesa em pé                |
| MINDHUB AGENT       | `mid`      | Descarga na altura do tronco                              |

Matriz (o golpe precisa antes **encostar** na hurtbox; a tabela decide se a guarda segura):

| Nível      | Defesa em pé (D) | Defesa agachada (↓ + D) |
| ---------- | ---------------- | ----------------------- |
| `high`     | bloqueia         | bloqueia\*              |
| `mid`      | bloqueia         | bloqueia                |
| `low`      | **não** (acerta) | bloqueia                |
| `overhead` | bloqueia         | **não** (acerta)        |

\* Na prática o soco em pé (`high`) passa por cima de quem está agachado e nem encosta.

- **Rasteira (low):** só a defesa agachada segura; quem defende em pé leva o golpe inteiro.
- **Golpes aéreos (overhead):** só a defesa em pé segura. O chute aéreo, mais baixo e largo,
  acerta quem está em `crouchBlock`. O soco aéreo tem hitbox na altura do peito: contra um
  corpo agachado ele só encosta numa janela curta, logo antes do landing (no resto do pulo
  passa por cima); quando encosta, `crouchBlock` não o bloqueia.
- Especiais seguem a mesma regra pelo próprio `level` (o MINDHUB AGENT é `mid`).
- A postura vale no frame do contato: trocar de guarda depois do golpe começar ainda funciona,
  se der tempo.

**Guarda da CPU.** A CPU não lê o futuro: só reage a um golpe que **já começou**, depois de
`reactionFrames` (contados a partir do primeiro frame do golpe) e com chance `blockChance`.
Ao reagir, escolhe a postura pelo nível do golpe, que já é visível: com chance
`guardReadChance` acerta (agachada contra `low`, em pé contra `overhead`); numa leitura errada
escolhe a postura oposta nesses dois níveis e é atingida. Contra `high`/`mid`, onde as duas
guardas funcionam, fica em pé. A guarda preventiva (sem golpe à vista) é baixa contra
adversário em postura baixa e em pé no resto, sem relação com o golpe que virá.

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

## Especiais e energia

F no teclado ou ESP no touch. A barra de cada lutador começa em 0, limitada a 100.
Acertar um normal dá +10 ao atacante e, havendo dano, +5 ao defensor. Um normal bloqueado
rende +3 ao atacante (chip não gera energia para o defensor). **Receber dano** rende +5 ao
defensor, venha o dano de um golpe normal ou de um especial. Um especial, bloqueado ou não,
não dá energia a nenhum participante. Errar não rende energia.

O especial tem prioridade sobre A/S quando apertados juntos. Usa borda e buffer de 6 frames:
um aperto no fim de recovery ou stun pode sair quando o lutador ficar livre, sem cancelar
ataque, hurt ou blockstun. Segurar F nunca renova o buffer. Sem energia, o comando é descartado
sem custo. No ar, um especial groundOnly é descartado. KO e vitória nunca aceitam golpes.
A barra fica verde com PRONTO quando há energia para algum especial configurado.

**24ZAP COMBO:** custo 30 descontado no primeiro frame, somente no chão, dano 18, chip 2,
startup 9 / ativo 5 / recovery 28, hitstun 24, blockstun 14, knockback 8, pushback 5 e hitstop 10.
Hitbox (24, -126, 108, 56): alcance frontal de 132 px. Avança 5 px/frame no startup/ativo
(até 70 px sem obstáculos); para no recovery. Facing travado, sem invulnerabilidade.
Tem um único contato por execução. Contra o chute normal (11 de dano, 10/4/16), ganha dano,
alcance e avanço, mas fica exposto por 28 frames se errar e pode ser punido ao ser bloqueado.
A sequência visual reaproveita os sprites, acompanhada de mensagens digitais azul/verde.

**MINDHUB AGENT (Filipe):** Filipe ativa um agente de IA que dispara uma descarga digital à
frente. Custo 35 (descontado no primeiro frame, mesmo se errar), somente no chão, nível `mid`,
dano 18, chip 2, startup 15 / ativo 6 / recovery 24, hitstun 24, blockstun 16, knockback 8,5,
pushback 6 e hitstop 12. Hitbox (30, -132, 140, 76): alcance frontal de 170 px, contra 110 do
chute dele, mas longe de cobrir a tela. Não avança (ele "conjura" parado), um único contato.
Comparado ao chute (10 de dano, 11/4/18), é bem mais forte e longo, porém lento o bastante para
ser visto e, bloqueado, deixa Filipe em desvantagem (24 de recovery contra 16 de blockstun).
Visual: reaproveita os frames do soco; os agentes orbitam a mão, uma rede de nós se forma no
alcance do golpe e descarrega um feixe azul/ciano/verde com pulsos e partículas (procedural,
sem logos nem imagens externas).
A CPU não usa especiais, mas reage, bloqueia e recebe seus impactos pelas regras existentes.

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
    guarda baixa (são bloqueados; a rasteira também, porque a guarda baixa segura `low`).
- Os golpes são feitos com os mesmos inputs de um humano: soco agachado = ↓ + A, rasteira =
  ↓ + S.
- **Reação:** ao ver um golpe do jogador já iniciado dentro do alcance, defende com chance
  `blockChance`, após `reactionFrames` (3 no `NORMAL_AI`), escolhendo a postura pelo nível do
  golpe com chance `guardReadChance` (veja "Níveis de ataque e guarda").
- As decisões dependem da distância e do estado do oponente; o acaso só varia entre opções
  plausíveis. Parâmetros em `src/controllers/aiProfiles.ts`.

### Dificuldade

Escolhida na seleção de personagem: **FÁCIL**, **NORMAL** (padrão) ou **DIFÍCIL**. ↑/↓ no
teclado, ou os botões `<` `>` e um toque na opção. A última escolha fica guardada durante a
sessão (registry do Phaser; recarregar a página volta ao NORMAL). O HUD não mostra a
dificuldade.

Cada dificuldade é só um `AIProfile` diferente para o **mesmo** `AIController`
(`AI_PROFILES` / `aiProfileFor`). Nenhuma trapaceia: a CPU difícil não lê input futuro, não
reage antes de o golpe começar + `reactionFrames`, usa o mesmo RNG e os mesmos atributos,
dano e vida do lutador. Ela só decide melhor.

| Parâmetro                   | FÁCIL (`EASY_AI`)   | NORMAL (`NORMAL_AI`) | DIFÍCIL (`HARD_AI`) |
| --------------------------- | ------------------- | -------------------- | ------------------- |
| `reactionFrames`            | 6                   | 3                    | 2                   |
| `blockChance`               | 0,15                | 0,35                 | 0,60                |
| `guardReadChance`           | 0,40                | 0,75                 | 0,92                |
| `aggression`                | 0,25                | 0,42                 | 0,58                |
| `retreatChance`             | 0,25                | 0,22                 | 0,14                |
| `guardChance`               | 0,06                | 0,12                 | 0,16                |
| `jumpInChance`              | 0,04                | 0,08                 | 0,12                |
| `jumpInAttackChance`        | 0,35                | 0,60                 | 0,85                |
| `lowKickChance`             | 0,20                | 0,30                 | 0,35                |
| `lowPostureAwareness`       | 0,50                | 0,85                 | 0,97                |
| Pesos vs. baixo (P/K/↓P/↓K) | 0,15/0,30/0,35/0,20 | 0,05/0,25/0,40/0,30  | 0/0,25/0,40/0,35    |
| `attackCooldown` (frames)   | 40–80               | 22–48                | 12–30               |
| `approachFrames`            | 20–44               | 16–36                | 12–28               |
| `retreatFrames`             | 14–28               | 14–28                | 10–20               |
| `guardFrames`               | 10–20               | 12–24                | 12–24               |
| `waitFrames`                | 20–40               | 10–24                | 6–14                |

Na prática: a FÁCIL reage tarde demais para a maioria dos socos rápidos e só às vezes
defende chutes e rasteiras, erra a postura em mais da metade das leituras, ataca pouco e
pula raramente. A DIFÍCIL defende com frequência e quase sempre na postura certa, quase nunca
desperdiça o soco alto contra quem está agachado, pressiona com pausas curtas e quase
sempre ataca no jump-in. Em simulações CPU x CPU (20 partidas por par, lados e lutadores
alternados), DIFÍCIL venceu NORMAL e NORMAL venceu FÁCIL em todas.

## Rounds e vitória (melhor de 3)

- A partida é **melhor de 3**: o primeiro a vencer **2 rounds** vence. Ex.: 2 x 0 ou 2 x 1.
- Cada round dura **99 segundos**. O timer fica laranja nos últimos 10 segundos.
- **KO:** vida 0 → "K.O." → o vencedor do round faz a pose de vitória e marca 1 ponto.
- **Tempo esgotado:** vence o round quem tiver mais vida.
- **Empate no round** (vida exatamente igual no fim do tempo, ou duplo KO no mesmo frame):
  aparece **DRAW**, ninguém pontua e o round é **repetido**.
- Anúncio: "ROUND 1", "ROUND 2"... e **"FINAL ROUND"** quando os dois já têm 1 vitória.
- HUD: abaixo do rótulo do round, dois losangos por lado (o jogador à esquerda, a CPU à
  direita) ficam dourados conforme os rounds vencidos.
- **Entre rounds:** vida cheia, volta ao ponto de partida, velocidade zerada, estado `idle`,
  hitstun/blockstun e hitstop zerados, timer em 99, inputs e buffers limpos e efeitos
  temporários removidos. A CPU também esquece as decisões do round anterior.
- **A barra de especial é mantida entre rounds.** Só uma nova partida volta a zerá-la.
- A tela de vitória só aparece quando alguém chega a 2 rounds.
- Limite de segurança: no máximo 9 rounds por partida (empates repetidos). Atingido o limite,
  vence quem tiver mais rounds; com placar igual, a partida termina empatada.

## Controles

| Ação               | Teclado                                    | Touch                  |
| ------------------ | ------------------------------------------ | ---------------------- |
| Andar              | ← →                                        | ◀ ▶ (esquerda da tela) |
| Pular              | ↑                                          | ▲                      |
| Agachar            | ↓                                          | ▼                      |
| Soco               | A                                          | SOCO (direita da tela) |
| Chute              | S                                          | CHUTE                  |
| Especial           | F                                          | ESP                    |
| Dificuldade (sel.) | ↑ / ↓ na seleção de personagem             | `<` `>` ou tocar opção |
| Defender           | D                                          | DEF                    |
| Soco / chute aéreo | ↑, depois A / S (→ + ↑ para pulo diagonal) | ▲, depois SOCO / CHUTE |
| Defesa agachada    | ↓ + D                                      | ▼ + DEF                |
| Soco agachado      | ↓ + A                                      | ▼ + SOCO               |
| Rasteira           | ↓ + S                                      | ▼ + CHUTE              |

Touch suporta vários dedos ao mesmo tempo (direção + pulo, direção + ataque aéreo, ▼ + DEF,
▼ + SOCO, ▼ + CHUTE).
O jogo é landscape; em celulares na vertical aparece "Gire o dispositivo para jogar".
