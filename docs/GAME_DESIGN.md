# Game Design: Bitrix24 Partner Fighter

## Objetivo do jogo

Fighting game 2D 1x1 no estilo arcade dos anos 90. Cada luta é entre dois personagens numa arena
lateral; vence quem zerar a vida do oponente (KO) ou tiver mais vida quando o tempo acabar.

Visão futura: um elenco de 8 a 16 personagens caricaturais inspirados no ecossistema Bitrix24
(parceiros, CRM, automações, WhatsApp, IA, vendas), com golpes temáticos. O elenco atual tem
`AUGUSTO`, `FILIPE`, `JOÃO GUIOTTI` e `ROMUALDO` jogáveis (`playable: true`); `FIGHTER_A` e
`FIGHTER_B` são placeholders de desenvolvimento (`playable: false`), fora da seleção.

## Game loop

```
LUTA RÁPIDA: Menu → Seleção (seu lutador, rival) → Fase → Tela VS → Luta (melhor de 3) → Vitória → Menu
HISTÓRIA:    Menu → Seleção → Mapa (viagem) → VS → Luta → Vitória → Mapa ... → Campanha concluída
```

1. **Menu:** título e botão JOGAR (Enter, Espaço, clique ou toque), que abre HISTÓRIA e LUTA
   RÁPIDA (← → escolhem, Enter confirma, Esc fecha). Os passos abaixo são da luta rápida; o
   Modo História tem seção própria.
2. **Seleção ("ESCOLHA SEU PARCEIRO"):** grade de cards gerada pelos lutadores jogáveis
   (roster filtrado por `playable`). A grade se ajusta à quantidade: 6 → 3 × 2, 7–8 → 4 × 2,
   9–10 → 5 × 2, 11–12 → 6 × 2 (cards menores, nomes longos em duas linhas); só acima disso há
   páginas, com ◀ ▶ e "1/2" no topo. Slots "EM BREVE" completam a última linha. Augusto é a seleção inicial; todos os jogáveis podem
   ser escolhidos, inclusive sem arte própria (retrato e boneco procedurais). O card
   escolhido ganha borda dourada, brilho pulsante e o marcador P1; ao lado, o painel de
   destaque mostra retrato ampliado, nome e barras PODER / VELOCIDADE / ALCANCE
   (só apresentação, calculadas do config em relação ao roster). ← → percorrem os jogáveis em
   ordem e ↑ ↓ trocam de linha na mesma coluna (passando de página; ◀ ▶ no topo trocam de página
   quando há várias); tocar um card seleciona e tocar de novo
   confirma, assim como SELECIONAR ou Enter. VOLTAR ou Esc volta ao menu. Abaixo da grade, o
   painel "DIFICULDADE < FÁCIL NORMAL DIFÍCIL >" (Q / E ou toque; veja "Dificuldade").
   Na luta rápida a seleção tem dois passos (selo "PASSO 1 DE 3" / "PASSO 2 DE 3"): primeiro o
   seu lutador; depois **"ESCOLHA O RIVAL"**, na mesma grade, começando no próximo jogável do
   roster (circular) mas aceitando qualquer jogável, inclusive o mesmo (espelho). No passo do
   rival o destaque diz CPU e o card do seu lutador mantém o P1; o rodapé lembra quem é o P1.
   Esc / VOLTAR no passo do rival volta ao primeiro passo, no lutador escolhido.
   **Fase ("ESCOLHA A FASE", passo 3 de 3, só na luta rápida):** prévia grande do cenário
   destacado (a própria arte de fundo), com a luta ("JOÃO GUIOTTI VS AISLAN") numa faixa no
   topo, nome e lugar embaixo, e a lista dos cenários ilustrados à direita (Partner Summit,
   Recife, Joinville, Joinville ZOPU, Praça Vermelha; a Partner Arena provisória fica fora).
   Começa no cenário sugerido pela cidade dos lutadores (regra abaixo). ↑ ↓ ← → percorrem
   (circular), tocar uma fase (em qualquer ponto da linha) seleciona e tocar de novo confirma,
   tocar a prévia grande também luta na fase mostrada, LUTAR! ou Enter vai ao VS e Esc /
   VOLTAR volta ao passo do rival com os dois lutadores.
