# Arte do final do Douglas no Modo História

`source.webp` é a arte oficial (1672×941) fornecida pelo usuário: o Douglas (Dohko Technology), de
costas, de terno escuro e mãos nos bolsos, num mirante de São Paulo olhando o pôr do sol sobre os
prédios da cidade, o rio e a ponte estaiada Octávio Frias de Oliveira.

`prepare_douglas_ending.py` faz o mesmo preparo dos outros finais 16:9 (recorte centralizado) e
gera `public/story/endings/douglas.jpg` (1440×810).

A arte é ligada ao lutador em `STORY_ENDING_ART` (`src/story/storyEndings.ts`) quando o
personagem entrar no elenco; aparece na `CampaignCompleteScene`, ao zerar o Modo História com
ele, e na galeria de finais.

Uso (ferramenta offline, fora do build; requer Python 3 e Pillow):

```bash
python scripts/story-ending-art/douglas/prepare_douglas_ending.py
```
