# TASKS

Backlog do projeto. Ao concluir uma tarefa, mova-a para DONE. **Não implemente itens de FUTURE
sem pedido explícito.**

## DONE (v0.1: vertical slice)

- [x] Projeto Vite + TypeScript (strict) + Phaser 3.90; ESLint, Prettier, Vitest
- [x] Documentação: README, AGENTS, ARCHITECTURE, GAME_DESIGN, ART_DIRECTION, TASKS
- [x] Simulação pura e determinística em passo fixo de 60 Hz (`FightSimulation`)
- [x] `Fighter` genérico com estados idle, walk, jump, crouch, punch, kick, block, hurt, knockout e victory
- [x] Hitbox, hurtbox e pushbox separadas do visual; frame data por ataque
- [x] `CombatSystem`: dano, bloqueio com chip, hitstun, knockback, hitstop, trade, KO
- [x] `ArenaSystem`: paredes, colisão de corpos, distância máxima entre lutadores
- [x] `RoundSystem`: intro, cronômetro de 99 s, KO, time over (vence quem tem mais vida), empate
- [x] Personagens orientados a dados (`FighterConfig`) + roster; FIGHTER_A e FIGHTER_B
- [x] Input abstrato com teclado remapeável e controles touch multi-touch
- [x] CPU com state machine (aproxima, recua, ataca, defende, pula)
- [x] HUD: nomes, barras de vida com rastro de dano, cronômetro, ROUND 1, anúncios
- [x] Cenas: Menu, Seleção, VS, Luta, Vitória, com volta ao menu
- [x] Cenário provisório "Partner Arena" com parallax e câmera que segue a luta
- [x] Visual placeholder (bonecos geométricos com poses por estado, flash de hit, sombra)
- [x] Escala responsiva 16:9 (FIT) + aviso "Gire o dispositivo" em portrait
- [x] Overlay de debug de caixas (F2 / `?debug=1`)
- [x] Testes unitários de lutador, combate, arena, round e IA
- [x] Smoke test manual no navegador: desktop 1280x720 e celular 844x390 com touch

## DONE (v0.2: pipeline de sprites, branch `feature/sprite-pipeline`)

- [x] `FighterConfig.assets` tipado: `portrait`, `sprite` (`sheet`, `animations`, `visual`), `pixelArt`
- [x] `SpriteFighterView`: frame derivado de `state`/`stateFrame`, golpes sincronizados ao frame
      data, `flipX`, âncora nos pés, `scale`/`offsetX`/`offsetY`, flash de hit, sombra
- [x] Fallback automático e seguro para `PlaceholderFighterView` (sem arte, falha de carga ou config inválida)
- [x] Cadeia de fallback visual para animações ausentes (`kick → punch → idle` etc.)
- [x] `BootScene` carrega os assets declarados pelo roster, sem duplicatas e sem código por personagem
- [x] Validação de config de arte em dev (mensagens `[assets]` no console)
- [x] `PortraitView` usa `assets.portrait` quando existe
- [x] Spritesheet e retrato **demo** do FIGHTER_A, gerados por `scripts/generate-demo-fighter-art.mjs`
- [x] Testes: mapeamento estado → frame, sincronização com frame data, validação, fallback e coleta de assets
- [x] Validação visual: todos os estados, troca de lado, F2, touch, fluxo completo e falha de carga

## DONE (v0.3: combate aéreo, defesa agachada e cross-up, branch `feature/air-crouch-combat`)

- [x] Estados `airPunch` e `airKick` com frame data próprio em `FighterConfig.attacks` (A e B)
- [x] Mapeamento genérico botão + postura → slot de ataque (`ATTACK_SLOTS`)
- [x] Ataque aéreo na subida e na descida, com gravidade e momento horizontal; 1 por pulo
- [x] Landing encerra o ataque aéreo e remove a hitbox no mesmo frame
- [x] Estado `crouchBlock` (↓ + D): hurtbox agachada, não anda, blockstun e chip normais
- [x] Bloqueio centralizado em `isAttackBlocked` (pronto para alto/baixo/overhead)
- [x] Cross-up pela física: `boxes.pushHeight` + pushbox aérea; no chão nunca atravessa
- [x] Facing travado no ar e durante golpes; corrigido após o landing
- [x] Knockback "para longe do atacante" (correto no cross-up)
- [x] CPU: chance de chute aéreo no jump-in (`jumpInAttackChance`)
- [x] Sprite demo (frames 26-30) e placeholder com poses de `airPunch`, `airKick`, `crouchBlock`
- [x] Visual do pulo por velocidade vertical (subida / ápice / descida) no sprite (frame 31) e no
      placeholder, correto também quando o pulo é retomado após um ataque aéreo
- [x] Testes: ataques aéreos, landing, crouchBlock e transições, cross-up, facing, determinismo
- [x] Validação no navegador: teclado real, multi-touch emulado, F2 e fluxo completo

## DONE (v0.4: golpes agachados)

- [x] Estados `crouchPunch` e `crouchKick` com frame data próprio (FIGHTER_A e FIGHTER_B)
- [x] Postura `crouch` em `ATTACK_SLOTS` (↓ segurado no momento do golpe), sem condicionais por golpe
- [x] Golpes agachados ficam baixos o tempo todo (hurtbox/pushbox agachadas) e voltam direto a
      `crouch` com ↓ segurado, ou a `idle` com ↓ solto
- [x] `AttackLevel` (`high | mid | low | overhead`) registrado em todos os golpes (ainda não aplicado)
- [x] CPU: chance de rasteira (`lowKickChance`)
- [x] Sprite demo (grade 8x5, frames 32-37) e placeholder com poses dos dois golpes
- [x] Testes: input, hurtbox, acerto único, transições, buffer a partir do crouchBlock, facing,
      determinismo, sprite e placeholder
- [x] Validação no navegador: teclado real, multi-touch, F2 congelado e fluxo completo

## DONE (v0.5: CPU consciente da postura baixa)

- [x] `isLowPosture` genérico (crouch, crouchBlock, crouchPunch, crouchKick)
- [x] `attackWouldConnect`: a IA só escolhe golpes cuja hitbox alcança a hurtbox atual (alcance + altura)
- [x] Contra adversário agachado: soco agachado / rasteira / chute mid com pesos; aproxima se nada alcança
- [x] `AIProfile.lowPostureAwareness` e `lowPostureAttackWeights` (NORMAL_AI imperfeita de propósito)
- [x] Comportamento contra adversário em pé inalterado (mesma sequência de RNG)
- [x] Testes: escolha por postura e alcance, inputs ↓ + A/S, pressão no crouchBlock, alternância,
      jump-in, determinismo, IA sem IDs de personagem
- [x] Playtest no navegador com a CPU real: segurar ↓ não neutraliza mais a CPU

