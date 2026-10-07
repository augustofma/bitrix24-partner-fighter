# Arquitetura

## Princípio central

O jogo é dividido em duas metades com uma fronteira rígida:

```
┌──────────────────────────── Phaser (apresentação) ────────────────────────────┐
│  scenes/   render/   ui/   input/                                              │
│  lê teclado/toque, desenha, toca efeitos, troca de cena                        │
└───────────────▲──────────────────────────────────────────┬────────────────────┘
                │ ReadonlyFighter, eventos                 │ InputState (por frame)
┌───────────────┴──────────────────────────────────────────▼────────────────────┐
│  core/   controllers/   fighters/   stages/   config/   types/                 │
│  simulação pura, determinística, 60 Hz fixo, sem Phaser (testável em Node)     │
└────────────────────────────────────────────────────────────────────────────────┘
```

- A **simulação** decide tudo que importa para o resultado da luta.
- A **apresentação** só traduz dispositivos em `InputState` e desenha o estado.
- O ESLint impede que a metade de baixo importe Phaser ou código de apresentação.

Isso mantém a lógica testável (`tests/` roda em Node, sem navegador) e prepara o terreno para
replays e multiplayer online (rollback precisa de uma simulação determinística e separada do
render).

## Estrutura de pastas

```
src/
  main.ts                 Cria o Phaser.Game (resolução, escala, cenas)
  config/                 Constantes globais (sem Phaser)
    display.ts            Resolução lógica 960x540
    simulation.ts         FPS fixo, gravidade, atrito, buffer de input, limites
    match.ts              Tempo de round (99 s), durações de intro/outro, dificuldade padrão
    controls.ts           Bindings de teclado (remapeáveis)
    sceneKeys.ts          Nomes das cenas
    registryKeys.ts       Chaves do registry do Phaser (estado da sessão entre cenas)
    strings.ts            Todos os textos de UI (pronto para i18n)
  types/                  Tipos compartilhados (sem lógica)
    fighter.ts            FighterConfig, AttackConfig, estados, assets
    input.ts              InputAction, InputState, InputSource
    geometry.ts           Vec2, Rect, LocalBox, Direction
    stage.ts              StageConfig, StageArt (camadas ilustradas), StageMood
    match.ts              MatchSetup (com AIDifficulty), RoundResult, MatchResult
  core/                   SIMULAÇÃO PURA
    FightSimulation.ts    Orquestra um frame da luta
    fighter/Fighter.ts    Entidade lutador: state machine + física + caixas
    fighter/attackFrames.ts  Fases de ataque (startup/active/recovery)
    fighter/AttackInputBuffer.ts  Borda e expiração do buffer de normais/especiais
    fighter/fighterPhysics.ts Integração de gravidade, landing e atrito
    fighter/fighterStates.ts Regras puras: grupos de estados, botão → slot (e o inverso),
                             postura baixa, GUARD_COVERAGE (nível × guarda), hurtbox/pushbox
    fighter/attackGeometry.ts "Este golpe acertaria agora?" (alcance + altura), usado pela IA
    fighter/ReadonlyFighter.ts  Visão somente leitura (para IA e render)
    systems/CombatSystem.ts  Hitbox x hurtbox, dano, bloqueio, KO
    systems/ArenaSystem.ts   Paredes, colisão de corpos, distância máxima
    systems/RoundSystem.ts   Um round: intro, cronômetro, KO, time over, fim do round
    systems/MatchSystem.ts   Melhor de N: pontos por round, empate repetido, FINAL ROUND, fim
    input.ts              InputTracker (bordas "pressed"), merge de inputs
    geometry.ts, random.ts   Utilitários (RNG com seed)
  controllers/            Quem controla um lutador (sem Phaser)
    FighterController.ts  Interface comum
    PlayerController.ts   Junta várias InputSource (teclado + touch)
    AIController.ts       CPU (state machine), escolha de golpe consciente da postura
    aiProfiles.ts         AIProfile por dificuldade (EASY_AI, NORMAL_AI, HARD_AI, aiProfileFor)
  fighters/               CONTEÚDO: um arquivo por personagem
    augusto.ts, filipe.ts, fighterA.ts, fighterB.ts
    shared/standardBody.ts  Hurtboxes padrão reutilizáveis
    roster.ts             Lista de personagens e helpers
  stages/                 CONTEÚDO: cenários
    partnerSummit.ts      Bitrix24 Partner Summit (padrão): mesma arena, arte ilustrada
    partnerArena.ts       Cenário procedural (também é o fallback visual)
    stageRegistry.ts
  input/                  Dispositivos (Phaser)
    KeyboardInputSource.ts, menuKeys.ts
  render/                 Desenho do mundo (Phaser)
    FighterView.ts        Interface de view de lutador
    createFighterView.ts  Fábrica: SpriteFighterView ou PlaceholderFighterView (fallback)
    FighterShadow.ts      Sombra no chão (compartilhada pelas views)
    viewEffects.ts        Flash de hit (compartilhado pelas views)
    sprite/               Lutador desenhado com spritesheet
      SpriteFighterView.ts  View Phaser: frame, flipX, âncora nos pés, escala, offsets
      animationHelpers.ts   PURO: estado da simulação -> frame do sheet
      spriteValidation.ts   PURO: validação da config + decisão de fallback
    assets/
      fighterAssets.ts    PURO: lista de assets do roster (sem duplicatas)
      titleAssets.ts      PURO: camadas da tela inicial (fundo, logo, botão JOGAR)
      victoryAssets.ts    PURO: camadas da tela de vitória (fundo, card, painel, botão)
      fontAssets.ts       PURO: fontes incluídas no jogo (Bangers, título da vitória)
      stageAssets.ts      PURO: imagens declaradas em StageConfig.art (sem duplicatas)
      textureInfo.ts      Quantos frames tem uma textura carregada
    placeholder/          Boneco geométrico: poses por estado + desenho
    stage/
      StageBackdrop.ts    Interface do fundo: setMood('fight' | 'celebrate') e update(tempo)
      createStageView.ts  Arte ilustrada se as texturas carregaram; senão o procedural
      IllustratedStageView.ts Fundo + público em colunas + recortes animados (cabeça, mão)
      StageView.ts        Cenário procedural com parallax
      stageMotion.ts      PURO: ritmos e poses dos loops (público, cabeça, mão) por animação
    FightCamera.ts        Câmera que segue o ponto médio, presa à arena
    HitEffects.ts         Faíscas de impacto
    SpecialEffects.ts     VFX procedural por configuração, sincronizado a stateFrame
    DebugOverlay.ts       Hitboxes/hurtboxes (F2)
    PortraitView.ts       Card de personagem (seleção/VS/vitória); `framed: false` só a arte
  ui/                     Interface fixa na tela (Phaser)
    FightHud.ts, HealthBar.ts, Announcer.ts, TouchControls.ts,
    SpecialMeterBar.ts, DifficultySelector.ts (painel < FÁCIL | NORMAL | DIFÍCIL >),
    MenuButton.ts, ArcadeBackground.ts, theme.ts
    ArtButton.ts          Botão feito de arte (JOGAR, VOLTAR AO MENU): hover 1,03 + brilho, press 0,97
    victory/              Tela de vitória
      victoryContent.ts   PURO: título, retratos, nome e linha de resultado a partir do MatchResult
      victoryLayout.ts    PURO: posições das camadas (saída do script de preparo)
      VictoryCard.ts      Card com retrato real, brilho da moldura, halo, flutuação e brilho varrendo
      fightTitle.ts       Letreiro de jogo de luta gerado num canvas a partir de qualquer texto
                          (fonte, inclinação, degradê, contornos, pincel, sombra; ajuste de largura)
      victoryText.ts      Título (fightTitle + brilho) e linha de resultado sobre o painel
      VictoryEffects.ts   Confete pixelado, quadradinhos subindo e brilhos (partículas leves)
    select/               Visual da seleção de personagem (Phaser, exceto os módulos puros)
      selectLayout.ts     PURO: geometria da tela, posição de cada card, páginas e slots vazios
      fighterRatings.ts   PURO: barras PODER/VELOCIDADE/ALCANCE derivadas do FighterConfig
      SelectBackground.ts Mapa pixel-art procedural (gerado uma vez como textura) + nuvens
      arcadeFrame.ts      Moldura pixel-art (contorno, borda dupla, cantos em degrau)
      ArcadeButton.ts     Botão arcade (primário/secundário, hover, pressão, pulso)
      RosterCard.ts       Card da grade (retrato, nome, P1, brilho, CPU, "EM BREVE")
      HeroPanel.ts        Painel de destaque do lutador selecionado
  scenes/                 Fluxo do jogo (Phaser)
    BootScene, MenuScene, CharacterSelectScene, VersusScene, FightScene, VictoryScene
    transitions.ts        Fade entre cenas
  utils/device.ts         Detecção de toque, flags de URL
tests/                    Vitest: lutador, combate, arena, round, partida, IA, dificuldade da CPU,
                          ataques aéreos e agachados, níveis de ataque × guarda, cross-up,
                          especiais, determinismo, seleção, animação/assets de sprite
scripts/                  Ferramentas Node (ex.: gerador da arte demo do FIGHTER_A)
  prepare-augusto-art.ps1 Montagem/validação offline do atlas do Augusto (Windows/System.Drawing)
  augusto-art/            Fontes ImageGen e prompts; não publicados no build
  prepare-filipe-art.ps1  Recortes e normalização offline do atlas/portrait de Filipe
  filipe-art/             Fontes ImageGen e prompts de Filipe (fora do build)
public/                   Assets estáticos; arte de lutadores em public/fighters/<id>/
```

