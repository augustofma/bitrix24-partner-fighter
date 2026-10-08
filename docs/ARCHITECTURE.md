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
    audio.ts              Faixas, volumes, fades, música de cada tela e stageMusic()
    fonts.ts              GAME_FONTS (TITLE, ARCADE, HUD, PIXEL, BODY) e os arquivos de fonte (OFL)
  types/                  Tipos compartilhados (sem lógica)
    fighter.ts            FighterConfig, AttackConfig, estados, assets
    input.ts              InputAction, InputState, InputSource
    geometry.ts           Vec2, Rect, LocalBox, Direction
    stage.ts              StageConfig, StageArt (camadas ilustradas), StageMood
    match.ts              MatchSetup (com AIDifficulty e GameMode), RoundResult, MatchResult
    story.ts              StoryLocation, StoryLeg, StoryRoute, StoryCharacterProfile, StoryProgress
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
    systems/RoundSystem.ts   Um round: intro, cronômetro, KO, time over, fim do round; PERFECT
                             (vida de cada lado vigiada em todo frame do round)
    systems/MatchSystem.ts   Melhor de N: pontos por round, empate repetido, FINAL ROUND, fim
    input.ts              InputTracker (bordas "pressed"), merge de inputs
    geometry.ts, random.ts   Utilitários (RNG com seed)
  controllers/            Quem controla um lutador (sem Phaser)
    FighterController.ts  Interface comum
    PlayerController.ts   Junta várias InputSource (teclado + touch)
    AIController.ts       CPU (state machine), escolha de golpe consciente da postura
    aiProfiles.ts         AIProfile por dificuldade (EASY_AI, NORMAL_AI, HARD_AI, aiProfileFor)
  fighters/               CONTEÚDO: um arquivo por personagem
    augusto.ts, filipe.ts, joaoGuiotti.ts, romualdo.ts, fighterA.ts, fighterB.ts
    shared/standardBody.ts  Hurtboxes padrão reutilizáveis
    roster.ts             Lista de personagens e helpers
  stages/                 CONTEÚDO: cenários
    partnerSummit.ts      Bitrix24 Partner Summit (padrão): mesma arena, arte ilustrada
    recife.ts             RECIFE (Marco Zero): mesma arena, público em grupos, avião com faixa
    joinville.ts          JOINVILLE (pórtico): mesma arena, mesmo público e avião (CRMThink)
    russia.ts             RÚSSIA (Praça Vermelha): escolhido pelo encontro do João Guiotti
    partnerArena.ts       Cenário procedural (também é o fallback visual)
    stageRegistry.ts
  story/                  MODO HISTÓRIA, PURO (sem Phaser; o ESLint garante)
    locations.ts          Cidades (lat/lon, UF) e rótulo "RECIFE - PE"
    storyProfiles.ts      Perfis (origem, lugar na história) e o gerador genérico de campanhas
    storyProgress.ts      Progresso imutável: início, chegada, resultado, MatchSetup da etapa
    brazilMap.ts          Contorno do Brasil (lon/lat) e projeção equiretangular por vista
    worldOutlines.ts      Contornos estilizados dos continentes (vista mundial)
    mapViews.ts           Vistas do mapa (Brasil / mundo), escolha pela viagem, duração do voo
    flightPath.ts         Curva do voo (Bezier quadrática), ponto e direção em t
  audio/                  Música
    MusicManager.ts       PURO: faixa atual, crossfade, sting, volume, mute, espera do unlock
    SfxManager.ts         PURO: efeitos (volume, mute, deduplicação, unlock, variação)
    combatSfx.ts          PURO: SimulationEvent -> efeitos (só eventos reais)
    PhaserMusicBackend.ts, PhaserSfxBackend.ts  Pontes para o sound manager do Phaser
    gameAudio.ts          Serviços de áudio por jogo (música + efeitos); fades, unlock, tecla M
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
      titleAssets.ts      PURO: camadas da tela inicial (fundo, logo, START, brilho, vento)
      victoryAssets.ts    PURO: camadas da tela de vitória (fundo, card, painel, botão)
      fontAssets.ts       PURO: FONT_ASSETS a partir de config/fonts.ts
      stageAssets.ts      PURO: imagens declaradas em StageConfig.art (sem duplicatas)
      textureInfo.ts      Quantos frames tem uma textura carregada
    placeholder/          Boneco geométrico: poses por estado + desenho
    stage/
      StageBackdrop.ts    Interface do fundo: setMood('fight' | 'celebrate') e update(tempo)
      createStageView.ts  Arte ilustrada se as texturas carregaram; senão o procedural
      IllustratedStageView.ts Fundo + público em colunas + recortes animados (cabeça, mão)
      StageView.ts        Cenário procedural com parallax
      IllustratedStageView.ts  Cenário da arte: fundo, público (onda ou grupos), flashes, recortes
      StageFlyoverView.ts Avião que cruza o céu rebocando a faixa (tiras que ondulam)
      stageMotion.ts      Matemática pura dos loops (público, presidente, avião, faixa)
      crowdReaction.ts    Evento da simulação -> reação do público (só leitura)
      stageMotion.ts      PURO: ritmos e poses dos loops (público, cabeça, mão) por animação
    FightCamera.ts        Câmera que segue o ponto médio, presa à arena
    HitEffects.ts         Faíscas de impacto
    special/              VFX dos especiais por tema de app (configurado em assets.specialEffects)
      SpecialEffects.ts   Gerente: desenha o golpe a partir do stateFrame e os impactos por tempo;
                          imagens e Graphics criados uma vez e reaproveitados
      specialTheme.ts     Contrato de um tema (fases do golpe + impacto)
      zapTheme.ts, mindTheme.ts  Temas 24zap (mensagens) e Mindhub (IA)
      vfxShapes.ts        Formas reutilizáveis (balão de chat, ✓✓, ondas, mira, trilhas)
    DebugOverlay.ts       Hitboxes/hurtboxes (F2)
    PortraitView.ts       Card de personagem (seleção/VS/vitória); `framed: false` só a arte
  ui/                     Interface fixa na tela (Phaser)
    FightHud.ts, HealthBar.ts, Announcer.ts, TouchControls.ts,
    SpecialMeterBar.ts, DifficultySelector.ts (painel < FÁCIL | NORMAL | DIFÍCIL >),
    MenuButton.ts, ArcadeBackground.ts
    theme.ts              Cores e estilos de texto (arcadeText, hudText, pixelText, bodyText)
    timerStyle.ts         PURO: cor e pulso do cronômetro (últimos 10 s)
    hud/specialReady.ts   PURO: limiar do SPECIAL READY (especial mais barato), transições, estilo do ESP
    hud/SpecialReadyEffect.ts Glow, brilho, raios procedurais e faíscas da barra (objetos reutilizados)
    ModeMenu.ts           HISTÓRIA / LUTA RÁPIDA no lugar do JOGAR
    story/                Mapa pixel-art por vista (StoryMapView), avião (planeTexture), layout
    ArtButton.ts          Botão feito de arte (JOGAR, VOLTAR AO MENU): hover 1,03 + brilho, press 0,97
    victory/              Tela de vitória
      victoryContent.ts   PURO: título, retratos, nome e linha de resultado a partir do MatchResult
      victoryLayout.ts    PURO: posições das camadas (saída do script de preparo)
      VictoryCard.ts      Card com retrato real, brilho da moldura, halo, flutuação e brilho varrendo
      fightTitle.ts       Letreiro de jogo de luta gerado num canvas a partir de qualquer texto
                          (fonte, inclinação, degradê, contornos, pincel, sombra; ajuste de largura)
      victoryText.ts      Título (fightTitle + brilho) e linha de resultado sobre o painel
                          (estilo por papel: veredito / detalhe / placar, ver resultRole)
      VictoryEffects.ts   Confete pixelado, quadradinhos subindo e brilhos (partículas leves)
    select/               Visual da seleção de personagem (Phaser, exceto os módulos puros)
      selectLayout.ts     PURO: geometria da tela, posição de cada card, páginas e slots vazios
      fighterRatings.ts   PURO: barras PODER/VELOCIDADE/ALCANCE derivadas do FighterConfig
      SelectBackground.ts Mapa pixel-art procedural (gerado uma vez como textura) + nuvens
      arcadeFrame.ts      Moldura pixel-art (contorno, borda dupla, cantos em degrau)
      ArcadeButton.ts     Botão arcade (primário/secundário, hover, pressão, pulso)
      RosterCard.ts       Card da grade (retrato, nome, P1, brilho, CPU, "EM BREVE")
      HeroPanel.ts        Painel de destaque do lutador selecionado
    stageSelect/
      stageSelectLayout.ts  Geometria da tela de fase, janela da lista e recorte "cover"
  scenes/                 Fluxo do jogo (Phaser)
    BootScene, MenuScene, CharacterSelectScene, StageSelectScene, VersusScene, FightScene,
    VictoryScene
    story/                StoryMapScene, CampaignCompleteScene e storyFlow.ts (cola entre as
                          cenas e o StoryProgress no registry)
    transitions.ts        Fade entre cenas
  utils/device.ts         Detecção de toque, flags de URL