## DONE (v0.6: AUGUSTO, branch `feature/augusto-fighter`)

- [x] AUGUSTO — Arrecife Digital, selecionável, configuração própria, seis ataques e 100 de vida
- [x] Mobilidade e pressão moderadas, compensadas por dano menor nos socos e recovery dos chutes
- [x] FIGHTER_A e FIGHTER_B preservados; regra genérica prioriza adversário reservado à CPU
- [x] Seleção paginada por quatro cards, navegação por teclado e touch para expansão do roster
- [x] Placeholder preto/azul e portrait fallback; pasta de arte com apenas README, sem PNGs
- [x] Testes de roster, frame data, inputs, guardas, cross-up, KO, tempo, IA e determinismo
- [x] Seleção testada com MatchSetup real e fixtures de 8/16 entradas; 137 testes no total
- [x] Playtest Chrome desktop 1280×720 e mobile landscape 844×390, teclado/multi-touch, F2,
      vitória com adversário controlado e derrota para CPU real; fluxo completo até o menu
- [x] Paginação com 16 entradas temporárias conferida também no navegador por teclado/toque;
      fixtures removidas ao recarregar, nenhum erro de execução observado
- [x] Direção visual futura e integração de portrait/sprite documentadas

## DONE (v0.7: arte jogável do AUGUSTO, branch `feature/augusto-art`)

- [x] Sprite e portrait pixel-art originais via ImageGen, baseados nas referências aprovadas
- [x] Atlas RGBA 1536×1120, 40 células 192×224; portrait RGBA 240×300
- [x] Preparação offline reproduzível com System.Drawing, fontes e prompts versionados
- [x] Recortes isolados, margens transparentes, baseline e fases dos golpes/KO revisados
- [x] Manifesto dos 15 estados, attackPhases 1/1/1 e jumpPhases 1/1/1
- [x] Scale 1, offsets 0/8, filtro pixel-art; nenhuma alteração de gameplay ou renderer
- [x] Playtest visual Chrome: seleção, VS, HUD, estados com F2, ataques, guardas, flipX,
      cross-up com dano e troca de lado, vitória e derrota por KO
- [x] Testes do carregamento atualizados para incluir os assets do Augusto

## DONE (FILIPE, branch feature/filipe-fighter)

- [x] Filipe Gomes selecionável, perfil técnico de médio alcance, seis ataques e specials vazio
- [x] Portrait e spritesheet pixel-art originais baseados nas fotos e no pôster aprovados
- [x] 40 células 192×224, atlas 1536×1120, portrait 240×300 e alpha real
- [x] Normalização reproduzível, fases 1/1/1, baseline, raízes e margens validadas por código
- [x] Integração via FighterConfig e roster, sem alterações no core ou renderer
- [x] Testes de config, assets, combate, guardas, cross-up, vitória/derrota, CPU e determinismo
- [x] Playtest Chrome com teclado e F2: seleção/VS/HUD, estados, flipX e cross-up com dano
- [x] Vitória completa contra adversário controlado e derrota para CPU real; ambas as guardas
- [x] 170 testes e npm run check aprovados; alpha e margens dos PNGs verificados em Node

## DONE (v0.8: especiais e 24ZAP COMBO)

- [x] F/ESP com borda e buffer compartilhado; multi-touch preservado
- [x] Meter 0..100, ganhos por contato normal e custo na ativação
- [x] SpecialMoveConfig genérico; nenhum ID de personagem no core
- [x] 24ZAP COMBO: custo 30, dano 18, 9/5/28, avanço e um contato forte
- [x] Barras com prontidão e VFX digital azul/verde original; PNGs preservados
- [x] Testes de input, meter, buffer, dano, defesa, KO, IA e determinismo
- [x] 162 testes; playtest com F2, meter por acertos, F sem energia, defesa, whiff, KO e ESP
- [x] Multi-touch emulado e três partidas automatizadas consecutivas contra CPU no navegador

## DONE (v0.9: MINDHUB AGENT do Filipe, branch `feature/fighting-polish`)

- [x] Sistema de especial/meter da `feature/special-meter-24zap` reaproveitado (sem sistema paralelo)
- [x] MINDHUB AGENT: custo 35, só no chão, mid, 18 de dano, 15/6/24, alcance 170, hitstop 12
- [x] Receber dano rende +5 também quando o dano vem de um especial; o executor nunca ganha
- [x] Estilos de VFX por configuração (`digital`, `agentNetwork`); rede de agentes procedural
- [x] Animação `special` do Filipe mapeada para frames existentes (nenhum PNG alterado)
- [x] Testes: custo, F segurado, alcance x normais, whiff, guardas, KO, hitstop, estados proibidos

## DONE (v0.10: melhor de 3, branch `feature/fighting-polish`)

- [x] `MatchSystem`: 2 vitórias vencem; DRAW não pontua e repete o round; limite de 9 rounds
- [x] ROUND n / FINAL ROUND; marcadores de rounds vencidos no HUD; placar na tela de vitória
- [x] Reset entre rounds (vida, spawn, velocidade, estado, stuns, hitstop, timer, inputs,
      buffers, VFX, decisões da CPU) com o meter preservado; nova partida zera o meter
- [x] Testes: 2x0, 2x1, Final Round, tempo, draw, limite, reset, meter e determinismo

## DONE (v0.11: níveis de ataque aplicados, branch `feature/fighting-polish`)

- [x] `GUARD_COVERAGE` em `fighterStates.ts`, aplicado em `isAttackBlocked`: high/mid = as duas
      guardas, low (rasteira) = só `crouchBlock`, overhead (golpes aéreos) = só `block` em pé
- [x] Especiais seguem o próprio `level` (MINDHUB AGENT é mid)
- [x] CPU reage só a golpes já iniciados (após `reactionFrames`) e escolhe a postura pelo nível;
      `AIProfile.guardReadChance` controla a leitura (erro = postura oposta em low/overhead)
- [x] Testes: matriz nível × guarda com geometria real (incluindo a janela curta do soco aéreo
      contra corpo agachado), especiais, guarda da CPU e ausência de leitura do futuro

## DONE (v0.12: dificuldade da CPU, branch `feature/fighting-polish`)

- [x] `AIDifficulty` (`easy | normal | hard`) e `AI_PROFILES` / `aiProfileFor` em `aiProfiles.ts`;
      um único `AIController`, `NORMAL_AI` mantido como NORMAL
- [x] FÁCIL (`EASY_AI`) mais permissiva, DIFÍCIL (`HARD_AI`) com decisões melhores, sem trapaça
      (sem input futuro, sem reagir antes do golpe + `reactionFrames`, sem RNG ou atributos extras)