## Tela inicial (MenuScene)

A `BootScene` carrega `TITLE_ASSETS` junto com os assets do roster. Com as três texturas
presentes, a `MenuScene` monta a arte em camadas: fundo (sem logo e sem botão), logo com
tweens de flutuação e escala, e o botão JOGAR como imagem interativa (hit area 16 px maior
que o desenho, hover/press por escala e brilho aditivo). Clique, toque, Enter e Espaço usam o
mesmo `start` (`goToScene` para a seleção, protegido contra chamada dupla). Sem as texturas,
a cena usa o visual procedural anterior.

## Cenários (StageConfig.art)

`StageConfig` define a arena (largura, chão, paredes), que é gameplay, e opcionalmente `art`,
que é só apresentação: imagem de fundo, `top` (Y do topo da arte), faixas do público com a
barreira à frente e `performers` (recortes que giram em torno de um pivô, com o movimento
`headLook` ou `handGesture`). A `BootScene` carrega `collectStageAssets(STAGES)`;
`createStageView` usa a `IllustratedStageView` quando todas as texturas existem e cai no
`StageView` procedural caso contrário.

- **Parallax:** a arte é mais larga que a tela; o fator é `(largura da arte − 960) /
(largura da arena − 960)`, então a borda da arte nunca aparece. Todas as camadas usam o
  mesmo fator e ficam coladas ao fundo.
