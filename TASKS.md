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

## NEXT (próximas tarefas recomendadas)

1. [ ] **Playtest e balanceamento:** ajustar frame data, velocidade, dano e `NORMAL_AI` com
       pessoas reais; adicionar perfis de dificuldade (fácil/normal/difícil) no menu.
2. [ ] **Melhor de 3 rounds:** `MatchSystem` acima do `RoundSystem`, indicadores de rounds
       vencidos no HUD, "ROUND 2/3", "FINAL ROUND".
3. [ ] **Polimento artístico:** revisar continuidade da caminhada e proporções entre poses
       com pessoas reais; refinar correspondência visual dos membros às caixas sem mudar gameplay.
4. [ ] **Áudio básico:** `AudioManager` ouvindo `SimulationEvent` (hit, block, KO, anúncios) e
       música de menu e de luta, respeitando o desbloqueio de áudio no mobile.
5. [ ] **Pausa e opções:** pausar a luta (Esc / botão touch), reiniciar, voltar ao menu; tela de
       remapeamento de teclas salva em `localStorage`.
6. [ ] Tela de carregamento na `BootScene` (barra de progresso) quando houver muitos assets.
7. [ ] Aplicar os níveis de ataque em `isAttackBlocked` (`low` só se defende agachado,
       `overhead` só em pé) e ensinar a CPU a escolher a guarda certa.
8. [ ] Playtest específico do cross-up (alcance do pulo, `pushHeight`, hitbox do chute aéreo).
9. [ ] Botão de tela cheia no mobile e teste em iOS Safari / Android Chrome reais.
10. [ ] Teste automatizado E2E (Playwright) do fluxo menu → vitória, no CI.
11. [ ] CI (GitHub Actions) rodando `npm run check`.

## FUTURE (não implementar agora)

- AUGUSTO: **24ZAP COMBO** (apenas ideia, não implementado)
- AUGUSTO: **MINDHUB AGENT** (apenas ideia, não implementado)
- AUGUSTO: **TOP 1 MUNDIAL** (apenas ideia, não implementado)

- Elenco de 8 a 16 personagens reais (com autorização) e character select maior
- Golpes especiais (sequências de comando) e barra de especial
- Combos, contador de hits, cancelamentos
- Vários cenários
- Sons, músicas e falas dos personagens
- Modo torneio / arcade com sequência de oponentes
- Ranking
- Multiplayer local (2 jogadores no mesmo teclado/gamepads)
- Multiplayer online (rollback netcode sobre a simulação determinística)
- Suporte a gamepad