3. **VS:** apresenta os dois lutadores e o cenário por cerca de 2,6 s (pode pular).
   O cenário vem do lugar da luta: quem é de **Recife** (Augusto, Filipe) luta no **Marco
   Zero** (RECIFE); de **Joinville** (Romualdo), no **pórtico de Joinville** (JOINVILLE CRMTHINK); os
   demais, no **Bitrix24 Partner Summit**. Na luta rápida essa é só a sugestão da tela de fase
   (cidade do rival ou, se ele não tiver cidade, a do jogador) e vale a fase escolhida; na
   história, o destino da etapa. O VS
   mostra o nome do cenário e o lugar ("MARCO ZERO - RECIFE, PE").
   - **Partner Summit:** o público pula em onda e comemora mais rápido quando um round tem
     vencedor; o presidente, sentado no palco, olha ao redor e gesticula (e acena ao fim do
     round).
   - **Recife:** a torcida atrás da grade se mexe em grupos (pulos, balanço, palmas em rajada,
     flashes de celular), reage a golpes fortes, especiais, KO e PERFECT, comemora o fim do
     round e mais ainda a vitória da partida. Um avião cruza o céu a cada ~20-30 s rebocando a
     faixa "Arrecife Digital", que ondula como tecido.
   - **Rússia (Praça Vermelha):** a luta contra João Guiotti no Modo História, com o Kremlin, a
     Catedral de São Basílio ao pôr do sol, a mesma torcida animada e um biplano com a faixa
     "Bitrix24" passando atrás das torres e cúpulas. Escolhido pelo encontro, não pelo país.
   - **Joinville:** a mesma torcida animada (dos dois lados do pórtico) e o mesmo voo, com a
     faixa "CRMThink" passando ao fundo, atrás do telhado e das palmeiras.
   - **Bitrix24 Moscou:** o salão da sede da Bitrix24, com o Kremlin e o Moscow City atrás do
     vidro. É o cenário do Dmitry, o chefe final da história; na luta rápida qualquer luta pode
     ser nele. A lista de fases se ajusta à quantidade de cenários (linhas mais baixas quando há
     mais fases; acima de 7, a lista rola).
     É só visual: a arena (largura, chão, paredes) é a mesma em todos os cenários.
4. **Luta:** melhor de 3. Cada round: "ROUND n" (ou "FINAL ROUND") → "FIGHT!" (2 s sem
   controle) → combate → "K.O." ou "TIME OVER". Quem vence 2 rounds vence a partida.
5. **Vitória:** arena ilustrada com "<NOME> VENCEU!" (ou EMPATE), o card com o retrato do
   vencedor, a linha "VOCÊ VENCEU!/VOCÊ PERDEU · motivo do último round · placar (ex.: 2 x 1)" e
   os botões REVANCHE (a mesma luta: lutadores, fase e dificuldade), NOVA LUTA (volta à seleção,
   no lutador usado) e VOLTAR AO MENU. Enter / Espaço fazem a revanche; Esc volta ao menu.

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

### JOÃO GUIOTTI

**João Guiotti — São Paulo - SP.** Técnico e equilibrado: o jab mais rápido do elenco
(startup 4) e boa mobilidade. Vida 100; caminhada 3,3/2,7 px/frame; pulo 16,8 com 4,1 px/frame
no ar. Corpo padrão, arte pixel-art própria com óculos, blazer preto e camiseta branca, e o especial
ALAIO VIBECODE! (veja "Especiais e energia").

### ISAQUE FERREIRA