- **Público:** colunas recortadas do próprio fundo (`setCrop`) pulam só para cima, em onda
  (fase defasada por coluna). Uma cópia da barreira por cima esconde a base das colunas; um
  teste garante que o pulo máximo nunca passa da barreira.
- **Recortes:** cabeça e mão ficam sobre uma área limpa do fundo (preenchida no preparo da
  arte), então girar ou virar não revela o original.
- **Humor (`StageMood`):** a `FightScene` chama `setMood('celebrate')` no evento
  `victoryPose`, que só existe quando o round tem vencedor, e `setMood('fight')` no
  `roundStart`. Nada de lógica de fim de luta duplicada. A empolgação vai de 0 a 1 em
  ~0,4 s e mistura os ritmos `CALM_MOTION` e `CHEER_MOTION`. As fases avançam por
  `ritmo × dt` no tempo de render, então mudar a velocidade nunca faz uma camada pular.

## Tela de vitória (VictoryScene)

Com as camadas de `VICTORY_ASSETS` carregadas, a cena monta: fundo da arena, efeitos (atrás de
tudo), card do vencedor, título, linha de resultado e o botão `ArtButton`. Todo texto vem de
`victoryContent(result, sides)`, que só lê o `MatchResult` real (vencedor, motivo do último
round, placar) e é testado sem Phaser. Entrada em sequência (~1,1 s): título com pop e
bounce, card com fade e subida, resultado deslizando, botão por último. Clique, toque, Enter,
Espaço, Esc e Backspace usam o mesmo `back` (`goToScene` para o menu). Sem a arte, a cena usa
o visual procedural anterior.

## Fluxo entre cenas

```
BootScene → MenuScene → CharacterSelectScene → VersusScene → FightScene → VictoryScene
                ▲                                                              │
                └──────────────────────────────────────────────────────────────┘
```

Os dados passam pelo `scene.start(key, data)`:

| De → Para                | Dado                                                                      |
| ------------------------ | ------------------------------------------------------------------------- |
| CharacterSelect → Versus | `MatchSetup` (`playerFighterId`, `cpuFighterId`, `stageId`, `difficulty`) |
| Versus → Fight           | `MatchSetup`                                                              |
| Fight → Victory          | `MatchResult` (`MatchSetup` + vencedor + motivo + placar)                 |

