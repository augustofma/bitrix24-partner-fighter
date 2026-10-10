"""
Arcade announcer voice of Bitrix24 Partner Fighter ("ROUND 1... FIGHT!", "K.O.", "PERFECT"...).

The words are spoken by Kokoro-82M (Apache-2.0 open-weights text-to-speech, run locally through
kokoro-onnx) and then given the arcade treatment here: a little lower and slower, driven
(soft saturation) and a light arena tail. Nothing is sampled from other games.

Offline tool (not part of the build). Setup, once:

    python3 -m venv .venv && .venv/bin/pip install kokoro-onnx soundfile
    curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.int8.onnx
    curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin

Then:

    .venv/bin/python scripts/voice/generate_announcer.py --model kokoro-v1.0.int8.onnx \
        --voices voices-v1.0.bin              # writes public/audio/sfx/voice-*.ogg and *.mp3
"""

from __future__ import annotations

import argparse
import subprocess
import tempfile
import wave
from pathlib import Path

import numpy as np

# Same folder as the sound effects: the game plays them as SFX ids `voice-<line>`.
OUT_DIR = Path(__file__).resolve().parents[2] / "public" / "audio" / "sfx"
VOICE = "am_michael"
SR = 44100
PEAK = 0.8
# Arcade treatment (tuned so the words stay intelligible: a slapback echo blurred the "t" of
# "fight" into "find" for a speech recogniser, so there is only a light arena tail).
PITCH = 0.93  # played back slower: deeper and a little more dramatic
DRIVE = 1.6
TAIL_S = 0.45
# Arena reverb level: low enough that the tail of a vowel never masks a final consonant.
REVERB = 0.003

# id -> (words, phonemes, speed). The phonemes are written by hand in Kokoro's US notation
# (misaki: A = eɪ, I = aɪ, W = aʊ, O = oʊ), so no grapheme-to-phoneme library is needed.
NUMBERS = [
    ("one", "wˈʌn"), ("two", "tˈu"), ("three", "θɹˈi"), ("four", "fˈɔɹ"), ("five", "fˈIv"),
    ("six", "sˈɪks"), ("seven", "sˈɛvən"), ("eight", "ˈAt"), ("nine", "nˈIn"),
]
LINES: dict[str, tuple[str, str, float]] = {
    **{f"round-{n}": (f"Round {word}!", f"ɹˈWnd {ipa}!", 0.9) for n, (word, ipa) in enumerate(NUMBERS, start=1)},
    "final-round": ("Final round!", "fˈInəl ɹˈWnd!", 0.85),
    "fight": ("Fight!", "fˈIt!", 0.8),
    "ko": ("K.O.!", "kˈA ˈO!", 0.8),
    "perfect": ("Perfect!", "pˈɜɹfəkt!", 0.85),
    "time-over": ("Time over!", "tˈIm ˈOvəɹ!", 0.9),
    "draw": ("Draw!", "dɹˈɔ!", 0.9),
    "you-win": ("You win!", "jˈu, wˈɪn!", 0.85),
    "you-lose": ("You lose...", "ju lˈuz…", 0.85),
}


def resample(signal: np.ndarray, src: int, dst: int) -> np.ndarray:
    positions = np.arange(int(len(signal) * dst / src)) * src / dst
    return np.interp(positions, np.arange(len(signal)), signal)


def trim(signal: np.ndarray, threshold: float = 0.005) -> np.ndarray:
    """Cuts the silence around the words, keeping a generous tail: final consonants (the "t" of
    "fight") are quiet bursts after the vowel and must not be cut."""
    loud = np.flatnonzero(np.abs(signal) > threshold * np.abs(signal).max())
    if loud.size == 0:
        return signal
    return signal[max(0, loud[0] - int(0.02 * SR)) : loud[-1] + int(0.15 * SR)]


def arcade(voice: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    # Slower playback = lower pitch (the classic "big announcer" trick).
    voice = resample(voice, SR, int(SR / PITCH))
    voice = voice / max(1e-9, np.abs(voice).max())
    driven = np.tanh(voice * DRIVE) / np.tanh(DRIVE) if DRIVE > 0 else voice
    out = np.concatenate([driven, np.zeros(int(TAIL_S * SR))])
    # Arena tail: decaying noise convolved with the voice (a cheap, smooth reverb).
    tail_len = int(TAIL_S * SR)
    impulse = rng.standard_normal(tail_len) * np.exp(-np.linspace(0, 7, tail_len)) * REVERB
    size = len(driven) + tail_len - 1
    n = 1 << (size - 1).bit_length()
    wet = np.fft.irfft(np.fft.rfft(driven, n) * np.fft.rfft(impulse, n), n)[:size]
    out[: min(len(out), size)] += wet[: len(out)]
    fade = int(0.05 * SR)
    out[-fade:] *= np.linspace(1, 0, fade)
    return out * (PEAK / max(1e-9, np.abs(out).max()))


def write_wav(path: Path, mono: np.ndarray) -> None:
    pcm = (np.clip(mono, -1, 1) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(SR)
        out.writeframes(pcm.tobytes())


def encode(wav: Path, name: str) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    base = ["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav), "-map_metadata", "-1"]
    subprocess.run(base + ["-c:a", "libvorbis", "-q:a", "4", str(OUT_DIR / f"{name}.ogg")], check=True)
    subprocess.run(base + ["-af", "volume=-1dB", "-c:a", "libmp3lame", "-q:a", "5", str(OUT_DIR / f"{name}.mp3")], check=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True)
    parser.add_argument("--voices", required=True)
    parser.add_argument("names", nargs="*")
    args = parser.parse_args()
    from kokoro_onnx import Kokoro

    kokoro = Kokoro(args.model, args.voices)
    with tempfile.TemporaryDirectory() as tmp:
        for name in args.names or list(LINES):
            _words, phonemes, speed = LINES[name]
            samples, rate = kokoro.create(phonemes, voice=VOICE, speed=speed, is_phonemes=True)
            voice = trim(resample(np.asarray(samples, dtype=np.float64), rate, SR))
            signal = arcade(voice, np.random.default_rng(len(name)))
            wav = Path(tmp) / f"{name}.wav"
            write_wav(wav, signal)
            encode(wav, f"voice-{name}")
            print(f"{name}: {len(signal) / SR * 1000:.0f} ms")


if __name__ == "__main__":
    main()