- [x] `MatchSetup.difficulty`; a `FightScene` cria a CPU com o profile escolhido
- [x] Seleção: "DIFICULDADE < FÁCIL | NORMAL | DIFÍCIL >" com ↑/↓, botões `<` `>` e toque na
      opção; padrão NORMAL; última escolha guardada no registry do Phaser durante a sessão
- [x] Testes (`tests/aiDifficulty.test.ts` e seleção): profiles, ordem dos parâmetros, guarda
      por nível, reação nunca antecipada, determinismo e CPU x CPU com dano por dificuldade
- [x] Simulação CPU x CPU (20 partidas por par): DIFÍCIL > NORMAL > FÁCIL em todas

## DONE (v0.13: redesign da seleção, branch `feature/character-select-redesign`)

- [x] Fundo pixel-art procedural (litoral tropical, vila colorida, coqueiros, nuvens em parallax)
- [x] Topo com VOLTAR, título "ESCOLHA SEU PARCEIRO" em moldura dupla com brilho e selo do adversário
- [x] Grade 3 × 2 paginada, cards com retrato, nome, P1, brilho pulsante, CPU e "EM BREVE"
- [x] Painel de destaque com retrato ampliado, descrição e barras derivadas do config (só visual)
- [x] Botão SELECIONAR arcade com pulso/hover; dificuldade num painel próprio (teclado e toque)
- [x] Sem mudanças em simulação, combate, roster, FighterConfig ou regras de seleção
- [x] Testes de layout, barras e da cena (seleção, toque, confirmar, voltar, paginação, dificuldade)
- [x] Validado no Chromium headless: desktop 1280×720 e mobile landscape 844×390 com toque

## DONE (v0.14: tela inicial ilustrada, branch `feature/title-screen-redesign`)

- [x] Arte aprovada separada em camadas: fundo limpo, logo e botão JOGAR (script reproduzível)
- [x] Logo flutuando (±4 px) com leve "respiração", sem logo duplicado atrás
- [x] Botão JOGAR real: hover, clique, toque (área ampliada), Enter e Espaço; feedback 1,03/0,97
- [x] Fallback para o visual procedural se a arte não carregar
- [x] Validado em 1280×720, 1920×1080 e 844×390 com toque

## DONE (v0.15: paleta da seleção alinhada à tela inicial, branch `feature/character-select-color-polish`)

- [x] Tokens `navy`/`indigo`/`royal`/`neon`/`violet` em `theme.ts` no lugar do teal/petróleo
- [x] Mapa de fundo em versão noturna (índigo, neon) com feixes de luz ciano e magenta
- [x] SELECIONAR no estilo do JOGAR (violeta + dourado) e halo no hover dos botões
- [x] Card selecionado com borda dourada e halo ciano; P1 magenta; barras ciano → dourado
- [x] Layout, seleção, dificuldade e navegação inalterados; validado em desktop e mobile

## DONE (v0.16: cenário Bitrix24 Partner Summit, branch `feature/partner-summit-stage-animation`)

- [x] Cenário ilustrado padrão com a arte aprovada; arena idêntica à PARTNER ARENA (teste)
- [x] `StageConfig.art` genérico (fundo, público, barreira, recortes com pivô) e fallback procedural
- [x] Público em colunas que pulam em onda; acelera e pula mais alto quando há vencedor
- [x] Presidente: cabeça olhando para os lados e acenando, mão gesticulando; aceno no fim do round
- [x] Humor do cenário pelos eventos existentes (`victoryPose` / `roundStart`)
- [x] Script reproduzível (`scripts/stage-art/`), helpers de imagem compartilhados (`scripts/art_tools.py`)
- [x] Playtest no Chromium: desktop 1280×720 e mobile 844×390, sem erros

## DONE (v0.17: tela de vitória ilustrada, branch `feature/victory-screen-redesign`)

- [x] Arte aprovada separada em camadas (fundo, moldura do card, painel, botão) por script reproduzível
- [x] Título, retrato, nome, veredito, motivo e placar dinâmicos a partir do `MatchResult` real
- [x] Entrada em sequência (~1,1 s), neon do título, card pulsando/flutuando com brilho varrendo
- [x] Confete pixelado, quadradinhos subindo e brilhos, atrás do conteúdo
- [x] Botão de arte compartilhado (`ArtButton`) com a tela inicial: hover, clique, toque, teclado
- [x] Testes de conteúdo (Augusto, Filipe, FIGHTER_A, derrota, tempo, empate) e dos assets
- [x] Playtest: 1280×720, 1920×1080, 844×390 com toque e uma partida real até a vitória

## DONE (v0.18: joystick virtual no mobile, branch `feature/mobile-virtual-joystick`)

- [x] Joystick de 8 direções no lugar de ◀ ▶ ▲ ▼; gera as mesmas entradas digitais das setas
- [x] Zona morta de 20%, setores por ângulo com diagonais um pouco mais largas (50°)
- [x] Um dedo por controle: joystick e botões de ação independentes (multi-touch)
- [x] Touch: um pulo por empurrão para cima (teclado inalterado: segurar ↑ repete o pulo)
- [x] Testes de direções, zona morta, ponteiros, pulo único, combos e determinismo
- [x] Playtest com toques reais (CDP) em 844×390, 667×375, 915×412 e 1280×720, incluindo cross-up

## DONE (v0.19: título da vitória padronizado, branch `feature/victory-title-font-standardization`)

- [x] Letreiro de jogo de luta gerado em código para qualquer vencedor ("<NOME> VENCEU!")
- [x] Fonte Bangers (OFL) incluída e carregada pela BootScene; fallback para a fonte arcade
- [x] Degradê quente, contorno duplo, pincel seco, inclinação e sombra; nomes longos cabem
- [x] Testes dos quatro vencedores, ajuste de largura e licença; playtest desktop e mobile

## DONE (v0.20: Modo História, branch `feature/story-mode-major-update`)

- [x] Menu JOGAR → HISTÓRIA / LUTA RÁPIDA (luta rápida inalterada)
- [x] Novos lutadores **JOÃO GUIOTTI** (São Paulo - SP, técnico) e **ROMUALDO** (Joinville - SC,
      pesado), com visual genérico, paletas próprias, todos os estados e sem especiais
- [x] Perfis de história em config (`src/story/storyProfiles.ts`): origem e `storyRoute` por
      lutador, sem `if` por ID nas cenas
- [x] Campanha de Augusto e Filipe: Recife → São Paulo (João) → Joinville (Romualdo)
- [x] `StoryProgress` puro e imutável; derrota oferece TENTAR NOVAMENTE (só aquela luta) ou SAIR;
      luta rápida nunca toca a campanha
- [x] `StoryMapScene`: mapa pixel-art do Brasil, cidades, avião em curva com rastro pontilhado,
      "PRÓXIMO DESAFIO" e VS com cidade/UF; `CampaignCompleteScene` no final