tests/                    Vitest: lutador, combate, arena, round, partida, IA, dificuldade da CPU,
                          ataques aéreos e agachados, níveis de ataque × guarda, cross-up,
                          especiais, determinismo, seleção, animação/assets de sprite
scripts/                  Ferramentas offline de preparação de assets
  aislan-art/             Fontes e normalização offline do Aislan
  isaque-ferreira-art/     Fontes originais e normalização offline do Isaque
  romualdo-art/            Fontes originais e normalização reproduzível da arte de Romualdo
  joao-guiotti-art/        Fontes originais e normalização reproduzível da arte de João
  prepare-augusto-art.ps1 Montagem/validação offline do atlas do Augusto (Windows/System.Drawing)
  augusto-art/            Fontes ImageGen e prompts; não publicados no build
  prepare-filipe-art.ps1  Recortes e normalização offline do atlas/portrait de Filipe
  filipe-art/             Fontes ImageGen e prompts de Filipe (fora do build)
public/                   Assets estáticos; arte de lutadores em public/fighters/<id>/
```

## Tela inicial (MenuScene)

A `BootScene` carrega `TITLE_ASSETS` (fundo, logo, START, brilho e as partes que o vento move)
junto com os assets do roster. Com todas as texturas presentes, a `MenuScene` monta a arte em
camadas, na ordem de desenho: fundo (sem logo, START, texto da dica e cabelo do João) →
`TitleAmbience` (luzes da arena pulsando por tween e faíscas num único Graphics, posições
calculadas pelo tempo) → `WindLayer` de cada parte (cabelo do João; gola, costas, barra e manga
dos dois lutadores) → logo flutuando → START (`ArtButton` com `idleGlow` e hit area 22 px
maior) → dica pulsando. As posições vêm de `src/ui/title/titleArtLayout.ts`, gerado pelo
preparo da arte. O vento é matemática pura (`src/ui/title/windMotion.ts`): cada parte é
cortada em tiras de 2 px (crops da mesma textura, criadas uma vez) e cada tira se desloca um
pouco, com a borda costurada ao corpo parada e a borda livre mexendo mais, numa onda que
percorre a peça; rajadas lentas (`windGust`) mudam a força sem nunca parar. Rosto, mãos e
logos impressos ficam fora das partes. Clique, toque, Enter e Espaço abrem o menu de modos
(HISTÓRIA / LUTA RÁPIDA) no lugar do START, como antes. Tudo é destruído no `shutdown`; sem
as texturas, a cena usa o visual procedural anterior.

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
- **Vitória da partida e reações:** no `victoryPose`, se o round também decide a partida
  (`MatchSystem.wouldWinMatch`, só leitura) o humor é `'victory'` (empolgação 1,5, além do
  `CHEER_MOTION`). Golpes fortes (dano ≥ 10), especiais, KO e PERFECT chamam
  `stageView.react(...)` (`crowdReaction(event)` mapeia os eventos): um pico de empolgação que
  decai sozinho (~0,6/s). Tudo é apresentação: nada volta para a simulação.
- **Público em grupos (`crowd.style: 'groups'`):** cada coluna recebe de um hash fixo do índice
  o seu loop (`hop`, `bob`, `sway`, `burst`), velocidade, tamanho e atraso; cerca de um terço só
  entra na empolgação a partir de um limiar. Flashes de celular (`crowd.flashes`) são um pool
  fixo desenhado num único Graphics, mais frequentes quando a torcida se empolga.
- **Avião (`art.flyover`):** `StageFlyoverView` cria uma vez o avião, a hélice, a faixa
  cortada em tiras (`setCrop`) e as cordas (Graphics) e os reaproveita a cada voo: fora da tela
  → cruza da direita para a esquerda (como o avião aponta na arte) → sai → pausa sorteada por um
  gerador visual com semente (`visualRng`, nunca `Math.random` nem a simulação) → de novo. A
  faixa ondula por tira (`bannerWave`: parada junto às cordas, mais solta na cauda) e segue o
  balanço do avião com atraso. O grupo tem parallax próprio, distante (`scrollFactor`), e
  `scale` (menor = mais longe).
- **Profundidade do céu:** ordem de desenho (mesma `DEPTH.stage`, ordem de criação): fundo →
  avião e faixa → `flyover.skyline` (topo do fundo com o céu transparente, gerado uma vez no
  preparo da arte, com o parallax do fundo) → público e grade → lutadores → HUD. Assim
  prédios, cúpulas e palmeiras ficam na frente do avião sem máscara por frame.
- **Ciclo de vida:** cada view guarda o que cria; `destroy()` é chamado no `shutdown` da
  `FightScene`. Nada é criado por frame (testes contam objetos com uma cena falsa).
- **Qual cenário:** o lugar decide, nunca o lutador. `StoryLocation.stageId` diz o cenário das
  lutas naquele lugar (`recife` → `'recife'`); na história, `legStageId(leg)` usa o `stageId`
  da etapa ou o do destino. Na luta rápida o jogador escolhe a fase (`StageSelectScene`, entre
  `getSelectableStages()`: os cenários com `art`); `quickFightStageId` (cenário da cidade do
  rival ou, se ele não tiver cidade, a do jogador; lugares sem cenário usam o padrão) só decide
  a fase destacada ao abrir.

## Tela de vitória (VictoryScene)

Com as camadas de `VICTORY_ASSETS` carregadas, a cena monta: fundo da arena, efeitos (atrás de
tudo), card do vencedor, título, linha de resultado e o botão `ArtButton`. Todo texto vem de
`victoryContent(result, sides)`, que só lê o `MatchResult` real (vencedor, motivo do último
round, placar) e é testado sem Phaser. Os botões (`ArcadeButton`) dependem do modo: luta
rápida tem VOLTAR AO MENU; na história, vitória mostra CONTINUAR e derrota mostra TENTAR
NOVAMENTE e SAIR PARA O MENU. Entrada em sequência (~1,1 s): título com pop e
bounce, card com fade e subida, resultado deslizando, botão por último. Clique, toque, Enter,
Espaço, Esc e Backspace usam o mesmo `back` (`goToScene` para o menu). Sem a arte, a cena usa
o visual procedural anterior.

## Fluxo entre cenas

```
LUTA RÁPIDA
BootScene → MenuScene → CharacterSelectScene (seu lutador → rival) → StageSelectScene
          → VersusScene → FightScene → VictoryScene
                ▲                                                              │
                └──────────────────────────────────────────────────────────────┘