Toda troca de cena usa `goToScene()` (fade, protegido contra chamada dupla).

A seleção deriva os cards do `ROSTER`, numa grade 3 × 2 por página (`selectLayout.ts`);
navegar troca a página automaticamente, os cards ocultos não recebem input e slots vazios
completam a última página. Com mais de uma página aparecem ◀ ▶ e o indicador de página no
topo (no lugar do selo do adversário), mantendo o layout utilizável com 8–16 personagens.
Toda a apresentação fica em `src/ui/select/`; a cena só orquestra seleção, teclado e
`MatchSetup`. Nada ali usa imagens novas: fundo, molduras e botões são desenhados em código,
e os retratos vêm de `createPortrait` (o mesmo caminho de VS e vitória).
`pickCpuOpponent` prioriza um personagem não selecionável diferente do jogador e, na ausência
dele, usa o primeiro diferente. As cenas continuam recebendo apenas `MatchSetup`.

A seleção também escolhe a dificuldade da CPU (`DifficultySelector`: ↑/↓, botões `<` `>` ou
toque na opção) e a grava em `MatchSetup.difficulty`. A última escolha fica no registry do
Phaser (`this.registry`, chave `RegistryKeys.aiDifficulty`), que dura a sessão do jogo e é
compartilhado pelas cenas; não há variável global solta. Valor ausente ou inválido volta para
`DEFAULT_AI_DIFFICULTY` (`normal`). A `FightScene` cria o `AIController` com
`aiProfileFor(setup.difficulty)`.

## O frame da luta

`FightScene.update()` acumula tempo real e executa passos fixos de 1/60 s
(no máximo 5 por frame de render, para não travar depois de uma pausa):

```
para cada passo fixo:
  inputs = [controller0.getInput(ctx), controller1.getInput(ctx)]   // InputState
  events = simulation.step(inputs)
  FightScene trata os eventos (faísca, tremor, anúncio, troca de cena)
depois:
  views.sync(fighter)  → câmera.follow  → hud.update  → debug.draw
```

Dentro de `FightSimulation.step()`:

1. **Hitstop:** se houver congelamento de impacto, só decrementa e sai.
2. **Input:** fora da fase `fight` (intro/fim), os inputs são neutralizados.
   `InputTracker` deriva `pressed` (borda) a partir de `held`.
3. **Fighter.update(input)** para cada lutador: state machine + física.
4. **ArenaSystem.resolve:** distância máxima, separação de corpos, paredes.
5. **Facing:** quem está livre vira para o oponente.
6. **CombatSystem.resolve** (apenas na fase `fight`): gera eventos `hit` / `block` / `koHit`.
7. **RoundSystem.step(health):** gera `fightStart`, `ko`, `timeUp`, `victoryPose`, `roundOver`.
8. **MatchSystem.recordRound** (a cada `roundOver`): pontua o vencedor, emite `roundDraw` se
   empatou, e então `roundStart` (próximo round) ou `matchOver` (fim da partida). No
   `roundStart` a simulação reinicia o round: `Fighter.resetForRound` (vida, spawn,
   velocidade, estado, stuns, buffers; **meter mantido**), novo `RoundSystem`, novos
   `InputTracker`s, hitstop zerado. A cena limpa faíscas, chama `reset()` nos controllers e só
   navega para a vitória no `matchOver`.

Eventos são dados simples (`SimulationEvent`). A apresentação reage a eles; a simulação nunca
chama a apresentação.

## Sistema de input

```
Teclado ─ KeyboardInputSource ─┐
Toque   ─ TouchControls ───────┼─ PlayerController ─┐
(futuro gamepad) ──────────────┘                    ├─→ InputState ─→ FightSimulation
                       AIController ────────────────┘
                (futuro) NetworkController / ReplayController
```

- `InputAction` = `left | right | up | down | punch | kick | block | special`. As direções são **absolutas**
  (tela); o `Fighter` converte em frente/trás conforme o lado para onde está virado.
- `InputSource.read(context?)` devolve as ações seguradas. Toques e teclas muito curtos
  (menos de um frame) ficam retidos (latch), então nunca se perdem. O `PlayerController` passa
  um `InputReadContext` só de leitura (`selfAirborne`), usado pelo touch para expressar
  intenção; nunca decide gameplay.