- [x] Tipografia central `GAME_FONTS` (TITLE / ARCADE / HUD / PIXEL / BODY) com fontes OFL
      offline; anúncios ROUND / FIGHT! / K.O. com o letreiro da vitória
- [x] Timer em fonte arcade; últimos 10 s em amarelo → laranja → vermelho com pulso discreto
- [x] Testes de roster, origens, rotas, progresso, retry, isolamento da luta rápida, mapa,
      voo, novos lutadores na simulação, CPU, melhor de 3, barra de especial, fontes e timer
- [x] Playtest Augusto (com derrota + retry) e Filipe em 1280×720, 1920×1080 e 844×390

## DONE (v0.21: SPECIAL READY e música, branch `feature/audio-and-special-ready-polish`)

- [x] SPECIAL READY a partir do custo do especial mais barato do lutador (Augusto 30, Filipe 35);
      sem especial, nunca READY
- [x] Glow que respira, brilho correndo, raios procedurais, faíscas, explosão ao ficar READY e
      descarga ao gastar; botão ESP do mobile com borda e anel pulsando
- [x] `MusicManager` central (faixa atual, crossfade, sting, volume, mute, unlock, sem duplicar)
- [x] Trilha original sintetizada (`scripts/music/compose.py`): menu, seleção, mapa, luta e
      fanfarra de vitória; música por cenário em `StageConfig.music`
- [x] Testes de READY, botão ESP, MusicManager, configuração e arquivos de áudio

## DONE (v0.22: efeitos sonoros, branch `feature/arcade-sfx`)

- [x] 19 efeitos originais sintetizados (`scripts/sfx/generate_sfx.py`): impactos por golpe,
      defesa, dano, pulo, aterrissagem, K.O., especial, SPECIAL READY, menus, ROUND, FIGHT!, vitória
- [x] `SfxManager` central junto do `MusicManager` (um AudioContext, volume, mute, deduplicação,
      unlock com tolerância para o toque que desbloqueia, variação leve de pitch/volume)
- [x] Sons só de eventos reais: contato (`hit`/`block`/`koHit`), ações do lutador (`jump`, `land`,
      `specialStart`) emitidas pela simulação sem mudar gameplay, KO e anúncios
- [x] Testes de impacto, whiff, defesa, pulo/aterrissagem, KO, especial, READY, menus, mute, volume
      e reentrada de cenas; playtest desktop e mobile

## DONE (v0.23: PERFECT, branch `feature/perfect-round-result`)

- [x] `RoundResult.perfect`: o vencedor não perdeu nenhum HP no round (chip damage anula; defesa
      sem dano não); calculado no `RoundSystem`, por round, determinístico; `MatchOutcome.perfects`
- [x] Chamada PERFECT dourada (letreiro do jogo, glow, faíscas, pop 0,5 → 1,15 → 1,0) depois de
      K.O. / TIME OVER, com efeito sonoro original `perfect`
- [x] Testes de KO/tempo com HP cheio, dano, chip, defesa, CPU, rounds independentes, empate e
      determinismo; playtest Round 1, Final Round, Player e CPU

## DONE (v0.24: viagens internacionais no Modo História, branch `feature/international-story-travel`)

- [x] `StoryLocation` genérico (cidade ou país; nome, país, UF opcional) com Portugal e Rússia
- [x] Origem oficial × local do confronto (`encounter`): Filipe em Portugal, João na Rússia
- [x] Rotas como `{ opponent, destination }`; a partida é sempre onde a campanha está
- [x] Mapa-múndi pixel-art para viagens ao exterior (Brasil destacado), mapa do Brasil mantido
      para as nacionais; voo mais longo no exterior; "PRÓXIMO DESTINO"; local da luta no VS
- [x] Testes de encontros, origens, rotas, partida, coordenadas, vistas e determinismo;
      playtest desktop e mobile com derrota + retry

## DONE (v0.25: especiais da CPU, branch `feature/cpu-special-ai`)

- [x] CPU usa especiais pelas regras do jogador (`specialForPress`, compartilhado com o `Fighter`)
- [x] Parâmetros por dificuldade em `AIProfile.special` (chance, cooldowns, hesitação, finalizar,
      punir whiff, checagem de alcance); sem cheat: só vê o que um humano veria, após reação
- [x] Testes: sem especial, sem energia, custo < 100, groundOnly, distância, stun, consumo,
      cooldown, finalizar, punição com reação, vários especiais, ordem por dificuldade, determinismo

## DONE (v0.26: VFX dos especiais com temas dos apps, branch `feature/app-themed-special-vfx`)

- [x] Temas por configuração (`assets.specialEffects`: estilo, emblema, símbolo, som)
- [x] 24ZAP: balões "digitando", emblema enviado, ondas de envio, impacto com ✓✓ e selo
- [x] MINDHUB AGENT: símbolo cérebro-circuito na mira, trilhas de circuito, rede neural, impacto
      digital com o emblema; emblemas pixel-art feitos dos logos fornecidos
- [x] Sons próprios de início (`special-zap`, `special-mind`); testes de fases, limpeza e
      reaproveitamento de objetos; playtest desktop e mobile (inclusive KO por especial)

## DONE (arte do João Guiotti)

- [x] Sheet original 1536×1120, 40 frames 192×224 e portrait 240×300, RGBA
- [x] Config existente integrado ao pipeline, fases 1/1/1, fontes/prompts/preparo reproduzíveis
- [x] Testes de alpha, margens, baseline, dimensões, carregamento e índices
- [x] Playtest desktop/mobile emulado, F2, Story/VS/Vitória, cross-up e flipX

## DONE (v0.27: travamento do especial e fonte do resultado, branch `fix/special-vfx-stutter-and-victory-font`)

- [x] Causa medida (perfil de CPU): balões do 24zap com tamanho negativo no pop-in iam para a
      triangulação de caminhos do Phaser (earcut), centenas de ms no frame do especial
- [x] VFX só com retângulos/triângulos/traços (`pixelBox`, `disc`), `easeOutBack` nunca
      negativo, formas minúsculas ignoradas; mesmo visual, sem mudar gameplay
- [x] Testes: emblemas no carregamento do roster, nada carregado/criado durante o especial,
      10 usos seguidos com o mesmo fluxo, custo de meter e dano inalterados
- [x] Resultado da vitória com papéis tipográficos: veredito (Russo One), detalhe e placar
      (Press Start 2P)

## DONE (arte do Romualdo)

- [x] Sheet RGBA 1536×1120 com 40 células 192×224 e portrait RGBA 240×300
- [x] Config existente com animações completas e fases 1/1/1; gameplay preservado
- [x] Fontes, prompts e preparação local reproduzível
- [x] Testes de assets, frame map, roster e referências do Story
- [x] Playtest F2, teclado, quatro confrontos, CPU, cross-up/flipX, Story/VS/Vitória e mobile emulado

