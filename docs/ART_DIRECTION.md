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
  grandes ("ROUND 1", "FIGHT!", "K.O.").
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

## Registro de licenças

Todo asset adicionado ao repositório deve ser original do projeto ou ter licença compatível,
registrada aqui:

| Asset                                                         | Autor                                                                                  | Licença                                                      |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `public/fighters/fighter-a/*.png` (demo)                      | Gerado por `scripts/generate-demo-fighter-art.mjs`                                     | Original do projeto                                          |
| `public/fighters/augusto/*.png` e `scripts/augusto-art/*.png` | ImageGen, com referências fornecidas e geração autorizada pelo usuário; montagem local | Arte original gerada para o projeto; sem assets de terceiros |
