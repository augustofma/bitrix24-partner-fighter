# Arte da tela inicial

`source.webp` é a arte aprovada da tela inicial (1672×941), fornecida pelo usuário, com o
logo e o botão JOGAR desenhados na própria imagem.

`prepare_title_art.py` separa essa arte nas camadas usadas pela `MenuScene` em
`public/ui/title/`:

| Arquivo          | Conteúdo                                                                     |
| ---------------- | ---------------------------------------------------------------------------- |
| `background.jpg` | 960×540, sem o logo e sem o botão (áreas preenchidas por difusão)            |
| `logo.png`       | Logo BITRIX24 / PARTNER FIGHTER com a explosão de chamas, fundo transparente |
| `button.png`     | Botão JOGAR, fundo transparente                                              |

Como funciona:

1. **Logo:** máscara por cor dentro de uma elipse ao redor do título (amarelo, laranja, rosa e
   magenta saturados ou ciano claro), sem bolhas pequenas (janelas acesas), fechada e dilatada
   para incluir o contorno escuro das letras.
2. **Botão:** em cada linha, o intervalo entre as bordas douradas, dilatado para o contorno.
3. **Fundo limpo:** as duas máscaras, mais uma margem maior que o movimento das camadas, são
   preenchidas por difusão em várias escalas a partir das bordas (com um leve granulado). As
   cabeças e luvas dos lutadores ficam protegidas. Como a margem cobre todo o deslocamento
   do logo (±4 px e 1% de escala) e do botão (de 97% a 103%), o original nunca aparece atrás.
4. Tudo é reduzido para a resolução lógica do jogo (960×540) com Lanczos, e o script imprime
   o centro de cada camada, usado em `src/scenes/MenuScene.ts`.

Uso (ferramenta offline, fora do build; requer Python 3, Pillow e NumPy):

```bash
python scripts/title-art/prepare_title_art.py
```
