# Arte original de Romualdo

Referências obrigatórias: foto/pôster original, foto adicional de blazer e pôster aprovado de Romualdo fornecidos pelo usuário. A sheet de João serviu apenas de referência técnica e de acabamento. Preservados: cabeça raspada, óculos, barba grisalha curta, rosto maduro e proporções naturais. Roupa: blazer azul-marinho, camiseta branca, calça e calçados escuros. Sem logos.

## Geração e preparação

Arte criada com a ferramenta ImageGen integrada. Fontes originais preservadas em `sheet-source.png` e `portrait-source.png`; não entram no build. Normalização local reproduzível:

```sh
python scripts/romualdo-art/prepare.py
python scripts/romualdo-art/prepare.py --validate-only
```

Pillow e NumPy são ferramentas offline já usadas no projeto; nenhuma dependência de runtime adicionada. Reutiliza `scripts/art_tools.py`. Os recortes foram revisados na fonte 1469×1071; componente sólido alpha ≥ 240, borda original alpha ≥ 128, removendo a franja residual da geração. Escala proporcional por vizinho mais próximo; âncoras por pose estabilizam o tronco durante golpes. Pés terrestres na linha 216; poses aéreas elevadas. Margem mínima de 4 px, sem conteúdo cruzando células.

Saídas: `public/fighters/romualdo/sprite.png` (1536×1120, RGBA, 8×5 células 192×224) e `portrait.png` (240×300 RGBA). Config visual: scale 1, offsetX 0, offsetY 8. Timing e caixas originais preservados.

## Mapa dos frames

0–3 idle; 4–9 walk; 10 rise, 11 apex, 12 fall; 13 crouch; 14–16 punch; 17–19 kick; 20–22 crouchPunch; 23–25 crouchKick; 26–28 airPunch; 29–31 airKick; 32 block; 33 crouchBlock; 34–35 hurt; 36 início do KO, 37 queda, 38 deitado; 39 victory. Cada ataque usa startup/active/recovery 1/1/1; pulo usa rise/apex/fall 1/1/1.

## Prompts

### Sheet

Use case: stylized-concept. Asset: original ROMUALDO arcade pixel-art fighter sheet. Reference images: three user images of Romualdo (bald mature man with glasses and short salt-and-pepper beard) are mandatory identity references; last image of João sprite sheet is ONLY pixel-art rendering quality, scale and frame order reference. Never copy João face/hair. ROMUALDO: completely bald/shaved head, medium warm tan skin, clear rectangular glasses ALWAYS present, short gray salt-and-pepper beard and mustache, mature face and natural stocky corporate build, not bodybuilder. Outfit identical in EVERY pose: dark NAVY BLUE blazer, plain white crewneck T-shirt, dark navy trousers, dark low-profile shoes. No logos, text or effects. Solid confident heavyweight posture. Crisp shaded arcade pixel clusters as reference, not photo. True transparent background no floor shadows. EXACTLY forty full-body isolated poses in 8 columns by 5 rows, evenly spaced. Target canvas1536x1120, eachcell192x224; standingfigure172px height; feet baseline same; safe transparent margins; all face RIGHT. Retain SAME head size, face, glasses, gray beard and body proportions throughout, limbs proportional. Row1 frames0-7: four small subtle breathing idle guard poses; walk1 left stride, walk2 passing feet near each other, walk3 right stride, walk4 passing. Row2 frames8-15: walk5 left stride, walk6 return passing; jump RISE legs extending; jump APEX knees tucked; jump FALL legs reaching down; crouch lowguard; standing PUNCH startup fist pulled back; standing PUNCH ACTIVE fist fully extended horizontally at shoulder height. Row3 frames16-23: punch RECOVERY fist returned near chin; kick startup raised bent knee; kick ACTIVE front leg straight HORIZONTAL at HIP height with other support foot on ground, not high kick; kick recovery bent knee retract; crouch punch startup; crouch punch ACTIVE fist extended horizontal at crouching shoulder height; crouch punch recovery fist back at chin; crouch kick startup bent leg low. Row4 frames24-31: crouch kick ACTIVE sweep leg extended right near floor; crouch kick recovery retract remain LOW; air punch startup both feet tucked airborne; air punch ACTIVE fist extended horizontally right with legs tucked; air punch recovery hand near chin legs tucked; air kick startup raised bent knee airborne; air kick ACTIVE leg straight right slightly downward and other leg tucked; air kick recovery retract airborne. Row5 frames32-39: standing block both forearms shield face; crouch block deep low forearms shield face; hurt light recoil; hurt stronger recoil; KO START leaning backwards feet still grounded; KO MID-FALL diagonal body head left feet right; KO GROUND fully horizontal body lying on back head left feet right; victory confident upright fist raised. Every startup/active/recovery clearly different: only active has fully extended striking limb. Stable grounded baseline, airborne figures elevated, KO fully within its cell. No neighboring overlap, no duplicates instead of missing poses, no baked checkerboard.

