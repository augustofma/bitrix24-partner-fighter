# Bitrix24 Partner Fighter

Fighting game 2D para navegador, inspirado nos jogos de luta arcade dos anos 90, com identidade,
personagens, cenários e assets **totalmente originais**.

A visão de longo prazo é ter personagens inspirados em pessoas do ecossistema Bitrix24, com golpes
ligados ao universo de CRM, automações, WhatsApp, IA, vendas e parceiros. A versão atual é uma
_vertical slice_ pequena e jogável. **AUGUSTO — Arrecife Digital** é o primeiro personagem real
selecionável, com sprite e retrato pixel-art originais gerados a partir das referências aprovadas.
`FIGHTER_A` (sprite demo) e `FIGHTER_B` (placeholder, CPU) continuam como personagens de
desenvolvimento. A seleção começa em Augusto e permite escolher FILIPE e FIGHTER_A; todos enfrentam
FIGHTER_B pela regra genérica do roster que prioriza personagens reservados à CPU.

Augusto tem 100 de vida, mobilidade um pouco maior e socos rápidos com menos dano, compensados
por recuperações maiores nos chutes. Possui seis ataques normais e o especial **24ZAP COMBO** (F / ESP, custo 30).
A barra começa em 0 e vai até 100: +10 por acerto normal, +5 por dano recebido (inclusive de
especial) e +3 quando o normal é bloqueado. Especiais nunca geram energia para quem os executa;
o custo é descontado ao iniciar, mesmo errando; segurar F não repete. A barra é mantida entre
os rounds e zera numa nova partida.
Estatísticas e frame data: [GAME_DESIGN.md](docs/GAME_DESIGN.md#augusto).
A seleção tem visual de fliperama brasileiro: mapa pixel-art procedural ao fundo, grade de
cards (3 × 2 por página, com paginação automática quando o roster cresce), painel de destaque
com retrato ampliado e barras de PODER / VELOCIDADE / ALCANCE derivadas do config, botões
VOLTAR e SELECIONAR. Não há posições específicas por personagem.
Na mesma tela escolhe-se a dificuldade da CPU (FÁCIL, NORMAL ou DIFÍCIL; padrão NORMAL, a
última escolha é lembrada durante a sessão). As lutas são em melhor de 3 rounds e a defesa
depende do nível do golpe: rasteira só se defende agachado e golpes aéreos só em pé
([GAME_DESIGN.md](docs/GAME_DESIGN.md#níveis-de-ataque-e-guarda)).

**FILIPE — Arrecife Digital** tem 100 de vida, mobilidade de 3,25 px/frame e maior alcance,
com startup/recovery maiores e menos dano nos chutes em comparação ao Augusto. Usa seis ataques
e o especial **MINDHUB AGENT** (F / ESP, custo 35, só no chão), com arte pixel-art original
baseada nas fotos e no pôster aprovados.
A montagem reproduzível usa `powershell -File scripts/prepare-filipe-art.ps1`;
fontes e prompts em [scripts/filipe-art/README.md](scripts/filipe-art/README.md).
Os testes dos PNGs usam apenas `fs`/`zlib` do Node; `@types/node` é uma dependência de
desenvolvimento para tipar essa validação de dimensões, alpha e margens. Não entra no jogo.

Para adicionar arte de um lutador, veja
[docs/ART_DIRECTION.md](docs/ART_DIRECTION.md#como-adicionar-arte-de-um-novo-lutador).

A arte do Augusto pode ser remontada com `powershell -File scripts/prepare-augusto-art.ps1`
no Windows (System.Drawing, sem dependências adicionais). Use `-ValidateOnly` para conferir
dimensões, alpha e margens das 40 células. As fontes geradas e os prompts estão em
[scripts/augusto-art/README.md](scripts/augusto-art/README.md); não entram no build do jogo.

> Projeto independente. Não usa logos oficiais nem assets de outras franquias.

## Stack

| Ferramenta                           | Versão | Papel                                 |
| ------------------------------------ | ------ | ------------------------------------- |
| Phaser                               | 3.90   | Engine 2D (render, cenas, input)      |
| TypeScript                           | 6.0    | Linguagem (modo `strict`)             |
| Vite                                 | 8      | Dev server e build                    |
| Vitest                               | 5      | Testes da lógica pura (simulação, IA) |
| ESLint + typescript-eslint, Prettier | 10 / 3 | Lint e formatação                     |

Requer **Node.js 20.19+** (testado com Node 24).

## Instalação e execução

```bash
npm install
npm run dev          # abre em http://localhost:5173
```

Para testar no celular pela rede local:

```bash
npm run dev:host     # expõe o dev server na LAN; abra o IP mostrado no celular
```

## Build de produção

```bash
npm run build        # typecheck + build em dist/
npm run preview      # serve o build localmente
```

O build usa caminhos relativos (`base: './'`), então `dist/` pode ser hospedado em qualquer subpasta.

## Scripts

| Script           | O que faz                                                                      |
| ---------------- | ------------------------------------------------------------------------------ |
| `npm run dev`    | Dev server com hot reload                                                      |
| `npm run build`  | `tsc --noEmit` + build de produção                                             |
| `npm run test`   | Testes unitários (Vitest)                                                      |
| `npm run lint`   | ESLint                                                                         |
| `npm run format` | Prettier (escreve)                                                             |
| `npm run check`  | typecheck + lint + format:check + test + build (use antes de concluir tarefas) |

A arte demo do FIGHTER_A pode ser regenerada com `node scripts/generate-demo-fighter-art.mjs`
(usa só o Node; não é necessário no dia a dia).

## Controles

**Teclado (Player 1)**

| Ação               | Tecla                                        |
| ------------------ | -------------------------------------------- |
| Mover              | ← / →                                        |
| Pular              | ↑                                            |
| Agachar            | ↓                                            |
| Soco               | A                                            |
| Chute              | S                                            |
| Especial           | F (gasta a barra de especial)                |
| Defender           | D                                            |
| Defesa agachada    | ↓ + D                                        |
| Soco agachado      | ↓ + A                                        |
| Rasteira           | ↓ + S                                        |
| Soco / chute aéreo | ↑ e, no ar, A / S (→ + ↑ para pulo diagonal) |
| Menus              | Enter / Espaço confirma, Esc volta           |
| Seleção            | ← / → lutador, ↑ / ↓ dificuldade da CPU      |
| Debug              | F2 mostra hitboxes (ou `?debug=1` na URL)    |

**Touch:** joystick virtual à esquerda (8 direções: ↗ e ↖ fazem o pulo diagonal) e botões
SOCO / CHUTE / DEF / ESP à direita, com multi-touch (ex.: joystick ↗ + CHUTE; ↓ + DEF;
↓ + SOCO; ↓ + CHUTE). Empurrar o joystick para cima dá um pulo; para pular de novo, saia da
zona de cima e volte. Na seleção, os botões
`<` `>` (ou um toque na opção) trocam a dificuldade. Os controles de luta aparecem
automaticamente em dispositivos de toque (force com `?touch=1` ou `?touch=0`). Em celular na
vertical o jogo pede para girar o aparelho.

As teclas ficam em [src/config/controls.ts](src/config/controls.ts) e podem ser remapeadas ali.

## Documentação

- [AGENTS.md](AGENTS.md): regras para agentes de IA e colaboradores
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): estrutura de código e sistemas
- [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md): regras do jogo
- [docs/ART_DIRECTION.md](docs/ART_DIRECTION.md): direção de arte e formato de assets
- [TASKS.md](TASKS.md): backlog (DONE / NEXT / FUTURE)
