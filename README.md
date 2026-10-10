# Bitrix24 Partner Fighter

Fighting game 2D para navegador, inspirado nos jogos de luta arcade dos anos 90, com identidade,
personagens, cenários e assets **totalmente originais**.

A visão de longo prazo é ter personagens inspirados em pessoas do ecossistema Bitrix24, com golpes
ligados ao universo de CRM, automações, WhatsApp, IA, vendas e parceiros. A versão atual é uma
_vertical slice_ pequena e jogável. **AUGUSTO — Arrecife Digital** é o primeiro personagem real
selecionável, com sprite e retrato pixel-art originais gerados a partir das referências aprovadas.
Todo lutador completo do roster (`playable: true`) aparece na seleção: AUGUSTO, FILIPE,
JOÃO GUIOTTI, ROMUALDO, ISAQUE FERREIRA, AISLAN, RÔMULO, GABRIEL MATTOZO, GABRIELE e AMANDA KONRAD.
Todos os dez estão disponíveis na luta rápida. Amanda (BR24) tem 100 de vida, seis normais,
mobilidade média, arte própria e o especial POWER COMBO (POWERZAP + POWERBOT).
Todos os dez têm campanha no Modo História (a Gabriele começa no Rio de Janeiro e a Amanda em
Florianópolis). Na **LUTA RÁPIDA** são três
passos: **seu lutador**, **o rival** (qualquer jogável, inclusive o mesmo; começa sugerindo o
próximo do roster) e **a fase** (todos os cenários ilustrados, com prévia; começa no cenário da
cidade dos lutadores). Esc volta um passo. `FIGHTER_A` (sprite
demo) e `FIGHTER_B` (placeholder) continuam no código para testes e desenvolvimento, com
`playable: false`, e não aparecem na seleção.

