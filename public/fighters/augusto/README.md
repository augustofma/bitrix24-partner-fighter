# AUGUSTO — arte futura

Esta pasta contém apenas este README. O personagem usa assets vazios, o
PlaceholderFighterView e o retrato geométrico existentes. A paleta preta com detalhes
azuis e pele cinza é um manequim provisório, sem representar características físicas.

Arquivos a fornecer futuramente:

- portrait.png: retrato mais detalhado para seleção, VS e vitória.
- sprite.png: spritesheet estilizada em grade, fundo transparente, olhando para a direita,
  pés no centro inferior de cada frame.

A arte definitiva deve representar todos os estados:
idle, walk, jump, crouch, punch, kick, crouchPunch, crouchKick,
airPunch, airKick, block, crouchBlock, hurt, knockout, victory.

Preencher assets.portrait e assets.sprite em src/fighters/augusto.ts, incluindo
key, caminhos, dimensões dos frames, índices das animações e escala/offsets.
Não é necessário modificar BootScene, CharacterSelectScene, VersusScene, FightScene,
VictoryScene ou CombatSystem. Arte não altera caixas nem frame data.

Direção visual e requisitos: [ART_DIRECTION.md](../../../docs/ART_DIRECTION.md#augusto).