- **Joystick virtual (touch):** `src/input/joystick.ts` é puro e testado: `joystickDirection`
  (zona morta de 20% do curso, depois só o ângulo em 8 setores, diagonais de 50°),
  `directionInputs` (direção → `up/down/left/right`, como as setas), `JoystickTracker` (o
  primeiro dedo que toca perto do joystick é o dono; outros dedos nunca o movem nem soltam;
  o dedo continua valendo fora da base) e `JumpLatch` (no touch, um pulo por empurrão para
  cima: envia `up` até o lutador sair do chão e espera o joystick sair da zona de cima).
  `VirtualJoystick` (Phaser) só desenha a base e o botão e repassa os ponteiros;
  `TouchControls` junta joystick e botões de ação num `InputState`.
- Remapear teclas: edite `PLAYER_ONE_KEYS` em `src/config/controls.ts`. Uma tela de opções futura
  só precisa produzir outro `KeyBindings`.
- Adicionar um dispositivo: implemente `InputSource` e passe-o ao `PlayerController`.
- **Buffer de ataque:** um soco ou chute apertado até 6 frames antes do lutador ficar livre é
  executado assim que possível.

## Sistema de combate

Coordenadas: `y` cresce para baixo; a posição do lutador é o **centro dos pés**.

Cada caixa (`LocalBox`) é escrita **como se o lutador olhasse para a direita**, relativa aos pés.
`toWorldRect()` espelha automaticamente quando ele olha para a esquerda.

| Caixa   | Onde                                           | Para quê                                        |
| ------- | ---------------------------------------------- | ----------------------------------------------- |
| Hurtbox | `FighterConfig.boxes` (em pé, agachado, no ar) | Onde o lutador pode ser atingido                |
| Hitbox  | `AttackConfig.hitbox`                          | Onde o ataque acerta (apenas nos frames ativos) |
| Pushbox | `boxes.pushWidth`, `boxes.pushHeight`          | Impede que os corpos se sobreponham             |

O visual **não** participa da colisão: trocar o boneco por sprites não muda o gameplay.
As regras de qual caixa vale em cada estado ficam em `core/fighter/fighterStates.ts`
(`hurtboxFor`, `pushboxFor`): `crouch`, `crouchBlock`, `crouchPunch` e `crouchKick` usam o
corpo agachado; no ar vale o
corpo aéreo.

Regras do `CombatSystem`:

- Cada ataque acerta no máximo uma vez (`markAttackConnected`).
- Todos os contatos do frame são coletados antes de serem aplicados, então golpes simultâneos
  trocam dano (trade).
- Bloqueio decidido num único ponto, `isAttackBlocked(defender, attack)`: a postura da guarda
  (`guardPostureOf`: `block` = em pé, `crouchBlock` = agachada) precisa constar em
  `GUARD_COVERAGE[attack.level]` (`high`/`mid`: as duas; `low`: só agachada; `overhead`: só em
  pé). A geometria decide antes se o golpe encosta; a tabela só decide se a guarda segura.
- Bloqueado: `chipDamage` (que nunca nocauteia), `blockstun` e `blockPushback`; a postura
  (em pé ou agachado) é mantida durante o blockstun.
- Caso contrário: `damage`, `hitstun`, `knockback`; com vida 0 → `knockout`.
- O empurrão é sempre **para longe do atacante** (`pushDirection`), o que funciona também no
  cross-up.
- Cada contato gera `hitstopFrames` de congelamento (24 no KO).

### Ataques em pé, agachados e aéreos

`FighterConfig.attacks` tem um `AttackConfig` por slot: `punch`, `kick`, `crouchPunch`,
`crouchKick`, `airPunch`, `airKick`. O botão vira slot pela postura (`ATTACK_SLOTS` em
`fighterStates.ts`):

| Postura                | A             | S            |
| ---------------------- | ------------- | ------------ |
| chão (`ground`)        | `punch`       | `kick`       |
| agachado (`crouch`, ↓) | `crouchPunch` | `crouchKick` |
| ar (`air`)             | `airPunch`    | `airKick`    |

No chão, `groundStance(held.down)` decide entre `ground` e `crouch` **no momento em que o golpe
sai** (inclusive quando vem do buffer). No ar a postura é sempre `air`. Uma postura nova é só
uma linha nessa tabela, mais os slots e estados correspondentes; o `Fighter` não tem
condicionais por golpe.