HISTÓRIA
MenuScene → CharacterSelectScene{mode: story} → StoryMapScene → VersusScene → FightScene
                                                    ▲                              │
                                    vitória (etapa) │        VictoryScene ◄────────┘
                                                    └── CONTINUAR ◄─┤ derrota: TENTAR NOVAMENTE
                                                                    │ (VersusScene, mesma luta)
                                   CampaignCompleteScene ◄── última vitória
```

Os dados passam pelo `scene.start(key, data)`:

| De → Para                | Dado                                                                      |
| ------------------------ | ------------------------------------------------------------------------- |
| CharacterSelect → Versus | `MatchSetup` (`playerFighterId`, `cpuFighterId`, `stageId`, `difficulty`) |
| Versus → Fight           | `MatchSetup`                                                              |
| Fight → Victory          | `MatchResult` (`MatchSetup` + vencedor + motivo + placar)                 |
| Select → StoryMap        | nada: o `StoryProgress` fica no registry (`RegistryKeys.storyProgress`)   |
| StoryMap → Versus        | `storyMatchSetup(progress, dificuldade)` (`mode: 'story'`)                |

Toda troca de cena usa `goToScene()` (fade, protegido contra chamada dupla).

A seleção deriva os cards de `getPlayableFighters()` (o `ROSTER` filtrado por
`FighterConfig.playable`), nos dois modos, numa grade 3 × 2 por página (`selectLayout.ts`);
navegar troca a página automaticamente, os cards ocultos não recebem input e slots vazios
completam a última página. Com mais de uma página aparecem ◀ ▶ e o indicador de página no
topo (no lugar do selo do adversário), mantendo o layout utilizável com 8–16 personagens.
Toda a apresentação fica em `src/ui/select/`; a cena só orquestra seleção, teclado e
`MatchSetup`. Nada ali usa imagens novas: fundo, molduras e botões são desenhados em código,
e os retratos vêm de `createPortrait` (o mesmo caminho de VS e vitória).
Na luta rápida a cena faz duas escolhas (`step`: `player`, depois `rival`) e entrega
`StageSelectData` (os dois ids e a dificuldade) à `StageSelectScene`, que monta o `MatchSetup` com
a fase. Voltar da fase reabre a seleção em `step: 'rival'` com os dois lutadores.
`pickCpuOpponent` devolve o próximo jogável depois do jogador na ordem do roster (circular): é o
rival sugerido ao abrir o passo do rival (qualquer jogável pode ser escolhido, até o mesmo); com
um único jogável, usa o primeiro lutador diferente. Na história, um jogável é escolhível se tiver perfil de história
(`isStoryEligible`); os outros cards aparecem bloqueados ("EM BREVE"). Placeholders de teste
(`playable: false`, hoje FIGHTER_A e FIGHTER_B) ficam no roster para testes e ferramentas, mas
nunca aparecem. As cenas continuam recebendo apenas `MatchSetup`.

A seleção também escolhe a dificuldade da CPU (`DifficultySelector`: ↑/↓, botões `<` `>` ou
toque na opção) e a grava em `MatchSetup.difficulty`. A última escolha fica no registry do
Phaser (`this.registry`, chave `RegistryKeys.aiDifficulty`), que dura a sessão do jogo e é
compartilhado pelas cenas; não há variável global solta. Valor ausente ou inválido volta para
`DEFAULT_AI_DIFFICULTY` (`normal`). A `FightScene` cria o `AIController` com
`aiProfileFor(setup.difficulty)`.

## Modo História

A campanha reaproveita as cenas e o motor existentes: não há outra FightScene nem outro
sistema de combate. A única diferença de uma luta da história é `MatchSetup.mode = 'story'`.

**Dados (puros, em `src/story/`):**

- `STORY_LOCATIONS`: lugares do mapa, `{ id, kind: 'city' | 'country', name, country, region?,
regionCode?, latitude, longitude, mapLabel?, stageId? }`. Cidades brasileiras (Recife, São
  Paulo, Joinville) e países (Portugal, Espanha, Rússia). `locationLabel` dá "RECIFE - PE" para
  cidades e "PORTUGAL" para países. `mapLabel` (opcional) põe o rótulo de um lugar de um lado e
  um pouco acima/abaixo do marcador, para vizinhos próximos (Portugal e Espanha) não se
  sobreporem; sem ele, o rótulo vai para o interior do mapa.
- `STORY_PROFILES`: para cada personagem da história, `home` opcional (**origem oficial**,
  mostrada sob os retratos na seleção e no VS; sem ela, nada aparece) e `encounter` opcional
  (um dos dois é obrigatório): **o lugar do personagem no mundo da
  história** (padrão = `home`), lido por `storyLocationId(id)`. É dali que a campanha dele
  COMEÇA e é ali que as outras campanhas o ENFRENTAM. Hoje: Augusto em Recife, Filipe em
  Portugal (é de Recife), João Guiotti na Rússia (é de São Paulo), Isaque Ferreira na Espanha
  (sem origem oficial cadastrada), Romualdo em Joinville.
- **Campanhas geradas (nada escrito por personagem):** `storyRouteFor(id)` =
  `campaignOpponents(id)` (todos os outros personagens da história, na ordem de
  `STORY_PROFILES`, ou na `opponentOrder` opcional do perfil; nunca o próprio) mapeados por
  `rivalLeg(rival)` = `{ opponent, destination: storyLocationId(rival) }`. O início é
  `campaignStartLocation(id)` = `storyLocationId(id)`, que vira o `currentLocation` inicial. A
  etapa não guarda a partida: é o destino da etapa anterior (ou o início, na primeira), então o
  avião sai sempre de onde a campanha está. Exemplos: Augusto Recife → Portugal (Filipe) →
  Rússia (João) → Espanha (Isaque) → Joinville (Romualdo); João Rússia → Recife (Augusto) →
  Portugal (Filipe) → Espanha (Isaque) → Joinville (Romualdo); Romualdo Joinville → Recife →
  Portugal → Rússia → Espanha; Isaque Espanha → Recife → Portugal → Rússia → Joinville.
  Recife vira destino para todos que não começam lá.
- `StoryProgress`: `selectedFighter`, `currentStage`, `currentLocation`, `nextLocation`,
  `opponent`, `completedStages` e `phase` (`travel` | `fight` | `complete`). As funções
  (`startStory`, `arriveForFight`, `recordStoryMatch`, `storyMatchSetup`) devolvem um novo
  objeto; derrota não avança (o retry repete a mesma etapa); vitória vai para a próxima viagem
  ou conclui a campanha.

**Cenas (`src/scenes/story/`):** `storyFlow.ts` guarda o progresso no registry
(`RegistryKeys.storyProgress`, validado ao ler) e faz as transições. A `VictoryScene` só chama
`finishStoryMatch` quando o `MatchResult` é de história, então a luta rápida nunca altera a
campanha. A `StoryMapScene` pede `tripForProgress(progress, rects)`, que parte sempre de
`progress.currentLocation` e escolhe a **vista** do mapa (`src/story/mapViews.ts`): viagens
dentro do Brasil usam a vista `brazil` (o mapa detalhado de antes); qualquer viagem que toque
um lugar fora do Brasil usa a vista `world` (Américas, Europa, África e oeste da Ásia, com o
Brasil mais claro e contornado em dourado). Cada vista é um retângulo lat/lon projetado de forma
equiretangular com a mesma escala nos dois eixos, rasterizado em células de 5 px numa textura
em cache (`StoryMapView`, contornos em `brazilMap.ts` e `worldOutlines.ts`). O avião segue
`flightPath(from, to)`: 650 ms parado (na primeira viagem, antes disso o painel mostra
"PONTO DE PARTIDA" com o lutador escolhido e o lugar onde a campanha começa, por 1,7 s), voo com easing (3 s no Brasil, 4,4 s no exterior),
rotação pela tangente, balanço leve e rastro pontilhado. Durante o voo o painel mostra
"PRÓXIMO DESTINO" e o lugar; ao pousar, "PRÓXIMO DESAFIO" com o rival e CONTINUAR (Enter, toque
ou automático após 4,2 s). No mapa não existem controles de luta. O VS mostra o lugar da luta
abaixo do "VS" (as origens oficiais continuam sob os retratos).

**Como adicionar um lugar:** inclua um `StoryLocation` em `src/story/locations.ts` com
latitude/longitude reais (`kind: 'city'` com `regionCode` para cidades, `kind: 'country'` para
países). Ele aparece na vista que o enquadra; cidades do Brasil ficam nas duas. Um país fora de
`WORLD_BOUNDS` pede ampliar a vista (e os contornos em `worldOutlines.ts`).

**Como adicionar um personagem à história:** crie o lutador como qualquer outro
(`src/fighters/<id>.ts` + `ROSTER`) e adicione `{ fighterId, home: '<origem>', encounter?:
'<lugar na história>' }` em `STORY_PROFILES`. Ele passa a ser jogável na história (começando no
seu lugar) e rival nas outras campanhas, sem nenhuma mudança nas cenas. A posição no array é a
ordem padrão em que as campanhas enfrentam os rivais; `opponentOrder` muda a ordem de uma
campanha específica.

**Cenários por lugar hoje:** Recife → `recife`, Joinville → `joinville`; os outros lugares
usam o Partner Summit. **Cenário por encontro:** `StoryCharacterProfile.encounterStageId`
escolhe a arena das lutas contra aquele personagem, acima do cenário do lugar (`rivalLeg` o
copia para `StoryLeg.stageId`; `legStageId` usa a etapa, senão o lugar). Assim o lugar
(Rússia) e o cenário (Praça Vermelha, `russia`) ficam separados, e um país pode ter várias
arenas. Hoje: João Guiotti → `russia`. Um cenário novo com avião: arte em `scripts/stage-art/<id>/`, um
`prepare_<id>.py` que descreve a arte num `FlyoverStage` (`scripts/stage-art/flyover_art.py`
gera fundo, avião, hélice, faixa e `skyline.png`), um `StageConfig` em `src/stages/` e o
`stageId` no lugar.

**Como associar um encontro a um cenário:** dê `stageId` ao lugar em `locations.ts` (ex.:
`recife` tem `stageId: 'recife'`): toda luta com `destination` nesse lugar usa esse cenário.
Para uma exceção, ponha `stageId` na própria `StoryLeg`. Nenhum código de cena muda.

## Música (MusicManager)

As cenas só dizem qual faixa querem; quem decide é o `MusicManager` (um por jogo, em
`gameMusic(scene)`), que não depende do Phaser e é testado com um backend falso:

- **Uma faixa atual.** Pedir a faixa que já toca não faz nada: reentrar numa cena nunca
  duplica a música. Trocar de faixa faz crossfade (sai em 450 ms, entra em 600 ms; a luta entra
  em 700 ms). Uma terceira troca no meio do fade corta a voz mais antiga: no máximo duas vozes.
- **Sting:** `playSting` abaixa a música atual em 250 ms e toca a faixa uma vez; depois, silêncio.
  No `matchOver` a música da luta sai em 900 ms e a `VictoryScene` toca `victory-sting`.
- **Autoplay:** enquanto o navegador mantém o áudio bloqueado nada é criado; o último pedido
  espera e começa no primeiro toque / clique / tecla (evento `unlocked` do Phaser). Stings
  pedidos nesse período são descartados (nunca tocam atrasados).
- **Carregamento:** a `BootScene` carrega só `menu-theme`; a `AudioLoaderScene` (invisível)
  baixa o resto em segundo plano. Uma faixa pedida antes de chegar começa quando o arquivo
  entra no cache. Arquivo ausente = silêncio, nunca erro.
- **Aba em segundo plano:** o Phaser suspende o contexto de áudio e o loop do jogo; nada é
  recriado ao voltar. Os fades usam o relógio real (limitado a 1 s por passo).
- **Volume e mute:** `MUSIC_VOLUME` (0,55) × ganho da faixa; `M` liga/desliga o som (guardado
  em `localStorage` quando disponível).

| Cena                                 | Pedido                                                   |
| ------------------------------------ | -------------------------------------------------------- |
| MenuScene                            | `play(SCENE_MUSIC.menu)`                                 |
| CharacterSelectScene                 | `play(SCENE_MUSIC.characterSelect)`                      |
| StageSelectScene                     | `play(SCENE_MUSIC.characterSelect)` (mesma faixa, segue) |
| StoryMapScene                        | `play(SCENE_MUSIC.storyMap)` (continua durante o voo)    |
| VersusScene                          | nada: segue a música da tela anterior                    |
| FightScene                           | `play(stageMusic(stage), 700)`; no `matchOver`, `stop()` |
| VictoryScene / CampaignCompleteScene | `playSting(SCENE_MUSIC.victory)`                         |

**Música de um cenário novo:** gere a faixa (adicione-a em `compose.py` e em `MusicTrackId`),
registre em `MUSIC_TRACKS` e ponha `music: '<id>'` no `StageConfig`. Sem `music`, o cenário usa
`DEFAULT_STAGE_MUSIC`.

## Efeitos sonoros (SfxManager)

Mesmo desenho da música: `gameAudio(scene)` cria **uma vez por jogo** o `MusicManager` e o
`SfxManager`, ambos sobre o sound manager do Phaser (um único AudioContext; nenhum efeito cria o
seu). Cenas chamam `gameSfx(scene).play(id)` ou `playSfx(scene, id)`; nenhuma registra
listeners, então reentrar numa cena não duplica nada. Cada `play` do Phaser cria uma instância
curta que se destrói ao terminar.

**PERFECT:** decidido na simulação, não no HUD. O `RoundSystem` recebe a vida máxima de cada lado
(da `FightSimulation`) e, a cada frame do round, marca quem perdeu vida (marcação permanente
até o fim do round). Ao terminar o round, `RoundResult.perfect = vencedor existe && vencedor nunca
perdeu vida`. O `MatchSystem` soma `perfects` por lado no `MatchOutcome`. A `FightScene` só lê
`event.result.perfect` nos eventos `ko` / `timeUp` e mostra o `PerfectCall` (`src/ui/PerfectCall.ts`)
1,3 s depois, com o efeito `perfect`; um novo round cancela uma chamada pendente.

**Combate (`combatSfx`):** a `FightScene` passa todo `SimulationEvent` por `combatSfx(event)`.
Só eventos reais geram som: `hit`/`koHit` → impacto do golpe que conectou (`punch`, `kick`,
`crouch-punch`, `crouch-kick`, `air-punch`, `air-kick`; especial usa `kick`) + `hurt`; `block`
→ `block`; `ko` → `ko` (uma vez por round); `fightStart` → `fight`; `victoryPose` → `victory`.
Um golpe no ar não gera evento de contato, então whiff nunca soa como impacto. Para pulo,
aterrissagem e especial, o `Fighter` registra **ações** no próprio frame (`jump` ao sair do chão,
`land` no contato real com o chão, `specialStart` quando o especial começa com a energia paga) e
a `FightSimulation` as devolve como `FighterActionEvent` (`{ type, fighterIndex }`). São só
informação: não mudam gameplay nem determinismo. `round-start` toca junto do anúncio
"ROUND n" e `special-ready` vem do `SpecialMeterBar`, só na transição NOT READY → READY.

**Menus:** os sons ficam nas ações que mudam estado (mover seleção, mudar dificuldade, abrir e
confirmar modo, SELECIONAR, VOLTAR, pular o VS, botões da vitória e da campanha), não nas teclas;
teclado e toque chegam na mesma ação. Mover sem mudar (ex.: dificuldade já no limite) não toca.

**Regras do `SfxManager`:** o mesmo efeito dentro de 50 ms toca uma vez (tecla + toque no mesmo
frame, ou dois sistemas no mesmo instante); com o áudio bloqueado nada toca, e só o último pedido
dos 250 ms antes do desbloqueio (o toque que desbloqueia, ex.: JOGAR) é tocado; mute para efeitos
novos; volume escala todos. A variação de pitch/volume usa `Math.random` só na apresentação: a
simulação tem RNG próprio com semente e nunca vê o áudio.

**Novo efeito:** adicione a síntese em `scripts/sfx/generate_sfx.py`, o id em `SfxId` e o nível
em `SFX` (`config/audio.ts`); a `BootScene` já carrega todos.

## Tipografia

`src/config/fonts.ts` define `GAME_FONTS` com cinco papéis: **TITLE** (Bangers: letreiro de
luta da vitória, anúncios ROUND / FIGHT! / K.O. / TIME OVER e títulos de rota),
**ARCADE** (Russo One: botões, nomes, rótulos), **HUD** (Press Start 2P: cronômetro),
**PIXEL** (Pixelify Sans: cidades do mapa, ETAPA, origem no VS) e **BODY** (fonte do sistema,
para textos corridos). Os arquivos ficam em `public/fonts/<nome>/` com o `OFL.txt` e são
carregados pela `BootScene` (`FONT_ASSETS`). As cenas usam só os helpers do `theme.ts`; nenhuma
cena escreve nome de fonte. Glifos ausentes (ex.: →) caem no fallback da pilha.

O cronômetro (`timerStyle.ts`) é dourado até 11 s; de 10 a 7 fica amarelo, de 6 a 4 laranja e
de 3 a 0 vermelho, com um pulso discreto (escala 1,08; 1,14 no final) a cada segundo. É só
visual: o tempo do round continua vindo do `RoundSystem`.

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

SpecialMeterBar desenha as barras do HUD e prontidão pelo custo configurado. Os VFX dos
especiais ficam em `src/render/special/`: `assets.specialEffects[activeAttack.id]` diz o tema
(`zapMessages` ou `mindNetwork`), o rótulo, o emblema / símbolo (imagens pixel-art em
`public/vfx/`, carregadas pelo mesmo `collectFighterAssets` dos sprites) e o som do início. O
golpe é desenhado só a partir de `stateFrame` e da fase (`startup` / `active` / `recovery`),
então congela no hitstop e some no instante em que o golpe acaba ou é interrompido; o impacto
(chamado pela `FightScene` nos eventos `hit` / `koHit` / `block` de especiais) é curto e por
tempo, então toca durante o hitstop. Tudo é criado no construtor (2 Graphics, rótulos e alguns
`Image` reaproveitados) e destruído com a cena: nada é criado por frame. Um tema novo é um
objeto `SpecialTheme` registrado na tabela `THEMES`. Desempenho: os temas desenham só
retângulos, triângulos e traços (`vfxShapes.ts`: `pixelBox`, `disc`, `chatBubble`), nunca
`fillRoundedRect` / `fillCircle` / `fillPath`, que passam pela triangulação (earcut) do Phaser; um
balão com tamanho negativo no pop-in (o `easeOutBack` passava de 0 para baixo) custava centenas
de ms e travava o primeiro especial. Formas abaixo de 3 px não são desenhadas e `easeOutBack`
nunca é negativo. Emblemas são carregados no boot com o roster; durante o especial nada é
carregado nem criado (`tests/specialStutter.test.ts`). assets.sprite.animations.special reaproveita o pipeline de fases;
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

### Encontros consecutivos no mesmo lugar

`Trip.requiresFlight` compara os IDs dos lugares de partida e destino. A `StoryMapScene`
apresenta diretamente o desafio quando forem iguais, sem criar avião ou tween de voo.
O progresso continua usando as mesmas funções de chegada, luta e retry. Aislan usa
`encounter: joinville` e `encounterStageId: joinville-zopu` (o pórtico com a arte da ZOPU), após
Romualdo na ordem de perfis.
Não há alias de personagem: o stage do encounter pode mudar independentemente do lugar.

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

**Especiais:** `src/core/fighter/specialMoves.ts` é a única regra de "qual especial um aperto
inicia" (`specialForPress`: energia e `groundOnly`, na ordem do config), usada pelo `Fighter` e
pela CPU. No `decide()`, antes dos golpes normais, `trySpecial` só segue se o lutador está livre
no chão, o cooldown e a hesitação acabaram e `specialWouldConnect` (hitbox do especial, com o
avanço do startup, contra a hurtbox atual) confirma o alcance; então rola
`AIProfile.special` (chance base + bônus de finalizar e de punir whiff, este só após
`reactionFrames`). O aperto é o mesmo botão do jogador e o `Fighter` revalida tudo. O RNG só é
usado quando há especial disponível, então CPUs sem especial mantêm a sequência exata de antes.
Vários especiais: `usableSpecials` lista os utilizáveis e a CPU avalia o que o aperto iniciaria.

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
  description: '...', playable: true,   // false: placeholder fora da seleção (testes/demo)
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
2. Adicione-o em `ROSTER` (`src/fighters/roster.ts`) com `playable: true` (aparece na seleção e
   como CPU; sem arte usa retrato e boneco procedurais). Para a história, um perfil em
   `STORY_PROFILES` (`src/story/storyProfiles.ts`).
3. (Opcional) Coloque a arte em `public/fighters/<id>/` e preencha `assets`
   (passo a passo em [ART_DIRECTION.md](ART_DIRECTION.md#como-adicionar-arte-de-um-novo-lutador)).

Nenhum outro arquivo precisa mudar: seleção, VS, HUD, combate e IA leem tudo do config.

### Pontos de extensão preparados (não implementados)

| Futuro              | Onde encaixa                                                                                                |
| ------------------- | ----------------------------------------------------------------------------------------------------------- |
| Combos              | Contador no `CombatSystem` (já é uma classe com estado)                                                     |
| Vários cenários     | Novo `StageConfig` (com `art` opcional) em `stages/` + registrar em `stageRegistry.ts` + `stageId` no lugar |
| Som, música e falas | Ouvir `SimulationEvent` na `FightScene` (como `HitEffects` faz)                                             |
| Multiplayer online  | `NetworkController` implementando `FighterController`; simulação já é determinística e em passos fixos      |
| Torneio e ranking   | Novas cenas consumindo `MatchResult`                                                                        |

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