Augusto tem 100 de vida, mobilidade um pouco maior e socos rápidos com menos dano, compensados
por recuperações maiores nos chutes. Possui seis ataques normais e o especial **24ZAP COMBO** (F / ESP, custo 30).
A barra começa em 0 e vai até 100: +10 por acerto normal, +5 por dano recebido (inclusive de
especial) e +3 quando o normal é bloqueado. Especiais nunca geram energia para quem os executa;
o custo é descontado ao iniciar, mesmo errando; segurar F não repete. A barra é mantida entre
os rounds e zera numa nova partida.
Estatísticas e frame data: [GAME_DESIGN.md](docs/GAME_DESIGN.md#augusto).
A seleção tem visual de fliperama brasileiro: mapa pixel-art procedural ao fundo, grade de
cards calculada pela quantidade de lutadores (6 → 3 × 2; 7–8 → 4 × 2; 9–10 → 5 × 2; 11–12 →
6 × 2; acima disso, páginas), painel de destaque
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

## Modo História

No menu, **JOGAR** abre **HISTÓRIA** e **LUTA RÁPIDA** (a luta rápida é a de sempre).
Na história escolhe-se um personagem (AUGUSTO, FILIPE, JOÃO GUIOTTI, ISAQUE FERREIRA ou
ROMUALDO) e a dificuldade da CPU. A campanha **começa no lugar do escolhido** (Augusto em Recife,
Filipe em Portugal, João na Rússia, Isaque na Espanha, Romualdo em Joinville) e viaja até cada um dos outros, no lugar deles (as viagens ao
exterior usam um mapa-múndi pixel-art; as nacionais, o mapa do Brasil). Com Augusto:

1. **Recife → Portugal:** luta contra **FILIPE** (de Recife - PE, enfrentado em Portugal).
2. **Portugal → Rússia:** luta contra **JOÃO GUIOTTI** (de São Paulo - SP, enfrentado na Rússia).
3. **Rússia → Espanha:** luta contra **ISAQUE FERREIRA** (enfrentado na Espanha).
4. **Espanha → Joinville:** luta contra **ROMUALDO** (Joinville - SC).
5. **Joinville → próximo desafio local:** luta contra **AISLAN — ZOPU**, sem novo voo.
6. **Joinville → Rússia:** luta contra **DMITRY — FINAL BOSS**, no escritório BITRIX24 MOSCOU.
7. **CAMPANHA CONCLUÍDA**, com JOGAR NOVAMENTE ou VOLTAR AO MENU.

Com João: Rússia → **Recife** (Augusto, no cenário Marco Zero) → Portugal (Filipe) → Espanha
(Isaque) → Joinville (Romualdo). Cada viagem sai de onde a campanha está; o VS mostra o lugar da luta.

Cada luta é melhor de 3, no mesmo motor da luta rápida. Ao perder: TENTAR NOVAMENTE (repete só
aquela luta) ou SAIR PARA O MENU. No mapa, Enter / toque pula o voo ou continua; Esc sai.
O progresso vale para a sessão. Rotas, cidades e rivais são configuração
([ARCHITECTURE.md](docs/ARCHITECTURE.md#modo-história)); regras em
[GAME_DESIGN.md](docs/GAME_DESIGN.md#modo-história).

João Guiotti (técnico, equilibrado) usa arte pixel-art própria, com óculos, blazer preto e
camiseta/tênis brancos. Atlas 1536×1120 (40 células 192×224), retrato 240×300 e alpha real.
[Fontes e preparo](scripts/joao-guiotti-art/README.md). Romualdo também usa arte própria: cabeça raspada, óculos, barba grisalha e blazer azul-marinho.
[Fontes e preparo do Romualdo](scripts/romualdo-art/README.md).
João tem o especial **ALAIO VIBECODE!** e Romualdo o **GPTMAKER!** (F / ESP; veja abaixo).

**ISAQUE FERREIRA** usa arte original com jaqueta bege, camiseta/calça pretas e tênis brancos.
Perfil equilibrado: vida 100, caminhada 3,1, recuo 2,5, pulo 16,5 e deslocamento aéreo 3,9.
Seis normais e o especial **ALAIO VIBECODE!** (o mesmo do João).
[Arte e preparo](scripts/isaque-ferreira-art/README.md).

**ALAIO VIBECODE!** (João e Isaque, custo 30, só no chão): um editor de código digita atrás
do ombro e duas ondas neon (magenta e ciano) levam tokens `</>` e `{ }` até o rival; no acerto,
glitch com divisão RGB e um ✓ de "build passou". **GPTMAKER!** (Romualdo, custo 35, só no chão,
o especial mais forte e mais lento): uma planta azul é projetada, um robozinho-agente é montado
bloco a bloco atrás do ombro e dispara um feixe âmbar sobre um fluxo de nós; no acerto, explosão
estelar, anel de engrenagem e blocos voando. Os dois têm emblema pixel-art original e som próprio.

## GABRIELE — INOVAR CONSULTING

Selecionável como jogador ou CPU na luta rápida; no Modo História mora no Rio de Janeiro
(cenário RIO DE JANEIRO, calçadão de Copacabana). Vida 100, caminhada 3,25, recuo 2,55,
salto 16,5 e velocidade aérea 3,9. Seis normais equilibrados, alguns com startup rápido.
Especial **CHAMA O 190!** (F / ESP, custo 40, só no chão): ela chama a polícia, uma viatura
chega de sirene ligada e os policiais disparam uma rajada no rival (o maior alcance do elenco,
mas lento para sair e muito punível na defesa). Arte original com cabelo vermelho longo, óculos grandes,
camisa creme e proporções naturais. Atlas RGBA 1536×1120 (40 frames 192×224), portrait
240×300, scale 1 e offsets 0/8. [Fontes e preparo](scripts/gabriele-art/README.md).

## GABRIEL MATTOZO — GMC

Perfil ágil: vida 100, caminhada 3,4, recuo 2,8, salto 16,8 e velocidade aérea 4,1.
Seis normais de dano médio, com startups curtos e recuperação que permite punição.
Selecionável como jogador e CPU na luta rápida; sem especial exclusivo ou Story Route.
Arte própria com óculos pretos, hoodie bege, jeans escuro e tênis branco. Atlas 1536×1120
(40 frames 192×224), portrait 240×300, scale 1 e offsets 0/8.
[Fontes, prompts e preparo](scripts/gabriel-mattozo-art/README.md).
É de **Curitiba - PR**: na história a campanha dele começa lá e as outras o enfrentam lá, no
cenário próprio **CURITIBA** (o Jardim Botânico, com a estufa, torcida e o avião da faixa "GMC";
[arte e preparo](scripts/stage-art/curitiba/README.md)).
Especial **N8N!** (F / ESP, custo 30, só no chão): um fluxo de automação disparado no rival, com
nós, conexões e pacotes de dados até o alvo.

## RÔMULO — ARRECIFE DIGITAL

Selecionável na luta rápida, como jogador ou rival CPU. Vida 100, caminhada 3,0, recuo 2,4,
salto 16,5 e velocidade aérea 3,9. Seis normais um pouco mais fortes, compensados por recuperação
maior. Usa os dois especiais da casa, **24ZAP!** e **MINDHUB AGENT**, um de cada vez: cada F / ESP
solta o outro. Corpo robusto preservado na arte.
É da Arrecife Digital, mas mora em **Castelo Branco, Portugal**: na história a campanha dele começa
lá e as outras o enfrentam lá, no cenário próprio **CASTELO BRANCO** (o terraço das muralhas sobre
a cidade, com torcida e o avião da faixa "Arrecife Digital";
[arte e preparo](scripts/stage-art/castelo-branco/README.md)), logo antes do chefe final. Tem
final ilustrado próprio (calçadão à beira-mar ao pôr do sol).
Sprite RGBA 1536×1120 (40 células 192×224), portrait 240×300, scale 1 e offsets 0/8.
[Fontes, prompts e preparo](scripts/romulo-art/README.md).

## AISLAN — ZOPU

Novo fighter equilibrado: vida 100, caminhada 3,1, recuo 2,5, pulo 16,5 e velocidade aérea 3,9.
Seis normais e o especial **FLUIDZ!** (F / ESP, custo 30, só no chão): um jato roxo de líquido
(o roxo da Fluidz, com o emblema da logo)
que ondula até o rival e explode num splash de gotas. Arte original, atlas 1536×1120 (40 frames 192×224) e
portrait 240×300; [fontes, prompts e preparo](scripts/aislan-art/README.md).
Na história entra após Romualdo, na mesma Joinville, mas luta no cenário próprio
**JOINVILLE (ZOPU)** (`joinville-zopu`): o mesmo pórtico com bandeirinhas e banners da ZOPU e o
avião rebocando a faixa "zopu" ([arte e preparo](scripts/stage-art/joinville-zopu/README.md)). O
Romualdo continua no Joinville da CRMThink. A escolha vem do `encounterStageId` do perfil.

## BITRIX24 MOSCOU — chefe final

Cenário **BITRIX24 MOSCOU** (`bitrix24-moscow`): o salão da sede da Bitrix24 em Moscou, com o
Kremlin e o Moscow City atrás do vidro, o urso, os troféus e o logo no piso
([arte e preparo](scripts/stage-art/bitrix24-moscow/README.md)). É o cenário do **Dmitry**, o chefe
final do Modo História (`STORY_FINAL_BOSS`). Na luta rápida pode ser escolhido na seleção de
fase. Na história só aparece na última luta, contra o Dmitry. Toda campanha termina nessa etapa.
O chefe fica fora da seleção comum (`playable: false`), sem campanha própria. Especial de chefe
**ALAIO STRIKE!** (custo 50, só no chão): ergue o punho e raios caem do céu no estágio inteiro;
distância e pulo não salvam, só a defesa (em pé ou agachado) evita o dano.
Vida 108; caminhada 3,0/2,4; salto 16,5/3,9. Sprite 1536×1344 (41 poses em células 192×224),
portrait 240×300, scale 1 e offsets 0/8. [Arte e reprodução](scripts/dmitry-art/README.md).

## Stack

| Ferramenta                           | Versão | Papel                                 |
| ------------------------------------ | ------ | ------------------------------------- |
| Phaser                               | 3.90   | Engine 2D (render, cenas, input)      |
| TypeScript                           | 6.0    | Linguagem (modo `strict`)             |
| Vite                                 | 8      | Dev server e build                    |
| Vitest                               | 5      | Testes da lógica pura (simulação, IA) |
| ESLint + typescript-eslint, Prettier | 10 / 3 | Lint e formatação                     |

Requer **Node.js 20.19+** (testado com Node 24).

## Jogar online (GitHub Pages)

**https://augustofma.github.io/bitrix24-partner-fighter/**: abre no navegador, desktop ou celular
(na horizontal).

O site é a branch `gh-pages`, que guarda só o jogo compilado (`dist/`). O workflow
[`.github/workflows/pages.yml`](.github/workflows/pages.yml) republica a cada push na `main`:
roda o `npm run check`, compila e atualiza a `gh-pages` (um build quebrado nunca vai ao ar).
Configuração única no GitHub: o repositório público (ou um plano com Pages em repositório
privado) e **Settings → Pages → Deploy from a branch → `gh-pages` / `(root)`**.

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

| Ação               | Tecla                                                                          |
| ------------------ | ------------------------------------------------------------------------------ |
| Mover              | ← / →                                                                          |
| Pular              | ↑                                                                              |
| Agachar            | ↓                                                                              |
| Soco               | A                                                                              |
| Chute              | S                                                                              |
| Especial           | F (gasta a barra de especial)                                                  |
| Defender           | D                                                                              |
| Defesa agachada    | ↓ + D                                                                          |
| Soco agachado      | ↓ + A                                                                          |
| Rasteira           | ↓ + S                                                                          |
| Soco / chute aéreo | ↑ e, no ar, A / S (→ + ↑ para pulo diagonal)                                   |
| Menus              | Enter / Espaço confirma, ← / → modo, Esc volta                                 |
| Seleção            | ← / → e ↑ / ↓ lutador na grade (seu, depois o rival), Q / E dificuldade da CPU |
| Fase               | ↑ / ↓ / ← / → cenário, Enter luta, Esc volta ao rival                          |
| Som                | M liga/desliga música, efeitos, narrador e torcida                             |
| Debug              | F2 mostra hitboxes (ou `?debug=1` na URL)                                      |

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
