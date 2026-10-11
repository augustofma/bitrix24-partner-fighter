# Jonas — Sapiens

Arte original gerada com ImageGen integrado a partir das referências oficiais fornecidas pelo
usuário: foto real como identidade e pôster aprovado como direção artística. Uso autorizado
para o projeto, sem sprites de franquias ou logos copiados.

Identidade preservada: cabelo curto castanho claro, barba curta castanha/grisalha, olhos
claros, expressão séria, corpo magro/atlético, camiseta preta e calça/sapatos escuros.

## Fontes e montagem reproduzível

- `sheet-source.png`: fonte RGBA 1469×1071 com as 40 poses.
- `portrait-source.png`: retrato original RGBA, braços cruzados.
- `prompts.json`: prompts exatos das duas gerações integradas.

```powershell
python scripts/jonas-art/prepare.py
python scripts/jonas-art/prepare.py --validate-only
```

Pillow/NumPy offline, já usados pelo projeto. Recortes e âncoras revisados por pose, isolamento
do componente opaco e sua borda, remoção do halo de baixa opacidade. Escala proporcional com
nearest, sem deformação corporal. Guarda com altura 172 px; baseline 216, margem mínima 4 px.
Frames aéreos têm elevação explícita. KO horizontal reduzido proporcionalmente para caber.
A geração não é determinística, mas a montagem usa fontes versionadas e é reproduzível.
O retrato ocupa 216 px de altura, ancorado na base do PNG: essa margem superior mantém
o rosto inteiro nos cards paginados, que usam recorte `cover` alinhado embaixo.

Saídas: `public/fighters/jonas/sprite.png`, 1536×1120 RGBA, grade 8×5 de células 192×224;
`public/fighters/jonas/portrait.png`, 240×300 RGBA. Scale 1, offsetX 0, offsetY 8.
Base voltada à direita, flipX genérico. Arte não controla timing nem colisão.

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

## Validação e limites

Dimensões, alpha, células não vazias, margem e baseline validados programaticamente.
Config, roster, animações por fase, CPU e determinismo cobertos por testes.
Playtest em Chromium com F2: todos os estados e seis golpes; o frame ativo do soco aéreo
foi deslocado para trás e para cima após inspeção da hitbox, sem alterar colisões.
Teclado, salto diagonal, cross-up e flipX conferidos.

Quatorze partidas completas com CPU normal e seeds 41/91. Pela perspectiva do Jonas:
Augusto 1–2, Filipe 1–2, João 1–2, Romualdo 0–2, Isaque 0–2, Aislan 1–2, Rômulo 0–2,
Gabriel 0–2, Gabriele 0–2, Amanda 0–2, Douglas 0–2, Rodolfo 0–2 e Dmitry 0–2.
Como CPU contra Augusto, perdeu 0–2. São amostras de smoke test, não avaliação estatística
de balanceamento; Jonas ainda não possui especial.

Mobile landscape emulado 844×390: seleção paginada, portrait, sprite e movimento + soco
simultâneos via touch funcionaram sem erros no console. SwiftShader por software mediu
cerca de 18 FPS; desempenho normal em GPU/aparelho físico não foi comprovado.

As transições de ataques têm três frames e o KO horizontal tem escala reduzida para caber.
Mobile emulado não substitui validação em aparelhos físicos.

## Base Git

Branch criada sobre a main atualizada em `d23a931`. Nenhum merge na main faz parte desta tarefa.
