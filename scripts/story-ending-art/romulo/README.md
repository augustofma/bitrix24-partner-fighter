# Arte do final do Romulo no Modo História

`source.webp` é a arte oficial (1672×941) fornecida pelo usuário: o Romulo, de costas, de blazer
escuro, num calçadão à beira-mar olhando o pôr do sol sobre a praia e os prédios.

`prepare_romulo_ending.py` faz o mesmo preparo dos outros finais (recorte 16:9 centralizado) e
gera `public/story/endings/romulo.jpg` (1440×810).

O Romulo ainda está sendo implementado: o final já está cadastrado em `STORY_ENDING_ART`
(`src/story/storyEndings.ts`) com o id `romulo` e passa a ser carregado e mostrado sozinho quando
um lutador com esse id entrar no `ROSTER` (com perfil de história, para ter campanha). Se o id
for outro, basta trocar a chave na tabela.

Uso (ferramenta offline, fora do build; requer Python 3 e Pillow):

```bash
python scripts/story-ending-art/romulo/prepare_romulo_ending.py
```
