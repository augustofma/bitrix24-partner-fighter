# Arte da Gabriele — Inovar Consulting

Arte original criada com ImageGen integrado em 09/10/2026. A foto real fornecida pelo usuário
guiou rosto, óculos, cabelo vermelho longo e ondulado, tom de pele e proporções naturais;
o pôster aprovado guiou roupa e acabamento arcade. Camisa creme, calça escura, tênis branco,
brincos e crachá. Sem sprites de franquias ou logos externos.

Fontes preservadas em `sheet-source.png` e `portrait-source.png`; prompts completos em
[prompts.json](prompts.json). A geração não é determinística; o preparo das fontes é reproduzível.

## Preparo

Execute `python scripts/gabriele-art/prepare.py` com Pillow e NumPy no ambiente offline.
`--validate-only` confere as saídas. Nenhuma dependência nova no runtime do jogo.

Fonte 1468×1071, 40 poses. Bounds e âncoras corporais revisados individualmente; extração do
componente sólido com alpha ≥240 e preservação da borda original ≥128, eliminando resíduos.
Escala proporcional nearest-neighbor, altura base 172 px, baseline 216 e margem mínima 4 px.
O corpo não é afinado horizontalmente. Cabelo e membros permanecem dentro de cada célula.
Defesas, reações e poses baixas mantêm a flexão corporal. Poses aéreas têm âncoras elevadas.
O frame 26 usa a pose recolhida de 28: o startup aéreo da fonte já estendia o braço, antes
do momento ativo. O KO deitado é reduzido proporcionalmente para caber na célula.

Saídas: `public/fighters/gabriele/sprite.png`, RGBA 1536×1120, grade 8×5 de células 192×224;
`portrait.png`, RGBA 240×300. Visual final: scale 1, offsetX 0, offsetY 8.

## Frame map

0–3 idle; 4–9 walk; 10 rise; 11 apex; 12 fall; 13 crouch; 14–16 punch;
17–19 kick; 20–22 crouchPunch; 23–25 crouchKick; 26–28 airPunch; 29–31 airKick;
32 block; 33 crouchBlock; 34–35 hurt; 36 início KO; 37 queda; 38 chão; 39 victory.
Ataques usam fases startup/active/recovery 1/1/1; pulo acompanha a velocidade vertical.
Sprites base à direita, flipX pelo renderer genérico. Vitória apontando para cima.

## Limitações visuais

Pequenas variações de proporção e cabelo entre poses; caminhada com poucos desenhos e
correspondência aproximada dos membros às hitboxes. Startup e recovery do soco aéreo
compartilham desenho recolhido. Nenhuma hitbox foi alterada para compensar arte.

## Playtest

Chromium com SwiftShader, desktop 1280×720 e mobile landscape emulado 844×390. Fluxo real
seleção → rival → cenário → VS → luta Gabriele×Augusto em Recife. Retrato e nono card
corretos, sem clipping observado. Comparação de escala com os nove fighters existentes.

Vinte capturas com debug cobrem idle, caminhada, três fases do pulo, agachamento, seis
normais ativos, duas guardas, dois hurt, três fases do KO e vitória. Teclado conferido nos
estados efetivos da simulação: frente/trás, agachar, seis golpes e duas guardas. F2 alternou
as caixas. No touch, salto diagonal cruzou o rival, invertendo direção/flipX; movimento+soco
simultâneos mantiveram os dois inputs. Nenhum erro de runtime.

Partidas CPU×CPU com passos acelerados no navegador, normal, seeds 41/91, Gabriele primeiro:
Augusto 0–2; Filipe 1–2; João 0–2; Romualdo 1–2; Isaque 0–2; Aislan 0–2; Rômulo 0–2;
Gabriel Mattozo 0–2; Dmitry 1–2. Como CPU do segundo lado contra Augusto: 1–2. Todas chegaram
ao fim por KO; são smoke tests, não amostra de balanceamento humano.

A emulação por software registrou ~16 FPS; desempenho em celular físico não foi validado.
Sem alteração global para contornar as limitações de renderização do ambiente de teste.
