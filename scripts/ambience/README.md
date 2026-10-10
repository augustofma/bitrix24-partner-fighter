# Som ambiente dos cenários

Um loop de 12 s por lugar, **sintetizado do zero** por `generate_ambience.py` (numpy + ffmpeg),
tocado por baixo da música durante a luta. Nada gravado nem baixado.

```
python3 scripts/ambience/generate_ambience.py          # todos
python3 scripts/ambience/generate_ambience.py rio      # só alguns
```

Gera `public/audio/ambience/<id>.ogg` (Vorbis) e `<id>.m4a` (AAC 64 kbps, para o Safari). O
final de cada loop é dobrado sobre o começo com crossfade, então ele repete sem clique. Semente
fixa por loop: arquivos reproduzíveis. Todos saem com nível parecido (~-21 dB médio); o jogo
toca a 0,3 (`AMBIENCE_VOLUME`) com ganho fino por loop em `AMBIENCES` (`src/config/audio.ts`).

| Loop             | Cenários                  | Som                                                         |
| ---------------- | ------------------------- | ----------------------------------------------------------- |
| `arena`          | Partner Summit, Arena     | Torcida de arena com reverb                                 |
| `rio`            | Rio de Janeiro            | Torcida, batucada (surdo, tamborim, ganzá), mar             |
| `recife`         | Recife                    | Torcida, alfaias de maracatu e agogô                        |
| `spain`          | Madri                     | Torcida e palmas de flamenco                                |
| `portugal`       | Portugal                  | Torcida, gaivotas e ondas                                   |
| `castelo-branco` | Castelo Branco            | Torcida, vento e passarinhos                                |
| `joinville`      | Joinville, Joinville Zopu | Torcida e passarinhos                                       |
| `curitiba`       | Curitiba                  | Torcida, chafariz e passarinhos                             |
| `russia`         | Rússia                    | Torcida e rajadas de vento                                  |
| `office`         | Bitrix24 Moscou           | Ar-condicionado, conversa, teclados, telefone (sem torcida) |

Cenário novo: escolha um loop existente em `StageConfig.ambience` ou crie um aqui (função
`amb_<id>` em `AMBIENCES`), gere e acrescente o id em `AmbienceId` e `AMBIENCES`.

Licença: original do projeto.