Perfil equilibrado, disponível na luta rápida e como CPU pelo roster genérico. Vida 100,
caminhada 3,1 e recuo 2,5 px/frame, impulso de pulo 16,5 e velocidade aérea 3,9. Corpo padrão,
com o especial ALAIO VIBECODE! (o mesmo do João, veja "Especiais e energia").

| Ataque      | Dano | Startup | Ativo | Recovery |
| ----------- | ---- | ------- | ----- | -------- |
| punch       | 7    | 5       | 3     | 11       |
| kick        | 11   | 10      | 4     | 17       |
| crouchPunch | 5    | 5       | 3     | 9        |
| crouchKick  | 9    | 9       | 4     | 18       |
| airPunch    | 7    | 5       | 6     | 10       |
| airKick     | 10   | 8       | 8     | 14       |

Alcance, stun e knockback seguem a referência intermediária de João; startup/recovery maiores
e mobilidade menor compensam o dano um pouco maior. Não substitui a validação de equilíbrio com jogadores.

### AISLAN — ZOPU

Perfil equilibrado, mesmos valores-base do Isaque: vida 100, avanço/recuo 3,1/2,5 px/frame,
pulo 16,5 e velocidade aérea 3,9. Seis normais e o especial FLUIDZ! (veja "Especiais e energia").
Dano e startup/ativo/recovery: soco 7 e 5/3/11; chute 11 e 10/4/17; soco agachado 5 e 5/3/9;
rasteira 9 e 9/4/18; soco aéreo 7 e 5/6/10; chute aéreo 10 e 8/8/14.
Aislan entra depois de Romualdo nas rotas, em Joinville, no cenário JOINVILLE (ZOPU)
(`joinville-zopu`, mesma arena; o Romualdo segue no Joinville da CRMThink).
Encontros consecutivos no mesmo lugar apresentam diretamente o desafio, sem voo.
A derrota mantém rival, localização, cenário e dificuldade para o retry.

### ROMUALDO

**Romualdo — Joinville - SC.** Pesado: golpes mais fortes, mais knockback e recuperações
maiores; o mais lento do elenco. Vida 100; caminhada 2,85/2,3 px/frame; pulo 16,2 com
3,7 px/frame no ar. Arte pixel-art própria: cabeça raspada, óculos, barba grisalha e blazer azul-marinho.
Especial: GPTMAKER! (veja "Especiais e energia").

| Lutador  | Golpe         | Dano | Startup | Ativo | Recovery | Hitstun | Blockstun | Alcance |
| -------- | ------------- | ---- | ------- | ----- | -------- | ------- | --------- | ------- |
| JOÃO     | Soco          | 6    | 4       | 3     | 9        | 14      | 9         | 82      |
| JOÃO     | Chute         | 10   | 9       | 4     | 15       | 18      | 12        | 100     |
| JOÃO     | Soco agachado | 5    | 4       | 3     | 7        | 13      | 8         | 74      |
| JOÃO     | Rasteira      | 8    | 8       | 4     | 16       | 16      | 11        | 112     |
| JOÃO     | Soco aéreo    | 6    | 4       | 6     | 8        | 14      | 9         | 68      |
| JOÃO     | Chute aéreo   | 9    | 7       | 8     | 12       | 17      | 12        | 78      |
| ROMUALDO | Soco          | 8    | 6       | 3     | 12       | 15      | 9         | 80      |
| ROMUALDO | Chute         | 13   | 11      | 4     | 19       | 19      | 12        | 98      |
| ROMUALDO | Soco agachado | 6    | 5       | 3     | 10       | 13      | 8         | 72      |
| ROMUALDO | Rasteira      | 11   | 10      | 4     | 20       | 17      | 11        | 110     |
| ROMUALDO | Soco aéreo    | 8    | 5       | 5     | 10       | 15      | 9         | 68      |
| ROMUALDO | Chute aéreo   | 12   | 9       | 8     | 15       | 18      | 12        | 76      |

