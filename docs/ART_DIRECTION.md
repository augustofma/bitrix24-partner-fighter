# Direção de Arte

> Estado atual (v0.2): o **pipeline de sprites está pronto**. O FIGHTER_A usa uma spritesheet
> **de demonstração** (gerada por script, não é arte final); o FIGHTER_B e o cenário ainda são
> desenhados em código. Este documento define a direção artística e o formato dos assets.

## Direção

- **Gênero e época:** fighting game arcade dos anos 90 (energia, cores saturadas, leitura
  imediata de silhuetas e golpes).
- **Técnica:** pixel art de alta qualidade **ou** ilustração 2D (a decidir num estudo de estilo).
  A escolha deve ser única para todo o jogo.
- **Personagens:** caricaturais e expressivos, inspirados em pessoas do ecossistema Bitrix24
  (somente com autorização delas). Golpes e poses ligados ao universo de CRM, automações,
  WhatsApp, IA, vendas e parceiros.
- **Identidade brasileira:** cores, humor, cenários e referências culturais do Brasil.
- **Interface arcade:** barras de vida chamativas, tipografia grossa com contorno, anúncios
  grandes ("ROUND 1", "FIGHT!", "K.O.") no mesmo letreiro do título da vitória (veja
  "Tipografia").
- **Originalidade total:** nada copiado ou "inspirado de perto" em Street Fighter, Mortal Kombat,
  King of Fighters ou outras franquias. Sem logos oficiais (inclusive o do Bitrix24) até haver
  autorização e guia de marca.

## Regras técnicas para lutadores

- Resolução lógica do jogo: **960x540**. Um lutador de porte médio em pé ocupa cerca de
  **170 px de altura na tela** (cerca de 1/3 da altura), que é o tamanho da hurtbox padrão. O
  tamanho **nativo** do frame é livre: ajuste com `visual.scale`.
- **A arte nunca define colisão.** Hitboxes, hurtboxes e pushbox ficam no `FighterConfig`
  (`boxes`, `attacks[].hitbox`). Desenhe a arte para combinar com as caixas e confira com F2.
- **A arte nunca define timing.** A duração de cada golpe vem do frame data
  (`startupFrames`, `activeFrames`, `recoveryFrames`). Os frames do sprite são distribuídos
  automaticamente sobre essas fases.
- **Desenhe olhando para a direita.** O jogo espelha (`flipX`); não crie sprites para a esquerda.
- **Pés no centro da base do frame.** A posição lógica do lutador é o centro dos pés, e o sprite
  é ancorado no centro da borda inferior do frame. Se a sua arte tiver margem embaixo ou estiver
  descentralizada, compense com `visual.offsetX` / `visual.offsetY`.
- **Margem para golpes.** O frame precisa caber o chute esticado e o corpo deitado no KO.
- **Pixel art:** use `pixelArt: true` em `assets` (filtro "nearest", sem borrar) e prefira
  escalas inteiras (2x, 3x).

## Estrutura de assets

```
public/
  fighters/
    <fighter-id>/
      sprite.png          Spritesheet em grade com todas as animações
      portrait.png        Retrato para seleção / VS / vitória
  stages/
    <stage-id>/           Camadas de fundo (parallax): sky, far, mid, floor
  ui/                     Molduras de HUD, fontes bitmap, ícones
  audio/
    music/                Trilhas
    sfx/                  Golpes, bloqueio, KO, anúncios
    voices/<fighter-id>/  Falas dos personagens
```

### Spritesheet

- **Uma imagem PNG em grade**, com todos os frames do mesmo tamanho (`frameWidth` x
  `frameHeight`), sem espaçamento entre eles e fundo transparente.
- Frames numerados **da esquerda para a direita, de cima para baixo, a partir de 0**.
- Pode sobrar espaço vazio no fim da grade.

### Animações (uma por estado do lutador)

Lista completa de poses de um lutador (uma animação por estado do jogo):

`idle`, `walk`, `jump`, `crouch`, `punch`, `kick`, `crouchPunch`, `crouchKick`, `airPunch`,
`airKick`, `block`, `crouchBlock`, `hurt`, `knockout`, `victory`.

Para arte final, desenhe **todas**. Só `idle` é tecnicamente obrigatória: qualquer outra que
falte mostra a animação de fallback da tabela (e o console avisa em `npm run dev`).

| Estado        | Obrigatória | Sugestão de frames        | Comportamento padrão                             | Se faltar, mostra |
| ------------- | ----------- | ------------------------- | ------------------------------------------------ | ----------------- |
| `idle`        | **sim**     | 4                         | loop                                             | (obrigatória)     |
| `walk`        | não         | 4 a 8                     | loop                                             | idle              |
| `jump`        | não         | 3 (subida, tuck, descida) | escolhido pela velocidade vertical               | idle              |
| `crouch`      | não         | 1                         | toca uma vez e segura                            | idle              |
| `punch`       | não         | 3 (prep, impacto, volta)  | sincronizado ao frame data                       | idle              |
| `kick`        | não         | 3 (prep, impacto, volta)  | sincronizado ao frame data                       | punch             |
| `crouchPunch` | não         | 3 (prep, impacto, volta)  | sincronizado ao frame data                       | crouch            |
| `crouchKick`  | não         | 3 (prep, impacto, volta)  | sincronizado ao frame data                       | crouchPunch       |
| `airPunch`    | não         | 2 (prep, impacto mantido) | sincronizado ao frame data                       | jump              |
| `airKick`     | não         | 2 (prep, impacto mantido) | sincronizado ao frame data                       | airPunch          |
| `block`       | não         | 1                         | toca uma vez e segura                            | idle              |
| `crouchBlock` | não         | 1 (agachado, guarda alta) | toca uma vez e segura                            | crouch            |
| `hurt`        | não         | 1 a 2                     | toca uma vez e segura                            | idle              |
| `knockout`    | não         | 2 a 3 (cai, deitado)      | toca uma vez e segura                            | hurt              |
| `victory`     | não         | 2 a 4                     | toca uma vez e segura (ou loop com `repeat: -1`) | idle              |