### Portrait

Use case: stylized-concept. Create original arcade pixel-art portrait of ROMUALDO for fighter selection, transparent PNG vertical4:5 intended240x300. References: first three user photos/posters of bald Romualdo are identity references; João sprite atlas is STYLE only, not identity; final Romualdo sprite sheet is outfit continuity. Mature Brazilian man with warm medium-tan skin, completely BALD head, clear rectangular eyeglasses, short well-trimmed SALT-AND-PEPPER GRAY beard and mustache, round mature face, natural stocky shoulders, not muscular. Strongly recognizable as the real reference person. Dark NAVY blazer over plain WHITE crewneck shirt. Three-quarter bust subtly facing RIGHT, calm confident friendly expression, whole scalp and glasses visible, shoulders and upper chest. Crisp shaded arcade pixel-art, detailed pixel clusters rather than photorealistic, compatible with existing game sprites and portraits. TRUE transparent alpha, no background, glow, halo, floor, text, logos, microphone, watermark, or props. Clean silhouette.

## Validação final

Chrome desktop 1280×720: comparação direta com Augusto, Filipe e João, pés alinhados com scale 1 e offsets 0/8. F2: seis ataques aproximadamente alinhados às caixas; guardas, hurt, três fases de KO e victory legíveis. Comandos reais de teclado confirmaram caminhada para frente/trás, pulo vertical/diagonal, agachado, seis ataques e duas guardas. Cross-up de Romualdo conectou uma vez, aterrissou do outro lado e atualizou flipX.

Quatro partidas melhores de três no navegador, com CPU e passos de simulação acelerados: Augusto × Romualdo 2–0; Filipe × Romualdo 2–0; João × Romualdo 2–1; Romualdo × Augusto 0–2. Romualdo atacou, bloqueou, pulou, recebeu dano, venceu round e sofreu KO. Conferência adicional da vitória: Romualdo venceu 2–1, com retrato próprio na VictoryScene.

Seleção, apresentação do rival no mapa Rússia → Joinville, VS, FightScene/HUD e vitória usam os assets próprios. Mesmo fighterId, origem e rota preservados. Mobile landscape emulado 844×390: sem clipping, retrato correto, joystick à direita + SOCO simultâneos e salto diagonal confirmados por eventos touch. Cerca de 30 FPS no Chrome headless; não é benchmark de aparelho físico.

Uma exceção de canvas ocorreu durante a automação com reinício de cenas pausadas; a sessão reiniciada e o fluxo final de vitória passaram sem erros. Os testes de CPU e determinismo existentes foram mantidos, e os contratos de dimensões, alpha, isolamento, frame map e carregamento foram adicionados.

Limitações: alinhamento aproximado às hitboxes e pequenas variações de volume entre poses. Caminhada de seis poses pode receber polimento artístico futuro. Mobile físico não testado.