## DONE (v0.28: cenário RECIFE, branch `feature/recife-stage`)

- [x] Arte oficial do Marco Zero como `StageConfig` `recife` (mesma arena), com preparo
      reproduzível (`scripts/stage-art/recife/`): céu limpo, avião, hélice e faixa em camadas
- [x] Cenário pelo lugar: `StoryLocation.stageId` (Recife → RECIFE), `legStageId` na história,
      `quickFightStageId` (cidade do rival, senão do jogador) na luta rápida; VS mostra o lugar
- [x] Torcida em grupos (loops, ritmos, alturas e atrasos próprios), flashes de celular,
      reações a golpe forte/especial/KO/PERFECT, comemoração do round e maior na vitória
- [x] Avião cruzando o céu (~15 s na tela, um voo a cada ~19-29 s, RNG visual com semente),
      hélice girando, faixa em tiras ondulando com atraso; tudo criado uma vez e destruído no
      `shutdown`
- [x] Testes de config, assets, escolha por lugar, voo, reações e ciclo de vida; playtest
      desktop, 1080p e mobile 844×390
- [x] Story Mode com origem dinâmica: a campanha começa no lugar do escolhido
      (`storyLocationId`) e é gerada (`campaignOpponents` + `rivalLeg`), sem rotas por
      personagem; os 4 personagens são jogáveis; "PONTO DE PARTIDA" no mapa; Recife vira destino
      (cenário Marco Zero) para quem não começa lá

## DONE (v0.29: todos os lutadores jogáveis, branch `feature/all-fighters-playable`)

- [x] `FighterConfig.playable` (evolução de `selectable`): a seleção usa o roster filtrado por
      `playable` nos dois modos; FIGHTER_A e FIGHTER_B ficam `playable: false` (fora da tela)
- [x] Luta rápida: CPU = próximo jogável do roster (circular), sem placeholder
- [x] História: jogável com perfil de história (`isStoryEligible`) escolhível; adversários só
      entre os elegíveis
- [x] Testes: filtro, 4 lutadores na seleção, VS/CPU, campanhas pela seleção, IA genérica em
      todos os pares, sem lista fixa de ids, grade com 4–12 lutadores; playtest 1280×720,
      1920×1080 (mouse) e 844×390 (toque)

## DONE (Isaque Ferreira)

- [x] Sheet RGBA 1536×1120 com 40 células 192×224 e portrait RGBA 240×300
- [x] Config existente com animações completas e fases 1/1/1; gameplay preservado
- [x] Fontes, prompts e preparação local reproduzível
- [x] Testes de assets, frame map, roster e referências do Story
- [x] Playtest F2, teclado, quatro confrontos, CPU, cross-up/flipX, Story/VS/Vitória e mobile emulado

## DONE (v0.30: cenário JOINVILLE, branch `feature/joinville-stage`)

- [x] Arte oficial do pórtico de Joinville como `StageConfig` `joinville` (mesma arena), com
      Joinville → `joinville` nos lugares (história e luta rápida do Romualdo)
- [x] Torcida em grupos e reações iguais às do Recife; avião com a faixa CRMThink voando ao
      fundo, atrás do telhado, palmeiras, bandeirinhas e postes (`skyline.png`)
- [x] Preparo compartilhado `scripts/stage-art/flyover_art.py` (Recife idêntico byte a byte)
- [x] Arte do Romualdo integrada (merge de `feature/romualdo-art`)
- [x] Testes comuns aos cenários com avião (`tests/flyoverStages.test.ts`); playtest desktop
      e mobile 844×390

## DONE (v0.31: nova tela inicial animada, branch `feature/new-animated-title-screen`)

- [x] Arte oficial (João Guiotti × Isaque Ferreira, arena neon) separada em camadas: fundo,
      logo, START, brilho e 9 partes de vento; layout gerado (`titleArtLayout.ts`)
- [x] Vento por tiras (`WindLayer` + `windMotion.ts`): cabelo do João, gola/costas/barra/manga
      dos dois; luzes pulsando e faíscas (`TitleAmbience`); logo flutuando; START com brilho
      respirando, hover, clique e hit area maior; entrada em ~0,9 s
- [x] Testes de camadas, layout e vento; playtest desktop/mobile, 70 s sem crescer objetos,
      tweens ou memória
- [x] FighterConfig equilibrado, seis normais, roster e luta rápida; sem novo especial/campanha
- [x] Sheet 1536×1120 RGBA, 40 células 192×224; portrait 240×300 RGBA
- [x] Fontes, prompts e preparação reproduzível; animações e fases completas
- [x] Testes de assets, seleção, CPU, simulação e determinismo
- [x] Playtest desktop/debug contra quatro fighters, Isaque CPU e mobile emulado com multi-touch,
      cross-up, flipX e vitória; 632 testes e check aprovados

## DONE (v0.32: Isaque Ferreira na Espanha no Modo História, branch `feature/isaque-spain-story-integration`)

- [x] `StoryLocation` `spain` (país, ~Madri) no mapa-múndi; rótulos de Portugal e Espanha em
      lados opostos (`mapLabel`, configuração)
- [x] Perfil do Isaque só com `encounter: 'spain'` (`home` passou a ser opcional; sem origem
      inventada); entra depois do João: campanhas passam por Rússia → Espanha
- [x] Testes do lugar, rotas, voo a partir do `currentLocation`, chegada, VS, retry, vitória e
      fim de campanha na Espanha; playtest desktop, 1080p e mobile

## DONE (v0.33: cenário RÚSSIA para o João Guiotti, branch `feature/russia-joao-stage`)

- [x] Arte oficial da Praça Vermelha como `StageConfig` `russia` (mesma arena), torcida em
      grupos, biplano com faixa Bitrix24 atrás das torres e cúpulas
- [x] Cenário por encontro: `encounterStageId` no perfil do João → `StoryLeg.stageId`; o lugar
      Rússia continua sem cenário próprio (país e arena separados)
- [x] `flyover_art.py`: `extra_sky` (nuvens do pôr do sol) e `plane_max_y`; Recife e Joinville
      idênticos
- [x] Testes do cenário, do encontro, retry, rounds e luta rápida; playtest desktop, 1080p e
      mobile (viagem → VS → luta, derrota → retry, FINAL ROUND)

## DONE (Aislan — ZOPU)

- [x] FighterConfig novo, roster, arte completa e portrait próprios, sem especial exclusivo
- [x] Pipeline offline reproduzível, 40 células RGBA com margens e fases 1/1/1
- [x] Encounter após Romualdo em Joinville, compartilhando stage sem duplicar arte
- [x] Transição local genérica sem voo e testes de assets, CPU, rotas e retry
- [x] Playtest F2/teclado, cinco rivais e CPU, Story com/sem voo, derrota/retry e touch landscape

