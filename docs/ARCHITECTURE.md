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
    match.ts              Tempo de round (99 s), durações de intro/outro
    controls.ts           Bindings de teclado (remapeáveis)
    sceneKeys.ts          Nomes das cenas
    strings.ts            Todos os textos de UI (pronto para i18n)
  types/                  Tipos compartilhados (sem lógica)
    fighter.ts            FighterConfig, AttackConfig, estados, assets
    input.ts              InputAction, InputState, InputSource
    geometry.ts           Vec2, Rect, LocalBox, Direction
    stage.ts              StageConfig
    match.ts              MatchSetup, RoundResult, MatchResult
  core/                   SIMULAÇÃO PURA
    FightSimulation.ts    Orquestra um frame da luta
    fighter/Fighter.ts    Entidade lutador: state machine + física + caixas
    fighter/attackFrames.ts  Fases de ataque (startup/active/recovery)
    fighter/AttackInputBuffer.ts  Borda e expiração do buffer de normais/especiais
    fighter/fighterPhysics.ts Integração de gravidade, landing e atrito
    fighter/fighterStates.ts Regras puras: grupos de estados, botão → slot (e o inverso),
                             postura baixa, hurtbox/pushbox
    fighter/attackGeometry.ts "Este golpe acertaria agora?" (alcance + altura), usado pela IA
    fighter/ReadonlyFighter.ts  Visão somente leitura (para IA e render)
    systems/CombatSystem.ts  Hitbox x hurtbox, dano, bloqueio, KO
    systems/ArenaSystem.ts   Paredes, colisão de corpos, distância máxima
    systems/RoundSystem.ts   Intro, cronômetro, KO, time over, fim do round
    input.ts              InputTracker (bordas "pressed"), merge de inputs
    geometry.ts, random.ts   Utilitários (RNG com seed)
  controllers/            Quem controla um lutador (sem Phaser)
    FighterController.ts  Interface comum
    PlayerController.ts   Junta várias InputSource (teclado + touch)
    AIController.ts       CPU (state machine), escolha de golpe consciente da postura
    aiProfiles.ts         Perfis de dificuldade/personalidade da CPU
  fighters/               CONTEÚDO: um arquivo por personagem
    augusto.ts, filipe.ts, fighterA.ts, fighterB.ts
    shared/standardBody.ts  Hurtboxes padrão reutilizáveis
    roster.ts             Lista de personagens e helpers
  stages/                 CONTEÚDO: cenários
    partnerArena.ts, stageRegistry.ts
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
      textureInfo.ts      Quantos frames tem uma textura carregada
    placeholder/          Boneco geométrico: poses por estado + desenho
    StageView.ts          Cenário procedural com parallax
    FightCamera.ts        Câmera que segue o ponto médio, presa à arena
    HitEffects.ts         Faíscas de impacto
    SpecialEffects.ts     VFX procedural por configuração, sincronizado a stateFrame
    DebugOverlay.ts       Hitboxes/hurtboxes (F2)
    PortraitView.ts       Card de personagem (seleção/VS/vitória)
  ui/                     Interface fixa na tela (Phaser)
    FightHud.ts, HealthBar.ts, Announcer.ts, TouchControls.ts,
    SpecialMeterBar.ts,
    MenuButton.ts, ArcadeBackground.ts, theme.ts
  scenes/                 Fluxo do jogo (Phaser)
    BootScene, MenuScene, CharacterSelectScene, VersusScene, FightScene, VictoryScene
    transitions.ts        Fade entre cenas
  utils/device.ts         Detecção de toque, flags de URL
tests/                    Vitest: lutador, combate, arena, round, IA, ataques aéreos e agachados,
                          defesa agachada, cross-up, determinismo, animação/assets de sprite
scripts/                  Ferramentas Node (ex.: gerador da arte demo do FIGHTER_A)
  prepare-augusto-art.ps1 Montagem/validação offline do atlas do Augusto (Windows/System.Drawing)
  augusto-art/            Fontes ImageGen e prompts; não publicados no build
  prepare-filipe-art.ps1  Recortes e normalização offline do atlas/portrait de Filipe
  filipe-art/             Fontes ImageGen e prompts de Filipe (fora do build)
public/                   Assets estáticos; arte de lutadores em public/fighters/<id>/
```

## Fluxo entre cenas

```
BootScene → MenuScene → CharacterSelectScene → VersusScene → FightScene → VictoryScene
                ▲                                                              │
                └──────────────────────────────────────────────────────────────┘
```

Os dados passam pelo `scene.start(key, data)`:

| De → Para                | Dado                                                        |
| ------------------------ | ----------------------------------------------------------- |
| CharacterSelect → Versus | `MatchSetup` (`playerFighterId`, `cpuFighterId`, `stageId`) |
| Versus → Fight           | `MatchSetup`                                                |
| Fight → Victory          | `MatchResult` (`MatchSetup` + vencedor + motivo)            |

Toda troca de cena usa `goToScene()` (fade, protegido contra chamada dupla).

A seleção deriva os cards do `ROSTER`, com até quatro por página; navegar troca a página
automaticamente e os cards ocultos não recebem input. Há botões laterais para touch quando
há mais de uma página, mantendo o layout utilizável com 8–16 personagens.
`pickCpuOpponent` prioriza um personagem não selecionável diferente do jogador e, na ausência
dele, usa o primeiro diferente. As cenas continuam recebendo apenas `MatchSetup`.

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
- `InputSource.read()` devolve as ações seguradas. Toques e teclas muito curtos (menos de um
  frame) ficam retidos (latch), então nunca se perdem.
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
- Bloqueio decidido num único ponto, `isAttackBlocked(defender, attack)`: hoje qualquer guarda
  (`block` ou `crouchBlock`) bloqueia tudo. Golpes altos/baixos/overhead entrarão ali.
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
- **Níveis de ataque:** cada `AttackConfig` tem `level: AttackLevel`
  (`high | mid | low | overhead`). Por enquanto é só semântico: `isAttackBlocked` ainda aceita
  qualquer guarda. A próxima evolução compara `attack.level` com a guarda (`block` em pé ×
  `crouchBlock`) nesse único ponto.

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

| Futuro                  | Onde encaixa                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------ |
| Alto / baixo / overhead | `AttackConfig.level` já existe; falta comparar com a guarda em `isAttackBlocked` (`CombatSystem`)      |
| Combos                  | Contador no `CombatSystem` (já é uma classe com estado)                                                |
| Vários cenários         | Novo `StageConfig` em `stages/` + registrar em `stageRegistry.ts`                                      |
| Som, música e falas     | Ouvir `SimulationEvent` na `FightScene` (como `HitEffects` faz)                                        |
| Melhor de 3 rounds      | Um `MatchSystem` acima do `RoundSystem` (`ROUND_NUMBER` está em config)                                |
| Multiplayer online      | `NetworkController` implementando `FighterController`; simulação já é determinística e em passos fixos |
| Torneio e ranking       | Novas cenas consumindo `MatchResult`                                                                   |

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
