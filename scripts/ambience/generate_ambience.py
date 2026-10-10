"""
Stage ambience of Bitrix24 Partner Fighter: a seamless loop per place, under the fight music.

Synthesized from scratch with numpy (nothing sampled): a crowd bed (many murmuring "voices" of
band-limited noise with their own slow swells, claps and whistles) plus each place's own
flavour: a samba batucada and the sea in Rio, maracatu drums and an agogô in Recife, flamenco
palmas in Madrid, seagulls in Portugal, birds and a fountain in Curitiba, wind on Red Square,
and an office hum with keyboards (no crowd) at the Bitrix24 office in Moscow.

    python3 scripts/ambience/generate_ambience.py          # public/audio/ambience/*.ogg + *.m4a
    python3 scripts/ambience/generate_ambience.py rio      # only these

Loops are rendered with their tail folded back onto the start, so they repeat without a click.
Seeded per ambience: reproducible files.
"""

from __future__ import annotations

import subprocess
import sys
import tempfile
import wave
import zlib
from pathlib import Path

import numpy as np

SR = 44100
LOOP_S = 12.0
FOLD_S = 1.0
OUT_DIR = Path(__file__).resolve().parents[2] / "public" / "audio" / "ambience"
PEAK = 0.7


def t(duration: float) -> np.ndarray:
    return np.arange(int(duration * SR)) / SR


def band(signal: np.ndarray, low: float, high: float) -> np.ndarray:
    """Brick-wall band-pass in the frequency domain (cheap for long signals)."""
    spectrum = np.fft.rfft(signal)
    freqs = np.fft.rfftfreq(len(signal), 1 / SR)
    spectrum[(freqs < low) | (freqs > high)] = 0
    return np.fft.irfft(spectrum, len(signal))


def slow_swell(rng: np.random.Generator, n: int, rate: float, depth: float) -> np.ndarray:
    """A smooth random envelope (sum of a few slow sines), 1 ± depth."""
    x = np.arange(n) / SR
    env = np.zeros(n)
    for _ in range(4):
        env += np.sin(2 * np.pi * rng.uniform(0.3, 1.0) * rate * x + rng.uniform(0, 2 * np.pi))
    return 1 + depth * env / 4


def place(out: np.ndarray, sound: np.ndarray, at: float, gain: float = 1.0) -> None:
    start = int(at * SR) % len(out)
    end = min(len(out), start + len(sound))
    out[start:end] += sound[: end - start] * gain
    rest = len(sound) - (end - start)
    if rest > 0:  # wraps around the loop point
        out[:rest] += sound[end - start :] * gain


def decay(duration: float, rate: float) -> np.ndarray:
    return np.exp(-rate * t(duration))


def crowd(rng: np.random.Generator, size: float = 1.0, claps: float = 1.0, whistles: int = 3) -> np.ndarray:
    n = int((LOOP_S + FOLD_S) * SR)
    out = np.zeros(n)
    # Many murmuring voices: formant-ish noise bands, each swelling on its own.
    for _ in range(int(14 * size)):
        centre = rng.uniform(350, 1900)
        voice = band(rng.standard_normal(n), centre * 0.7, centre * 1.35)
        out += voice * slow_swell(rng, n, 0.35, 0.8).clip(0) * 0.05
    # Scattered claps.
    for _ in range(int(40 * claps * size)):
        clap = band(rng.standard_normal(int(0.03 * SR)), 900, 6000) * decay(0.03, 140)
        place(out, clap, rng.uniform(0, LOOP_S + FOLD_S), rng.uniform(0.08, 0.2))
    # A few whistles.
    for _ in range(whistles):
        dur = rng.uniform(0.25, 0.6)
        f0 = rng.uniform(1900, 2900)
        glide = f0 * (1 + rng.uniform(-0.15, 0.2) * t(dur) / dur)
        whistle = np.sin(2 * np.pi * np.cumsum(glide) / SR) * np.sin(np.pi * t(dur) / dur) * 0.05
        place(out, whistle, rng.uniform(0, LOOP_S))
    return out


def arena_reverb(signal: np.ndarray, rng: np.random.Generator, seconds: float = 1.2, gain: float = 0.25) -> np.ndarray:
    tail = int(seconds * SR)
    impulse = rng.standard_normal(tail) * np.exp(-np.linspace(0, 6, tail)) * 0.004
    size = len(signal) + tail - 1
    nfft = 1 << (size - 1).bit_length()
    wet = np.fft.irfft(np.fft.rfft(signal, nfft) * np.fft.rfft(impulse, nfft), nfft)[: len(signal)]
    return signal + wet * gain / max(1e-9, np.abs(wet).max()) * np.abs(signal).max()


