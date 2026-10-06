# Fontes e prompts do Filipe

Arte original criada pela ferramenta integrada ImageGen, usando as duas fotos de identidade e
o pôster aprovado fornecidos pelo usuário. O atlas do Augusto foi referência de linguagem visual,
sem copiar sua identidade. As fontes ficam fora de public e não entram no build.

## Prompts usados

### Spritesheet

Use case: stylized-concept. Asset: original pixel-art arcade 2D fighting game spritesheet for FILIPE GOMES. Input images: first two are identity photographs of Filipe; third is his approved design poster; fourth is AUGUSTO spritesheet ONLY as pixel-art rendering style and pose-layout reference. Create FILIPE, never copy Augusto's face/body. Preserve Filipe's natural proportions, medium brown skin, distinctive dark tight curly hair with rounded volume, short dark beard, recognizable friendly face, navy blue blazer, plain black shirt, black trousers, clean white sneakers. No logos, no text, no badge or lanyard. Don't bulk him up or make him thinner than photos. Match the crisp shaded pixel-art, dark outlines and arcade 2D side-view of Augusto. All facing RIGHT (even when falling, consistent side view), full body visible, true transparent alpha background, NO opaque background behind figures. Produce exactly 40 separately spaced figures arranged 8 columns x 5 rows, row-major; target canvas1536x1120 each192x224. Consistent body scale approx170px standing tall, center hips near each cell's center, ground soles at216 within cell. Air poses retain lift. Leave clear margins between all figures, no touching or cropping. Each cell contains only one pose. Precise frame contents row1: 0 idle guard,1 slight breath,2 slight guard shift,3 relaxed return,4 walk left-foot forward,5 walk passing,6 walk right-foot forward,7 walk passing opposite. Row2:8 walk left stride,9 walk return,10 jump rising stretched legs,11 jump apex tucked,12 jump falling reaching legs down,13 deep crouch guard,14 standing punch windup,15 straight punch fully extended horizontally to right. Row3:16 punch recoiling to guard,17 standing kick windup with bent knee,18 standing side kick fully extended right at waist height,19 kick recovery retract knee upright on support foot,20 deep crouch punch windup,21 crouching punch fully extended right at mid-height while hips stay low,22 crouch punch hand returning to guard,23 low sweep windup bent front knee. Row4:24 sweep active straight right leg near floor,25 sweep recovery knee retracts while still crouching,26 air punch windup with legs tucked,27 air punch fully extended to right with legs tucked,28 air punch retract to guard mid-air,29 air kick windup with front knee tucked,30 air kick extended forward and slightly downward to right,31 air kick recovery tuck leg mid-air. Row5:32 standing block forearms cover face,33 crouch block forearms cover face low,34 hurt light recoil,35 hurt stronger recoil,36 KO initial backward lean feet still near ground,37 KO midfall diagonal body head to left feet to right,38 KO flat on back head left and feet right horizontal on floor,39 victory upright right fist raised overhead. No action effects, no symbols, no labels, no grid lines. Exact same identity/outfit on all 40 poses. Especially distinguish startup, fully extended active, and retracted recovery poses, do NOT repeat impact for recovery.

### Portrait

Use case: stylized-concept. Asset: transparent PNG fighter selection portrait for FILIPE GOMES. References: first two photos identity, third approved Filipe design poster, fourth Augusto sheet style only, fifth newly generated Filipe sprite sheet identity/outfit continuity. Produce a more detailed pixel-art bust in the same original 2D arcade game art language, not a photographic cutout, not vector. High fidelity to Filipe's facial structure, medium brown skin, rounded dark tightly curly hair, neat short dark beard, friendly confident smile, natural shoulders and physique (no larger muscles, no slimming). Navy/dark blue blazer, plain black T-shirt. Three-quarter view subtly looking to RIGHT, head completely visible with curls not cropped, shoulders and upper chest, vertical 4:5 composition. Large face for readability at final240x300. Genuine transparent alpha background, no panel, glow, text, letters, logo, badge, lanyard, scenery, props or watermark. Crisp pixel clusters, restrained highlights, clean dark outline, detailed recognizable eyes/nose/mouth. Artwork matches the approved poster's person and the sprite's navy/black clothes. Output just one isolated bust.

## Preparação reproduzível

```powershell
powershell -File scripts/prepare-filipe-art.ps1
powershell -File scripts/prepare-filipe-art.ps1 -ValidateOnly
```

Requer Windows e System.Drawing, sem dependência de runtime. O script usa recortes revisados
para esta fonte de 1467×1072, isola componentes, preserva alpha e escala proporcionalmente por
vizinho mais próximo. A escala base é 0,875; raízes por pose mantêm o tronco estável quando
braços/pernas se estendem. A sola terrestre fica na linha 216; poses aéreas mantêm elevação.
O validador verifica tamanho, conteúdo não vazio e margens transparentes em todas as 40 células.
Os testes Node decodificam o PNG e verificam alpha, dimensões e isolamento sem bibliotecas novas.

Saídas: public/fighters/filipe/sprite.png e public/fighters/filipe/portrait.png.

Na revisão, idle4 retorna à guarda de idle2 e crouchPunch recovery retorna ao crouch.
As poses eretas de caminhada e recuperação do chute são normalizadas a 172 px de altura,
para corrigir pequenas diferenças de escala da geração. Não há redesenho local de membros.

### Correção do chute ativo

Use case: stylized-concept. Generate ONE replacement active standing kick pose for FILIPE GOMES, same original pixel-art fighter as referenced sheet and portrait. Sheet is identity, proportions, pixel-art and outfit reference; portrait is face/curly-hair reference. Preserve medium brown skin, tight dark curly hair, short beard, navy blazer, plain black shirt/trousers, WHITE sneakers. Natural medium/slim body exactly as source, not muscular. Full-body side view facing RIGHT. Standing on LEFT support leg straight with WHITE support sneaker flat on ground. RIGHT leg fully extended HORIZONTALLY to the right at WAIST HEIGHT: knee and kicking sneaker both at hip height, about halfway up the entire body. IMPORTANT: the kicking leg is NOT angled upward, NO high kick. Kicking foot must be around 80-90 pixels above ground when character height172px. Both fists return near face guard, torso remains upright above hip and support foot. Maintain recognizable Filipe identity and crisp arcade pixel-art rendering, clean outlines, consistent pixel clusters. One isolated pose, true transparent alpha background. No floor, shadow, text, labels, grid, effects, logos, extra limbs, extra character or objects. Leave generous transparent margin on all sides.

`kick-active.png` substitui somente a pose 18. A perna fica horizontal à altura da cintura,
conforme o playtest com F2; nenhuma hitbox foi alterada. O soco aéreo ativo recebe 8 px
adicionais para baixo na montagem, preservando a margem e o espaço sob os pés.
