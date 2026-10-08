# Arte do Aislan — ZOPU

Referências oficiais: foto real e pôster aprovados pelo usuário. ImageGen integrado criou arte
original; nenhum asset de franquia foi usado. Fontes preservadas nesta pasta, fora do build.

## Reprodução

Execute `python scripts/aislan-art/prepare.py` com Pillow e NumPy (somente offline; nenhuma
nova dependência de runtime). `--validate-only` verifica o resultado sem reprocessar.

A fonte 1467×1072 contém 40 componentes revisados; os recortes manuais seguem a grade visual,
incluindo KO mais largo. O alpha sólido ≥240 e a borda original ≥128 eliminam resíduos soltos.
Escala proporcional nearest-neighbor, âncora por pose, baseline 216 e margem mínima 4 px.
A strip idle substitui os quatro primeiros desenhos por guarda consistente e respiração sutil.
Poses aéreas mantêm elevação. O retrato é ajustado proporcionalmente em canvas transparente.

Saídas: `public/fighters/aislan/sprite.png`, 1536×1120 RGBA, 8×5 células 192×224;
`portrait.png`, 240×300 RGBA. Visual: scale 1, offsetX 0, offsetY 8.

## Frame map

0–3 idle; 4–9 walk; 10 rise; 11 apex; 12 fall; 13 crouch; 14–16 punch;
17–19 kick; 20–22 crouchPunch; 23–25 crouchKick; 26–28 airPunch; 29–31 airKick;
32 block; 33 crouchBlock; 34–35 hurt; 36 início KO, 37 queda, 38 chão; 39 victory.
Ataques e pulo usam fases 1/1/1. Nenhum sprite invade outra célula.

## Prompts utilizados

### Sheet

Use case: stylized-concept. Create original AISLAN arcade pixel-art fighting game sprite atlas based on the TWO ATTACHED REFERENCES: real photo is identity and outfit; approved poster is art direction. Mature man with thick medium black parted hair, full thick black beard, serious confident expression, warm light-medium skin, natural broad build, NOT bodybuilder. Identical outfit all frames: dark BLUE PLAID blazer, NAVY shirt, LIGHT GRAY trousers, belt, WHITE sneakers, wristwatch. No logos or text or lanyard. Crisp detailed pixel clusters, dark outlines and cel shading matching 1990s arcade original fighters, NOT photorealistic. Exactly 40 isolated full-body poses in 8 columns and 5 rows, row-major, target1536x1120, each192x224. Real transparent alpha background. No floor, shadow, grid, checkerboard, captions. Safe margins; same head size, proportions and standing height across frames, grounded sole baseline consistent. All base poses face RIGHT. Row1 frames0-7: four subtle confident ready-guard idle poses; walk1 left stride; walk2 passing feet close; walk3 right stride; walk4 passing. Row2 frames8-15: walk5 opposite stride; walk6 passing;10jump RISE legs extending;11jump APEX knees tucked;12jump FALL legs reaching down;13deep crouch;14punch STARTUP fist back;15punch ACTIVE straight right arm at shoulder height. Row3 frames16-23:16punch RECOVERY fist near chin;17kick STARTUP raised bent knee supportfootgrounded;18kick ACTIVE straight leg HORIZONTAL AT HIP HEIGHT not high kick, upright torso supportleggrounded;19kick RECOVERY kneebent supportfootgrounded;20crouchpunch STARTUP;21crouchpunch ACTIVE straight arm at LOW shoulderheight;22crouchpunch RECOVERY arm retracted stayLOW;23crouchkick STARTUP lowbentleg. Row4 frames24-31:24crouchkick ACTIVE straight frontleg nearGROUND;25crouchkick RECOVERY retract leg stayLOW;26airpunch STARTUP tucked legs;27airpunch ACTIVE straight arm RIGHT slightlyDOWN fromshoulder knees tucked;28airpunch RECOVERY arm retract legsstilltucked;29airkick STARTUP airborne bentknee;30airkick ACTIVE frontlegstraight RIGHT and slightlyDOWN otherlegtucked;31airkick RECOVERY retractleg airborne. Row5 frames32-39:32standing BLOCK forearmsprotectface;33crouch BLOCK;34light HURT recoil;35strong HURT recoil;36KO START leaningback feetgrounded;37KO FALL diagonal headleft feetright;38KO GROUND flat horizontal headleft feetright;39VICTORY serious confident raisedfist. Distinct startup/active/recovery with ONLY active frame fully extending. Clean isolated poses no overlap, all40frames. Preserve blackhair/fullblackbeard and blueplaidblazer graypants whiteshoes in EVERY pose.

