# Arte original de João Guiotti

Gerada com ImageGen integrado, com as duas fotos e o pôster aprovados como referências de identidade. A sheet do Filipe foi referência de estilo. Sem assets de terceiros ou logos. Fontes preservadas fora do build.

## Preparação

```sh
python scripts/joao-guiotti-art/prepare.py
python scripts/joao-guiotti-art/prepare.py --validate-only
```

Requer Pillow e NumPy, as mesmas ferramentas offline de `scripts/art_tools.py`; nenhuma dependência de runtime adicionada. Recortes revisados para a fonte 1468×1071, componentes conectados para remover fragmentos vizinhos, alpha original preservado nos pixels mantidos, escala proporcional por vizinho mais próximo. Raízes por pose estabilizam o tronco; pés terrestres na linha 216 e aéreos elevados. Margem mínima 4 px. Vitória normalizada a 202 px incluindo o braço erguido.

Saídas: `public/fighters/joao-guiotti/sprite.png` (1536×1120, 8×5 células 192×224) e `portrait.png` (240×300), RGBA. Scale 1, offsetX 0, offsetY 8. A arte não altera combate.

## Prompt da sheet

Use case: stylized-concept. Original pixel-art 2D arcade fighting game sprite atlas for JOÃO GUIOTTI. Input images: the two photos and approved JOÃO GUIOTTI poster are mandatory identity/outfit references; the last image (Filipe sprite sheet) is ONLY rendering style, pose order and scale reference, never copy his face or blue clothing. João has light skin, brown swept-up quiff hair, full neatly trimmed brown beard, recognizable face, rectangular tortoiseshell glasses ALWAYS visible, natural broad body proportions not muscular. BLACK blazer, plain WHITE crew-neck shirt, BLACK pants, WHITE sneakers. No logos or writing. Match crisp shaded pixel clusters and outlines of Filipe. Exactly40 isolated full-body poses in 8columns x5rows, row major, target1536x1120, cells192x224. True transparent alpha, no white boxes, no checkerboard baked in, no shadows, floor, grid or text. Consistent character size approximately172px standing, safe clear gaps, never touching neighboring figures. Facing RIGHT in side/three-quarter fighting view throughout. Precise order row1:0 idle guard;1 slight breathing;2 guard shift;3 return guard;4 walk left stride;5 passing;6 right stride;7 opposite passing. Row2:8 left stride;9 walk return;10 jump rise legs extending;11 apex legs tucked;12 descending legs reaching down;13 deep crouch guard;14 standing punch startup hand winding back;15 punch ACTIVE arm fully straight to right at shoulder height. Row3:16 punch RECOVERY fist retracted near chin;17 kick startup raised bent knee with support foot grounded;18 kick ACTIVE straight leg HORIZONTAL at WAIST height not high kick, support foot flat grounded;19 kick RECOVERY leg retracted bent knee;20 deep crouch punch startup;21 deep crouch punch ACTIVE arm extended right at crouched shoulder height;22 deep crouch punch RECOVERY hand back at chin remain deep crouch;23 low sweep startup bent front knee. Row4:24 low sweep ACTIVE front leg straight right near floor;25 sweep RECOVERY retract front leg remain low;26 air punch startup tucked legs;27 air punch ACTIVE straight arm right tucked legs;28 air punch RECOVERY fist back at chin tucked legs;29 air kick startup bent front knee;30 air kick ACTIVE leg extended right slightly down;31 air kick RECOVERY front leg retracted tucked both feet off ground. Row5:32 standing block forearms covering face;33 crouching block forearms covering face;34 light hurt recoil;35 stronger hurt recoil;36 knockout fall START lean back feet grounded;37 knockout MID-FALL diagonal head left feet right;38 knockout GROUND flat horizontal on back head left feet right;39 victory upright right fist raised. Grounded sole baseline consistent, airborne poses visibly lifted. All forty same recognizable João identity and glasses. Exact startup/active/recovery distinctions, no duplicated extended impact poses for recovery. Pixel art not photorealistic, no overbuilt muscles, preserve black blazer white shirt white shoes.

## Prompt do retrato

