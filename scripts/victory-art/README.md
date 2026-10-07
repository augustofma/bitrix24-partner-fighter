# Arte da tela de vitória

`source.png` é a arte aprovada da tela de vitória (1672×941), com um exemplo "AUGUSTO VENCEU!"
desenhado na própria imagem: título, card com retrato, linha de resultado e botão.

`prepare_victory_art.py` separa essa arte nas camadas usadas pela `VictoryScene` em
`public/ui/victory/`:

| Arquivo            | Conteúdo                                                                        |
| ------------------ | ------------------------------------------------------------------------------- |
| `background.jpg`   | 960×540, a arena sem título, card, linha de resultado e botão                   |
| `card-frame.png`   | Moldura do card com a janela do retrato transparente e a plaqueta do nome vazia |
| `result-panel.png` | Painel do resultado sem texto                                                   |
| `button.png`       | Botão VOLTAR AO MENU (o rótulo é fixo, então fica na arte)                      |

Como funciona:

1. **Silhuetas:** cada elemento é recortado linha a linha, do primeiro ao último pixel da sua
   moldura (ciano ou dourado), com as pequenas decorações laterais incluídas.
2. **Textos de exemplo:** no interior da plaqueta e do painel, cada linha recebe a cor mediana
   dos seus pixels escuros, apagando o texto e mantendo o degradê do painel.
3. **Título:** as letras amarelas/rosa são detectadas por cor e dilatadas para cobrir contorno e
   sombra.
4. **Fundo limpo:** título, card, painel e botão (com margem) são preenchidos por difusão a
   partir das bordas (`scripts/art_tools.py`). Atrás de cada camada fica só esse preenchimento.
5. Tudo é reduzido para 960×540 com Lanczos e o script imprime as posições usadas em
   `src/ui/victory/victoryLayout.ts`.

Nome do vencedor, retrato, veredito, motivo e placar são desenhados pelo jogo a partir do
`MatchResult` real.

Uso (ferramenta offline, fora do build; requer Python 3, Pillow e NumPy):

```bash
python scripts/victory-art/prepare_victory_art.py
```
