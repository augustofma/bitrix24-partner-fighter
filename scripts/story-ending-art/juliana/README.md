# Arte do final da Juliana no Modo História

`source.webp` é a arte oficial (1672×941) fornecida pelo usuário: a Juliana, de costas, blusa
laranja e calça escura, num terraço à beira do rio olhando o pôr do sol sobre a água, um barco e
uma ponte antiga de pedra.

`prepare_juliana_ending.py` recorta em 16:9 exato (centralizado) e gera
`public/story/endings/juliana.jpg` (1440×810).

A arte é ligada à lutadora (id `juliana`) em `STORY_ENDING_ART` (`src/story/storyEndings.ts`) e
aparece na `CampaignCompleteScene`, ao zerar o Modo História com ela, e na galeria de finais,
assim que a lutadora `juliana` entrar no elenco (até lá a entrada fica registrada e não é
carregada).

Uso (ferramenta offline, fora do build; requer Python 3 e Pillow):

```bash
python scripts/story-ending-art/juliana/prepare_juliana_ending.py
```
