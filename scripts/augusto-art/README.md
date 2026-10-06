# Fontes da arte do Augusto

Arte original produzida pela ferramenta integrada ImageGen, usando as fotos do Augusto e a
prancha aprovada anexadas pelo usuário como referências de identidade e figurino.
Estas fontes ficam fora de `public/` para não aumentar o download do jogo.

## Conjunto de prompts aplicado

1. `sheet-original.png`: spritesheet pixel-art arcade original, 8×5, 40 poses na ordem abaixo,
   fundo realmente transparente; homem adulto robusto, cabelo curto escuro, barba cheia aparada,
   blazer/camisa/calça/tênis pretos e cordão azul. Olhar para a direita, escala consistente,
   idle respirando, caminhada com transferência de peso, pulo em três fases, ataques em
   preparação/impacto/recuperação, guardas, hurt, queda e vitória. Sem texto, logos ou efeitos.
2. `sheet-corrected.png`: preservar identidade e figurino da primeira geração; corrigir
   recuperação do chute em pé, preparação/impacto/recuperação dos ataques agachados e queda do
   KO. Manter transparência e figuras separadas. O resultado não é um atlas matemático;
   os recortes revisados do script isolam as poses aproveitadas de ambas as versões.
3. `kick-recovery.png`: uma pose isolada do mesmo personagem, olhando para a direita,
   recuperação do chute com pé de apoio no chão, joelho recolhido à frente da cintura,
   tronco ereto e punhos retornando à guarda; pixel-art, transparência e corpo inteiro.
4. `portrait-source.png`: busto pixel-art mais detalhado do mesmo Augusto, expressão confiante
   e amigável, vista em três quartos para a direita, composição vertical 4:5, cabeça completa,
   blazer preto e cordão azul; fundo transparente, sem texto, logo, borda ou marca d'água.

## Montagem reproduzível

Na raiz do projeto, no Windows:

```powershell
powershell -File scripts/prepare-augusto-art.ps1
powershell -File scripts/prepare-augusto-art.ps1 -ValidateOnly
```

Usa System.Drawing e C# via PowerShell, sem Python instalado e sem dependência de runtime.
Os parâmetros opcionais permitem informar os quatro caminhos de origem. O mapa de recortes
é específico para estas fontes revisadas, não um detector genérico de qualquer spritesheet.
O alpha dos pixels mantidos é preservado; fragmentos isolados de geração são descartados.
Não há reconstrução de rosto, desenho procedural substituto ou alteração de gameplay.

Saídas: `public/fighters/augusto/sprite.png` e `portrait.png`.
O validador verifica dimensões, 40 células não vazias, margens transparentes e alpha.
