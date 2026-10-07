"""
Original arcade sound effects of Bitrix24 Partner Fighter, synthesized from scratch.

Nothing is sampled, downloaded or copied from other games: every effect is built here from
oscillators, noise, pitch sweeps, envelopes and FIR filters (numpy), then encoded with ffmpeg.

    python3 scripts/sfx/generate_sfx.py              # writes public/audio/sfx/*.ogg and *.mp3
    python3 scripts/sfx/generate_sfx.py punch kick   # only these

The random generator is seeded per effect, so the files are reproducible.
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
OUT_DIR = Path(__file__).resolve().parents[2] / "public" / "audio" / "sfx"
PEAK = 0.75  # headroom: dense, driven hits overshoot in the lossy encoders


def seconds(duration: float) -> np.ndarray:
    return np.arange(int(duration * SR)) / SR


def lowpass(signal: np.ndarray, cutoff: float, taps: int = 63) -> np.ndarray:
    n = np.arange(taps) - (taps - 1) / 2
    kernel = 2 * cutoff / SR * np.sinc(2 * cutoff / SR * n) * np.hamming(taps)
    return np.convolve(signal, kernel / kernel.sum(), mode="same")


def highpass(signal: np.ndarray, cutoff: float) -> np.ndarray:
    return signal - lowpass(signal, cutoff)


def bandpass(signal: np.ndarray, low: float, high: float) -> np.ndarray:
    return lowpass(highpass(signal, low), high)


def sweep(start: float, end: float, duration: float, curve: float = 1.0) -> np.ndarray:
    """Phase of an exponential-ish pitch sweep (curve > 1 drops faster at the start)."""
    t = seconds(duration)
    shape = (t / duration) ** (1 / curve)
    freq = start * (end / start) ** shape
    return 2 * np.pi * np.cumsum(freq) / SR


def decay(duration: float, rate: float) -> np.ndarray:
    return np.exp(-seconds(duration) * rate)


def attack(signal: np.ndarray, ms: float = 1.5) -> np.ndarray:
    n = max(1, int(ms / 1000 * SR))
    out = signal.copy()
    out[:n] *= np.linspace(0, 1, n)
    return out


def square(phase: np.ndarray, harmonics: int = 12) -> np.ndarray:
    return sum(np.sin(k * phase) / k for k in range(1, 2 * harmonics, 2)) * 0.8


def saw(phase: np.ndarray, harmonics: int = 16) -> np.ndarray:
    return sum(np.sin(k * phase) / k for k in range(1, harmonics + 1)) * 0.55


def mix(*parts: np.ndarray) -> np.ndarray:
    out = np.zeros(max(len(p) for p in parts))
    for part in parts:
        out[: len(part)] += part
    return out


def at(signal: np.ndarray, start: float) -> np.ndarray:
    return np.concatenate([np.zeros(int(start * SR)), signal])


def note(hz: float, duration: float, kind: str = "square", rate: float = 18) -> np.ndarray:
    phase = 2 * np.pi * hz * seconds(duration)
    wave_ = square(phase, 6) if kind == "square" else np.sin(phase) + 0.25 * np.sin(2 * phase)
    return attack(wave_ * decay(duration, rate), 2)


# ---------------------------------------------------------------------------------------------
# Effects: (rng) -> mono signal
# ---------------------------------------------------------------------------------------------


def impact(rng, body_from: float, body_to: float, body_len: float, crack: float, snap_cut: float, drive: float):
    """Dry fighting-game hit: pitched body thump + filtered noise snap + tiny click."""
    body = np.sin(sweep(body_from, body_to, body_len, curve=2.2)) * decay(body_len, 26 / body_len / 10)
    snap_len = 0.07
    snap = highpass(rng.uniform(-1, 1, int(snap_len * SR)), snap_cut) * decay(snap_len, 70) * crack
    thump = lowpass(rng.uniform(-1, 1, int(0.05 * SR)), 900) * decay(0.05, 60) * 0.8
    signal = mix(body * 1.1, snap, thump)
    return np.tanh(drive * signal)


def sfx_punch(rng):
    return impact(rng, 210, 85, 0.11, crack=0.9, snap_cut=1800, drive=2.2)


def sfx_kick(rng):
    # Lower and longer than the punch, with more weight.
    return impact(rng, 150, 48, 0.2, crack=0.75, snap_cut=1200, drive=2.6)


def sfx_crouch_punch(rng):
    return impact(rng, 250, 110, 0.09, crack=1.0, snap_cut=2200, drive=2.0)


def sfx_crouch_kick(rng):
    sweep_noise = bandpass(rng.uniform(-1, 1, int(0.09 * SR)), 250, 1400) * decay(0.09, 30) * 0.5
    return mix(impact(rng, 135, 45, 0.18, crack=0.6, snap_cut=900, drive=2.4), sweep_noise)


def sfx_air_punch(rng):
    return impact(rng, 230, 95, 0.1, crack=1.1, snap_cut=2600, drive=2.1)


def sfx_air_kick(rng):
    crack = highpass(rng.uniform(-1, 1, int(0.03 * SR)), 4000) * decay(0.03, 120) * 0.6
    return mix(impact(rng, 160, 52, 0.19, crack=0.8, snap_cut=1500, drive=2.6), crack)


def sfx_block(rng):
    """Forearm guard: a padded, muffled thud of the blow landing on the arm, the skin-and-sleeve
    slap on contact, a short cloth rustle as the arm absorbs it. No ringing, no pitch: a dull
    body sound, lighter and shorter than a clean hit."""
    thud = np.sin(sweep(150, 78, 0.12, curve=2.0)) * decay(0.12, 30) * 0.55
    knock = lowpass(rng.uniform(-1, 1, int(0.06 * SR)), 700) * decay(0.06, 55) * 0.9
    slap = bandpass(rng.uniform(-1, 1, int(0.045 * SR)), 600, 3200) * decay(0.045, 75) * 2.2
    # The arm gives a little: a second, softer contact a few milliseconds later.
    give = at(bandpass(rng.uniform(-1, 1, int(0.03 * SR)), 400, 2000) * decay(0.03, 110) * 0.9, 0.009)
    rustle = at(bandpass(rng.uniform(-1, 1, int(0.08 * SR)), 1500, 5000) * decay(0.08, 38) * 0.45, 0.012)
    return np.tanh(1.8 * mix(attack(thud, 1.0), attack(knock, 0.6), attack(slap, 0.3), give, rustle))


def sfx_hurt(rng):
    """Body reaction under the impact: low crunch with a vocal-ish (but wordless) formant."""
    length = 0.16
    noise = rng.uniform(-1, 1, int(length * SR))
    formant = bandpass(noise, 450, 1100) * decay(length, 22)
    crunch = np.tanh(3 * lowpass(noise, 600)) * decay(length, 35) * 0.5
    low = np.sin(sweep(110, 70, length)) * decay(length, 20) * 0.7
    return attack(mix(formant, crunch, low), 4)


def sfx_jump(rng):
    """Short upward swoosh with a discreet blip."""
    length = 0.13
    noise = rng.uniform(-1, 1, int(length * SR))
    t = seconds(length)
    whoosh = bandpass(noise, 500, 2600) * np.sin(np.pi * t / length) ** 2
    blip = square(sweep(300, 640, length), 4) * decay(length, 22) * 0.12
    return mix(whoosh * 0.7, blip)


def sfx_landing(rng):
    """Discreet low thud plus a little floor scuff."""
    thud = np.sin(sweep(95, 52, 0.09)) * decay(0.09, 35)
    scuff = lowpass(rng.uniform(-1, 1, int(0.05 * SR)), 1200) * decay(0.05, 70) * 0.4
    return attack(mix(thud, scuff), 1)


def sfx_ko(rng):
    """The finishing blow: deep boom, long noise tail and a metallic ring."""
    boom = np.tanh(2.5 * np.sin(sweep(90, 28, 1.1, curve=2.5))) * decay(1.1, 3.2)
    tail = lowpass(rng.uniform(-1, 1, int(0.9 * SR)), 1600) * decay(0.9, 5) * 0.6
    crack = highpass(rng.uniform(-1, 1, int(0.05 * SR)), 2500) * decay(0.05, 80)
    t = seconds(1.3)
    ring = sum(a * np.sin(2 * np.pi * f * t) for f, a in ((196, 1), (392.7, 0.5), (589, 0.35), (811, 0.2)))
    ring = ring * np.exp(-t * 3.5) * 0.25
    return mix(boom * 1.2, tail, crack, ring)


def sfx_special(rng):
    """Techy energy release: rising filtered saw, digital arpeggio and an electric zap."""
    length = 0.42
    rise = saw(sweep(180, 1250, length, curve=0.8), 14)
    rise = lowpass(rise, 3500) * np.linspace(0.3, 1, len(rise)) * decay(length, 2)
    arp = mix(*[at(note(f, 0.08, "square", 30) * 0.25, i * 0.055) for i, f in enumerate((1047, 1319, 1568, 2093, 2637))])
    zap_len = 0.25
    zap = highpass(rng.uniform(-1, 1, int(zap_len * SR)), 3000) * decay(zap_len, 14) * 0.35
    burst = np.sin(sweep(240, 60, 0.3)) * decay(0.3, 9) * 0.8
    return mix(rise * 0.7, arp, at(zap, length - 0.05), at(burst, length - 0.04))


def sfx_special_ready(rng):
    """Short bright two-note chime with an electric sparkle: the meter is charged."""
    chime = mix(note(1319, 0.16, "sine", 14), at(note(1976, 0.3, "sine", 9), 0.075))
    sparkle_len = 0.3
    sparkle = highpass(rng.uniform(-1, 1, int(sparkle_len * SR)), 6000) * decay(sparkle_len, 12)
    sparkle *= (rng.uniform(0, 1, len(sparkle)) > 0.92)  # crackle, not hiss
    return mix(chime * 0.7, at(sparkle * 0.9, 0.04), at(note(3951, 0.06, "square", 50) * 0.15, 0.08))


def sfx_menu_move(rng):
    return note(880, 0.045, "square", 60) * 0.7


def sfx_menu_confirm(rng):
    return mix(note(659, 0.06, "square", 35), at(note(988, 0.13, "square", 22), 0.055)) * 0.7


def sfx_menu_back(rng):
    return mix(note(659, 0.06, "square", 35), at(note(440, 0.12, "square", 24), 0.055)) * 0.7


def sfx_round_start(rng):
    """Arcade gong-like hit with a whoosh before the round call."""
    t = seconds(0.9)
    partials = ((220, 1), (331, 0.6), (467, 0.45), (602, 0.3), (911, 0.2))
    gong = sum(a * np.sin(2 * np.pi * f * t) for f, a in partials) * np.exp(-t * 4.5)
    hit = np.sin(sweep(130, 60, 0.2)) * decay(0.2, 18)
    whoosh_len = 0.18
    whoosh = bandpass(rng.uniform(-1, 1, int(whoosh_len * SR)), 700, 3500) * np.linspace(0, 1, int(whoosh_len * SR)) ** 2
    return mix(whoosh * 0.4, at(gong * 0.45 + mix(hit, np.zeros(len(gong))) * 0.9, whoosh_len))


def sfx_fight(rng):
    """FIGHT! stab: punchy hit, a short bright synth-brass chord and a crash."""
    length = 0.38
    chord = sum(saw(2 * np.pi * f * seconds(length), 18) for f in (523.3, 659.3, 784, 1046.5))
    chord = lowpass(chord, 4200) * decay(length, 6) * 0.35
    hit = impact(rng, 160, 50, 0.18, crack=0.8, snap_cut=1500, drive=2.4)
    crash_len = 0.7
    crash = highpass(rng.uniform(-1, 1, int(crash_len * SR)), 5000) * decay(crash_len, 5) * 0.35
    return mix(hit, attack(chord, 3), crash)


def sfx_victory(rng):
    """Short winner chime (the victory screen has its own music sting)."""
    notes = (784, 1047, 1319, 1568)
    arp = mix(*[at(note(f, 0.18 if i < 3 else 0.5, "square", 16 if i < 3 else 6) * 0.35, i * 0.08) for i, f in enumerate(notes)])
    shimmer = mix(*[at(note(f * 2, 0.4, "sine", 8) * 0.12, 0.24) for f in (1047, 1319)])
    return mix(arp, shimmer)


def sfx_perfect(rng):
    """PERFECT: bright rising fanfare, a held major chord with shimmer and a sparkle tail."""
    rise = mix(*[at(note(f, 0.14, "square", 22) * 0.3, i * 0.06) for i, f in enumerate((784, 988, 1175, 1568))])
    chord_len = 0.75
    t = seconds(chord_len)
    chord = sum(saw(2 * np.pi * f * t, 14) for f in (1047, 1319, 1568, 2093))
    vibrato = 1 + 0.15 * np.sin(2 * np.pi * 7 * t)
    chord = lowpass(chord, 5000) * np.exp(-t * 3.2) * vibrato * 0.28
    sparkle_len = 0.6
    sparkle = highpass(rng.uniform(-1, 1, int(sparkle_len * SR)), 7000) * decay(sparkle_len, 6)
    sparkle *= rng.uniform(0, 1, len(sparkle)) > 0.9
    boom = np.sin(sweep(120, 55, 0.25)) * decay(0.25, 12) * 0.6
    return mix(rise, at(attack(chord, 4), 0.24), at(sparkle * 0.7, 0.26), at(boom, 0.24))


def sfx_special_zap(rng):
    """24zap special: a "message sent" swoosh, bubble pops, a two-tone chime and an energy hit."""
    swoosh_len = 0.22
    swoosh = bandpass(rng.uniform(-1, 1, int(swoosh_len * SR)), 900, 5000)
    swoosh *= np.sin(np.pi * seconds(swoosh_len) / swoosh_len) ** 2
    pops = mix(*[at(np.sin(sweep(900 + 260 * i, 1500 + 300 * i, 0.04)) * decay(0.04, 60) * 0.5, 0.05 + i * 0.05) for i in range(4)])
    chime = mix(note(1568, 0.12, "sine", 18), at(note(2093, 0.3, "sine", 10), 0.09))
    hit = np.sin(sweep(220, 70, 0.22)) * decay(0.22, 12)
    zap = highpass(rng.uniform(-1, 1, int(0.18 * SR)), 3500) * decay(0.18, 22) * 0.4
    return mix(swoosh * 0.7, pops, at(chime * 0.6, 0.18), at(hit, 0.2), at(zap, 0.2))


def sfx_special_mind(rng):
    """Mindhub special: a digital "thinking" blip sequence over a data warble, then a deep discharge."""
    steps = [1047, 1568, 1319, 2093, 1760, 2349, 1976, 2637]
    blips = mix(*[at(note(f, 0.04, "square", 70) * 0.28, i * 0.032) for i, f in enumerate(steps)])
    warble_len = 0.3
    t = seconds(warble_len)
    warble = np.sin(2 * np.pi * 660 * t + 4 * np.sin(2 * np.pi * 37 * t)) * np.linspace(0.1, 0.5, len(t))
    discharge = lowpass(saw(sweep(300, 1400, 0.25, curve=0.7), 14), 4000) * decay(0.25, 6) * 0.45
    boom = np.sin(sweep(160, 45, 0.35)) * decay(0.35, 8)
    glitch = highpass(rng.uniform(-1, 1, int(0.12 * SR)), 5000) * (rng.uniform(0, 1, int(0.12 * SR)) > 0.85) * 0.5
    return mix(blips, warble * 0.4, at(discharge, 0.25), at(boom, 0.27), at(glitch, 0.27))


EFFECTS = {
    "punch": sfx_punch,
    "kick": sfx_kick,
    "crouch-punch": sfx_crouch_punch,
    "crouch-kick": sfx_crouch_kick,
    "air-punch": sfx_air_punch,
    "air-kick": sfx_air_kick,
    "block": sfx_block,
    "hurt": sfx_hurt,
    "jump": sfx_jump,
    "landing": sfx_landing,
    "ko": sfx_ko,
    "special": sfx_special,
    "special-ready": sfx_special_ready,
    "menu-move": sfx_menu_move,
    "menu-confirm": sfx_menu_confirm,
    "menu-back": sfx_menu_back,
    "round-start": sfx_round_start,
    "fight": sfx_fight,
    "victory": sfx_victory,
    "perfect": sfx_perfect,
    "special-zap": sfx_special_zap,
    "special-mind": sfx_special_mind,
}


def finish(signal: np.ndarray) -> np.ndarray:
    fade = min(len(signal) // 4, int(0.01 * SR))
    signal = signal.copy()
    signal[-fade:] *= np.linspace(1, 0, fade)
    return signal * (PEAK / max(1e-9, np.abs(signal).max()))


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
    subprocess.run(base + ["-c:a", "libvorbis", "-q:a", "5", str(OUT_DIR / f"{name}.ogg")], check=True)
    # MP3 rings a little more on hard transients: 1.5 dB less keeps it from clipping.
    mp3 = ["-af", "volume=-1.5dB", "-c:a", "libmp3lame", "-q:a", "4", str(OUT_DIR / f"{name}.mp3")]
    subprocess.run(base + mp3, check=True)


def main(names: list[str]) -> None:
    with tempfile.TemporaryDirectory() as tmp:
        for name in names or list(EFFECTS):
            rng = np.random.default_rng(zlib.crc32(name.encode()))
            signal = finish(EFFECTS[name](rng))
            wav = Path(tmp) / f"{name}.wav"
            write_wav(wav, signal)
            encode(wav, name)
            print(f"{name}: {len(signal) / SR * 1000:.0f} ms")


if __name__ == "__main__":
    main(sys.argv[1:])