Simulação CPU × CPU (NORMAL, 30 partidas por par, só referência de equilíbrio): Augusto 16 × 14
João e 16 × 14 Romualdo; Filipe 15 × 15 João e 20 × 10 Romualdo; João 12 × 18 Romualdo.

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
| ALAIO VIBECODE!     | `mid`      | Ondas de código na altura do tronco                       |
| GPTMAKER!           | `mid`      | Feixe do agente, do peito à cabeça                        |

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
A sequência visual reaproveita os sprites; o efeito é o tema 24zap (veja "VFX dos especiais").

**MINDHUB AGENT (Filipe):** Filipe ativa um agente de IA que dispara uma descarga digital à
frente. Custo 35 (descontado no primeiro frame, mesmo se errar), somente no chão, nível `mid`,
dano 18, chip 2, startup 15 / ativo 6 / recovery 24, hitstun 24, blockstun 16, knockback 8,5,
pushback 6 e hitstop 12. Hitbox (30, -132, 140, 76): alcance frontal de 170 px, contra 110 do
chute dele, mas longe de cobrir a tela. Não avança (ele "conjura" parado), um único contato.
Comparado ao chute (10 de dano, 11/4/18), é bem mais forte e longo, porém lento o bastante para
ser visto e, bloqueado, deixa Filipe em desvantagem (24 de recovery contra 16 de blockstun).
Visual: reaproveita os frames do soco; o efeito é o tema Mindhub (veja "VFX dos especiais").

**ALAIO VIBECODE! (João Guiotti e Isaque Ferreira):** o mesmo golpe nos dois, cada um com o
próprio id (`src/fighters/shared/alaioVibecode.ts`). Custo 30, somente no chão, nível `mid`,
dano 17, chip 2, startup 12 / ativo 6 / recovery 24, hitstun 24, blockstun 15, knockback 8,
pushback 5,5 e hitstop 11. Hitbox (26, -134, 136, 64): alcance de 162 px, contra ~100 dos
chutes deles. Um passinho à frente (2 px/frame no startup/ativo), um único contato. Bloqueado,
deixa o lutador em desvantagem (24 de recovery contra 15 de blockstun).

**GPTMAKER! (Romualdo):** o especial pesado do elenco. Custo 35, somente no chão, nível `mid`,
dano 21, chip 3, startup 17 / ativo 6 / recovery 27, hitstun 26, blockstun 17, knockback 10,
pushback 6,5 e hitstop 13. Hitbox (30, -138, 130, 84): alcance de 160 px, do peito à cabeça.
Não avança. É o que mais tira vida e o mais lento de sair, e o mais punível bloqueado (27 de
recovery contra 17 de blockstun). Os dois reaproveitam os frames do soco.

**FLUIDZ! (Aislan):** um jato de líquido roxo (o roxo da Fluidz). Custo 30, somente no chão, nível `mid`, dano 17,
chip 2, startup 13 / ativo 7 / recovery 23, hitstun 24, blockstun 15, knockback 8,5, pushback
5,5 e hitstop 11. Hitbox (24, -124, 140, 62): alcance de 164 px (o chute dele: 100), da cintura
ao peito. Inclina-se um pouco no jato (1,5 px/frame no startup/ativo), um único contato.
Bloqueado, deixa Aislan em desvantagem (23 de recovery contra 15 de blockstun). Reaproveita os
frames do soco.

### VFX dos especiais

Cada especial tem a identidade do app ligado a ele, só na apresentação (frame data, dano, custo e
caixas iguais). As fases seguem o frame data do golpe: carga (startup), disparo (active),
dissipação (recovery) e um impacto no acerto ou na defesa.

- **24ZAP (Augusto), app de mensagens:** na carga, balões "digitando..." aparecem ao redor e o
  emblema do 24zap se forma na mão, com energia verde se concentrando; no disparo, o emblema é
  "enviado" à frente de uma rajada de balões de chat, com ondas ")))" de envio; no acerto, onda
  de choque verde, balões estourando nas cores do logo (verde, rosa, amarelo), ✓✓ azul de
  "lida" e o selo do 24zap no oponente (na defesa: menor e só um ✓ cinza, "enviada"); depois os
  balões sobem e somem.