### Portrait

Use case: stylized-concept. Create original AISLAN pixel-art arcade fighting game portrait, vertical4:5 bust intended240x300, TRUE transparent background. References: real photo and approved poster specify identity, last sprite sheet specifies costume and pixel style. Mature man, full medium black parted swept hair, thick full black beard and mustache, warm light-medium skin, natural broad build, serious confident expression. Dark blue plaid blazer, dark navy shirt, hint of belt not necessary. Recognizable facial proportions from photo, three-quarter facing RIGHT. Whole hair head and shoulders visible, shoulders upper chest. Crisp detailed pixel clusters with dark outline and cel shading matching atlas and original arcade fighters, not photorealistic. No logos text watermark lanyard microphone phone background floor or glow. Keep consistent black hair and full beard, no glasses.

### Idle corrigido

Use case: stylized-concept. Create a matching FOUR-FRAME IDLE animation strip for AISLAN from the referenced sprite atlas. Four side-by-side full-body sprites, facing RIGHT, TRUE transparency, no shadows/text/grid. Preserve exact character identity, dark medium parted hair/fullblackbeard, BLUE PLAID blazer navyshirt lightgraypants belt whitesneakers wristwatch, same detailed arcade pixel style and head/body proportions. ALL FOUR poses must be SAME FIRM READY GUARD, both fists raised at chest/chin, knees slightly bent and identical feet positions. ONLY subtle breathing: shoulders and hands move 1-2 pixels between poses; no hands in pockets, no changed stance, no facial variation. Four consistent idle frames rather than four different poses. Each full body isolated with ample gap, standing characterheight172px intendedcell192x224; targetstrip768x224. Reference atlas ONLY as appearance/style, disregard its differing idle stances.

## Validação e playtest

Chrome desktop 1280×720 e landscape touch emulado 844×390. Inspeção dos 40 frames, F2,
teclado (caminhada nos dois sentidos, pulos, seis ataques, duas guardas), hurt, KO, vitória,
multi-touch (movimento+soco), salto diagonal e cross-up/flipX. Escala final 1 e offsets 0/8.
Os golpes acompanham aproximadamente as caixas; a arte não altera colisão.

Partidas CPU×CPU determinísticas com passos acelerados no navegador: Aislan×Augusto 0–2;
×Filipe 0–2; ×João 1–2; ×Romualdo 2–0; ×Isaque 0–2. Augusto×Aislan CPU 2–0.
São smoke tests; não substituem balanceamento com jogadores humanos.

Story: progresso avançado pelas funções reais até o encontro, seguido de mapa/VS/luta.
Após Romualdo, Joinville apresenta Aislan sem criar avião/tween de voo. Na campanha de Romualdo,
Espanha→Joinville mantém voo, chegada, portrait próprio e stage joinville. Derrota real por KO
0–2 contra Aislan e retry pelo Enter mantiveram etapa/rival/cenário/dificuldade.
Mobile conferiu seleção, portrait, controles e Story Joinville sem clipping observado.
Nenhum erro de runtime do jogo durante os testes.

Limitações: pequenas variações de volume entre poses geradas; caminhada de seis desenhos;
correspondência aproximada dos membros às hitboxes. Emulação headless registrou cerca de
30–35 FPS; desempenho em dispositivo físico não foi medido. Sem especial exclusivo.
