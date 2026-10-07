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

## NEXT (próximas tarefas recomendadas)

0. [ ] **Desempenho mobile:** os botões touch (`Arc` preenchidos) também passam pelo earcut a
       cada frame (~4% da CPU num celular lento, sem relação com especiais); trocar por
       textura gerada uma vez.

1. [ ] **Playtest e balanceamento:** ajustar frame data, velocidade, dano e os três perfis
       (`EASY_AI`, `NORMAL_AI`, `HARD_AI`) com pessoas reais; a FÁCIL ainda pode estar difícil
       para iniciantes.
2. [ ] Comandos de entrada diferentes por especial (hoje um botão inicia o primeiro utilizável).
3. [ ] **Polimento artístico:** revisar continuidade da caminhada e proporções entre poses
       com pessoas reais; refinar correspondência visual dos membros às caixas sem mudar gameplay.
4. [ ] Vozes/locução dos anúncios (ROUND, FIGHT!, K.O.) e falas dos personagens.
5. [ ] **Pausa e opções:** pausar a luta (Esc / botão touch), reiniciar, voltar ao menu; tela de
       remapeamento de teclas salva em `localStorage`.
6. [ ] Tela de carregamento na `BootScene` (barra de progresso) quando houver muitos assets.
7. [ ] Mostrar a dificuldade escolhida na tela VS (o HUD fica limpo de propósito).
8. [ ] Playtest específico do cross-up (alcance do pulo, `pushHeight`, hitbox do chute aéreo).
9. [ ] Botão de tela cheia no mobile e teste em iOS Safari / Android Chrome reais.
10. [ ] Teste automatizado E2E (Playwright) do fluxo menu → vitória, no CI.
11. [ ] CI (GitHub Actions) rodando `npm run check`.
12. [ ] Especiais para João e Romualdo.
13. [ ] Campanhas para João e Romualdo (hoje só rivais) e mais cidades no mapa.
14. [ ] Salvar o progresso da campanha em `localStorage` (hoje vale só para a sessão).
15. [ ] Cenários próprios por cidade (o `StoryLeg.stageId` já permite; hoje todas usam o Partner Summit).
16. [ ] Tela de opções com volumes separados de música e efeitos (hoje só M para mutar tudo).

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
