# Narrador (voz de anunciador)

Falas de fliperama em inglês ("ROUND 1... FIGHT!", "K.O.", "PERFECT"...) geradas **offline** por
`generate_announcer.py`. Ferramenta de desenvolvimento: não faz parte do build; os arquivos
gerados ficam versionados em `public/audio/sfx/voice-*.ogg` / `.mp3`.

- Voz: [Kokoro-82M](https://github.com/hexgrad/kokoro) (pesos abertos, **Apache-2.0**), voz
  `am_michael`, rodando localmente com `kokoro-onnx`. Nada vem de outros jogos.
- Pronúncia: fonemas escritos à mão (`LINES` no script), sem depender do espeak.
- Tratamento: tom um pouco mais grave e lento, saturação leve e um rabo curto de reverb de
  arena. Um eco forte apagava o "t" de "Fight", por isso o reverb é discreto.
- Conferência: as falas foram transcritas por reconhecimento de fala (Whisper tiny) e todas
  foram reconhecidas.

```
python3 -m venv .venv && .venv/bin/pip install kokoro-onnx soundfile
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.int8.onnx
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
.venv/bin/python scripts/voice/generate_announcer.py --model kokoro-v1.0.int8.onnx --voices voices-v1.0.bin
```

| Arquivo                            | Fala                     | Quando                         |
| ---------------------------------- | ------------------------ | ------------------------------ |
| `voice-round-1` … `voice-round-9`  | "Round n!"               | Início do round                |
| `voice-final-round`                | "Final round!"           | Os dois a uma vitória do match |
| `voice-fight`                      | "Fight!"                 | A luta começa                  |
| `voice-ko`                         | "K.O.!"                  | Nocaute                        |
| `voice-perfect`                    | "Perfect!"               | Round vencido sem perder vida  |
| `voice-time-over`                  | "Time over!"             | Tempo esgotado                 |
| `voice-draw`                       | "Draw!"                  | Round empatado                 |
| `voice-you-win` / `voice-you-lose` | "You win!" / "You lose…" | Tela de vitória (jogador 1)    |

Para uma fala nova: acrescente em `LINES`, gere, adicione o id em `SfxId` e o nível em `SFX`
(`src/config/audio.ts`).