- **MINDHUB AGENT (Filipe), IA:** na carga, o símbolo cérebro-circuito do Mindhub acende na mão
  dentro de uma mira giratória, bits de dados convergem e trilhas de circuito são desenhadas até
  o alvo; no disparo, descarga digital, rede neural com pulsos e o emblema do Mindhub chegando
  ao fim do alcance; no acerto, onda de choque quadrada/losango, linhas neurais com nós e o
  emblema; depois a rede desliga nó a nó e o símbolo se expande e some.
- **ALAIO VIBECODE! (João, Isaque), vibe coding:** na carga, um editor de código abre atrás do
  ombro e é digitado linha a linha em cores de sintaxe, com cursor piscando, ondas "vibe" magenta e
  ciano pulsam na mão e tokens `</>` / `{ }` orbitam até ela; no disparo, duas ondas senoidais neon
  trançadas vão da mão ao fim do alcance levando os tokens, com o emblema `</>` na ponta; no
  acerto, glitch (faixas magenta/ciano deslocadas, divisão RGB), quadrado de pixels, anel roxo,
  tokens voando, ✓ verde de "build passou" e o emblema (na defesa: menor, sem ✓ nem emblema);
  depois o código sobe e se desfaz em pixels.
- **GPTMAKER! (Romualdo), construtor de agentes de IA:** na carga, uma planta azul (grade de
  blueprint) é projetada no alcance, engrenagens giram na mão, faíscas de quatro pontas piscam e
  as peças de um robozinho-agente voam e se encaixam atrás do ombro, com olhos ciano e antena
  âmbar; no disparo, o feixe âmbar com núcleo branco e tokens correndo sai da mão sobre um fluxo de
  nós (o "workflow" do agente) que acende até o alvo, com o emblema do robô no fim; no acerto,
  explosão estelar âmbar, anel de engrenagem, blocos se espalhando e faíscas (na defesa: menor,
  sem emblema); depois o robô se desmonta e a planta apaga.
- **FLUIDZ! (Aislan), líquido roxo da Fluidz:** na carga, o líquido se junta à frente do corpo
  numa bolha roxa que balança, gotas são puxadas para ela, bolhas sobem e uma gota pinga; no disparo, um
  jato grosso e ondulante sai da mão até o fim do alcance, com reflexos brilhantes correndo nele,
  uma crista de onda na ponta e gotas espirrando; no acerto, splash: clarão, coroa de gotas
  jogadas para cima e para a frente que caem com gravidade, ondas concêntricas e o emblema da Fluidz
  (na defesa: menor, sem emblema); depois o jato vira gotas que caem e uma poça roxa se espalha e
  seca no chão.

Cada um também tem som próprio ao começar (`special-zap`, `special-mind`, `special-vibe`,
`special-gpt`, `special-fluidz`).
A CPU também usa especiais (veja "Especiais da CPU"), pelas mesmas regras do jogador.

### SPECIAL READY (só visual)

A barra entra em **SPECIAL READY** quando a energia alcança o custo do especial **mais barato**
configurado para aquele lutador (Augusto, João, Isaque e Aislan: 30; Filipe e Romualdo: 35), nunca "barra
cheia". Especiais com custo acima do máximo da barra não contam; lutadores sem especial (FIGHTER_A/B)
nunca ficam READY. A restrição `groundOnly` não entra na conta, para o HUD não piscar a cada pulo.

- **READY:** preenchimento neon mais claro com destaque branco, moldura dourada, glow que
  respira (≈1,8 s por ciclo), faixa de brilho correndo pela barra, raios curtos (ponta externa,
  bordas da moldura e cortes rápidos no preenchimento) e faíscas leves. O rótulo vira
  "ESP n/100 · PRONTO" em dourado. Nada sai da faixa da barra (vida, timer, nomes e losangos
  ficam limpos).
