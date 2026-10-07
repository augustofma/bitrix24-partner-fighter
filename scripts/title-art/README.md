# Arte da tela inicial

`source.webp` é a arte oficial aprovada da tela inicial (1672×941): arena neon, João Guiotti
à esquerda, Isaque Ferreira à direita, o logo "BITRIX24 / PARTNER FIGHTER" e o botão START.

`prepare_title_art.py` separa essa arte nas camadas usadas pela `MenuScene` em
`public/ui/title/` e gera `src/ui/title/titleArtLayout.ts` (posição e tamanho de cada camada):

| Arquivo              | Conteúdo                                                                               |
| -------------------- | -------------------------------------------------------------------------------------- |
| `background.jpg`     | 960×540, sem o logo, o START, as letras da dica e o cabelo do João (áreas preenchidas) |
| `logo.png`           | Logo com chamas e raios, alpha                                                         |
| `button.png`         | Botão START, alpha                                                                     |
| `glow.png`           | Brilho redondo suave (luzes da arena, tingido e pulsado em código)                     |
| `wind-joao-hair.png` | Cabelo do João (com um anel fino do entorno), alpha                                    |
| `wind-*.png`         | Gola, costas, barra e manga de cada lutador: recortes elípticos com borda suave        |

Como funciona:

1. **Logo:** máscara por cor numa caixa ao redor do título (laranja, amarelo, rosa, roxo
   saturados, quase brancos e o ciano claro de "BITRIX24"), sem o troféu, fechada e dilatada
   para incluir o contorno escuro das letras.
2. **START:** em cada linha, o intervalo entre as bordas douradas, dilatado para o contorno.
3. **Cabelo:** fios marrom-escuros e bordô na caixa acima dos óculos. A camada leva um anel de
   4 px do entorno, então parada é idêntica à arte; atrás dela o fundo é preenchido, para as
   pontas que se mexem nunca revelarem um segundo cabelo parado.
4. **Tecidos:** elipses de borda suave sobre gola, costas, barra e manga, longe de rosto, mãos
   e logos impressos. Como o deslocamento é de 1-2 px, o fundo original segue por baixo.
5. **Fundo limpo:** logo, START (mais uma margem maior que a flutuação e o clique), as letras
   da dica e o cabelo são preenchidos por difusão (`scripts/art_tools.py`).
6. Tudo é reduzido para 960×540 com Lanczos.

Uso (ferramenta offline, fora do build; requer Python 3, Pillow e NumPy):

```bash
python scripts/title-art/prepare_title_art.py
```