Campos de cada animação:

| Campo          | Tipo                                                                                  | Padrão                                |
| -------------- | ------------------------------------------------------------------------------------- | ------------------------------------- |
| `frames`       | lista de índices do sheet                                                             | obrigatório                           |
| `frameRate`    | frames por segundo (só visual)                                                        | 10                                    |
| `repeat`       | `-1` loop, `0` uma vez, `n` repete n vezes                                            | loop em idle/walk, uma vez nos demais |
| `attackPhases` | `{ startup, active, recovery }` (quantos frames em cada fase; soma = `frames.length`) | 1 frame de impacto no meio            |
| `jumpPhases`   | `{ rise, apex, fall }` (só `jump`; soma = `frames.length`)                            | 3 frames = 1 cada; 2 = subida/descida |

Em golpes, `frameRate` e `repeat` são ignorados: os frames acompanham o frame data. Com 3 frames
(padrão), o 1º aparece durante o startup, o 2º **exatamente nos frames ativos** (quando a hitbox
existe) e o 3º durante o recovery.

Poses específicas:

- **`airPunch` / `airKick`:** desenhe com o corpo no ar (pernas recolhidas), com os **pés do
  quadro na mesma referência dos frames de pulo** (centro da base = posição lógica). É comum
  manter a pose de impacto até o fim: use `attackPhases: { startup: 1, active: 1, recovery: 0 }`
  com 2 frames. O chute aéreo do corpo padrão aponta para a frente e para baixo e pega levemente
  atrás do corpo (cross-up); confira com F2 se a perna cobre a hitbox.
- **`jump`:** o frame vem da **velocidade vertical** (subida, ápice com |vy| < 3 px/frame,
  descida), não do tempo no estado. Assim, um pulo retomado depois de um ataque aéreo mostra a
  fase certa. Vários frames numa mesma fase alternam no `frameRate`.
- **`crouchBlock`:** mesma altura do `crouch` (a hurtbox agachada não muda), com os braços em
  guarda à frente do rosto, para diferenciar visualmente do agachado comum.
- **`crouchPunch` / `crouchKick`:** o corpo **fica agachado em todos os frames** (prep, impacto e
  volta): a hurtbox é a agachada o golpe inteiro e, terminado o golpe, o lutador volta direto ao
  `crouch`. Nunca desenhe um frame de "levantar". O soco agachado vai na altura do tronco do
  adversário (hitbox padrão y −92 a −70); a rasteira estende a perna da frente rente ao chão
  (hitbox y −28 a −4, bem comprida). Como sempre, confira com F2.
- O lutador **não vira no ar**: os golpes aéreos são desenhados só olhando para a direita, como
  todo o resto, e o jogo espelha conforme a direção em que o pulo começou.

## Como adicionar arte de um novo lutador

1. **Pasta.** Crie `public/fighters/<fighter-id>/` (mesmo `id` do `FighterConfig`).
2. **Portrait.** Salve `portrait.png` (busto ou corpo; qualquer proporção, ele é ajustado ao
   card com "contain" e alinhado pela base). Sugestão: cerca de 240x300 px.
3. **Spritesheet.** Salve `sprite.png` em grade (regras acima), arte olhando para a direita e
   pés no centro da base de cada frame.
4. **Dimensões dos frames.** Informe `frameWidth` e `frameHeight` exatamente como na grade. Não
   há tamanho único obrigatório: cada personagem pode ter o seu.
5. **Animations.** Liste os índices de cada estado em `assets.sprite.animations` (no mínimo
   `idle`).
6. **Scale.** Ajuste `visual.scale` para o corpo ficar com a altura da hurtbox (cerca de 170 px
   na tela para o corpo padrão). Exemplo: corpo de 85 px no frame → `scale: 2`.
7. **Offsets.** Ligue o F2 (ou abra com `?debug=1`) e ajuste `visual.offsetX` / `offsetY` até o
   ponto branco (posição lógica) ficar entre os pés e o corpo dentro da hurtbox verde. O
   `offsetX` positivo vai para a frente do lutador e é espelhado automaticamente.
8. **Fallback.** Se a imagem não carregar ou a config tiver erro, o jogo **não quebra**: o
   lutador usa o placeholder geométrico e o console (em `npm run dev`) mostra mensagens
   `[assets]` explicando o problema. Animações que faltarem usam a animação parecida da tabela.

Exemplo completo (o do FIGHTER_A, em `src/fighters/fighterA.ts`):

```ts
assets: {
  portrait: 'fighters/fighter-a/portrait.png',
  pixelArt: true,
  sprite: {
    sheet: {
      key: 'fighter-a-demo-sheet',          // único no jogo todo
      path: 'fighters/fighter-a/sprite.png',
      frameWidth: 96,
      frameHeight: 112,
    },
    visual: { scale: 2, offsetX: 0, offsetY: 0 },
    animations: {
      idle: { frames: [0, 1, 2, 3], frameRate: 6 },
      walk: { frames: [4, 5, 6, 7], frameRate: 10 },
      jump: { frames: [8, 9, 31] }, // subida, ápice (tuck), descida
      crouch: { frames: [10] },
      punch: { frames: [11, 12, 13] },
      kick: { frames: [14, 15, 16] },
      crouchPunch: { frames: [32, 33, 34] },
      crouchKick: { frames: [35, 36, 37] },
      airPunch: { frames: [26, 27], attackPhases: { startup: 1, active: 1, recovery: 0 } },
      airKick: { frames: [28, 29], attackPhases: { startup: 1, active: 1, recovery: 0 } },
      block: { frames: [17] },
      crouchBlock: { frames: [30] },
      hurt: { frames: [18, 19], frameRate: 12 },
      knockout: { frames: [20, 21, 22], frameRate: 8 },
      victory: { frames: [23, 24, 25], frameRate: 6, repeat: -1 },
    },
  },
},
```

