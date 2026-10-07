# Arte original de Isaque Ferreira

Referências: fotos de corpo inteiro, foto no palco e pôster aprovado enviados pelo usuário. A sheet de Romualdo é referência apenas de acabamento e organização. Arte original criada com ImageGen integrado; cabeça raspada, barba escura, overshirt bege, camiseta/calça pretas, tênis brancos e relógio preto. Sem logos ou crachá para manter leitura clara.

## Preparação reproduzível

```sh
python scripts/isaque-ferreira-art/prepare.py
python scripts/isaque-ferreira-art/prepare.py --validate-only
```

Fontes preservadas em `sheet-source.png` e `portrait-source.png`, fora do build. Pillow/NumPy offline, ferramentas já usadas no projeto, sem dependência nova de runtime. Reutiliza `scripts/art_tools.py`.

Fonte 1469×1071 com 40 recortes revisados. Componente sólido alpha ≥ 240, borda original alpha ≥ 128; remove resíduos sem redesenhar. Redimensionamento proporcional por vizinho mais próximo; âncora por pose mantém tronco estável durante extensão dos membros. Baseline terrestre 216; aéreos elevados; margem mínima 4 px. Retrato espelhado para olhar à direita, ajustado proporcionalmente em canvas 240×300.

Saídas: `public/fighters/isaque-ferreira/sprite.png`, 1536×1120 RGBA, grade 8×5, células 192×224; `portrait.png`, 240×300 RGBA. Config visual: scale 1, offsetX 0, offsetY 8.

## Frame map

0–3 idle; 4–9 walk; 10 rise, 11 apex, 12 fall; 13 crouch; 14–16 punch; 17–19 kick; 20–22 crouchPunch; 23–25 crouchKick; 26–28 airPunch; 29–31 airKick; 32 block; 33 crouchBlock; 34–35 hurt; 36 KO início, 37 queda, 38 deitado; 39 victory. Ataques e pulo: fases 1/1/1, sincronizadas ao config.

## Prompts

### Sheet

Use case: stylized-concept. Create original ISAQUE FERREIRA pixel-art arcade fighting game sprite atlas. Reference images: four user photos/poster of Isaque with beige overshirt are mandatory identity/outfit references; final Romualdo sprite sheet is STYLE, size and pose-order reference ONLY. Never copy Romualdo gray beard or glasses. Isaque is BALD with DARK neatly trimmed beard, warm medium skin, recognizable broad friendly smiling face, natural stocky build NOT muscular. All40poses identical outfit: LIGHT BEIGE open overshirt/jacket with rolled sleeves, BLACK T-shirt, BLACK trousers, WHITE sneakers, BLACK wristwatch. NO GLASSES. No logos, no lanyard to keep silhouette clear. Match existing arcade crisp pixel clusters/outlines, not photorealism. Exactly40fullbody isolated poses in8columns5rows, row-major target1536x1120 cells192x224. True transparent alpha background, no floor/shadows/grid/text/checkerboard. Safe margins, consistent172px standing height, grounded sole baseline consistent, every character faces RIGHT. Same headsize/bodyproportions acrossframes. Row1 indices0–7: four subtly different relaxed confident idleguard breathing poses; walk1 left stride; walk2 PASSING feet close; walk3 right stride; walk4 PASSING feet close. Row2 indices8–15: walk5 opposite stride; walk6 passing;10jump rise legs extending;11jump apex tuck;12jump fall legs reach down;13deep crouch;14punchstartup hand back;15punchACTIVE straight arm horizontal at shoulder. Row3 indices16–23:16punchRECOVERY hand near chin;17kickstartup knee bent supportfootgrounded;18kickACTIVE straight kickingleg HORIZONTAL at HIP height, NOT high kick, torso upright and supportleg straight grounded;19kickRECOVERY kneebent supportfootstillgrounded;20crouchpunchstartup;21crouchpunchACTIVE straighthand at crouchedshoulderheight;22crouchpunchRECOVERY armretracted stayLOW;23crouchkickstartup lowbentleg. Row4 indices24–31:24lowSWEEPACTIVE straightfrontlegnearGROUND;25sweepRECOVERY bentleg stayLOW;26airpunchstartup tuckedlegs;27airpunchACTIVE straightarm right slightlydown fromshoulder withkneestucked;28airpunchRECOVERY retractarm legsstilltucked;29airkickstartup airborne bentknee;30airkickACTIVE frontlegstraight RIGHT and slightlyDOWN withotherlegtucked;31airkickRECOVERY retractleg airborne. Row5 indices32–39:32standingBLOCK forearmsshieldface;33crouchBLOCK forearmscoverface;34lightHURT recoil;35strongHURT recoil;36KO START leanback feetgrounded;37KO MIDDLE diagonal fall headleft feetright;38KO GROUND flat lying horizontal headleftfeetright;39VICTORY confident smiling raisedfist. Distinct startup/active/recovery; ONLYactive fullyextends limb; no inventedmissingframes, no overlap, preserve Isaque identity always. No glasses, no graybeard, no darkblazer. All exactly same beigejacketblackshirtwhiteshoes.

### Portrait

Use case: stylized-concept. Create original pixel-art arcade fighter portrait ISAQUE FERREIRA, vertical4:5 bust intended240x300 transparent PNG. User photos of Isaque on stage and full body plus approved poster are identity references. Romualdo atlas is STYLE ONLY; last Isaque atlas is costume continuity. Bald/shaved head, dark neatly trimmed full beard and mustache, warm medium skin, recognizable friendly smiling face, natural broad shoulders not bodybuilder. NO GLASSES, no gray beard. LIGHT BEIGE open overshirt/jacket with collar over BLACK crewneck T-shirt. Confident charismatic smile, three-quarter subtly facing RIGHT. Whole head visible and shoulders/upper chest. Detailed crisp pixel clusters matching existing arcade game portraits, not photo. True transparent alpha, clean edges without colored fringe or glow. No logos, text, microphone, phone, badges, floor, background, props or watermark.

## Playtest final

Chrome desktop 1280×720 e emulação touch landscape 844×390, debug de caixas ativo. Conferidos idle, caminhada nos dois sentidos, pulo vertical/diagonal, seis ataques, defesas, hurt, três fases de KO e vitória. Teclado real exercitado; inspeção dos 40 frames e alinhamento aos demais fighters. Escala 1, offsets (0, 8).

Cinco partidas com passos acelerados no navegador e controladores determinísticos: Isaque × Augusto 1–2; × Filipe 0–2; × João 1–2; × Romualdo 2–0; Augusto × Isaque CPU 2–0. Todos os confrontos concluíram normalmente; placares são smoke tests, não estudo estatístico de balanceamento.

Mobile: seleção/portrait, movimento + soco simultâneos via multi-touch, pulo diagonal, cross-up e flipX conferidos; vitória 2–0 contra controle neutro exibiu portrait próprio. Sem clipping observado. Emulação headless registrou cerca de 30–34 FPS; desempenho em aparelho físico não foi medido. Um erro na interface do controlador artificial de QA foi corrigido no fixture e a sessão reiniciada; não exigiu alteração no jogo.

Limitações: pequenas variações de volume entre poses geradas e animação de caminhada limitada a seis desenhos. Hitboxes aproximam os membros e não seguem o contorno exato da arte. Isaque não possui especial exclusivo nem campanha Story.