def drum(f_start: float, f_end: float, duration: float, rate: float) -> np.ndarray:
    freq = np.linspace(f_start, f_end, int(duration * SR))
    return np.sin(2 * np.pi * np.cumsum(freq) / SR) * decay(duration, rate)


def tick(rng: np.random.Generator, low: float, high: float, duration: float = 0.04) -> np.ndarray:
    return band(rng.standard_normal(int(duration * SR)), low, high) * decay(duration, 90)


def bell(freq: float, duration: float = 0.25) -> np.ndarray:
    x = t(duration)
    return (np.sin(2 * np.pi * freq * x) + 0.5 * np.sin(2 * np.pi * freq * 2.76 * x)) * decay(duration, 14)


def waves(rng: np.random.Generator, n: int, gain: float) -> np.ndarray:
    surf = band(rng.standard_normal(n), 120, 1800)
    return surf * slow_swell(rng, n, 0.12, 0.9).clip(0) * gain


def birds(rng: np.random.Generator, out: np.ndarray, count: int, low: float, high: float) -> None:
    for _ in range(count):
        chirps = rng.integers(2, 5)
        start = rng.uniform(0, LOOP_S)
        for c in range(chirps):
            dur = rng.uniform(0.05, 0.12)
            f0 = rng.uniform(low, high)
            glide = f0 * (1 + rng.uniform(-0.3, 0.3) * t(dur) / dur)
            chirp = np.sin(2 * np.pi * np.cumsum(glide) / SR) * np.sin(np.pi * t(dur) / dur) * 0.05
            place(out, chirp, start + c * rng.uniform(0.09, 0.16))


def beat_loop(bpm: float, beats: float) -> tuple[float, int]:
    """Seconds per beat, and how many beats fit the loop exactly (the groove loops cleanly)."""
    count = max(1, round(LOOP_S * bpm / 60 / beats) * int(beats))
    return LOOP_S / count, count


# --- Places -----------------------------------------------------------------------------------


def amb_arena(rng):
    return arena_reverb(crowd(rng, size=1.3, claps=1.3, whistles=5), rng)


def amb_rio(rng):
    out = crowd(rng, size=1.1)
    n = len(out)
    out += waves(rng, n, 0.05)
    # Batucada (samba, 2/4): surdo strong on beat 2, tamborim telecoteco, shaker on 16ths.
    beat, count = beat_loop(100, 2)
    pattern = [1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0]  # telecoteco over 2 bars
    for b in range(count):
        place(out, drum(80, 55, 0.35, 7), b * beat, 0.32 if b % 2 else 0.16)
        for s in range(4):
            sixteenth = (b * 4 + s)
            place(out, tick(rng, 4000, 9000, 0.03), b * beat + s * beat / 4, 0.05)
            if pattern[sixteenth % 16]:
                place(out, tick(rng, 1500, 4500, 0.05), b * beat + s * beat / 4, 0.12)
    return out


def amb_recife(rng):
    out = crowd(rng, size=1.0)
    # Maracatu: alfaias (low drums) in a rolling pattern and an agogô (two-tone bell).
    beat, count = beat_loop(90, 4)
    alfaia = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 1]
    for b in range(count):
        for s in range(4):
            i = b * 4 + s
            if alfaia[i % 16]:
                place(out, drum(110, 60, 0.3, 9), b * beat + s * beat / 4, 0.22)
        place(out, bell(880 if b % 2 else 660), b * beat, 0.07)
    return out


def amb_spain(rng):
    out = crowd(rng, size=1.0, claps=0.6)
    # Flamenco palmas: a 12-beat compás with accents on 3, 6, 8, 10 and 12.
    beat, count = beat_loop(180, 12)
    for b in range(count):
        accent = (b % 12) + 1 in (3, 6, 8, 10, 12)
        clap = band(rng.standard_normal(int(0.04 * SR)), 1200, 7000) * decay(0.04, 110)
        place(out, clap, b * beat, 0.22 if accent else 0.08)
    return out


def amb_portugal(rng):
    out = crowd(rng, size=0.9)
    n = len(out)
    out += waves(rng, n, 0.06)
    # Seagulls: falling "kyow" calls.
    for _ in range(5):
        start = rng.uniform(0, LOOP_S)
        for c in range(rng.integers(1, 4)):
            dur = rng.uniform(0.18, 0.3)
            glide = np.linspace(rng.uniform(1300, 1600), rng.uniform(700, 900), int(dur * SR))
            phase = 2 * np.pi * np.cumsum(glide) / SR
            call = np.sin(phase + 2.2 * np.sin(phase * 0.5)) * np.sin(np.pi * t(dur) / dur) * 0.04
            place(out, call, start + c * 0.32)
    return out


