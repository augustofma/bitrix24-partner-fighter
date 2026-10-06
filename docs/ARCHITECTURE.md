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
    fighter/ReadonlyFighter.ts  Visão somente leitura (para IA e render)
    systems/CombatSystem.ts  Hitbox x hurtbox, dano, bloqueio, KO
    systems/ArenaSystem.ts   Paredes, colisão de corpos, distância máxima
    systems/RoundSystem.ts   Intro, cronômetro, KO, time over, fim do round
    input.ts              InputTracker (bordas "pressed"), merge de inputs
    geometry.ts, random.ts   Utilitários (RNG com seed)
  controllers/            Quem controla um lutador (sem Phaser)
    FighterController.ts  Interface comum
    PlayerController.ts   Junta várias InputSource (teclado + touch)
    AIController.ts       CPU (state machine)
    aiProfiles.ts         Perfis de dificuldade da CPU
  fighters/               CONTEÚDO: um arquivo por personagem
    fighterA.ts, fighterB.ts
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
    DebugOverlay.ts       Hitboxes/hurtboxes (F2)
    PortraitView.ts       Card de personagem (seleção/VS/vitória)
  ui/                     Interface fixa na tela (Phaser)
    FightHud.ts, HealthBar.ts, Announcer.ts, TouchControls.ts,
    MenuButton.ts, ArcadeBackground.ts, theme.ts
  scenes/                 Fluxo do jogo (Phaser)
    BootScene, MenuScene, CharacterSelectScene, VersusScene, FightScene, VictoryScene
    transitions.ts        Fade entre cenas
  utils/device.ts         Detecção de toque, flags de URL
tests/                    Vitest: lutador, combate, arena, round, IA, animação/assets de sprite
scripts/                  Ferramentas Node (ex.: gerador da arte demo do FIGHTER_A)
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

- `InputAction` = `left | right | up | down | punch | kick | block`. As direções são **absolutas**
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
| Pushbox | `boxes.pushWidth`                              | Impede que os corpos se sobreponham             |

O visual **não** participa da colisão: trocar o boneco por sprites não muda o gameplay.

Regras do `CombatSystem`:

- Cada ataque acerta no máximo uma vez (`markAttackConnected`).
- Todos os contatos do frame são coletados antes de serem aplicados, então golpes simultâneos
  trocam dano (trade).
- Defensor em `block`: recebe `chipDamage` (que nunca nocauteia), `blockstun` e `blockPushback`.
- Caso contrário: `damage`, `hitstun`, `knockback`; com vida 0 → `knockout`.
- Cada contato gera `hitstopFrames` de congelamento (24 no KO).

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
`fighter.stateFrame` e `fighter.activeAttack`:

| Situação                       | Frame mostrado                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------ |
| Estado sem animação            | Cadeia de fallback visual (`kick → punch → idle`, `knockout → hurt → idle`...) |
| Ataque (`activeAttack` existe) | Frames divididos entre startup / active / recovery do **frame data real**      |
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
  attacks: { punch: {...}, kick: {...} },  // frame data completo
  specials: [],                         // reservado (SpecialMoveConfig)
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

| Futuro              | Onde encaixa                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Golpes especiais    | `SpecialMoveConfig` em `types/fighter.ts`; detector de sequência no `InputTracker`; novo estado de ataque reutilizando `AttackConfig` |
| Barra de especial   | Campo novo no `Fighter` + evento no `CombatSystem` + barra no HUD                                                                     |
| Combos              | Contador no `CombatSystem` (já é uma classe com estado)                                                                               |
| Vários cenários     | Novo `StageConfig` em `stages/` + registrar em `stageRegistry.ts`                                                                     |
| Som, música e falas | Ouvir `SimulationEvent` na `FightScene` (como `HitEffects` faz)                                                                       |
| Melhor de 3 rounds  | Um `MatchSystem` acima do `RoundSystem` (`ROUND_NUMBER` está em config)                                                               |
| Multiplayer online  | `NetworkController` implementando `FighterController`; simulação já é determinística e em passos fixos                                |
| Torneio e ranking   | Novas cenas consumindo `MatchResult`                                                                                                  |

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
