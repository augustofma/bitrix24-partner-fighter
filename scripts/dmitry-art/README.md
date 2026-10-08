# Arte do Dmitry — Final Boss

ImageGen integrado criou arte original com as duas fotos reais e o pôster fornecidos pelo usuário.
Nenhum sprite de franquia foi copiado. `sheet-source.png` e `portrait-source.png` preservam
as gerações originais; os prompts completos estão em [prompts.json](prompts.json).

## Reprodução

Execute `python scripts/dmitry-art/prepare.py` com Pillow e NumPy instalados no ambiente offline.
Nenhuma dependência foi adicionada ao runtime ou package.json. `--validate-only` verifica a saída.

A fonte 1469×1071 contém 40 poses em grade visual 8×5. Os bounds revisados no script isolam os
componentes; alpha sólido ≥240 e borda original ≥128 retiram resíduos soltos. Recortes mantêm
proporção, escala nearest-neighbor e âncora horizontal por pose. Altura em pé 172 px, baseline
216 e margem mínima 4 px. Poses aéreas mantêm elevação; o soco aéreo foi elevado mais 20 px
após a conferência com F2, sem mudar hitboxes. Retrato ajustado proporcionalmente, sem flip.

Saídas: `public/fighters/dmitry/sprite.png` RGBA 1536×1120, 40 células 192×224; portrait RGBA
240×300. Config visual: scale 1, offsetX 0, offsetY 8. Nenhum frame vazio ou conteúdo na borda.

## Frame map

0–3 idle; 4–9 walk; 10 rise; 11 apex; 12 fall; 13 crouch; 14–16 punch;
17–19 kick; 20–22 crouchPunch; 23–25 crouchKick; 26–28 airPunch; 29–31 airKick;
32 block; 33 crouchBlock; 34–35 hurt; 36 início KO, 37 queda, 38 chão; 39 victory.
Fases de ataques/pulo 1/1/1; sprite base olha à direita, flipX pelo renderer existente.

## Playtest

Chrome desktop 1280×720 e landscape touch emulado 844×390. Inspeção de todas as animações e
fases principais com F2; pés, escala, guardas, hurt, KO e vitória. Teclado e multi-touch
(movimento+soco) funcionaram. Salto diagonal atravessou o rival e inverteu direção/flipX.
Mapa final e VS mostraram portrait próprio, FINAL BOSS e Rússia; luta no escritório existente.
Dmitry foi exercitado como P1 por setup de desenvolvimento, pois fica oculto na seleção comum.

Seis partidas CPU×CPU com passos acelerados no navegador (Dmitry primeiro, seeds 41/91):
Augusto 0–2; Filipe 1–2; João 1–2; Romualdo 1–2; Isaque 0–2; Aislan 1–2.
Todas terminaram por KO. São smoke tests, não uma amostra estatística de balanceamento.

Story: avanço até a sexta etapa pelas funções reais de progresso, depois mapa → VS → luta.
Derrota real 0–2 por KO contra Dmitry e retry mantiveram etapa 5 (índice), Rússia,
bitrix24-moscow e dificuldade normal. Vitória posterior 2–0 por KO concluiu a campanha com
as seis etapas registradas. Sem alteração de vida para forçar o resultado. Controladores de
QA alternaram IA e input neutro; o combate usou a simulação real. Nenhum erro de runtime.

Limitações: pequenas variações de volume entre desenhos, correspondência aproximada dos membros
às hitboxes. Mobile testado por emulação; desempenho físico não medido (headless ~30 FPS).
Sem especial exclusivo e sem seleção/desbloqueio do chefe nesta versão. O boss sem especial
perdeu as seis comparações com essas seeds; balanceamento humano fica para uma rodada posterior.