Nada além do `FighterConfig` precisa mudar: a BootScene carrega os assets declarados pelo roster
automaticamente.

### Substituir a arte demo do FIGHTER_A

Troque `public/fighters/fighter-a/sprite.png` e `portrait.png` pela arte final e atualize em
`fighterA.ts`: `frameWidth`/`frameHeight`, os índices de `animations`, `visual` e `pixelArt`
(remova se a arte não for pixel art). Use uma `key` nova (ex.: `fighter-a-sheet`). Depois disso,
`scripts/generate-demo-fighter-art.mjs` pode ser apagado.

## AUGUSTO

Primeiro personagem real: **AUGUSTO — Arrecife Digital**. Usa arte pixel-art original gerada
com ImageGen a partir das fotos e do concept aprovados pelo usuário. Homem adulto robusto,
cabelo curto escuro, barba cheia aparada, blazer/camisa/calça/tênis pretos e cordão/crachá azul.

Direção visual:

- Homem adulto, camisa preta e detalhes azuis ligados à Arrecife Digital.
- Crachá azul pode fazer parte do design; tatuagens podem aparecer.
- Estética de fighting game arcade, sprite estilizado e portrait mais detalhado que o sprite.
- A aparência segue as referências fornecidas; não foram usados sprites de franquias.

`sprite.png` tem 1536×1120 px, 8×5 células de 192×224 e 40 frames com alpha real.
`portrait.png` tem 240×300 px com alpha real. O manifesto em `src/fighters/augusto.ts`
usa `pixelArt: true`, `scale: 1`, `offsetX: 0`, `offsetY: 8`: sola terrestre na linha
216 da célula, com oito pixels transparentes abaixo. Idle ocupa cerca de 170–174 px.
Poses aéreas mantêm espaço abaixo dos pés; poses agachadas permanecem baixas.

A ordem dos frames e os comandos reproduzíveis estão no
[README dos assets](../public/fighters/augusto/README.md).
As fontes e o conjunto de prompts ficam em `scripts/augusto-art/`. A preparação offline usa
recortes revisados, remoção de fragmentos desconectados, escala proporcional por vizinho mais
próximo e margem mínima de quatro pixels. A recuperação do chute foi gerada separadamente;
a queda do KO foi ordenada da pose inclinada até o corpo deitado. Ajustes de posição nas poses
ativas aproximam os membros das hitboxes sem mudar gameplay. A correspondência é aproximada,
não uma silhueta idêntica às caixas; guarda e hurt têm o corpo curvado dentro da hurtbox em pé.

Seleção, VS, HUD, estados, flipX e cross-up foram conferidos no Chrome com F2. Nenhuma alteração
foi feita no core, BootScene, FightScene, CombatSystem ou no renderer.

## FILIPE GOMES

**FILIPE — Arrecife Digital** usa as duas fotos de identidade e o pôster aprovado como referências.
Cabelo cacheado escuro, barba curta, pele morena, proporções naturais, blazer azul escuro,
camisa/calça pretas e tênis brancos. Sem logos. ImageGen integrado produziu sprite e portrait
pixel-art originais, na linguagem visual do Augusto; o portrait é mais detalhado.

Atlas 1536×1120, grade 8×5, 40 células 192×224 e alpha real; portrait 240×300 com alpha.
Escala 1, offsets 0/8 e baseline 216; idle e caminhada com 172 px de altura. Todas as células
mantêm margem transparente de pelo menos 4 px; poses aéreas preservam elevação.
A ordem de frames coincide com a do Augusto. Ataques têm fases 1/1/1 e pulo 1/1/1.

O script offline usa regiões revisadas, raízes do corpo por pose e vizinho mais próximo.
Idle4 retorna à guarda de idle2; recuperação do soco agachado retorna ao crouch para não erguer
o corpo. Isso reaproveita a arte original gerada. A apresentação pode ser refinada sem alterar
hitboxes ou frame data. Fontes e prompts: [filipe-art](../scripts/filipe-art/README.md).
Comandos e mapa: [README dos assets](../public/fighters/filipe/README.md).
O chute ativo foi gerado separadamente para alinhar a perna com a cintura; o soco aéreo foi
reposicionado 8 px para baixo. F2 confirmou correspondência aproximada às caixas, sem alterar
gameplay. Seleção, VS, HUD, controles, flipX, cross-up e resultados por KO foram validados no
Chrome. As poses de guarda/hurt dobram o corpo dentro da hurtbox padrão; arte não muda colisão.

## JOÃO GUIOTTI

Arte original produzida com ImageGen integrado a partir das fotos e pôster aprovados: pele
clara, cabelo castanho para cima, barba aparada, óculos, blazer preto, camiseta branca, calça
preta e tênis brancos. Linguagem pixel-art do elenco, proporções naturais e poses para a direita.
Atlas RGBA 1536×1120, 40 células 192×224; portrait RGBA 240×300. Scale 1, offsets 0/8.
Baseline 216 e margens mínimas 4 px, com elevação aérea. Fases de pulo e ataques 1/1/1.
[Prompts, fontes e montagem reproduzível](../scripts/joao-guiotti-art/README.md).
Arte original do projeto, sem assets de terceiros; nenhuma mudança de gameplay.

## ROMUALDO

Arte original gerada com ImageGen integrado a partir das fotos e do pôster aprovados. Cabeça
raspada, óculos, barba grisalha curta, blazer azul-marinho, camiseta branca e calça escura.
Atlas RGBA 1536×1120, grade 8×5 com 40 células 192×224; portrait RGBA 240×300. Scale 1,
offsetX 0, offsetY 8; baseline 216 e margem mínima 4 px. Pulo e ataques com fases 1/1/1.
[Fontes, prompts e preparação](../scripts/romualdo-art/README.md). Gameplay e identidade do
config existente preservados.

## ISAQUE FERREIRA

