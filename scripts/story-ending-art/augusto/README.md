# Arte do final do Augusto no Modo História

`source.webp` é a arte oficial (1672×941) fornecida pelo usuário: o Augusto, de costas, olhando o
pôr do sol no Marco Zero do Recife, de volta para casa depois da campanha.

`prepare_augusto_ending.py` faz um recorte 16:9 centralizado e redimensiona, gerando
`public/story/endings/augusto.jpg` (1440×810, 1,5× a tela de 960×540, para ficar nítida em telas
grandes e aguentar o zoom lento do final).

A arte entra pelo perfil de história (`endingArt` em `src/story/storyProfiles.ts`) e só aparece
na `CampaignCompleteScene`, ao zerar o Modo História com o Augusto. Título, rota e botões são
desenhados por cima, em código.

Uso (ferramenta offline, fora do build; requer Python 3 e Pillow):

```bash
python scripts/story-ending-art/augusto/prepare_augusto_ending.py
```
