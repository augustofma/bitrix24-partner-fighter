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

| Faixa                    | Onde toca                      | Tom / BPM     | Duração | Clima                                    |
| ------------------------ | ------------------------------ | ------------- | ------- | ---------------------------------------- |
| `menu-theme`             | Tela inicial                   | Ré menor 112  | 34 s    | Abertura épica, intro com pad e arpejo   |
| `character-select-theme` | Seleção e VS da luta rápida    | Mi menor 140  | 27 s    | Expectativa: four-on-the-floor, chiptune |
| `story-map-theme`        | Mapa do Modo História (e o VS) | Ré menor 138  | 42 s    | Mapa de arcade de luta (ver abaixo)      |
| `partner-summit-theme`   | Lutas no Partner Summit        | Lá menor 150  | 38 s    | Batalha: galope de power chords, lead    |
| `victory-sting`          | Vitória e campanha concluída   | Si♭ maior 165 | 5 s     | Fanfarra de arcade de luta (ver abaixo)  |

**`story-map-theme`:** tema de "mapa-múndi" de arcade de luta, com melodia original: baixo
funk em semicolcheias com oitavas, orquestra hits abrindo cada frase e stabs de metais nos
contratempos, tema heroico nos metais (A), repetido com o lead de synth e virando para o relativo
maior (A'), ponte com o lead no agudo sobre cordas e metais na oitava de baixo (B) e virada com
hits e rufo de caixa de volta ao início do loop. Usa os mesmos instrumentos da fanfarra.

**`victory-sting`:** fanfarra no estilo das vitórias de jogos de luta de arcade, com melodia
original: orquestra hit no tempo forte, chamada de metais em tercina dobrada em oitavas (metais
com "scoop" de afinação no ataque, filtro que abre e assenta e vibrato nas notas longas),
cordas e baixo em colcheias, subida IV–V com rufo de caixa e tímpanos, acorde final sustentado
com brilho de sinos e reverb de sala (convolução). Instrumentos próprios: `horn`, `strings`,
`stab`, `timpani`, `bell`; reverb e cauda são opcionais por faixa (`reverb`, `tail_seconds`),
então as outras faixas não mudam.

Licença: original do projeto (mesma licença do repositório).