def amb_castelo_branco(rng):
    out = crowd(rng, size=0.8)
    n = len(out)
    out += band(rng.standard_normal(n), 80, 600) * slow_swell(rng, n, 0.08, 0.8).clip(0) * 0.05
    birds(rng, out, 8, 2500, 4200)
    return out


def amb_joinville(rng):
    out = crowd(rng, size=1.0)
    birds(rng, out, 6, 2800, 4500)
    return out


def amb_curitiba(rng):
    out = crowd(rng, size=1.0)
    n = len(out)
    # The garden's fountain: a steady, soft splash.
    out += band(rng.standard_normal(n), 2500, 9000) * slow_swell(rng, n, 1.5, 0.25) * 0.025
    birds(rng, out, 10, 3000, 5200)
    return out


def amb_russia(rng):
    out = crowd(rng, size=0.9, whistles=2)
    n = len(out)
    # Cold wind gusts across the square.
    gusts = band(rng.standard_normal(n), 150, 1200) * slow_swell(rng, n, 0.07, 1.0).clip(0) ** 2
    return out + gusts * 0.06


def amb_office(rng):
    n = int((LOOP_S + FOLD_S) * SR)
    x = np.arange(n) / SR
    # HVAC hum and air, a quiet murmur, keyboards clacking, a phone now and then.
    out = (np.sin(2 * np.pi * 60 * x) * 0.02 + np.sin(2 * np.pi * 120 * x) * 0.01)
    out += band(rng.standard_normal(n), 100, 900) * 0.02
    for _ in range(4):
        centre = rng.uniform(400, 1200)
        out += band(rng.standard_normal(n), centre * 0.7, centre * 1.3) * slow_swell(rng, n, 0.25, 0.9).clip(0) * 0.012
    for _ in range(14):
        start = rng.uniform(0, LOOP_S)
        for k in range(rng.integers(4, 12)):
            place(out, tick(rng, 2000, 7000, 0.02), start + k * rng.uniform(0.08, 0.16), rng.uniform(0.05, 0.1))
    ring_start = rng.uniform(2, LOOP_S - 3)
    for r in range(2):
        ring = (np.sin(2 * np.pi * 1300 * t(0.35)) + np.sin(2 * np.pi * 1700 * t(0.35))) * 0.015
        place(out, ring, ring_start + r * 0.5)
    return out


AMBIENCES = {
    "arena": amb_arena,
    "rio": amb_rio,
    "recife": amb_recife,
    "spain": amb_spain,
    "portugal": amb_portugal,
    "castelo-branco": amb_castelo_branco,
    "joinville": amb_joinville,
    "curitiba": amb_curitiba,
    "russia": amb_russia,
    "office": amb_office,
}


def fold_loop(signal: np.ndarray) -> np.ndarray:
    """Folds the extra tail (FOLD_S) onto the start with a crossfade: a seamless loop."""
    n = int(LOOP_S * SR)
    fold = len(signal) - n
    out = signal[:n].copy()
    ramp = np.linspace(0, 1, fold)
    out[:fold] = out[:fold] * ramp + signal[n:] * (1 - ramp)
    return out


def write_wav(path: Path, mono: np.ndarray) -> None:
    pcm = (np.clip(mono, -1, 1) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(SR)
        out.writeframes(pcm.tobytes())


def encode(wav: Path, name: str) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    common = ["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav), "-map_metadata", "-1"]
    subprocess.run(common + ["-c:a", "libvorbis", "-q:a", "2", str(OUT_DIR / f"{name}.ogg")], check=True)
    subprocess.run(common + ["-c:a", "aac", "-b:a", "64k", str(OUT_DIR / f"{name}.m4a")], check=True)


def main(names: list[str]) -> None:
    with tempfile.TemporaryDirectory() as tmp:
        for name in names or list(AMBIENCES):
            rng = np.random.default_rng(zlib.crc32(name.encode()))
            loop = fold_loop(AMBIENCES[name](rng))
            loop = loop * (PEAK / max(1e-9, np.abs(loop).max()))
            wav = Path(tmp) / f"{name}.wav"
            write_wav(wav, loop)
            encode(wav, name)
            print(f"{name}: {len(loop) / SR:.1f} s")


if __name__ == "__main__":
    main(sys.argv[1:])