## DONE (cenário JOINVILLE ZOPU do Aislan, branch `feature/aislan-joinville-stage`)

- [x] Arte oficial preparada por `prepare_joinville_zopu.py` (faixa branca separada das nuvens
      pela cor creme, logo verde pela própria cor), mesma composição do Joinville
- [x] `joinville-zopu` no registro; o perfil do Aislan aponta para ele, Romualdo inalterado
- [x] Testes de flyover, rotas e assets; playtest desktop e touch com o avião e a torcida

## DONE (luta rápida com escolha de rival e fase, branch `feature/quick-fight-selection`)

- [x] Seleção em dois passos (seu lutador, rival; espelho permitido), selo PASSO n DE 3, P1/CPU
- [x] `StageSelectScene`: prévia com a arte do cenário, lista dos cenários ilustrados
      (`getSelectableStages`), sugestão inicial por `quickFightStageId`, toque e teclado
- [x] Esc volta um passo mantendo as escolhas; testes de fluxo, layout e recorte; playtest
      desktop e touch até a luta no cenário escolhido

## DONE (v0.34: especiais ALAIO VIBECODE! e GPTMAKER!, branch `feature/new-specials`)

- [x] ALAIO VIBECODE! para João e Isaque (`shared/alaioVibecode.ts`, ids próprios): custo 30,
      chão, mid, 17 de dano, 12/6/24, alcance 162
- [x] GPTMAKER! para Romualdo: custo 35, chão, mid, 21 de dano, 17/6/27, alcance 160
- [x] Temas de VFX `vibeCode` e `agentBuilder`, emblemas pixel-art originais
      (`draw_original_emblems.py`), sons `special-vibe` e `special-gpt`
- [x] Testes de configuração, execução, defesa, VFX sem travamento/limpeza e CPU usando os especiais

## DONE (FLUIDZ! do Aislan, branch `feature/aislan-fluidz`)

- [x] Branch junta `feature/quick-fight-selection` (Aislan, Joinville ZOPU, seleção) e
      `feature/new-specials`
- [x] FLUIDZ!: custo 30, chão, mid, 17 de dano, 13/7/23, alcance 164
- [x] Tema de VFX `liquidFlow` (roxo da Fluidz, bolha, jato ondulante, splash com gravidade, poça),
      emblema da logo da Fluidz `fluidz-emblem.png` e som `special-fluidz`
- [x] Testes de configuração, execução, defesa, VFX sem travamento/limpeza e CPU; playtest

## DONE (seleção pronta para mais lutadores, branch `feature/character-select-expanded-roster`)

- [x] Grade calculada pela quantidade (`rosterGrid`): 6 → 3 × 2, 9 (atual + 3) → 5 × 2 numa
      página só; paginação genérica só acima de 12
- [x] `RosterCard` com tamanho da grade e nome em duas linhas em card estreito
- [x] ↑ ↓ entre linhas (`moveInGrid`, cruzando páginas), dificuldade em Q / E, ◀ ▶ por página
- [x] Testes com roster atual + 3 entradas só de teste, 1920x1080, 1280x720 e 844x390; playtest

## DONE (cenário BITRIX24 MOSCOU do chefe final Dmitry, branch `feature/dmitry-boss-stage`)

- [x] Arte oficial redimensionada por `prepare_bitrix24_moscow.py`; `bitrix24-moscow` no registro
      e na seleção de fase da luta rápida
- [x] `STORY_FINAL_BOSS`: com o Dmitry no roster, toda campanha termina contra ele em Moscou
      nesse cenário (único uso na história); sem ele, rotas iguais
- [x] Lista de fases calculada pela quantidade (`stageList`), sem linha escondida com 6 fases
- [x] Testes com um Dmitry só de teste; playtest desktop e mobile

## DONE (Dmitry — chefe final, branch `feature/dmitry-final-boss`)

- [x] Auditoria da base `feature/dmitry-boss-stage`: escritório e configuração de boss reutilizados
- [x] FighterConfig próprio, vida 108, seis normais, sem especial; CPU e core genéricos intactos
- [x] Sprite original RGBA 1536×1120/40 células e portrait 240×300; fontes e preparo reproduzíveis
- [x] Animações completas, escala 1 e offsets 0/8; poses aéreas elevadas e KO no chão
- [x] Boss oculto na seleção comum, última etapa de todas as campanhas, selo no mapa e VS
- [x] Retry preserva encontro/escritório; vitória conclui campanha pelo fluxo existente
- [x] Testes de assets, roster, simulação, CPU, determinismo, rotas e ausência de ID no core
- [x] Playtest Chrome desktop e touch emulado: poses/F2/flipX, seis rivais, Story/retry/final

## DONE (final ilustrado do Augusto no Modo História, branch `feature/augusto-story-ending`)

- [x] Arte oficial em 1440×810 (`prepare_augusto_ending.py`), `endingArt` no perfil do Augusto
- [x] `CampaignCompleteScene`: ilustração em tela cheia com zoom lento, título à direita, sem
      card; tecla na introdução só mostra os botões; outros personagens com o final padrão
- [x] Rota do final sem lugar repetido em sequência (Joinville → Joinville)
- [x] Testes do asset e dos perfis; playtest desktop e mobile

## DONE (rodapé estilo luta e fim direto da campanha, branch `feature/dmitry-final-boss-integration`)

- [x] `ControlsHint`: rodapé das seleções em Bangers, teclas douradas e setas desenhadas
- [x] `endMatch`: vencer a última luta da campanha vai direto à campanha concluída
- [x] Testes de `parseHint` e do fluxo; playtest desktop e mobile

## DONE (final ilustrado do Romualdo, branch `feature/dmitry-final-boss-integration`)

- [x] Arte oficial em 1440×810 (`prepare_romualdo_ending.py`), `endingArt` no perfil do Romualdo
- [x] Testes do asset; playtest desktop e mobile

## DONE (ALAIO STRIKE!, especial do chefe final Dmitry, branch `feature/dmitry-final-boss-integration`)

- [x] Especial `dmitry.alaioStrike`: hitbox simétrica que cobre a arena toda, nível `mid`, custo
      50, dano 24, chip 4; só a defesa evita (no ar não há defesa)
- [x] Pose nova (frame 40, punho erguido) montada no `prepare.py` com os pixels do soco
- [x] Tema de VFX `skyLightning` (nuvem brava, raios no estágio visível) e som
      `special-alaio-strike`
- [x] Testes de alcance, defesa em pé/agachado, pulo, fuga, CPU, VFX e sprite; playtest no navegador

## DONE (final ilustrado do Aislan, branch `feature/aislan-story-ending`)

- [x] Arte oficial 4:3 cortada em 16:9 a partir de `CROP_TOP` (`prepare_aislan_ending.py`),
      `endingArt` no perfil do Aislan