- **Golpes agachados:** estão em `CROUCHING_STATES`, então usam a hurtbox e a pushbox
  agachadas o golpe inteiro. Terminam pelo mesmo caminho dos golpes em pé: no frame do fim,
  `handleFreeGroundState` relê o input, e com ↓ segurado vai direto para `crouch` (ou
  `crouchBlock`, ou outro golpe agachado do buffer), sem nenhum frame em pé.
- **Níveis de ataque:** cada `AttackConfig` (e cada especial) tem `level: AttackLevel`
  (`high | mid | low | overhead`), aplicado via `GUARD_COVERAGE` em `isAttackBlocked`. Um
  nível novo, ou outra regra de guarda, é uma linha nessa tabela; nada no `Fighter` muda.

- **Ataque aéreo:** sai do estado `jump` quando há um soco ou chute apertado (borda ou buffer),
  no máximo **um por pulo** (flag `airAttackUsed`, zerada no landing). A velocidade não é
  alterada: gravidade e movimento horizontal continuam.
- **Regra de landing:** em `integratePhysics`, quando o lutador toca o chão vindo de cima, os
  estados de `LANDING_STATES` (`jump`, `airPunch`, `airKick`) vão para `idle` e o ataque é
  descartado. Como a física roda antes do combate no mesmo frame, **nenhuma hitbox aérea existe
  no frame do landing nem depois**. No frame seguinte o lutador age normalmente.
- Se o recovery do ataque aéreo acabar no ar, o lutador volta para `jump` (sem novo ataque).

### Especiais por configuração

SpecialMoveConfig estende AttackConfig: state special, meterCost, groundOnly e advanceSpeed.
F executa o primeiro especial elegível e acessível na ordem de FighterConfig.specials.
Cada entrada inclui id/displayName, dano/chip, frame data, hitbox, stun, knockback/pushback e
hitstop. O core não lê assets nem IDs de personagem. Um novo lutador precisa apenas preencher
specials; a CPU continua enviando somente inputs normais.

AttackInputBuffer mantém a borda por 6 frames para normais e especiais. Fighter verifica postura
quando livre, consome a energia e usa o mesmo ciclo de ataque. fighterPhysics integra gravidade,
landing e atrito; ataques aéreos, inclusive especiais configurados com groundOnly false,
encerram no landing. Não há cancelamentos ou repetição automática.

specialMeter é somente leitura para render/IA e começa em zero. changeSpecialMeter aplica clamp;
CombatSystem concede os valores de config/special.ts uma vez por contato normal. O tipo do
ataque vem do contato coletado, preservando a classificação mesmo em trades que interrompam o
atacante. Um especial nunca gera meter para quem o executa; receber dano (de golpe normal ou
especial) sempre rende +5 ao defensor.

Nesta versão cada execução tem um contato, inclusive o especial. Um futuro multi-hit deve
estender a linha do tempo de AttackConfig e o controle de contatos por índice/janela em
Fighter/CombatSystem; não simular hits via timers do renderer ou condicionais por personagem.

SpecialMeterBar desenha as barras do HUD e prontidão pelo custo configurado. SpecialEffects lê
assets.specialEffects[activeAttack.id] (`{ style, label }`), stateFrame e posição e despacha
para o desenhista do estilo: `digital` (pacotes de dados, 24ZAP) ou `agentNetwork` (rede de
agentes de IA com nós, conexões, pulsos e feixe, MINDHUB AGENT). Tudo é derivado do
stateFrame, sem aleatoriedade, então congela durante hitstop e some se o golpe for
interrompido. Um estilo novo é uma função a mais na tabela STYLES, escolhida por configuração. assets.sprite.animations.special reaproveita o pipeline de fases;
a ausência usa punch como fallback. Não há alterações nos PNGs.

### Cross-up (passar por cima)

O critério é só geometria (`pushboxFor`), sem nada específico de personagem:

- **No chão**, a pushbox vai dos pés até `pushHeight`. Duas pushboxes no chão sempre se
  sobrepõem verticalmente, então nunca se atravessa andando.
- **No ar**, a pushbox é a faixa vertical do corpo aéreo. Quando ela fica inteira acima da
  pushbox do adversário, não há sobreposição e a `ArenaSystem` não empurra: o pulador passa por
  cima com a física normal do pulo.
- Ao descer, as caixas voltam a se sobrepor e `ArenaSystem.separateBodies` empurra cada um para
  o lado em que seu centro está; se ele já cruzou, fica do outro lado.

### Facing

