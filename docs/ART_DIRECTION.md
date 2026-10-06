# Direção de Arte

> Estado atual (v0.1): **toda a arte é provisória**, desenhada em código (bonecos geométricos,
> cenário procedural). Este documento define a direção **futura** e o formato esperado dos assets.

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

## Restrições técnicas

- Resolução lógica do jogo: **960x540**. Lutador em pé ocupa cerca de **170 px de altura**
  (cerca de 1/3 da tela).
- Para pixel art, desenhar em escala inteira dessa resolução (ex.: sprite nativo de 85 px,
  exibido a 2x) e ativar `pixelArt: true` em `src/main.ts`.
- Ponto de origem de cada frame: **centro dos pés** (é a posição do lutador na simulação).
- Sprites desenhados **olhando para a direita** (o jogo espelha).
- As hitboxes e hurtboxes são definidas no `FighterConfig`, **não** derivadas da arte. Ao trocar a
  arte, use F2 (debug) para conferir se as caixas ainda batem com o desenho.

## Estrutura de assets

```
public/
  fighters/
    <fighter-id>/
      portrait.png        Retrato para seleção/VS/vitória
      idle.png            Spritesheets (uma linha de frames) por estado:
      walk.png
      jump.png
      crouch.png
      punch.png
      kick.png
      block.png
      hurt.png
      knockout.png
      victory.png
  stages/
    <stage-id>/           Camadas de fundo (parallax): sky, far, mid, floor
  ui/                     Molduras de HUD, fontes bitmap, ícones
  audio/
    music/                Trilhas
    sfx/                  Golpes, bloqueio, KO, anúncios
    voices/<fighter-id>/  Falas dos personagens
```

Cada estado de lutador (`FighterStateId`) corresponde a **uma** animação. Golpes têm
frames de startup, active e recovery: a animação deve casar com o frame data do ataque
(ex.: soco de FIGHTER_A = 5 + 3 + 9 = 17 frames de jogo).

## Como plugar a arte (quando existir)

1. Coloque os arquivos em `public/fighters/<id>/`.
2. Preencha `assets` no `FighterConfig`:
   ```ts
   assets: {
     portrait: 'fighters/<id>/portrait.png',
     animations: {
       idle: { path: 'fighters/<id>/idle.png', frameWidth: 128, frameHeight: 192, frameRate: 10, loop: true },
       // ...
     },
   },
   ```
3. Carregue os assets em `BootScene.preload()` e crie `SpriteFighterView` (implementando
   `FighterView`), escolhida em `src/render/createFighterView.ts`. O gameplay não muda.

## Licenças

Todo asset adicionado ao repositório deve ser original do projeto ou ter licença compatível,
registrada aqui:

| Asset          | Autor | Licença |
| -------------- | ----- | ------- |
| (nenhum ainda) |       |         |