- [x] Testes do asset; playtest desktop e mobile

## DONE (final do Romulo e seleção para mais três, branch `feature/romulo-ending-roster`)

- [x] Finais em `STORY_ENDING_ART` (por id, fora dos perfis): o do Romulo (`romulo`) já
      cadastrado, carregado e mostrado quando ele entrar no roster
- [x] Seleção conferida com 9 jogáveis (atual + Romulo, Gabriel Mattozo e Danilo, só no teste):
      grade 5 × 2 numa página, nomes longos em duas linhas, VS e HUD sem corte

## DONE (Rômulo — Arrecife Digital, branch `feature/romulo-arrecife-fighter`)

- [x] Auditoria: personagem inexistente; implementação nova a partir da main atual
- [x] FighterConfig equilibrado, seis normais, roster e luta rápida; sem especial/campanha
- [x] Sprite RGBA 1536×1120 com 40 células e portrait 240×300; fontes/prompts/preparo preservados
- [x] Escala 1 e offsets 0/8, corpo robusto, baseline e margem validados por célula
- [x] Testes de assets, fases, seleção, CPU, simulação e determinismo
- [x] Playtest de poses/debug, comparações com os sete fighters, Rômulo como P1 e CPU
- [x] Teclado e smoke mobile landscape com multi-touch e cross-up

## DONE (cenário CASTELO BRANCO e Rômulo no Modo História, branch `feature/castelo-branco-stage`)

- [x] Rômulo do Codex (`feature/romulo-arrecife-fighter`) revisado e juntado
- [x] Arte preparada por `prepare_castelo_branco.py` (avião, faixa e skyline separados; nuvens
      por cor; linhas de reboque por `clear_boxes`) e cenário `castelo-branco` com avião e torcida
- [x] Lista de fases com 7 cenários sem rolagem (linhas ~44 px)
- [x] Lugar `castelo-branco` (Portugal) e perfil do Rômulo: campanha própria e etapa antes do
      chefe final nas outras; marcador de Portugal em Lisboa e `mapNudge` para não sobrepor
- [x] Testes de cenário, lugar, rotas e mapa; playtest da luta, do avião, do mapa e do final

## DONE (seta do anúncio da viagem, branch `feature/route-title-arrow`)

- [x] "→" dos títulos de luta desenhado como forma (a fonte não tem seta): mesmas camadas das
      letras (sombra, contorno, degradê de fogo, inclinação), no meio das maiúsculas

## DONE (final ilustrado do Filipe, branch `feature/filipe-story-ending`)

- [x] Arte oficial 4:3 cortada em 16:9 (`prepare_filipe_ending.py`), `filipe` em
      `STORY_ENDING_ART`; testes e playtest desktop e mobile

## DONE (final ilustrado do João Guiotti, branch `feature/joao-story-ending`)

- [x] Arte oficial em 1440×810 (`prepare_joao_guiotti_ending.py`), `joao-guiotti` em
      `STORY_ENDING_ART`; testes e playtest desktop e mobile

## DONE (especiais do Rômulo, branch `feature/romulo-specials`)

- [x] Lutador com vários especiais alterna entre eles (`specialForPress` + `specialTurn`); a vez
      cuja energia não paga cede ao próximo usável; lutadores de um especial não mudam
- [x] Rômulo com 24ZAP! e MINDHUB AGENT (dados e visual dos originais, ids próprios)
- [x] Testes de alternância, custo, CPU e playtest no navegador

## DONE (final ilustrado do Isaque Ferreira, branch `feature/isaque-story-ending`)

- [x] Arte oficial em 1440×810 (`prepare_isaque_ferreira_ending.py`), `isaque-ferreira` em
      `STORY_ENDING_ART`: todo personagem da história tem final próprio; playtest desktop e mobile

## DONE (Gabriel Mattozo — GMC, branch `feature/gabriel-mattozo-fighter`)

- [x] Novo fighter configurável, oitavo selecionável na luta rápida como jogador e CPU
- [x] Perfil ágil, vida 100, seis normais, sem especial exclusivo ou Story Route
- [x] Arte original com óculos, hoodie bege e corpo magro; atlas RGBA 1536×1120, portrait 240×300
- [x] 40 frames normalizados, margens e baseline validados; fontes, prompts e preparo offline
- [x] Testes de roster, carregamento, animações, simulação, seleção, CPU e determinismo
- [x] Playtest desktop, F2, poses, sete confrontos, Gabriel CPU, touch e cross-up
- [x] Comparação visual com os oito fighters existentes; escala 1 e offsets 0/8

## DONE (cenário CURITIBA e Gabriel Mattozo no Modo História, branch `feature/curitiba-stage`)

- [x] Gabriel Mattozo do Codex revisado e juntado à `main` atual
- [x] Arte preparada por `prepare_curitiba.py` (avião roxo e faixa "GMC" separados;
      `pale_solid_from` para os prédios claros cobrirem o avião) e cenário `curitiba`
- [x] Lista de fases com 8 cenários sem rolagem (linhas ~41 px)
- [x] Lugar `curitiba` (PR, separado de Joinville no mapa) e perfil do Gabriel antes do
      Romualdo: rota Espanha → Curitiba → Joinville
- [x] Testes de cenário, lugar, rotas e mapa; playtest da luta, do avião, do mapa e da seleção

## DONE (cenário PORTUGAL da luta do Filipe, branch `feature/portugal-stage`)

- [x] Arte 4:3 cortada em 16:9 e preparada espelhada (`prepare_portugal.py`); opções novas do
      preparo: `plane_min_y`, `sky_min_value`, `sky_max_hue`, `clear_ring`
- [x] Voo para a direita na animação (`direction: 'right'`), faixa atrás do avião
- [x] Cenário `portugal` no lugar Portugal (luta do Filipe) e na seleção (9 fases, sem rolagem)
- [x] Testes atualizados; playtest da luta e do voo

## DONE (cenário MADRI da luta do Isaque, branch `feature/spain-stage`)

- [x] Arte preparada por `prepare_spain.py` (jato sem hélice, faixa separada pelo brilho)
- [x] Hélice opcional no preparo e na animação do voo (`propeller` opcional)
- [x] Cenário `spain` no lugar Espanha (luta do Isaque) e na seleção (10 fases, sem rolagem)
- [x] Testes atualizados; playtest da luta e do voo

## DONE (especial N8N! do Gabriel Mattozo, branch `feature/gabriel-n8n-special`)

- [x] `gabriel-mattozo.n8n`: custo 30, chão, mid, 16 de dano, alcance 176
- [x] Tema de VFX `workflowNodes` (nós, conexões curvas, pacotes, check de executado) e som
      `special-n8n`
- [x] Testes de configuração, acerto, defesa, alcance e VFX; playtest no navegador