- **Ao ficar READY:** uma única explosão (flash, raios mais intensos por ~320 ms, faíscas).
- **Ao gastar e cair abaixo do custo:** READY termina na hora, com descarga curta (flash, raios
  saindo das pontas, glow apagando em ~180 ms). Se sobrar energia suficiente, continua READY.
- **Mobile:** o botão ESP ganha borda ciano e um anel dourado pulsando enquanto o especial do
  jogador estiver disponível.

## CPU

A mesma IA genérica controla qualquer lutador (lê só o `FighterConfig` e o estado da luta).

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

Escolhida na seleção de personagem: **FÁCIL**, **NORMAL** (padrão) ou **DIFÍCIL**. Q / E no
teclado (↑ ↓ andam pela grade), ou os botões `<` `>` e um toque na opção. A última escolha fica guardada durante a
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

### Especiais da CPU

A CPU descobre os especiais pelo `FighterConfig` (nada por personagem) e só considera o que um
aperto de especial realmente iniciaria: energia ≥ custo (o mesmo limiar do SPECIAL READY, sem
esperar 100), postura permitida (`groundOnly`), livre no chão (nunca em hitstun, blockstun, KO,
no próprio golpe ou no ar) e a uma distância em que o golpe alcança. Aí o especial é uma opção
da árvore de decisão, não um aperto automático: rola uma chance e, usando ou não, espera um
cooldown antes de considerar de novo. Quando a barra fica pronta, ainda hesita um pouco.

| Dificuldade | Chance base | Cooldown após usar | Cooldown ao recusar | Hesitação | Finalizar | Punir whiff | Checa o alcance |
| ----------- | ----------- | ------------------ | ------------------- | --------- | --------- | ----------- | --------------- |
| FÁCIL       | 13%         | 120–180 frames     | 90–150 frames       | 60–120    | +8%       | +0%         | 50%             |
| NORMAL      | 40%         | 55–100 frames      | 40–70 frames        | 20–45     | +30%      | +15%        | 85%             |
| DIFÍCIL     | 72%         | 30–65 frames       | 12–24 frames        | 6–16      | +60%      | +35%        | 100%            |

"Finalizar": soma quando o dano do especial zera a vida do oponente. "Punir whiff": soma quando
o oponente está preso no recovery de um golpe, percebido só depois dos `reactionFrames`, e o
recovery que falta cobre o startup do especial. Sem checar o alcance, a CPU calcula "no olho" e
pode jogar o golpe um pouco curto; checando, também espera o oponente aterrissar. A chance total
nunca passa de 95%. Em simulação CPU × CPU (20 lutas, contra FIGHTER_A no NORMAL), Filipe usa
cerca de 3 especiais por minuto no FÁCIL, 8 no NORMAL e 10 no DIFÍCIL; a barra fica pronta e
sem uso ~78%, ~34% e ~14% do tempo.

## Rounds e vitória (melhor de 3)

- A partida é **melhor de 3**: o primeiro a vencer **2 rounds** vence. Ex.: 2 x 0 ou 2 x 1.
- Cada round dura **99 segundos**. O timer usa fonte arcade (Press Start 2P): dourado, depois
  amarelo (10–7 s), laranja (6–4 s) e vermelho (3–0 s), com um pulso discreto a cada segundo.
  É só visual: a duração do round não muda.
- **KO:** vida 0 → "K.O." → o vencedor do round faz a pose de vitória e marca 1 ponto.
- **Tempo esgotado:** vence o round quem tiver mais vida.
- **Empate no round** (vida exatamente igual no fim do tempo, ou duplo KO no mesmo frame):
  aparece **DRAW**, ninguém pontua e o round é **repetido**.
