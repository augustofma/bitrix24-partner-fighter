# Bitrix24 Partner Fighter

Fighting game 2D para navegador, inspirado nos jogos de luta arcade dos anos 90, com identidade,
personagens, cenários e assets **totalmente originais**.

A visão de longo prazo é ter personagens inspirados em pessoas do ecossistema Bitrix24, com golpes
ligados ao universo de CRM, automações, WhatsApp, IA, vendas e parceiros. A versão atual é uma
_vertical slice_ pequena e jogável. **AUGUSTO — Arrecife Digital** é o primeiro personagem real
selecionável, ainda com visual geométrico provisório preto e azul, sem arte definitiva.
`FIGHTER_A` (sprite demo) e `FIGHTER_B` (placeholder, CPU) continuam como personagens de
desenvolvimento. A seleção começa em Augusto e permite escolher FIGHTER_A; ambos enfrentam
FIGHTER_B pela regra genérica do roster que prioriza personagens reservados à CPU.

Augusto tem 100 de vida, mobilidade um pouco maior e socos rápidos com menos dano, compensados
por recuperações maiores nos chutes. Possui os seis ataques atuais e nenhum especial.
Estatísticas e frame data: [GAME_DESIGN.md](docs/GAME_DESIGN.md#augusto).
A seleção pagina automaticamente a cada quatro cards quando o roster cresce; setas do teclado
ou botões laterais percorrem os selecionáveis. Não há posições específicas por personagem.

Para adicionar arte de um lutador, veja
[docs/ART_DIRECTION.md](docs/ART_DIRECTION.md#como-adicionar-arte-de-um-novo-lutador).

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
| Defender           | D                                            |
| Defesa agachada    | ↓ + D                                        |
| Soco agachado      | ↓ + A                                        |
| Rasteira           | ↓ + S                                        |
| Soco / chute aéreo | ↑ e, no ar, A / S (→ + ↑ para pulo diagonal) |
| Menus              | Enter / Espaço confirma, Esc volta           |
| Debug              | F2 mostra hitboxes (ou `?debug=1` na URL)    |

**Touch:** direcional à esquerda (◀ ▶ ▲ ▼) e botões SOCO / CHUTE / DEF à direita, com
multi-touch (ex.: ▶ + ▲, depois CHUTE; ▼ + DEF; ▼ + SOCO; ▼ + CHUTE). Aparecem
automaticamente em dispositivos de toque (force com `?touch=1` ou `?touch=0`). Em celular na
vertical o jogo pede para girar o aparelho.

As teclas ficam em [src/config/controls.ts](src/config/controls.ts) e podem ser remapeadas ali.

## Documentação

- [AGENTS.md](AGENTS.md): regras para agentes de IA e colaboradores
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): estrutura de código e sistemas
- [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md): regras do jogo
- [docs/ART_DIRECTION.md](docs/ART_DIRECTION.md): direção de arte e formato de assets
- [TASKS.md](TASKS.md): backlog (DONE / NEXT / FUTURE)
