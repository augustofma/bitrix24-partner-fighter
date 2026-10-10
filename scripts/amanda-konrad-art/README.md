# Amanda Konrad — BR24

Arte original para o projeto, gerada com **ImageGen integrado** usando as três referências
fornecidas pelo usuário: foto no palco, retrato adicional e pôster aprovado. Fotos definem
identidade/proporções; pôster define direção artística. Cabelo acobreado preso com ondas,
blusa off-white com babados, jeans, crachá e tênis claros. Nenhum sprite de franquia ou logo
externo foi usado. Referências pessoais permanecem no anexo da conversa.

## Fontes e prompts

- `sheet-source.png`: geração original RGBA 1468×1071, 40 poses.
- `portrait-source.png`: retrato original gerado a partir das fotos e da sheet.
- `ko-source.png`: faixa de três poses de KO, refeita porque as poses 36/37 originais se tocavam.
- `prompts.json`: prompts completos da sheet e do portrait.
- `ko-prompt.txt`: prompt da correção de KO, usando a sheet normalizada como referência.
- `kick-source.png` e `kick-prompt.txt`: frame ativo do chute refeito na altura da cintura,
  após inspeção com F2. Soco aéreo ativo com elevação de apenas 3 px para alinhar mão e hitbox.

A geração é não determinística. As fontes versionadas tornam a montagem final reproduzível.

## Montagem

Executar na raiz, com Pillow e NumPy (ferramentas offline já usadas no projeto):

```powershell
python scripts/amanda-konrad-art/prepare.py
python scripts/amanda-konrad-art/prepare.py --validate-only
```

O script isola o componente opaco de cada pose, conserva a borda alpha e descarta ruído
transparente da geração. Bounds e âncoras foram revisados visualmente. Redimensiona com nearest,
sem distorcer proporções; centraliza a base do corpo e ancora os pés em y=216. Poses aéreas
têm afastamentos explícitos. A posição mais recolhida do soco agachado foi destinada ao startup;
o braço estendido aparece no frame ativo. A faixa separada substitui os três KOs.
Corpos horizontais são reduzidos proporcionalmente para caber inteiros na célula.

Saídas:

- `public/fighters/amanda-konrad/sprite.png`: 1536×1120, RGBA, grade 8×5, células 192×224.
- `public/fighters/amanda-konrad/portrait.png`: 240×300, RGBA.
- Config: escala 1, offsetX 0, offsetY 8; em pé cerca de 172 px. Todas as bases olham à direita.

Validação: 40 células não vazias, margem mínima 4 px, baseline de cada pose, dimensões e alpha.

## Frame map final

| Frames       | Estado                                  |
| ------------ | --------------------------------------- |
| 0–3          | idle                                    |
| 4–9          | walk                                    |
| 10 / 11 / 12 | jump rise / apex / fall                 |
| 13           | crouch                                  |
| 14 / 15 / 16 | punch startup / active / recovery       |
| 17 / 18 / 19 | kick startup / active / recovery        |
| 20 / 21 / 22 | crouchPunch startup / active / recovery |
| 23 / 24 / 25 | crouchKick startup / active / recovery  |
| 26 / 27 / 28 | airPunch startup / active / recovery    |
| 29 / 30 / 31 | airKick startup / active / recovery     |
| 32 / 33      | block / crouchBlock                     |
| 34 / 35      | hurt1 / hurt2                           |
| 36 / 37 / 38 | knockout start / fall / ground          |
| 39           | victory                                 |

## Playtest

Chromium com renderização SwiftShader: seleção → rival → fase → VS → luta; poses inspecionadas
com F2, seis ataques, defesas, pulo, dano, KO e vitória. Teclado e multitouch reais via eventos
do navegador; pulo diagonal cruza o rival e flipX acompanha a direção ao aterrissar.
Onze partidas completas com CPUs seed 41/91: Amanda contra os nove parceiros e Dmitry,
mais Augusto contra Amanda CPU. Resultados dessa amostra: Augusto 0–2, Filipe 1–2,
João 1–2, Romualdo 0–2, Isaque 2–1, Aislan 1–2, Rômulo 0–2, Gabriel 0–2,
Gabriele 0–2, Dmitry 1–2; Amanda CPU perdeu 0–2. Placares são da perspectiva de Amanda.

Mobile emulado 844×390: retrato, sprite e escala legíveis; movimento+soco simultâneos e
cross-up confirmados, sem erros JavaScript. SwiftShader ficou perto de 16 FPS: isso não valida
desempenho em aparelho físico. Continuidade de walk e transições de três frames têm a limitação
visual normal do atlas curto; recomenda-se revisão humana adicional em dispositivo real.