`FightSimulation` vira para o oponente apenas os lutadores com `canTurn`: no chão e em estado
livre (`idle`, `walk`, `crouch`) ou de guarda (`block`, `crouchBlock`). Nunca no ar e nunca
durante ataques: um golpe aéreo mantém sprite e hitbox na direção inicial mesmo cruzando o
adversário; a correção acontece no primeiro frame livre após o landing.

## CPU (AIController)

A CPU é um `FighterController` como o jogador: lê `ReadonlyFighter` e devolve `InputState`.
Nunca chama golpes diretamente. Os modos (`approach`, `retreat`, `attack`, `guard`, `jump`,
`wait`) são escolhidos em `decide()` a cada poucos frames, com pesos do `AIProfile` e RNG
injetado (determinístico em testes).

**Escolha do golpe consciente da postura**, só com dados genéricos:

1. `isLowPosture(opponent.state)` (`fighterStates.ts`) diz se o adversário está baixo
   (`crouch`, `crouchBlock`, `crouchPunch`, `crouchKick`).
2. Se estiver, a CPU percebe com chance `lowPostureAwareness` (sorteio feito só nesse caso, então
   o jogo contra adversário em pé consome exatamente a mesma sequência de RNG de antes).
3. Percebendo, filtra os golpes de chão (`punch`, `kick`, `crouchPunch`, `crouchKick`) com
   `attackWouldConnect` (`attackGeometry.ts`): a hitbox, se ficasse ativa agora, tocaria a
   **hurtbox atual** do adversário? Isso cobre alcance e altura de uma vez.
4. Sorteia entre os que conectam com `lowPostureAttackWeights`. Se nenhum conecta, `approach`.
5. O golpe vira input humano por `groundInputFor(slot)` (inverso do `ATTACK_SLOTS`):
   `crouchPunch` → ↓ + A, `crouchKick` → ↓ + S.

**Guarda reativa:** `watchIncomingAttack` só olha para `opponent.activeAttack`, um golpe que já
começou, e só depois de `opponent.stateFrame >= reactionFrames`; então, com `blockChance`,
entra em `guard` até o golpe acabar. A postura vem de `readGuardPosture(attack.level)`: com
`guardReadChance` usa `correctGuardFor(level)`; senão, em `low`/`overhead` (só uma postura
funciona) escolhe a oposta, e em `high`/`mid` fica em pé.

