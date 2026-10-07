# Trilha sonora original

Todas as músicas do jogo são **composições originais** feitas para o Bitrix24 Partner Fighter e
sintetizadas do zero por `compose.py` (numpy + ffmpeg). Não há samples, loops comprados,
trechos baixados nem transcrições de outros jogos: cada melodia, progressão e padrão de bateria
está escrito nota a nota no script. Os instrumentos são síntese simples (serra/quadrada com banda
limitada, ruído filtrado para a bateria, filtros FIR, delay ping-pong).

```
python3 scripts/music/compose.py               # todas as faixas
python3 scripts/music/compose.py menu-theme    # só uma
```

Gera `public/audio/music/<id>.ogg` (Vorbis q4, loop sem emenda) e `<id>.m4a` (AAC 128 kbps,
para navegadores sem Vorbis). Os loops são renderizados com a cauda (releases, ecos, pratos)
dobrada sobre o início, então repetem sem clique nem silêncio.

| Faixa                    | Onde toca                      | Tom / BPM    | Duração | Clima                                     |
| ------------------------ | ------------------------------ | ------------ | ------- | ----------------------------------------- |
| `menu-theme`             | Tela inicial                   | Ré menor 112 | 34 s    | Abertura épica, intro com pad e arpejo    |
| `character-select-theme` | Seleção e VS da luta rápida    | Mi menor 140 | 27 s    | Expectativa: four-on-the-floor, chiptune  |
| `story-map-theme`        | Mapa do Modo História (e o VS) | Ré maior 120 | 32 s    | Aventura e viagem, pluck e lead brilhante |
| `partner-summit-theme`   | Lutas no Partner Summit        | Lá menor 150 | 38 s    | Batalha: galope de power chords, lead     |
| `victory-sting`          | Vitória e campanha concluída   | Dó maior 132 | 4 s     | Fanfarra curta, depois silêncio           |

Licença: original do projeto (mesma licença do repositório).
