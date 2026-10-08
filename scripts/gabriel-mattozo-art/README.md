# Arte do Gabriel Mattozo — GMC

Arte original gerada com ImageGen integrado em 08/10/2026. Referências oficiais: as duas
fotos reais (frente/perfil) e o pôster aprovado enviados pelo usuário. Identidade guiada pelas
fotos: rosto estreito, óculos pretos retangulares, cabelo alto com fade, barba curta, corpo
magro, hoodie bege claro, jeans escuro, tênis branco e crachá. Sem logos ou sprites externos.
Fontes preservadas em `sheet-source.png` e `portrait-source.png`; prompts completos em
[prompts.json](prompts.json). A geração é não determinística; o preparo das fontes é reproduzível.

## Preparo

Execute `python scripts/gabriel-mattozo-art/prepare.py` com Pillow e NumPy instalados.
Use `--validate-only` para conferir os PNGs finais. Dependências apenas do preparo offline,
sem nova dependência do jogo.

A fonte 1467×1072 contém 40 poses. Bounds e raízes corporais foram revisados individualmente.
O script remove resíduos de alpha baixo: componente sólido ≥240, borda original ≥128.
Recortes proporcionais com nearest-neighbor, altura base 172 px, baseline 216 e margens
de pelo menos 4 px. Defesas e reações mantêm a flexão natural do corpo; não são esticadas
até a altura do idle. Poses aéreas têm âncoras elevadas. O KO deitado cabe proporcionalmente
na largura de 184 px. Nenhum frame invade outra célula; os 40 desenhos são próprios.

Saídas: `public/fighters/gabriel-mattozo/sprite.png`, RGBA 1536×1120, grade 8×5 com células
192×224; `portrait.png`, RGBA 240×300. Visual: scale 1, offsetX 0, offsetY 8.

## Frame map

0–3 idle; 4–9 walk; 10 rise; 11 apex; 12 fall; 13 crouch; 14–16 punch;
17–19 kick; 20–22 crouchPunch; 23–25 crouchKick; 26–28 airPunch; 29–31 airKick;
32 block; 33 crouchBlock; 34–35 hurt; 36 início KO; 37 queda; 38 chão; 39 victory.
Ataques usam startup/active/recovery 1/1/1; pulo usa velocidade vertical. Base para a direita,
flipX pelo renderer genérico. Vitória com gesto de palestrante, sem microfone.

## Limitações visuais

Pequenas variações de desenho entre poses; correspondência dos membros às caixas é aproximada.
A pose deitada tem escala menor para caber na célula. O personagem mantém corpo magro;
não houve alteração de hitboxes para acomodar a arte. Sem especial exclusivo ou campanha.

## Playtest

Chromium com SwiftShader, desktop 1280×720 e mobile landscape emulado 844×390. Seleção
pela interface até VS e luta Gabriel×Augusto em Recife; oitavo card e retrato corretos.
Vinte capturas cobrem idle, walk, três fases do pulo, agachamento, seis normais ativos,
duas guardas, dois hurt, três fases do KO e vitória. F2 alternado pelo teclado.
Controles de teclado conferidos na simulação real; touch com salto diagonal, cross-up e
flipX nos dois lados. Movimento+soco simultâneos preservaram ambos os inputs. Sem clipping
observado ou erros de runtime. Comparação de escala com os oito fighters existentes.

Partidas CPU×CPU em passos acelerados no navegador, dificuldade normal, seeds 41/91,
Gabriel primeiro: Augusto 2–1; Filipe 0–2; João 0–2; Romualdo 2–1; Isaque 0–2; Aislan 0–2;
Rômulo 1–2; Dmitry 0–2. Como CPU do segundo lado contra Augusto: 0–2. Todas concluídas
por KO. Resultados são smoke tests, não uma amostra de balanceamento humano.

O renderer por software registrou ~15 FPS no mobile emulado; não comprova desempenho em
celular físico. Nenhum ajuste global de renderização ou gameplay foi feito para esse ambiente.