Use case: stylized-concept. Create original pixel-art arcade fighter selection PORTRAIT of JOÃO GUIOTTI, vertical4:5 bust intended240x300. References: first two photos and JOÃO GUIOTTI poster are mandatory real identity references; Filipe sheet is style only; last generated João sprite sheet is outfit and pixel-art continuity. Preserve João recognizable light-skinned face, brown swept-up voluminous quiff, full neatly trimmed brown beard, rectangular tortoiseshell glasses, smiling friendly confident expression, natural broad shoulders not muscular. BLACK blazer over plain WHITE crew-neck T-shirt. Three-quarter subtly looking RIGHT. Detailed pixel-art face and crisp clusters, same original arcade language as sprites, not photo cutout or vector. Head entirely visible, shoulders upper chest, large readable face. TRUE TRANSPARENT ALPHA background, no background panel, no halos, no glow, no colored edge fringe, no writing, logos, microphone, scenery, props or watermark. Just one isolated bust, clean dark outline.

## Correção do chute ativo

`kick-active.png` substitui somente o frame 18. O recorte mantém o componente sólido (alpha ≥ 240) e um pixel de borda original, removendo o glow indesejado da geração. Escala para 172 px e âncora no tênis de apoio. O soco aéreo ativo usa escala 0,79 para baixar o punho até a hitbox sem encostar os pés no chão.

Create ONE original pixel-art replacement active standing kick pose of JOÃO GUIOTTI. Referenced sheet and portrait define exact identity, outfit and arcade shading. Light skin, brown swept-up quiff, brown full trimmed beard, tortoiseshell rectangular GLASSES, black blazer, WHITE shirt, black pants and white sneakers; natural broad body, no extra muscles. FULL BODY side-view facing RIGHT. Left support leg straight VERTICAL, white support shoe flat on ground. Right kicking THIGH AND SHIN extend in a straight HORIZONTAL LINE to the right at HIP HEIGHT, NOT upward. Critical: front WHITE kicking shoe should be approximately 85px above ground when full standing head-to-support-sole height is172px. Shoe below waist/hip or at waist, never chest height. Torso upright straight over support leg, fists near chin guard. Same body proportions as sprite, crisp pixel clusters. Both legs anatomically correct. No high kick. True transparent alpha background; no floor, shadow, white box, text, effects, logos or other objects. One isolated figure with generous margin.

## Mapa dos frames

[Mapa completo das 40 células](../../public/fighters/joao-guiotti/README.md). Ataques usam uma célula para startup, uma para active e uma para recovery; pulo usa uma para cada fase de velocidade. O timing continua vindo do FighterConfig existente.

## Validação visual

Chrome desktop 1280×720 e mobile landscape emulado 844×390. Seleção, mapa Recife → Rússia, VS, luta/HUD e vitória usam a arte própria; origem São Paulo preservada. Comparação direta com Augusto e Filipe: scale 1, offsetX 0, offsetY 8, pés na mesma linha.

Teclado: caminhada para frente/trás, pulos vertical/diagonal, agachado, seis ataques e duas guardas. Inspeção F2 das poses e fases, hurt, KO e vitória. Chute ativo corrigido e soco aéreo aproximado da caixa. Cross-up de João P2 contra Filipe conectou uma vez, aterrissou do outro lado e atualizou flipX.

Três partidas melhores de três executadas no navegador com controladores de CPU e passos acelerados: Filipe × João 2–0, Augusto × João 2–0, João × Augusto 1–2. João atacou, bloqueou, pulou, sofreu dano, venceu round e sofreu KO. Partida adicional com adversário neutro: João venceu 2–0 e exibiu retrato próprio na VictoryScene. Nenhum erro JavaScript observado.

Mobile: retratos na seleção/VS, sprite dentro da tela e controles legíveis. Multitoque real via eventos touch do navegador: joystick à direita + SOCO simultâneos, depois salto diagonal. Emulação headless observada em cerca de 27–29 FPS; não equivale a benchmark de hardware mobile e não foi testado aparelho físico.

Limitações visuais: correspondência aproximada às caixas, pequenas variações de volume entre poses e caminhada com apenas seis poses. A arte não altera hitboxes, frame data ou balanceamento.