- **PERFECT:** quem vence um round sem perder **nenhum** ponto de vida naquele round (por KO ou
  por tempo, Player ou CPU) ganha a chamada **PERFECT**, em dourado, cerca de 1,3 s depois de
  "K.O." / "TIME OVER" e antes do próximo round ou da tela de vitória. Qualquer perda real de HP no
  round, inclusive chip damage de golpe defendido, anula; defender sem perder HP não anula. Empate
  nunca é PERFECT. Vale por round (cada round começa do zero); a partida conta os PERFECTs de cada
  lado (`MatchOutcome.perfects`).
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

## Modo História

Uma turnê pelo Brasil e pelo mundo contra os rivais, usando as mesmas lutas da luta rápida.

- **Seleção ("MODO HISTÓRIA"):** todo personagem da história pode ser escolhido (Augusto,
  Filipe, João Guiotti, Isaque Ferreira, Romualdo). O selo mostra onde a campanha começa ("PARTIDA RÚSSIA"); a
  dificuldade da CPU vale para a campanha toda.
- **Origem × lugar na história:** a origem oficial não muda (Augusto e Filipe de Recife - PE,
  João de São Paulo - SP, Romualdo de Joinville - SC), mas cada um tem um lugar na história:
  Augusto em **Recife**, **Filipe em Portugal**, **João Guiotti na Rússia**, **Isaque
  Ferreira na Espanha** (ainda sem origem oficial) e Romualdo em **Joinville**. A campanha do escolhido **começa no lugar dele**, e os outros são enfrentados
  nos lugares deles, um por um (nunca ele mesmo).
- **Rotas (geradas):** Augusto: Recife → Portugal (Filipe) → Rússia (João) → Espanha (Isaque)
  → Joinville (Romualdo). Filipe: Portugal → Recife (Augusto) → Rússia (João) → Espanha
  (Isaque) → Joinville (Romualdo). João: Rússia → Recife (Augusto) → Portugal (Filipe) →
  Espanha (Isaque) → Joinville (Romualdo). Romualdo: Joinville → Recife (Augusto) → Portugal
  (Filipe) → Rússia (João) → Espanha (Isaque). Isaque: Espanha → Recife → Portugal → Rússia →
  Joinville. Cada viagem parte de onde a
  campanha está (o lugar da luta anterior). Lutas em Recife são no **Marco Zero** (cenário
  RECIFE); os outros lugares usam o Partner Summit até terem cenário próprio.
- **Início:** o mapa abre no lugar de partida com "PONTO DE PARTIDA", o retrato e o lugar
  (ex.: "JOÃO GUIOTTI · RÚSSIA"); em seguida "PRÓXIMO DESTINO" e o voo.
- **Mapa:** pixel-art (azul escuro, contorno ciano, rotas douradas, linhas magenta do Equador e
  dos trópicos). Viagens dentro do Brasil usam o mapa do Brasil (voo de ~3 s); viagens ao
  exterior usam um mapa-múndi estilizado com o Brasil destacado em dourado (voo de ~4,4 s, em
  curva longa sobre o Atlântico). O título mostra "RECIFE → PORTUGAL" e "ETAPA 1/3"; durante o
  voo, "PRÓXIMO DESTINO" e o lugar; ao pousar, "PRÓXIMO DESAFIO", retrato, nome e local do rival
  e CONTINUAR. Enter / toque pulam o voo ou continuam; sem ação, segue sozinho após ~4 s. Esc sai.
- **VS:** origem oficial abaixo de cada retrato, **local da luta** abaixo do "VS" (ex.: PORTUGAL)
  e "ETAPA n/t" no topo.
- **Luta:** melhor de 3, regras normais.
- **Vitória:** CONTINUAR leva à próxima viagem. **Derrota:** TENTAR NOVAMENTE repete só aquela
  luta (mesmo rival, cenário e dificuldade); SAIR PARA O MENU encerra a campanha.
- **Chefe final (Dmitry):** quando o Dmitry entrar no elenco, toda campanha termina numa luta
  contra ele em Moscou, no cenário **BITRIX24 MOSCOU**, que na história só é usado nessa luta.
  Ele não é rival comum (não aparece no meio das rotas) e não tem campanha própria. Antes dele
  existir, as rotas acima não mudam.
