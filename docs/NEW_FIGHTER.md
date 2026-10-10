# Novo personagem jogável: checklist

Roteiro para colocar um parceiro novo no jogo (próximo: **Gabriele, da Inovar Consulting**) com
o mesmo nível dos outros: luta rápida, Modo História, galeria. Quase tudo é dado de
configuração; as telas se ajustam sozinhas. Comece de uma branch nova a partir da `main`
atualizada e siga as regras do [AGENTS.md](../AGENTS.md).

> **Gabriele (Inovar Consulting):** a cidade dela já está pronta. O lugar `rio-de-janeiro`
> (Rio de Janeiro - RJ) e o cenário RIO DE JANEIRO (calçadão de Copacabana) existem; no Modo
> História basta `{ fighterId: '<id dela>', home: 'rio-de-janeiro' }` em `STORY_PROFILES`.

## 1. Lutador (obrigatório)

- `src/fighters/<camelCase>.ts` exportando um `FighterConfig` (modelo:
  `src/fighters/gabrielMattozo.ts`):
  - `id` em kebab-case (ex.: `gabriele`), `name` igual ao id, `displayName` em maiúsculas
    (`GABRIELE`), `description` com a empresa (`INOVAR CONSULTING`).
  - `playable: true`; `boxes: STANDARD_BODY` (`src/fighters/shared/standardBody.ts`), salvo
    motivo de gameplay.
  - `attacks` com os 6 slots e frame data na faixa dos outros (não mexa nos outros lutadores).
  - `specials`: opcional; um especial temático novo precisa de tema em
    `src/render/special/` registrado em `SpecialEffects` (THEMES) e som em
    `scripts/sfx/generate_sfx.py` (veja `src/render/special/workflowTheme.ts`, N8N!).
  - `assets`: `portrait`, `sprite` (sheet + animações), `pixelArt` se for pixel art.
- Acrescente em `ROSTER` (`src/fighters/roster.ts`) **entre os jogáveis, antes do `dmitry`**: a
  posição é a ordem na seleção de personagens.

## 2. Arte (obrigatório)

- `public/fighters/<id>/sprite.png` (RGBA 1536×1120, 8×5 células de 192×224) e
  `public/fighters/<id>/portrait.png` (RGBA 240×300), mesmo padrão dos outros
  ([ART_DIRECTION.md](ART_DIRECTION.md)).
- Fontes, prompts e preparo reproduzível em `scripts/<id>-art/` (README + `prepare.py`); seção
  do personagem no `docs/ART_DIRECTION.md` e linha na tabela de proveniência.
- **Não carregue nada à mão.** O retrato entra no boot e a sprite sheet na tela VS
  (`src/render/assets/sceneAssets.ts`), tudo a partir de `FighterConfig.assets`.

## 3. Modo História (obrigatório para ser "como os outros")

- Uma entrada em `STORY_PROFILES` (`src/story/storyProfiles.ts`):
  `{ fighterId: '<id>', home: '<lugar>' }` (e `encounter` se na história ela estiver em outro
  lugar; `encounterStageId` para um cenário específico do encontro).
- O lugar é um `StoryLocation` de `src/story/locations.ts`. Cidade nova: acrescente com
  `kind: 'city'`, `name`, `region`, `regionCode`, `country`, `latitude`/`longitude`; se o
  marcador encostar em outro no mapa, use `mapLabel`/`mapNudge` (veja Curitiba e Castelo
  Branco).
- Pronto: ela passa a ter campanha própria (4 rivais sorteados + Dmitry) e entra no sorteio
  dos rivais das outras campanhas. Nada nas cenas muda.

## 4. Opcionais (podem vir depois)

- **Cenário próprio:** `src/stages/<id>.ts` + `STAGES` (`src/stages/stageRegistry.ts`) +
  `stageId` no lugar. Arte em `scripts/stage-art/`. Sem cenário, as lutas na cidade usam o
  Partner Summit.
- **Final ilustrado:** `public/story/endings/<id>.jpg` (1440×810, preparado em
  `scripts/story-ending-art/<id>/`) + entrada em `STORY_ENDING_ART`
  (`src/story/storyEndings.ts`). Sem ele, a campanha termina no final padrão (arte de vitória e
  card) e a galeria mostra o retrato no card dela.

## 5. O que se ajusta sozinho (não mexa)

- **Seleção de personagens:** a grade é calculada pela quantidade (10 jogáveis: 5×2; com o
  Dmitry liberado, 11).
- **Galeria de finais:** um card a mais por personagem com campanha e o contador "x/N"
  (hoje 10). O Dmitry passa a exigir todos os finais.
- Luta rápida (CPU em rodízio, cenário pela cidade do rival), VS, HUD, carregamento sob demanda.

## 6. Testes

- Novos, no modelo do Gabriel Mattozo: `tests/<id>Assets.test.ts` (dimensões, células,
  margens) e `tests/<id>Fighter.test.ts` (config e frame data).
- Listas explícitas do elenco que precisam do id novo:
  - `tests/playableRoster.test.ts` (ids jogáveis, na ordem);
  - `tests/storyMode.test.ts` (rotas completas de Augusto e Filipe e a lista de quem tem
    campanha);
  - `tests/storyCampaign.test.ts` (`campaignOpponents` e `routeCities` das rotas completas);
  - `tests/storyFighters.test.ts` e `tests/spriteAssets.test.ts` (assets declarados).
- `npm run check` precisa passar (lint, formatação, tipos, testes e build).

## 7. Documentação

- `TASKS.md` (seção DONE da branch), `docs/GAME_DESIGN.md` (personagem, origem, especial),
  `docs/ART_DIRECTION.md` (arte) e, se criar lugar ou cenário, as seções de Modo História.