**Dificuldade:** `AIDifficulty` (`easy | normal | hard`, em `types/match.ts`) indexa
`AI_PROFILES`; `aiProfileFor(difficulty)` devolve o `AIProfile`. Existe um único
`AIController`: dificuldade é só dado (tempos de reação, chances, pesos e durações), nunca
atributos, dano, vida, leitura de input futuro ou RNG manipulado. Valores por dificuldade em
[GAME_DESIGN.md](GAME_DESIGN.md#dificuldade).

A IA não conhece nenhum personagem: um teste garante que `src/controllers/` não contém IDs.

## Pipeline de arte dos lutadores

A arte é **só apresentação**: nada em `FighterConfig.assets` é lido pela simulação. Trocar,
remover ou quebrar a arte nunca muda física, caixas, dano ou frame data.

### Carregamento (BootScene)

```
ROSTER ─ collectFighterAssets() ─▶ lista sem duplicatas ─▶ load.image / load.spritesheet
       ─ pixelArtTextureKeys()  ─▶ filtro NEAREST nas texturas pixel art
       ─ validateRosterAssets() ─▶ avisos e erros no console (apenas em dev)
```

A BootScene não conhece nenhum personagem: adicionar um lutador com arte não exige editá-la.
Um arquivo que falha ao carregar gera um aviso `[assets]` e o lutador usa o placeholder.

### Escolha da view (fallback)

```
createFighterView(config)
  └─ selectSpriteAssets(config, framesCarregados)
       assets.sprite existe? textura carregou? config sem erros? frames dentro do sheet?
         SIM ─▶ SpriteFighterView
         NÃO ─▶ PlaceholderFighterView
```

O mesmo vale para o retrato: `PortraitView` usa a imagem de `assets.portrait` quando a textura
existe e, caso contrário, desenha a figura geométrica.

### Como o sprite acompanha a simulação

Não há segunda state machine nem relógio próprio de animação. A cada render,
`spriteFrameFor(animations, fighter)` calcula o frame **apenas** a partir de `fighter.state`,
`fighter.stateFrame`, `fighter.activeAttack` e `fighter.velocity` (esta só no pulo):

| Situação                       | Frame mostrado                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------ |
| Estado sem animação            | Cadeia de fallback visual (`kick → punch → idle`, `knockout → hurt → idle`...) |
| Ataque (`activeAttack` existe) | Frames divididos entre startup / active / recovery do **frame data real**      |
| `jump`                         | Subida / ápice / descida pela velocidade vertical (`render/jumpPhase.ts`)      |
| Demais estados                 | `stateFrame × frameRate / 60`, em loop (idle, walk) ou toca uma vez e segura   |

Consequências: o frame de impacto aparece exatamente nos frames em que a hitbox está ativa; o
hitstop congela o sprite (o `stateFrame` não avança); toda essa lógica é pura e testada em Node.

Posicionamento: a origem do sprite é `(0.5, 1)`, o centro da base do frame, que corresponde aos
pés (a posição lógica). `visual.scale` escala; `visual.offsetX` (espelhado conforme o lado) e
`visual.offsetY` corrigem artes cujos pés não estão no centro da base. A virada usa `flipX` (a
arte sempre olha para a direita). O overlay F2 continua desenhando por cima as caixas da
simulação, para comparar arte e colisão.

## Arquitetura de personagens

Um personagem é **só dados**: um `FighterConfig` em `src/fighters/<id>.ts`.

```ts
export const augusto: FighterConfig = {
  id: 'augusto', name: 'augusto', displayName: 'AUGUSTO',
  description: '...', selectable: true,
  stats: { maxHealth, walkSpeed, backWalkSpeed, jumpForce, jumpHorizontalSpeed },
  boxes: STANDARD_BODY,                 // ou caixas próprias
  attacks: { punch, kick, crouchPunch, crouchKick, airPunch, airKick },  // frame data + level
  specials: [],                         // SpecialMoveConfig: ataques especiais opcionais
  palette: {...},                       // cores do placeholder (e dos cards)
  assets: { portrait, sprite: { sheet, animations, visual }, pixelArt },  // opcional
};
```

Para adicionar um personagem:

1. Copie `src/fighters/fighterA.ts` para `src/fighters/<id>.ts` e ajuste os valores.
2. Adicione-o em `ROSTER` (`src/fighters/roster.ts`).
3. (Opcional) Coloque a arte em `public/fighters/<id>/` e preencha `assets`
   (passo a passo em [ART_DIRECTION.md](ART_DIRECTION.md#como-adicionar-arte-de-um-novo-lutador)).

Nenhum outro arquivo precisa mudar: seleção, VS, HUD, combate e IA leem tudo do config.

### Pontos de extensão preparados (não implementados)

| Futuro              | Onde encaixa                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------- |
| Combos              | Contador no `CombatSystem` (já é uma classe com estado)                                                       |
| Vários cenários     | Novo `StageConfig` (com `art` opcional) em `stages/` + registrar em `stageRegistry.ts`; falta a escolha na UI |
| Som, música e falas | Ouvir `SimulationEvent` na `FightScene` (como `HitEffects` faz)                                               |
| Multiplayer online  | `NetworkController` implementando `FighterController`; simulação já é determinística e em passos fixos        |
| Torneio e ranking   | Novas cenas consumindo `MatchResult`                                                                          |

## Decisões técnicas

- **Resolução lógica 960x540** (16:9), com `Scale.FIT` e letterbox. É 1/2 de 1080p e 1/4 de 4K,
  bom para escalar sprites 2D. Nada é esticado.
- **Física própria** (não Arcade Physics): fighting games precisam de controle por frame e
  determinismo; a física aqui são poucas linhas.
- **Passo fixo de 60 Hz** com acumulador: frame data exato em monitores de 60, 120 ou 144 Hz.
- **Visual placeholder procedural** (Graphics): nenhum asset externo, troca simples depois.
- **Aviso de orientação em CSS** (`index.html`): funciona em todas as cenas sem código de jogo.
- **TypeScript 6** em vez do 7: o `typescript-eslint` ainda não suporta o 7.
- **Phaser 3.90** (última 3.x), conforme o requisito do projeto.
- **Frame do sprite derivado do `stateFrame`** (v0.2), não do relógio de animação do Phaser:
  mantém o visual sincronizado com o frame data, respeita o hitstop e é testável sem navegador.
- **Arte demo gerada por script** (`scripts/generate-demo-fighter-art.mjs`, só Node, sem
  dependências) para provar o pipeline sem nenhum asset de terceiros.
