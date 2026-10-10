# Rodolfo — Brasil Leads

Arte original criada com ImageGen integrado. Referências oficiais: foto real do Rodolfo
(identidade) e pôster aprovado (direção artística), fornecidos pelo usuário nesta tarefa.
Uso autorizado para o projeto, sem sprites de franquias ou logos copiados.

## Fontes e prompts

- `sheet-source.png`: 1468×1071 RGBA, fonte dos movimentos no chão.
- `air-source.png`: 1536×1024 RGBA, oito poses aéreas corrigidas em grade 4×2.
- `portrait-source.png`: retrato original transparente.
- `prompts.json`: prompts exatos das três gerações integradas.

A primeira fonte tinha poses aéreas ausentes ou fora da ordem. A fonte suplementar corrige
subida, descida e os seis frames de ataques aéreos. Recuperação do soco reutiliza a pose
recolhida de startup, recuperação da rasteira reutiliza a pose baixa de startup e o início
do KO reutiliza a segunda reação de dano. Não foram inventados pixels por desenho procedural.

## Montagem reproduzível

```powershell
python scripts/rodolfo-art/prepare.py
python scripts/rodolfo-art/prepare.py --validate-only
```

Pillow/NumPy offline, ferramentas já usadas pelo projeto. Recortes e âncoras revisados por pose;
isolamento do componente opaco preservando sua borda e removendo o halo de baixa opacidade;
escala proporcional com nearest, sem deformação corporal. Altura de guarda 172 px,
baseline 216, margem mínima 4 px. Frames aéreos recebem elevação explícita. KO horizontal
reduzido proporcionalmente para caber na célula. A geração não é determinística, mas a
montagem a partir das fontes versionadas é reproduzível.

Saídas: `public/fighters/rodolfo/sprite.png`, 1536×1120 RGBA (8×5 células 192×224), e
`public/fighters/rodolfo/portrait.png`, 240×300 RGBA. Scale 1, offsetX 0, offsetY 8.
Todos os frames base para a direita; flipX genérico. Arte não controla colisão ou timing.

## Frame map

| Frames       | Animação                       |
| ------------ | ------------------------------ |
| 0–3          | idle                           |
| 4–9          | walk                           |
| 10 / 11 / 12 | jump rise / apex / fall        |
| 13           | crouch                         |
| 14–16        | punch                          |
| 17–19        | kick                           |
| 20–22        | crouchPunch                    |
| 23–25        | crouchKick                     |
| 26–28        | airPunch                       |
| 29–31        | airKick                        |
| 32 / 33      | block / crouchBlock            |
| 34 / 35      | hurt                           |
| 36–38        | knockout start / fall / ground |
| 39           | victory                        |

## Validação e limitações

Validação automática de alpha, dimensões, 40 células não vazias, margem e baseline.
Testes de config, roster, animações por fase, CPU e determinismo.
Playtest em Chromium com F2: poses de todos os estados, seis golpes, controles de teclado,
salto diagonal, flipX e cross-up. O frame ativo do soco aéreo foi deslocado para baixo e
para trás após inspeção da hitbox, sem alterar o config de colisão.

Treze partidas completas, CPU normal com seeds 41/91; placares pela perspectiva do Rodolfo:
Augusto 0–2, Filipe 2–1, João 0–2, Romualdo 0–2, Isaque 0–2, Aislan 0–2, Rômulo 1–2,
Gabriel 2–0, Gabriele 1–2, Amanda 1–2, Douglas 2–1 e Dmitry 1–2. No lado CPU, venceu
Augusto por 2–1. Amostras de smoke test, não avaliação estatística de balanceamento.

Mobile landscape emulado 844×390: retrato, seleção, sprite, cross-up e movimento + soco
simultâneos via touch sem erros no console. SwiftShader por software mediu cerca de 16 FPS;
isso não comprova desempenho normal em GPU ou aparelho físico.

Transições curtas de três frames, algumas poses reutilizadas e redução do KO horizontal
são limitações desta versão. Mobile emulado não substitui teste em aparelho físico.

## Base Git

Branch criada sobre `origin/main` em `4a72de0`. O commit do Douglas foi incorporado como
pré-requisito do confronto Rodolfo VS Douglas, sem trazer a branch paralela de história dele.
Nenhum merge na main faz parte desta tarefa.
