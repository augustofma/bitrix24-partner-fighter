# AGENTS.md: regras para agentes de IA (Claude, Codex etc.) e colaboradores

Este repositório é mantido por pessoas e por agentes diferentes, sem contexto compartilhado.
Estas regras existem para que qualquer um consiga continuar o trabalho com segurança.

## Antes de começar

1. Leia [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) antes de qualquer alteração estrutural
   (novos sistemas, pastas, mudanças em `src/core/` ou nos tipos de `src/types/`).
2. Leia [TASKS.md](TASKS.md) para saber o que já existe, o que vem a seguir e o que está
   explicitamente fora de escopo (FUTURE).
3. Para regras de jogo, consulte [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md). Para arte e assets,
   [docs/ART_DIRECTION.md](docs/ART_DIRECTION.md).
4. Vai colocar um personagem novo? Siga o checklist [docs/NEW_FIGHTER.md](docs/NEW_FIGHTER.md).

## Regras de arquitetura

- **Não duplique sistemas existentes.** Antes de criar algo, procure: combate em
  `src/core/systems/CombatSystem.ts`, arena em `ArenaSystem.ts`, round/timer em `RoundSystem.ts`,
  input em `src/controllers/` + `src/input/`, IA em `src/controllers/AIController.ts`.
- **Nada de lógica específica de personagem no motor.** `src/core/` nunca testa `id`, nome ou
  qualquer personagem específico. Tudo que é do personagem vem de `FighterConfig`
  (`src/fighters/<id>.ts`). Se um personagem precisa de um comportamento novo, generalize-o como
  um dado de configuração.
- **A simulação é pura.** `src/core/`, `src/types/`, `src/controllers/`, `src/fighters/`,
  `src/stages/` e `src/config/` não importam Phaser nem código de apresentação. O ESLint bloqueia
  isso (`no-restricted-imports`). Também não use `Math.random()`, `Date` ou tempo real dentro de
  `src/core/`: a simulação deve ser determinística (fundamental para replays e online).
- **A simulação avança em passos fixos de 60 Hz.** Durações de gameplay são em _frames_, nunca em
  milissegundos.
- **Render só lê.** Views (`src/render/`) e HUD (`src/ui/`) leem `ReadonlyFighter` e nunca alteram
  o estado da luta.
- **Arte nunca define gameplay.** Sprites e retratos entram só por `FighterConfig.assets`
  (veja `docs/ART_DIRECTION.md`). Colisão vem das caixas do config e timing vem do frame data,
  nunca da arte. Não carregue assets de personagem à mão: o que cada tela precisa sai do config
  (`src/render/assets/sceneAssets.ts`: retratos no boot, sprite sheets na tela VS). Nem crie
  lógica por personagem no renderer.
- **Sem valores mágicos.** Constantes ficam em `src/config/` (globais) ou no topo do arquivo que as
  usa (locais, com nome descritivo). Textos visíveis ao usuário ficam em `src/config/strings.ts`.
- **Sem dependências circulares.** Tipos compartilhados ficam em `src/types/`.
- **Componentes pequenos, responsabilidade clara.** Se um arquivo passar de ~300 linhas ou uma
  classe fizer duas coisas, divida.

## Regras de código

- TypeScript estrito; não use `any` (prefira `unknown` + narrowing). Mantenha tudo tipado.
- Identificadores e comentários de código em **inglês**; textos de UI e documentação em
  **português**.
- Siga o estilo existente (Prettier: aspas simples, ponto e vírgula, 100 colunas).
- Comente o _porquê_, não o _o quê_.

## Dependências e assets

- Não adicione dependências sem necessidade real. Justifique no PR/commit e documente no README.
- **Nunca** use assets protegidos por copyright (sprites, sons, fontes, logos de Street Fighter,
  Mortal Kombat, King of Fighters, Bitrix24 etc.). Nada de assets aleatórios baixados da internet.
  Só arte original ou com licença explícita e registrada em `docs/ART_DIRECTION.md`.

## Antes de concluir uma tarefa

1. Rode `npm run check` (typecheck, lint, formatação, testes e build). Tudo deve passar.
2. Se mexeu em gameplay de `src/core/`, adicione ou atualize testes em `tests/`.
3. Se mudou arquitetura, pastas ou fluxos, atualize `docs/ARCHITECTURE.md`.
4. Se mudou regras de jogo ou controles, atualize `docs/GAME_DESIGN.md` e o `README.md`.
5. Atualize `TASKS.md` (mova itens para DONE, adicione descobertas em NEXT).
6. Não implemente itens de FUTURE sem pedido explícito.

## Dicas práticas

- Em `npm run dev`, a instância do jogo fica em `window.__BPF_GAME__` (apenas em dev), útil para
  inspecionar estado ou automatizar smoke tests (ex.:
  `__BPF_GAME__.scene.getScene('FightScene').simulation`).
- `?debug=1` ou F2 mostra hurtboxes (verde), hitboxes (vermelho) e pushboxes (azul).
- `?touch=1` força os controles touch no desktop.