- **Final:** "CAMPANHA CONCLUÍDA" com a rota percorrida, JOGAR NOVAMENTE (recomeça com o mesmo
  lutador) ou VOLTAR AO MENU.
- O progresso dura a sessão e é independente da luta rápida.

## Música

Cada tela tem trilha própria, original: tema de abertura no menu, faixa mais rápida na seleção,
tema de mapa de arcade de luta no mapa (inclusive durante o voo) e a faixa do cenário na luta
(`StageConfig.music`; hoje `partner-summit-theme`). O VS mantém a música da tela anterior. Quando
a partida termina a música da luta some e toca uma vinheta de rock curta (5 s) na vitória; depois,
silêncio. Trocas sempre com fade. A música só começa depois da primeira interação (exigência dos
navegadores) e **M** liga/desliga o som. Detalhes em
[ART_DIRECTION.md](ART_DIRECTION.md#música).

## Efeitos sonoros

Sons originais de fliperama, sempre ligados a eventos reais da luta: o impacto só toca quando o
golpe conecta (soco, chute, agachados e aéreos têm sons próprios; o chute é mais grave), errar
não faz som de impacto, defesa tem som próprio (baque abafado no antebraço), quem apanha tem um baque de dano, o pulo
toca ao sair do chão e a aterrissagem no contato com o chão. K.O. toca uma vez, o especial quando
realmente começa e SPECIAL READY quando a barra fica pronta (não a cada frame). Anúncios ROUND e
FIGHT!, a pose de vitória e os menus (mover, confirmar, voltar) também têm som. Os efeitos ficam
acima da música; **M** silencia tudo. Lista e níveis em
[scripts/sfx/README.md](../scripts/sfx/README.md).

## Controles

| Ação               | Teclado                                    | Touch                               |
| ------------------ | ------------------------------------------ | ----------------------------------- |
| Andar              | ← →                                        | Joystick ← → (esquerda da tela)     |
| Pular              | ↑ (↑ + ← / → para pulo diagonal)           | Joystick ↑, ↖ ou ↗                  |
| Agachar            | ↓                                          | Joystick ↓ (↙ / ↘ também agacham)   |
| Soco               | A                                          | SOCO (direita da tela)              |
| Chute              | S                                          | CHUTE                               |
| Especial           | F                                          | ESP                                 |
| Dificuldade (sel.) | Q / E na seleção de personagem             | `<` `>` ou tocar opção              |
| Defender           | D                                          | DEF                                 |
| Soco / chute aéreo | ↑, depois A / S (→ + ↑ para pulo diagonal) | Joystick ↗ / ↖, depois SOCO / CHUTE |
| Defesa agachada    | ↓ + D                                      | Joystick ↓ + DEF                    |
| Soco agachado      | ↓ + A                                      | Joystick ↓ + SOCO                   |
| Rasteira           | ↓ + S                                      | Joystick ↓ + CHUTE                  |

**Joystick virtual (touch):** só converte a posição do dedo nas mesmas entradas digitais das
setas, nunca em velocidade. Zona morta de 20% do curso no centro; fora dela vale só o ângulo,
em 8 setores (diagonais com 50° e direções retas com 40°, para facilitar ↗ e ↖). O dedo pode
sair da base e continua controlando; ao soltar, tudo é liberado na hora e o botão volta ao
centro. Diferença única em relação ao teclado: no touch, manter o joystick para cima dá **um**
pulo (para pular de novo, saia da zona de cima e volte); no teclado, segurar ↑ continua pulando
a cada aterrissagem, como antes.

Touch suporta vários dedos ao mesmo tempo: um no joystick e outro nos botões (↗ + CHUTE,
↖ + SOCO, ↓ + DEF, ↓ + SOCO, ↓ + CHUTE).
O jogo é landscape; em celulares na vertical aparece "Gire o dispositivo para jogar".
