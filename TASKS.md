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

## NEXT (próximas tarefas recomendadas)

1. [ ] **Playtest e balanceamento:** ajustar frame data, velocidade, dano e `NORMAL_AI` com
       pessoas reais; adicionar perfis de dificuldade (fácil/normal/difícil) no menu.
2. [ ] **Melhor de 3 rounds:** `MatchSystem` acima do `RoundSystem`, indicadores de rounds
       vencidos no HUD, "ROUND 2/3", "FINAL ROUND".
3. [ ] **Pipeline de sprites:** `SpriteFighterView` + carregamento em `BootScene` a partir de
       `FighterConfig.assets`, com fallback para o placeholder.
4. [ ] **Áudio básico:** `AudioManager` ouvindo `SimulationEvent` (hit, block, KO, anúncios) e
       música de menu e de luta, respeitando o desbloqueio de áudio no mobile.
5. [ ] **Pausa e opções:** pausar a luta (Esc / botão touch), reiniciar, voltar ao menu; tela de
       remapeamento de teclas salva em `localStorage`.
6. [ ] Ataques agachados e aéreos (novos `AttackConfig` com `state` próprios).
7. [ ] Botão de tela cheia no mobile e teste em iOS Safari / Android Chrome reais.
8. [ ] Teste automatizado E2E (Playwright) do fluxo menu → vitória, no CI.
9. [ ] CI (GitHub Actions) rodando `npm run check`.

## FUTURE (não implementar agora)

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
