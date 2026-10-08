# Arte do Rômulo — Arrecife Digital

Arte original criada com ImageGen integrado. Referências: foto de corpo inteiro, foto de rosto
e pôster aprovado enviados pelo usuário. Fotos guiaram identidade e roupa; pôster, direção.
Fontes originais preservadas em `sheet-source.png` e `portrait-source.png`. Prompts completos
em [prompts.json](prompts.json). Nenhum sprite de franquia ou imagem externa foi copiado.

## Reprodução

`python scripts/romulo-art/prepare.py` com Pillow e NumPy no ambiente offline.
`--validate-only` confere as saídas. Nenhuma dependência nova de runtime.

Fonte 1468×1071, 40 regiões em grade visual 8×5. Bounds e âncoras revisados no script; alpha
sólido ≥240 e borda original ≥128 removem resíduos. Escala proporcional nearest-neighbor,
altura em pé 172 px, baseline 216, margem mínima 4 px. Corpo robusto nunca comprimido na
horizontal. Poses aéreas têm âncoras elevadas; o chute aéreo ativo foi elevado após F2 para
aproximar pé e hitbox. A pose recolhida do frame 25 também serve ao startup 23 da rasteira:
a geração original de 23 já estava estendida. Nenhum pixel de outro lutador foi usado.

Saída: `public/fighters/romulo/sprite.png`, RGBA 1536×1120, 40 células 192×224;
`portrait.png`, RGBA 240×300. Visual final scale 1, offsetX 0, offsetY 8.

## Frame map

0–3 idle; 4–9 walk; 10 rise; 11 apex; 12 fall; 13 crouch; 14–16 punch;
17–19 kick; 20–22 crouchPunch; 23–25 crouchKick; 26–28 airPunch; 29–31 airKick;
32 block; 33 crouchBlock; 34–35 hurt; 36 início KO, 37 queda, 38 chão; 39 victory.
Fases de ataque e pulo 1/1/1; base à direita, flipX pelo renderer existente.

## Playtest

Chromium headless desktop 1280×720 e touch landscape emulado 844×390. Seleção de Rômulo,
rival e cenário pelas telas existentes levou a Rômulo×Augusto em Recife. Retrato, nome e
sétimo card corretos. Poses e frames conferidos com caixas de debug; F2 alternou desligado/ligado.
Teclado: caminhada frente/trás, pulo, agachamento, seis normais e ambas as guardas. Hurt,
KO em três fases e vitória inspecionados em fixtures visuais. No touch, salto diagonal cruzou
o rival e inverteu direção/flipX; movimento+soco simultâneos mantiveram ambos os inputs.
Sem clipping observado na seleção e luta. Nenhum erro de runtime na sessão válida.

Partidas CPU×CPU na simulação real com passos acelerados no navegador, dificuldade normal,
seeds 41/91, Rômulo primeiro: Augusto 1–2; Filipe 1–2; João 1–2; Romualdo 0–2; Isaque 0–2;
Aislan 0–2; Dmitry 1–2. Augusto×Rômulo CPU 2–0. Todas terminaram por KO; isso é smoke test,
não amostra estatística suficiente para balanceamento humano.

Limitações: variações pequenas entre poses e correspondência aproximada dos membros às
hitboxes; startup e recovery da rasteira compartilham o desenho recolhido. Sem especial ou
campanha nesta etapa. O Chrome instalado não respondeu de forma estável e o Chromium padrão
apresentou framebuffer incompatível; o playtest usou Chromium com SwiftShader. A emulação
mobile registrou ~16 FPS por software nesta máquina sob carga, portanto não comprova desempenho
em celular físico. Nenhuma alteração no jogo foi feita para contornar o ambiente de teste.