Arte original ImageGen baseada nas fotos e pôster aprovados: cabeça raspada, barba escura,
expressão sorridente, overshirt bege clara, camiseta/calça pretas, tênis brancos e relógio preto.
Sem logos ou crachá. Sheet RGBA 1536×1120, 8×5 células 192×224; portrait RGBA 240×300.
Scale 1, offsets 0/8, baseline 216 e margens mínimas 4 px; fases de ataques e pulo 1/1/1.
[Fontes, prompts, mapa e preparação](../scripts/isaque-ferreira-art/README.md).

## Tela inicial

Arte oficial aprovada: arena neon com globo, holofotes, troféu e telões, **João Guiotti** à
esquerda (azul) e **Isaque Ferreira** à direita (roxo) em guarda, o logo "BITRIX24 / PARTNER
FIGHTER" centralizado e o botão START. A fonte fica em `scripts/title-art/source.webp`;
`prepare_title_art.py` separa as camadas em `public/ui/title/` (detalhes em
[scripts/title-art/README.md](../scripts/title-art/README.md)). Nada foi redesenhado.

- **Entrada (~0,9 s):** fundo com fade, os lutadores acendem num brilho ciano/violeta, o logo
  cresce de 0,9 a 1 e o START aparece com um pop; depois entra o loop.
- **Logo:** flutua 8 px para cima e volta (~2,2 s, seno) e respira 1,2%, sobre uma área limpa.
- **START:** camada real. Brilho dourado respirando parado, hover 1,03 com brilho maior,
  pressionado 0,97; hit area 22 px maior que o desenho.
- **Dica:** "— PRESSIONE START OU TOQUE —" em Russo One, pulsando de leve.
- **Vento:** um vento da arena (da direita para a esquerda, em rajadas lentas) move o cabelo
  do João (tufos para trás, até ~2,6 px) e o tecido dos dois: gola, costas, barra e manga
  (1-1,6 px). A borda presa ao corpo fica parada; rosto, mãos e anatomia não se mexem.
- **Ambiente:** luzes dos holofotes, do troféu e do globo pulsando suavemente e faíscas
  pequenas subindo e piscando.
- Se a arte não carregar, a `MenuScene` volta ao visual procedural anterior.

## Tela de vitória

Arte aprovada de uma arena noturna com holofotes, torcida, placas "BITRIX24 PARTNER FIGHTER" e
confete, com o card do vencedor, o painel do resultado e o botão VOLTAR AO MENU. A fonte fica em
`scripts/victory-art/source.png`; o preparo está em
[scripts/victory-art/README.md](../scripts/victory-art/README.md).

- **Título:** "<NOME> VENCEU!" (ou EMPATE) com letreiro de jogo de luta gerado em código
  (`src/ui/victory/fightTitle.ts`), igual para todo vencedor: fonte Bangers (OFL, incluída no
  jogo), inclinada para a frente, degradê quente (vermelho no topo, laranja, amarelo e creme
  embaixo), contorno escuro grosso com linha interna vermelho-escura, riscos de pincel seco
  só sobre as letras e sombra projetada forte. Um brilho quente respira por cima. Nomes longos
  são reduzidos para caber (até 860 px), sempre centralizados. Entra com pop e bounce e depois
  flutua 3 px.
- **Card:** moldura da arte sobre a janela azul-marinho com listras laterais; dentro, o retrato
  real do vencedor (os dois no empate) e o nome na plaqueta. A moldura pulsa um brilho ciano, um
  halo suave fica atrás, o card flutua 3 px e um brilho cruza a janela de tempos em tempos.