## DONE (barra de comandos na luta, branch `feature/fight-controls-bar`)

- [x] Barra fixa no pé da luta com os comandos do teclado (`ControlsHint`, mesmo estilo das
      seleções); escondida com controles de toque
- [x] Tela de carregamento no boot (`LoadingBar`: título, barra e porcentagem) para o celular
      não ficar com tela preta enquanto baixa ~48 MB de arte e áudio

## DONE (final ilustrado do Gabriel Mattozo, branch `feature/gabriel-story-ending`)

- [x] Arte oficial em 1440×810 (`prepare_gabriel_mattozo_ending.py`), `gabriel-mattozo` em
      `STORY_ENDING_ART`: de novo todo personagem da história tem final próprio

## DONE (abertura no celular, branch `feature/mobile-boot-hardening`)

- [x] "Carregando…" em HTML desde o primeiro instante; erro de inicialização aparece na tela
- [x] `index.html` velho em cache pedindo um bundle apagado: recarrega uma vez sem cache; o deploy
      também mantém o bundle anterior no gh-pages
- [x] Tela cheia (e paisagem travada) no primeiro toque em aparelhos touch; manifesto com
      `display: fullscreen` e ícones para "Adicionar à tela inicial"

## DONE (iOS, branch `feature/ios-fullscreen`)

- [x] iPad: tela cheia no toque pela API prefixada do Safari
- [x] iPhone (Safari não tem tela cheia para páginas): aviso de "Adicionar à Tela de Início";
      instalado, abre como app em tela cheia (`apple-touch-icon` 180, barra de status translúcida)
- [ ] Testar num iPhone/iPad de verdade (aqui só emulação no Chromium; sem WebKit no ambiente)

## DONE (celular mais leve e pausa, branch `feature/mobile-perf-pause`)

- [x] Carregamento sob demanda: abertura de ~48 MB para ~6 MB; sprites e cenário na tela VS,
      miniaturas na escolha de fase, final junto das lutas da campanha (`sceneAssets.ts`)
- [x] Botões de toque e joystick como imagens tingidas de texturas geradas uma vez
      (`TouchCircle`), sem o earcut por quadro dos `Arc` preenchidos
- [x] Pausa na luta (`PauseScene`): ESC/P, botão II no toque e pausa automática ao sair da
      página; CONTINUAR, REINICIAR LUTA, SAIR PARA O MENU

## DONE (Modo História com rivais sorteados, branch `feature/story-random-rivals`)

- [x] Cada campanha: 4 rivais sorteados (sem repetir, nunca o próprio) e o chefe final;
      sorteio ao começar, guardado em `StoryProgress.route` (retry e mapa usam a mesma rota)

## DONE (galeria de finais, branch `feature/endings-gallery`)

- [x] GALERIA no menu (`EndingGalleryScene`): um card por personagem da história, contador
      x/8, final em tela cheia para os liberados, silhueta e dica para os bloqueados
- [x] Final liberado ao zerar a campanha, salvo em `localStorage` (`endingGallery.ts`);
      "NOVO FINAL NA GALERIA x/8" na tela de campanha concluída

## DONE (Dmitry liberado pela galeria, branch `feature/dmitry-unlock`)

- [x] `FighterConfig.unlock: 'all-endings'`: com os 8 finais, o Dmitry entra na luta rápida;
      teaser na galeria e anúncio na tela de campanha concluída

## DONE (pronto para receber personagem novo, branch `feature/new-fighter-ready`)

- [x] Checklist `docs/NEW_FIGHTER.md` (lutador, arte, Modo História, opcionais, testes) e link no
      AGENTS.md; regra de assets atualizada para o carregamento sob demanda
- [x] Galeria escolhe as colunas (até 5) pelo maior card: 9 ou 10 finais em 5×2
- [x] Personagem novo pode entrar sem final ilustrado (teste e legenda da galeria aceitam)
- [x] Ensaio com um 9º personagem temporário: seleção 5×2, campanha própria, galeria 3/9

## DONE (cenário RIO DE JANEIRO, branch `feature/rio-stage`)

- [x] Cenário RIO DE JANEIRO (Copacabana, arte oficial; torcida animada) e lugar
      `rio-de-janeiro` (RJ, rótulo à direita no mapa) para a Gabriele, da Inovar Consulting
- [x] Escolha de fase com 11 cenários sem rolar: linhas compactas mostram só o nome

## NEXT (próximas tarefas recomendadas)

1. [ ] Testar em iPhone/iPad e Android reais (abertura, tela cheia, memória, desempenho).
2. [ ] Salvar o progresso da campanha em `localStorage` (hoje vale só para a sessão).
3. [ ] **Playtest e balanceamento:** ajustar frame data, velocidade, dano e os três perfis
       (`EASY_AI`, `NORMAL_AI`, `HARD_AI`) com pessoas reais; a FÁCIL ainda pode estar difícil
       para iniciantes.
4. [ ] 2 jogadores no mesmo aparelho e suporte a gamepad.
5. [ ] Comandos de entrada por especial (ex.: ↓↘→ + soco), mantendo o botão de especial.
6. [ ] **Polimento artístico:** revisar continuidade da caminhada e proporções entre poses
       com pessoas reais; refinar correspondência visual dos membros às caixas sem mudar gameplay.
7. [ ] Vozes/locução dos anúncios (ROUND, FIGHT!, K.O.) e falas dos personagens.
8. [ ] Contador de combo e pausa de impacto nos golpes fortes.
9. [ ] Som ambiente de torcida por cenário.
10. [ ] Tela de opções com volumes separados de música e efeitos (hoje só M para mutar tudo) e
        remapeamento de teclas salvo em `localStorage`.
11. [ ] Mostrar a dificuldade escolhida na tela VS (o HUD fica limpo de propósito).
12. [ ] Playtest específico do cross-up (alcance do pulo, `pushHeight`, hitbox do chute aéreo).
13. [ ] Teste automatizado E2E (Playwright) do fluxo menu → vitória, no CI.
14. [ ] Mais cidades no mapa do Modo História.

## FUTURE (não implementar agora)

- AUGUSTO: **MINDHUB AGENT** (apenas ideia, não implementado)
- AUGUSTO: **TOP 1 MUNDIAL** (apenas ideia, não implementado)

- Elenco de 8 a 16 personagens reais (com autorização) e character select maior
- Sequências de comando para especiais e suporte a multi-hit real
- Combos, contador de hits, cancelamentos
- Vários cenários
- Falas dos personagens e trilha gravada por músicos (hoje é sintetizada)
- Modo torneio / arcade com chaveamento (o Modo História já cobre a sequência de rivais)
- Ranking
- Multiplayer local (2 jogadores no mesmo teclado/gamepads)
- Multiplayer online (rollback netcode sobre a simulação determinística)
- Suporte a gamepad