- **Resultado:** três papéis tipográficos (`ResultRole`, em `victoryText.ts`), todos com fontes
  do jogo e renderizados em 2x para ficarem nítidos pequenos:
  - **veredito** ("VOCÊ VENCEU!" dourado / "VOCÊ PERDEU" magenta): Russo One 20 px, contorno
    escuro, sombra dura e espaçamento de 1,5 px, o maior destaque;
  - **detalhe** (motivo, ou a rota na campanha concluída): Russo One 14 px, branco-azulado
    (#D9E4FF), contorno fino, mais neutro;
  - **placar** ("2 x 0"): Press Start 2P 15 px dourado com contorno, os dígitos de placar do HUD;
  - separados por quadradinhos ciano. Textos longos são reduzidos para caber no painel (com 36 px
    de margem), nunca cortados.
- **Botão:** a arte do VOLTAR AO MENU, com hover 1,03 e brilho, pressionado 0,97.
- **Detalhes:** confete pixelado caindo, quadradinhos neon subindo e brilhos, sempre atrás do
  card e dos textos.

## Cenário: Bitrix24 Partner Summit

Ilustração pixel-art aprovada de um auditório de evento: painel de LED "Bitrix24 Partner
Summit", palco com poltronas, o presidente sentado ao centro, público com lightsticks e um chão
de arena com reflexos. É o cenário padrão das lutas. A fonte fica em
`scripts/stage-art/partner-summit/source.webp`; o preparo está em
[scripts/stage-art/partner-summit/README.md](../scripts/stage-art/partner-summit/README.md).

- A arte fica 12% maior que a tela e rola com parallax. O topo foi posicionado para o título
  do painel aparecer logo abaixo do HUD, e os pés dos lutadores ficam no chão, entre a
  barreira e a linha ciano.
- **Público:** colunas de ~46 px pulam em onda: 1,5 px a 1,1 Hz durante a luta, 3,5 px a
  2,6 Hz comemorando.
- **Presidente:** a cabeça olha para um lado e para o outro (troca rápida com leve achatamento)
  e acena levemente com a cabeça; a mão levantada balança como quem fala. Comemorando, ele olha
  ao redor mais rápido e a mão vira um aceno amplo (±28°).
- A arte não define gameplay: arena, chão e paredes são os do PARTNER ARENA.

## Cenário: RECIFE (Marco Zero)

Arte oficial fornecida pelo dono do projeto: o Marco Zero de Recife em pixel art, com prédios
históricos, palmeiras, bandeirinhas, bandeiras azuis da Arrecife Digital, a torcida atrás da
grade, o piso de mosaico da praça e um avião rebocando a faixa "Arrecife Digital". A
composição não foi redesenhada: o preparo
([scripts/stage-art/recife/README.md](../scripts/stage-art/recife/README.md)) só tira o avião,
as cordas e a faixa do céu (preenchido por difusão) para eles voarem como camadas próprias.

- Mesmo enquadramento do Partner Summit (arte 12% maior que a tela, parallax); `top` −12
  põe os pés dos lutadores no piso da praça, à frente da grade, sem pisar na torcida. Céu e
  prédios principais ficam inteiros em 1280×720, 1920×1080 e 844×390.
- **Torcida:** colunas de ~20 px (uma pessoa) em grupos com loops, ritmos, alturas e atrasos
  diferentes; ninguém pula em sincronia. Debaixo dos guarda-sóis a faixa começa abaixo das
  lonas, que nunca pulam. Flashes de celular em pixel (ponto branco com cruz curta).
- **Avião:** voa da direita para a esquerda, como aponta na arte, **atrás dos prédios**: uma
  camada de recorte (`skyline.png`, o topo do próprio fundo com céu e nuvens transparentes) é
  desenhada por cima dele, então torre, cúpulas, palmeiras e antenas passam na frente. Em
  escala 0,62 (parece distante), alto no céu (y 98, logo abaixo do HUD), a 80 px/s (~18 s na
  tela); balança 1,6 px e inclina ±1°; a hélice gira em 4 quadros. Cordas escuras de 1 px.
- **Faixa:** 24 tiras que ondulam até 1,6 px, paradas junto às cordas e mais soltas na cauda,
  seguindo o balanço do avião com atraso. O texto continua legível no céu aberto.
- A arte não define gameplay: arena, chão e paredes são os do PARTNER ARENA.

## Cenário: JOINVILLE (Pórtico)

Arte oficial fornecida pelo dono do projeto: o pórtico de entrada de Joinville em pixel art
(enxaimel, telhado de madeira com o letreiro "Joinville"), palmeiras, bandeirinhas e banners
laranja da CRMThink, a torcida atrás das grades dos dois lados e um avião rebocando a faixa
laranja "CRMThink". É a cidade do Romualdo. A composição não foi redesenhada: o preparo
([scripts/stage-art/joinville/README.md](../scripts/stage-art/joinville/README.md)) usa as mesmas
ferramentas do Recife (`scripts/stage-art/flyover_art.py`).

- Mesmo enquadramento dos outros cenários; `top` −50 põe os pés no calçamento da praça, à
  frente dos canteiros e das grades.
- **Torcida:** igual à do Recife: colunas de ~20 px em grupos (loops, ritmos, alturas e
  atrasos próprios), flashes de celular e as mesmas reações a golpes fortes, especiais, KO,
  PERFECT, fim de round e vitória. Duas faixas: à esquerda (depois do poste) e à direita (antes
  do poste), sem mover postes nem troncos altos.
- **Avião:** mesmo voo do Recife (direita → esquerda, escala 0,62, 80 px/s), **atrás** do
  telhado do pórtico, das palmeiras, das bandeirinhas e dos postes (`skyline.png` de 250
  linhas). A faixa laranja ondula de leve e continua legível no céu aberto.
- A arte não define gameplay: arena, chão e paredes são os do PARTNER ARENA.

## Cenário: RÚSSIA (Praça Vermelha)

Arte oficial fornecida pelo dono do projeto: a Praça Vermelha ao pôr do sol em pixel art, com a
torre Spasskaya do Kremlin, a Catedral de São Basílio, tendas e grades da Bitrix24, a torcida e
um biplano rebocando a faixa "Bitrix24". Arena da luta contra João Guiotti na história. O
preparo ([scripts/stage-art/russia/README.md](../scripts/stage-art/russia/README.md)) usa as
ferramentas compartilhadas (`scripts/stage-art/flyover_art.py`) com duas regras desta arte: as
nuvens rosa/laranja/violeta do pôr do sol contam como céu (`extra_sky`) e as linhas abaixo das
rodas do avião ficam fora dele (`plane_max_y`, uma nuvem violeta encosta nelas).

- `top` −40 põe os pés no calçamento, à frente das grades. Torcida em grupos nas duas faixas
  separadas pelo poste; avião a 0,62, atrás da torre Spasskaya, das cúpulas e dos postes.

## Interface da seleção de personagem

Visual de fliperama, sem assets de imagem novos: tudo é desenhado em código em
`src/ui/select/`. A paleta segue a tela inicial, para as duas telas parecerem do mesmo jogo.

- **Paleta (`theme.ts`):** noite azul-marinho/índigo (`navy`, `navyDeep`, `indigo`) na base;
  ciano neon (`neon`) e azul royal (`royal`) como cores frias; violeta em dois tons (`violet`,
  `violetLight`) com dourado (`gold`) na ação principal, como o JOGAR; laranja e magenta como
  acentos. Textos secundários em branco.
- **Fundo:** mapa pixel-art procedural de um litoral tropical à noite (mar índigo, terra
  azul-violeta, litoral lilás, rio ciano, vila iluminada em neon, coqueiros e veleiros), em
  "pixels" de 6 px, determinístico e escurecido para não competir com a UI. Feixes de luz ciano
  e magenta (como os holofotes da arena da tela inicial) e nuvens em parallax lento.
- **Molduras:** `drawArcadeFrame`, com contorno, borda colorida, linha interna (contorno
  duplo), faixa superior mais clara opcional (dois tons, como o botão JOGAR), brilho no topo e
  cantos em degrau, só com retângulos alinhados (nítido em qualquer escala).
- **Título:** faixa violeta em dois tons com moldura dourada/laranja e brilho que passa; texto
  dourado com halo magenta.
- **Cards:** retrato existente sobre faixas na cor do personagem, plaqueta marinho e borda
  azul royal. O selecionado tem borda dourada, linha interna ciano, halo ciano pulsante, leve
  zoom e marcador P1 magenta.
- **Painel de destaque:** fundo marinho profundo, moldura dourada com linha violeta e contorno
  ciano pulsante; faixa violeta com o nome dourado e halo ciano; disco neon sob o retrato;
  barras em blocos que vão de ciano a dourado e laranja, com brilho no topo.
- **Botões:** SELECIONAR no estilo do JOGAR (violeta, moldura dourada, texto dourado), com
  pulso; VOLTAR e setas em índigo com borda ciano. Hover clareia o fundo e acende um halo
  (dourado ou ciano); pressionar afunda o texto.
- **Dificuldade:** painel marinho com borda ciano; a opção ativa fica num destaque dourado.

Inspirada na linguagem de telas de seleção de fliperama, sem copiar logos, textos,
personagens ou artes de outros jogos.

## Modo História: mapa e avião

Tudo é desenhado em código, sem imagens novas, na paleta da seleção e da tela inicial:

- **Mapa:** contornos lon/lat simplificados (`src/story/brazilMap.ts` e `worldOutlines.ts`)
  rasterizados em células de 5 px: terra em azul escuro com pontilhado de ruído, costa em ciano
  neon, oceano com pontinhos e um brilho suave atrás; linhas tracejadas magenta discretas marcam
  o Equador e os trópicos. Duas vistas: o Brasil sozinho (viagens nacionais) e um mapa-múndi
  estilizado (viagens ao exterior), onde os outros continentes têm costa ciano mais apagada e o
  Brasil fica mais claro, contornado em dourado e com o nome "BRASIL". Geradas uma vez e
  reaproveitadas como textura.
- **Países:** marcados num ponto central reconhecível (Rússia perto de Moscou), com rótulo só
  com o nome ("PORTUGAL", "RÚSSIA").
- **Cidades:** ponto com anel pulsante e rótulo "CIDADE - UF" em fonte PIXEL. Dourado = cidade
  atual, magenta = destino, ciano = já visitada, branco = outras.
- **Rotas:** curva (Bezier quadrática) para o lado de dentro do país; etapas vencidas ficam
  como pontilhado dourado; durante o voo o avião deixa o mesmo rastro.
- **Avião:** pixel-art vista de cima (`src/ui/story/planeTexture.ts`), branco com detalhes
  magenta e ciano, sombra deslocada, gira pela direção da curva e balança levemente.
- **Tela final:** fundo e efeitos da vitória, card do lutador e o letreiro "CAMPANHA CONCLUÍDA".

ROMUALDO e JOÃO GUIOTTI usam sprites e retratos próprios pelo pipeline genérico.

## Tipografia

Todas as fontes são OFL, ficam em `public/fonts/` com a licença e são definidas em um só lugar
(`GAME_FONTS`, `src/config/fonts.ts`):

| Papel  | Fonte            | Uso                                                              |
| ------ | ---------------- | ---------------------------------------------------------------- |
| TITLE  | Bangers          | Letreiro de luta: "<NOME> VENCEU!", ROUND / FIGHT! / K.O., rotas |
| ARCADE | Russo One        | Botões, nomes, títulos de tela, rótulos                          |
| HUD    | Press Start 2P   | Cronômetro da luta                                               |
| PIXEL  | Pixelify Sans    | Cidades do mapa, ETAPA n/t, origem no VS, rótulo do round no HUD |
| BODY   | Fonte do sistema | Descrições e dicas (melhor leitura em qualquer tela)             |

Textos grandes usam contorno escuro e sombra dura. Cenas nunca citam fontes: usam
`arcadeText`, `hudText`, `pixelText`, `bodyText` ou `createFightTitle`.

## Música

Trilha **original**, composta e sintetizada no próprio repositório
([scripts/music/README.md](../scripts/music/README.md)): estética de fliperama de luta dos anos
90 com synthwave moderno: baixo forte, bateria eletrônica, pads, leads de synth com vibrato,
power chords de "guitarra" sintetizada e toques discretos de chiptune. Nenhuma melodia, sample
ou trecho de outros jogos (Street Fighter, King of Fighters, Mortal Kombat, Tekken etc.).

| Tela                       | Faixa                    | Volume efetivo |
| -------------------------- | ------------------------ | -------------- |
| Menu                       | `menu-theme`             | 0,55           |
| Seleção (e VS)             | `character-select-theme` | 0,52           |
| Mapa do Brasil (e VS)      | `story-map-theme`        | 0,55           |
| Luta (`StageConfig.music`) | `partner-summit-theme`   | 0,47           |
| Vitória / campanha         | `victory-sting` (5 s)    | 0,55           |

Volume da música 0,55 (ganho por faixa para igualar). Arquivos em `public/audio/music/`.

## Efeitos sonoros

Efeitos **originais** de fliperama de luta, sintetizados por
[scripts/sfx/generate_sfx.py](../scripts/sfx/README.md) (osciladores, ruído, varreduras de pitch,
envelopes, filtros): impactos secos, chutes mais graves, bloqueio abafado de antebraço, pulo curto,
aterrissagem discreta, K.O. forte, especial tecnológico e UI arcade. Nada copiado de outros jogos.
Os níveis (golpes 0,62-0,75, defesa 0,60, K.O. e especial 0,85, pulo 0,35, aterrissagem 0,40, UI
0,45) ficam acima da música (0,47-0,55) e foram conferidos em playtest. Impactos, defesa, dano,
pulo e aterrissagem variam um pouco de pitch (±6%) e volume (até -10%) a cada vez, só na
apresentação. Arquivos em `public/audio/sfx/` (`.ogg` e `.mp3`, mono, ~150 KB no total por formato).

## Registro de licenças

Todo asset adicionado ao repositório deve ser original do projeto ou ter licença compatível,
registrada aqui:

| Asset                                                                             | Autor                                                                                           | Licença                                                           |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `public/fighters/fighter-a/*.png` (demo)                                          | Gerado por `scripts/generate-demo-fighter-art.mjs`                                              | Original do projeto                                               |
| `public/fighters/augusto/*.png` e `scripts/augusto-art/*.png`                     | ImageGen, com referências fornecidas e geração autorizada pelo usuário; montagem local          | Arte original gerada para o projeto; sem assets de terceiros      |
| `public/fighters/joao-guiotti/*.png` e `scripts/joao-guiotti-art/*.png`           | ImageGen integrado, referências autorizadas pelo usuário; montagem local                        | Arte original gerada para o projeto; sem assets de terceiros      |
| `public/fighters/filipe/*.png` e `scripts/filipe-art/*.png`                       | ImageGen integrado, referências e geração autorizadas pelo usuário; montagem local              | Arte original gerada para o projeto; sem assets de terceiros      |
| `scripts/stage-art/russia/source.png` e `public/stages/russia/*`                  | Arte oficial fornecida pelo usuário; camadas separadas localmente por `prepare_russia.py`       | Arte do projeto, aprovada pelo usuário                            |
| `scripts/stage-art/joinville/source.png` e `public/stages/joinville/*`            | Arte oficial fornecida pelo usuário; camadas separadas localmente por `prepare_joinville.py`    | Arte do projeto, aprovada pelo usuário                            |
| `scripts/stage-art/recife/source.png` e `public/stages/recife/*`                  | Arte oficial fornecida pelo usuário; camadas separadas localmente por `prepare_recife.py`       | Arte do projeto, aprovada pelo usuário                            |
| `scripts/stage-art/partner-summit/source.webp` e `public/stages/partner-summit/*` | Arte fornecida pelo usuário; camadas separadas localmente por `prepare_partner_summit.py`       | Arte do projeto, aprovada pelo usuário                            |
| `scripts/victory-art/source.png` e `public/ui/victory/*`                          | Arte fornecida pelo usuário; camadas separadas localmente por `prepare_victory_art.py`          | Arte do projeto, aprovada pelo usuário                            |
| `public/fonts/bangers/*` (fonte Bangers)                                          | The Bangers Project Authors (Google Fonts)                                                      | SIL Open Font License 1.1 (`public/fonts/bangers/OFL.txt`)        |
| `public/fonts/russo-one/*` (fonte Russo One)                                      | Jovanny Lemonad (Google Fonts)                                                                  | SIL Open Font License 1.1 (`public/fonts/russo-one/OFL.txt`)      |
| `public/fonts/press-start-2p/*` (fonte Press Start 2P)                            | The Press Start 2P Project Authors / CodeMan38 (Google Fonts)                                   | SIL Open Font License 1.1 (`public/fonts/press-start-2p/OFL.txt`) |
| `public/fonts/pixelify-sans/*` (fonte Pixelify Sans)                              | The Pixelify Sans Project Authors (Google Fonts)                                                | SIL Open Font License 1.1 (`public/fonts/pixelify-sans/OFL.txt`)  |
| `scripts/vfx-art/source/24zap-logo.png`, `mindhub-logo.png`                       | Logos dos apps 24zap e Mindhub, fornecidos pelo dono do projeto para uso no jogo                | Uso autorizado pelo dono do projeto                               |
| `public/vfx/24zap-*`, `mindhub-*`                                                 | Derivados dos logos acima por `scripts/vfx-art/prepare_app_emblems.py`                          | Uso autorizado pelo dono do projeto                               |
| `public/vfx/vibecode-emblem.png`, `gptmaker-emblem.png`                           | Desenhados forma a forma por `scripts/vfx-art/draw_original_emblems.py` (sem logo de terceiros) | Original do projeto                                               |
| `public/audio/sfx/*` (24 efeitos)                                                 | Sintetizados por `scripts/sfx/generate_sfx.py`                                                  | Original do projeto                                               |
| `public/audio/music/*` (5 faixas)                                                 | Compostas e sintetizadas por `scripts/music/compose.py`                                         | Original do projeto                                               |
| Mapa do Brasil, avião e marcadores do Modo História                               | Desenhados em código (`src/ui/story/`), contorno simplificado em `src/story/brazilMap.ts`       | Original do projeto                                               |
| `public/fighters/romualdo/*.png` e `scripts/romualdo-art/*.png`                   | ImageGen integrado, referências autorizadas pelo usuário; montagem local                        | Arte original gerada para o projeto; sem assets de terceiros      |
| `scripts/title-art/source.webp` e `public/ui/title/*`                             | Arte fornecida pelo usuário; camadas separadas localmente por `prepare_title_art.py`            | Arte do projeto, aprovada pelo usuário                            |
| Asset                                                                             | Autor                                                                                           | Licença                                                           |
| --------------------------------------------------------------------------------- | -----------------------------------------------------------------------------------------       | ----------------------------------------------------------------- |
| `public/fighters/fighter-a/*.png` (demo)                                          | Gerado por `scripts/generate-demo-fighter-art.mjs`                                              | Original do projeto                                               |
| `public/fighters/augusto/*.png` e `scripts/augusto-art/*.png`                     | ImageGen, com referências fornecidas e geração autorizada pelo usuário; montagem local          | Arte original gerada para o projeto; sem assets de terceiros      |
| `public/fighters/joao-guiotti/*.png` e `scripts/joao-guiotti-art/*.png`           | ImageGen integrado, referências autorizadas pelo usuário; montagem local                        | Arte original gerada para o projeto; sem assets de terceiros      |
| `public/fighters/filipe/*.png` e `scripts/filipe-art/*.png`                       | ImageGen integrado, referências e geração autorizadas pelo usuário; montagem local              | Arte original gerada para o projeto; sem assets de terceiros      |
| `scripts/stage-art/recife/source.png` e `public/stages/recife/*`                  | Arte oficial fornecida pelo usuário; camadas separadas localmente por `prepare_recife.py`       | Arte do projeto, aprovada pelo usuário                            |
| `scripts/stage-art/partner-summit/source.webp` e `public/stages/partner-summit/*` | Arte fornecida pelo usuário; camadas separadas localmente por `prepare_partner_summit.py`       | Arte do projeto, aprovada pelo usuário                            |
| `scripts/victory-art/source.png` e `public/ui/victory/*`                          | Arte fornecida pelo usuário; camadas separadas localmente por `prepare_victory_art.py`          | Arte do projeto, aprovada pelo usuário                            |
| `public/fonts/bangers/*` (fonte Bangers)                                          | The Bangers Project Authors (Google Fonts)                                                      | SIL Open Font License 1.1 (`public/fonts/bangers/OFL.txt`)        |
| `public/fonts/russo-one/*` (fonte Russo One)                                      | Jovanny Lemonad (Google Fonts)                                                                  | SIL Open Font License 1.1 (`public/fonts/russo-one/OFL.txt`)      |
| `public/fonts/press-start-2p/*` (fonte Press Start 2P)                            | The Press Start 2P Project Authors / CodeMan38 (Google Fonts)                                   | SIL Open Font License 1.1 (`public/fonts/press-start-2p/OFL.txt`) |
| `public/fonts/pixelify-sans/*` (fonte Pixelify Sans)                              | The Pixelify Sans Project Authors (Google Fonts)                                                | SIL Open Font License 1.1 (`public/fonts/pixelify-sans/OFL.txt`)  |
| `scripts/vfx-art/source/24zap-logo.png`, `mindhub-logo.png`                       | Logos dos apps 24zap e Mindhub, fornecidos pelo dono do projeto para uso no jogo                | Uso autorizado pelo dono do projeto                               |
| `public/vfx/24zap-*`, `mindhub-*`                                                 | Derivados dos logos acima por `scripts/vfx-art/prepare_app_emblems.py`                          | Uso autorizado pelo dono do projeto                               |
| `public/vfx/vibecode-emblem.png`, `gptmaker-emblem.png`                           | Desenhados forma a forma por `scripts/vfx-art/draw_original_emblems.py` (sem logo de terceiros) | Original do projeto                                               |
| `public/audio/sfx/*` (24 efeitos)                                                 | Sintetizados por `scripts/sfx/generate_sfx.py`                                                  | Original do projeto                                               |
| `public/audio/music/*` (5 faixas)                                                 | Compostas e sintetizadas por `scripts/music/compose.py`                                         | Original do projeto                                               |
| Mapa do Brasil, avião e marcadores do Modo História                               | Desenhados em código (`src/ui/story/`), contorno simplificado em `src/story/brazilMap.ts`       | Original do projeto                                               |
| `public/fighters/isaque-ferreira/*.png` e `scripts/isaque-ferreira-art/*.png`     | ImageGen integrado com referências autorizadas pelo usuário; montagem local                     | Arte original do projeto; sem assets de terceiros                 |
| `public/fighters/romualdo/*.png` e `scripts/romualdo-art/*.png`                   | ImageGen integrado, referências autorizadas pelo usuário; montagem local                        | Arte original gerada para o projeto; sem assets de terceiros      |
| `scripts/title-art/source.webp` e `public/ui/title/*`                             | Arte fornecida pelo usuário; camadas separadas localmente por `prepare_title_art.py`            | Arte do projeto, aprovada pelo usuário                            |

## VFX dos especiais (temas dos apps)

24ZAP reutiliza os frames 14, 17, 15, 18, 19 e 16 na animação special, com fases 2/2/2; os PNGs
dos lutadores não mudam. Os efeitos são procedurais (`src/render/special/`) mais três emblemas
pixel-art feitos a partir dos logos fornecidos pelo dono do projeto
(`scripts/vfx-art/prepare_app_emblems.py`): os logos são reduzidos para uma grade de 48 px, com
paleta reduzida e contorno escuro de 1 px, para entrarem no estilo do jogo em vez de colados
como imagem lisa.

- **24zap:** verde do app (#25D366) com verde-claro, os acentos rosa e amarelo dos balõezinhos
  do logo e o azul dos ✓✓ de "lida". Balões de chat, ondas ")))" de envio, emblema do app
  enviado como mensagem e selo no impacto.
- **Mindhub:** azul-marinho do jogo, ciano neon, azul elétrico e branco. O símbolo
  cérebro-circuito do logo vira um "selo" brilhante na mão (versão só do símbolo, tingida em
  ciano com brilho aditivo) e o emblema completo (disco marinho, borda ciano, símbolo branco)
  aparece no fim do alcance e no impacto; trilhas de circuito em ângulo reto (como o lado direito
  do símbolo), rede neural e onda de choque quadrada.
- **ALAIO VIBECODE!:** roxo (#7B2CBF), magenta (#FF2FB4), ciano (#2FE0FF) e cores de sintaxe
  (amarelo, verde-menta, lilás) sobre um editor roxo-escuro. Emblema original: azulejo em degradê
  roxo→magenta com `</>` branco, faísca ciano e cursor.
- **GPTMAKER!:** âmbar (#FFB21F), laranja (#FF6E1E), azul-marinho, aço e ciano nos olhos do robô,
  com grade azul de blueprint. Emblema original: azulejo âmbar→laranja com um robozinho marinho de
  olhos ciano, antena e raio amarelo, e uma faísca branca. Nenhum dos dois imita logo de produto.

Os efeitos ficam em volta dos lutadores e nunca cobrem barras de vida, barra de especial ou
controles touch.

As formas são "pixel-art" feitas só de retângulos (balão com cantos chanfrados, disco como
octógono de três retângulos), triângulos e traços: nada de `fillRoundedRect` / `fillCircle`. Além
de combinar com o estilo, isso evita a triangulação de caminhos do Phaser (earcut), que custava
centenas de ms com balões de tamanho negativo ou minúsculo no pop-in e travava o jogo ~1 s no
especial (corrigido; teste em `tests/specialStutter.test.ts`).
