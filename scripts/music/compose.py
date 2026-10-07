"""
Original soundtrack of Bitrix24 Partner Fighter, composed and synthesized from scratch.

Every note, chord progression and drum pattern below was written for this game; nothing is
sampled, downloaded or transcribed. The instruments are plain numpy synthesis (band-limited
saw/square, noise drums, FIR filters, delay), so the result is fully reproducible:

    python3 scripts/music/compose.py            # writes public/audio/music/*.ogg and *.m4a

Requires numpy and ffmpeg (libvorbis + aac). Loops are rendered with their tail folded back
onto the start, so they repeat without a click or a gap.
"""

from __future__ import annotations

import subprocess
import sys
import tempfile
import wave
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

SR = 44100
OUT_DIR = Path(__file__).resolve().parents[2] / "public" / "audio" / "music"
TAIL_SECONDS = 2.5
ONE_SHOT_TAIL_SECONDS = 0.5
PEAK = 0.7  # about -3 dBFS: headroom for the lossy encoders

NOTE_INDEX = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def midi(name: str) -> int:
    """'C#5' -> 73, 'Bb2' -> 46."""
    letter, rest = name[0], name[1:]
    shift = 0
    while rest and rest[0] in "#b":
        shift += 1 if rest[0] == "#" else -1
        rest = rest[1:]
    return 12 * (int(rest) + 1) + NOTE_INDEX[letter] + shift


def hz(note: int) -> float:
    return 440.0 * 2 ** ((note - 69) / 12)


CHORDS = {
    # name: intervals over the root
    "": (0, 4, 7),
    "m": (0, 3, 7),
    "5": (0, 7, 12),
}


def chord(name: str, octave: int = 3) -> tuple[int, list[int]]:
    """'Bb' / 'Dm' / 'A5' -> (root midi, chord tones)."""
    root = name[0] + (name[1] if len(name) > 1 and name[1] in "#b" else "")
    quality = name[len(root):]
    base = midi(f"{root}{octave}")
    return base, [base + i for i in CHORDS[quality]]


# ---------------------------------------------------------------------------------------------
# Instruments
# ---------------------------------------------------------------------------------------------


def lowpass_kernel(cutoff: float, taps: int = 63) -> np.ndarray:
    n = np.arange(taps) - (taps - 1) / 2
    fc = cutoff / SR
    kernel = 2 * fc * np.sinc(2 * fc * n) * np.hamming(taps)
    return kernel / kernel.sum()


def lowpass(signal: np.ndarray, cutoff: float) -> np.ndarray:
    return np.convolve(signal, lowpass_kernel(cutoff), mode="same")


def highpass(signal: np.ndarray, cutoff: float) -> np.ndarray:
    return signal - lowpass(signal, cutoff)


def envelope(length: int, attack: float, decay: float, sustain: float, release: float, gate: int) -> np.ndarray:
    """ADSR in seconds; `gate` = samples the note is held, then the release."""
    env = np.zeros(length)
    a = max(1, int(attack * SR))
    d = max(1, int(decay * SR))
    r = max(1, int(release * SR))
    t = np.arange(length)
    env = np.where(t < a, t / a, sustain + (1 - sustain) * np.exp(-(t - a) / d))
    held_level = env[min(gate, length - 1)]
    after = t >= gate
    env[after] = held_level * np.exp(-(t[after] - gate) / r)
    return env


def additive(freq: float, length: int, odd_only: bool = False, max_harmonics: int = 40, vibrato: float = 0.0) -> np.ndarray:
    """Band-limited saw (or square with odd_only) by summing harmonics below ~16 kHz."""
    t = np.arange(length) / SR
    phase = 2 * np.pi * freq * t
    if vibrato:
        depth = vibrato * np.clip(t / 0.25 - 0.4, 0, 1)  # vibrato fades in after the attack
        phase = phase + depth * np.sin(2 * np.pi * 5.5 * t) * 2 * np.pi * freq / 5.5 / 60
    out = np.zeros(length)
    count = max(1, min(max_harmonics, int(16000 / freq)))
    for k in range(1, count + 1):
        if odd_only and k % 2 == 0:
            continue
        out += np.sin(k * phase) / k
    return out * (0.6 if odd_only else 0.5)


@dataclass
class Note:
    beat: float
    length: float  # beats
    pitch: int
    velocity: float = 1.0


@dataclass
class Track:
    bpm: float
    bars: int
    loop: bool = True
    beats_per_bar: int = 4
    # Hall reverb (wet level, 0 = none) and its decay time in seconds.
    reverb: float = 0.0
    reverb_seconds: float = 1.8
    # Seconds rendered after the last bar of a one-shot (releases, reverb); default below.
    tail_seconds: float | None = None
    voices: dict[str, list[Note]] = field(default_factory=dict)
    drums: list[tuple[float, str, float]] = field(default_factory=list)

    @property
    def spb(self) -> float:
        return 60.0 / self.bpm

    def add(self, voice: str, beat: float, length: float, pitch: int, velocity: float = 1.0) -> None:
        self.voices.setdefault(voice, []).append(Note(beat, length, pitch, velocity))

    def hit(self, beat: float, drum: str, velocity: float = 1.0) -> None:
        self.drums.append((beat, drum, velocity))


# Each instrument: (note, seconds per beat) -> mono buffer. Pan and level are set in MIX.

def inst_lead(note: Note, spb: float) -> np.ndarray:
    """Synth lead: two detuned saws + a square an octave down, vibrato, bright filter."""
    gate = int(note.length * spb * SR * 0.92)
    length = gate + int(0.25 * SR)
    f = hz(note.pitch)
    raw = additive(f, length, vibrato=0.35) + additive(f * 1.006, length, vibrato=0.35)
    raw += 0.5 * additive(f / 2, length, odd_only=True)
    sig = lowpass(raw, 7500)
    return sig * envelope(length, 0.008, 0.25, 0.75, 0.12, gate) * note.velocity * 0.45


def inst_chip(note: Note, spb: float) -> np.ndarray:
    """Discreet chiptune voice: thin square, short and plucky."""
    gate = int(note.length * spb * SR * 0.6)
    length = gate + int(0.06 * SR)
    sig = additive(hz(note.pitch), length, odd_only=True, max_harmonics=15)
    return sig * envelope(length, 0.002, 0.08, 0.35, 0.03, gate) * note.velocity * 0.35


def inst_pluck(note: Note, spb: float) -> np.ndarray:
    """Bright pluck for arpeggios (fast decay, filtered saw)."""
    length = int(min(note.length * spb, 0.5) * SR) + int(0.15 * SR)
    sig = lowpass(additive(hz(note.pitch), length, max_harmonics=30), 5500)
    return sig * envelope(length, 0.002, 0.11, 0.0, 0.05, length) * note.velocity * 0.5


def inst_pad(note: Note, spb: float) -> np.ndarray:
    """Warm synthwave pad: three detuned saws, dark filter, slow attack."""
    gate = int(note.length * spb * SR)
    length = gate + int(0.6 * SR)
    f = hz(note.pitch)
    raw = sum(additive(f * d, length, max_harmonics=18) for d in (0.995, 1.0, 1.005))
    sig = lowpass(raw, 1500)
    return sig * envelope(length, 0.25, 0.6, 0.8, 0.45, gate) * note.velocity * 0.22


def inst_bass(note: Note, spb: float) -> np.ndarray:
    """Strong synth bass: saw + sub sine, punchy filter."""
    gate = int(note.length * spb * SR * 0.9)
    length = gate + int(0.05 * SR)
    f = hz(note.pitch)
    t = np.arange(length) / SR
    sig = lowpass(additive(f, length, max_harmonics=30), 900) + 0.8 * np.sin(2 * np.pi * f * t)
    return np.tanh(1.6 * sig) * envelope(length, 0.004, 0.18, 0.7, 0.03, gate) * note.velocity * 0.55


def inst_power(note: Note, spb: float) -> np.ndarray:
    """Synth "guitar" power chord (root, fifth, octave) with drive and a palm-muted decay."""
    gate = int(note.length * spb * SR * 0.85)
    length = gate + int(0.06 * SR)
    f = hz(note.pitch)
    raw = sum(additive(f * r * d, length, max_harmonics=20) for r in (1, 1.5, 2) for d in (0.997, 1.003))
    sig = lowpass(np.tanh(3.2 * raw), 4200)
    return sig * envelope(length, 0.003, 0.16, 0.45, 0.03, gate) * note.velocity * 0.3


def inst_brass(note: Note, spb: float) -> np.ndarray:
    """Fanfare brass for the victory sting: saws with a swelling filter."""
    gate = int(note.length * spb * SR)
    length = gate + int(0.5 * SR)
    f = hz(note.pitch)
    raw = additive(f, length) + additive(f * 1.004, length)
    bright = lowpass(raw, 4200)
    dark = lowpass(raw, 1200)
    swell = np.clip(np.arange(length) / (0.12 * SR), 0, 1)
    sig = dark + (bright - dark) * swell
    return sig * envelope(length, 0.03, 0.4, 0.8, 0.35, gate) * note.velocity * 0.35


# --- Arcade-fighter fanfare instruments (victory sting) -------------------------------------


def glide_saw(freq: float, length: int, scoop: float = 0.0, scoop_s: float = 0.05,
              vibrato: float = 0.0, max_harmonics: int = 36) -> np.ndarray:
    """Band-limited saw whose pitch can start a little flat and slide up ("scoop", like a
    brass player hitting the note) and pick up a late vibrato."""
    t = np.arange(length) / SR
    bend = 1 - scoop * np.exp(-t / max(scoop_s, 1e-4))
    if vibrato:
        bend = bend * (1 + vibrato * np.clip(t / 0.3 - 0.5, 0, 1) * np.sin(2 * np.pi * 5.2 * t))
    phase = 2 * np.pi * np.cumsum(freq * bend) / SR
    out = np.zeros(length)
    for k in range(1, max(1, min(max_harmonics, int(15000 / freq))) + 1):
        out += np.sin(k * phase) / k
    return out * 0.5


def inst_horn(note: Note, spb: float) -> np.ndarray:
    """Arcade brass section: three detuned saws (+ one an octave down) with a pitch scoop,
    a "blat" filter that opens fast and settles, and a late vibrato on long notes."""
    gate = int(note.length * spb * SR * 0.94)
    length = gate + int(0.35 * SR)
    f = hz(note.pitch)
    vib = 0.006 if note.length >= 1 else 0.0
    raw = sum(glide_saw(f * d, length, scoop=0.03, vibrato=vib) for d in (0.996, 1.0, 1.0045))
    raw += 0.45 * glide_saw(f / 2, length, scoop=0.03, max_harmonics=20)
    bright, dark = lowpass(raw, 6000), lowpass(raw, 1300)
    t = np.arange(length) / SR
    opening = np.clip(t / 0.025, 0, 1) * (0.55 + 0.45 * np.exp(-t / 0.18))
    sig = np.tanh(1.4 * (dark + (bright - dark) * opening))
    return sig * envelope(length, 0.012, 0.25, 0.82, 0.28, gate) * note.velocity * 0.2


def inst_strings(note: Note, spb: float) -> np.ndarray:
    """Ensemble strings: five detuned saws, vibrato, soft attack, airy filter."""
    gate = int(note.length * spb * SR)
    length = gate + int(0.7 * SR)
    f = hz(note.pitch)
    raw = sum(glide_saw(f * d, length, vibrato=0.004, max_harmonics=24)
              for d in (0.991, 0.996, 1.0, 1.004, 1.009))
    sig = lowpass(raw, 3200)
    return sig * envelope(length, 0.09, 0.5, 0.85, 0.55, gate) * note.velocity * 0.09


def inst_stab(note: Note, spb: float) -> np.ndarray:
    """Orchestra hit layer: a short, bright, distorted brass+string chord tone with a noise
    "air" burst (one note of the chord; the hit is the whole chord played together)."""
    length = int(0.75 * SR)
    f = hz(note.pitch)
    t = np.arange(length) / SR
    raw = sum(glide_saw(f * d, length, scoop=0.02, scoop_s=0.02) for d in (0.993, 1.0, 1.007))
    raw += 0.5 * glide_saw(f * 2, length, max_harmonics=18)
    sig = np.tanh(2.2 * lowpass(raw, 7000))
    rng = np.random.default_rng(note.pitch)
    sig += lowpass(rng.uniform(-1, 1, length), 3500) * 0.18 * np.exp(-t / 0.035)
    return sig * np.exp(-t / 0.22) * np.clip(t / 0.003, 0, 1) * note.velocity * 0.16


def inst_timpani(note: Note, spb: float) -> np.ndarray:
    """Timpani: low membrane modes with a slight pitch drop and a felt-mallet thump."""
    length = int(1.8 * SR)
    f = hz(note.pitch)
    t = np.arange(length) / SR
    drop = 1 + 0.06 * np.exp(-t / 0.03)
    phase = 2 * np.pi * np.cumsum(f * drop) / SR
    sig = (np.sin(phase) + 0.5 * np.sin(1.5 * phase) * np.exp(-t / 0.25)
           + 0.3 * np.sin(1.98 * phase) * np.exp(-t / 0.4))
    rng = np.random.default_rng(note.pitch + 7)
    sig += lowpass(rng.uniform(-1, 1, length), 900) * np.exp(-t / 0.02) * 0.8
    return np.tanh(1.3 * sig) * np.exp(-t / 0.55) * note.velocity * 0.5


def inst_bell(note: Note, spb: float) -> np.ndarray:
    """Glockenspiel-like FM bell for the final sparkle."""
    length = int(1.6 * SR)
    f = hz(note.pitch)
    t = np.arange(length) / SR
    index = 2.2 * np.exp(-t / 0.15)
    sig = np.sin(2 * np.pi * f * t + index * np.sin(2 * np.pi * f * 3.5 * t))
    return sig * np.exp(-t / 0.5) * np.clip(t / 0.002, 0, 1) * note.velocity * 0.22


INSTRUMENTS = {
    "lead": inst_lead,
    "chip": inst_chip,
    "pluck": inst_pluck,
    "pad": inst_pad,
    "bass": inst_bass,
    "power": inst_power,
    "brass": inst_brass,
    "horn": inst_horn,
    "strings": inst_strings,
    "stab": inst_stab,
    "timpani": inst_timpani,
    "bell": inst_bell,
}

# Mix: (gain, pan -1..1, echo send)
MIX = {
    "lead": (0.85, 0.0, 0.32),
    "chip": (0.45, 0.35, 0.25),
    "pluck": (0.55, -0.3, 0.3),
    "pad": (0.7, 0.0, 0.15),
    "bass": (0.68, 0.0, 0.0),
    "power": (0.62, -0.15, 0.05),
    "brass": (0.9, 0.0, 0.25),
    "horn": (1.0, 0.08, 0.18),
    "strings": (0.8, -0.2, 0.12),
    "stab": (0.9, 0.0, 0.2),
    "timpani": (0.85, -0.1, 0.0),
    "bell": (0.55, 0.3, 0.35),
}


def drum_kit(rng: np.random.Generator) -> dict[str, np.ndarray]:
    def noise(seconds: float) -> np.ndarray:
        return rng.uniform(-1, 1, int(seconds * SR))

    t = lambda seconds: np.arange(int(seconds * SR)) / SR  # noqa: E731
    kt = t(0.42)
    freq = 46 + 120 * np.exp(-kt * 32)
    kick = np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.exp(-kt * 8.5)
    kick[: int(0.004 * SR)] += lowpass(noise(0.004), 6000) * 0.15
    kick = np.tanh(1.8 * kick)

    st = t(0.28)
    snare = highpass(noise(0.28), 1200) * np.exp(-st * 17) * 0.9
    snare += 0.55 * np.sin(2 * np.pi * 185 * st) * np.exp(-st * 28)

    ct = t(0.3)
    clap = np.zeros_like(ct)
    for offset in (0.0, 0.011, 0.023):
        start = int(offset * SR)
        span = len(ct) - start
        burst = highpass(rng.uniform(-1, 1, span), 900) * np.exp(-np.arange(span) / SR * (60 if offset < 0.02 else 16))
        clap[start:] += burst
    clap *= 0.55

    ht = t(0.05)
    hat = highpass(noise(0.05), 7000) * np.exp(-ht * 70) * 0.85
    ot = t(0.3)
    open_hat = highpass(noise(0.3), 6500) * np.exp(-ot * 11) * 0.55
    crt = t(2.2)
    crash = highpass(noise(2.2), 4500) * np.exp(-crt * 2.4) * 0.4
    tt = t(0.4)
    tom = np.sin(2 * np.pi * np.cumsum(70 + 90 * np.exp(-tt * 18)) / SR) * np.exp(-tt * 9) * 0.8
    return {"kick": kick, "snare": snare, "clap": clap, "hat": hat, "ohat": open_hat, "crash": crash, "tom": tom}


DRUM_MIX = {"kick": (0.82, 0.0), "snare": (0.85, 0.05), "clap": (0.75, -0.05), "hat": (1.0, 0.3), "ohat": (0.8, 0.3), "crash": (0.6, -0.25), "tom": (0.7, 0.1)}


def place(buffer: np.ndarray, sound: np.ndarray, start: int, gain: float, pan: float) -> None:
    end = min(len(buffer), start + len(sound))
    if end <= start:
        return
    left = gain * np.sqrt(0.5 * (1 - pan))
    right = gain * np.sqrt(0.5 * (1 + pan))
    buffer[start:end, 0] += sound[: end - start] * left
    buffer[start:end, 1] += sound[: end - start] * right


def ping_pong(send: np.ndarray, delay: int, feedback: float = 0.38, repeats: int = 4) -> np.ndarray:
    out = np.zeros_like(send)
    level = 1.0
    for i in range(1, repeats + 1):
        level *= feedback
        shifted = np.zeros_like(send)
        shifted[delay * i :] = send[: len(send) - delay * i]
        channel = i % 2
        out[:, channel] += shifted.mean(axis=1) * level * 1.4
    return lowpass_stereo(out, 4500)


def hall_reverb(stereo: np.ndarray, seconds: float, rng: np.random.Generator) -> np.ndarray:
    """Convolution with a decaying, darkening noise tail per channel (FFT): a smooth hall."""
    length = int(seconds * SR)
    t = np.arange(length) / SR
    out = np.zeros_like(stereo)
    n = len(stereo) + length
    size = 1 << (n - 1).bit_length()
    for ch in range(2):
        tail = rng.normal(0, 1, length) * np.exp(-t * 6.9 / seconds)
        tail = lowpass(tail, 5000) * np.clip(t / 0.02, 0, 1)
        tail /= np.sqrt(np.sum(tail**2))
        wet = np.fft.irfft(np.fft.rfft(stereo[:, ch], size) * np.fft.rfft(tail, size), size)
        out[:, ch] = wet[: len(stereo)]
    return highpass_stereo(out, 180)


def highpass_stereo(stereo: np.ndarray, cutoff: float) -> np.ndarray:
    return np.stack([highpass(stereo[:, 0], cutoff), highpass(stereo[:, 1], cutoff)], axis=1)


def lowpass_stereo(stereo: np.ndarray, cutoff: float) -> np.ndarray:
    return np.stack([lowpass(stereo[:, 0], cutoff), lowpass(stereo[:, 1], cutoff)], axis=1)


def render(track: Track, seed: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    spb = track.spb
    length = int(track.bars * track.beats_per_bar * spb * SR)
    tail = TAIL_SECONDS if track.loop else (track.tail_seconds or ONE_SHOT_TAIL_SECONDS)
    total = length + int(tail * SR)
    dry = np.zeros((total, 2))
    send = np.zeros((total, 2))
    for voice, notes in track.voices.items():
        gain, pan, echo = MIX[voice]
        cache: dict[tuple[int, float, float], np.ndarray] = {}
        for note in notes:
            key = (note.pitch, note.length, note.velocity)
            if key not in cache:
                cache[key] = INSTRUMENTS[voice](note, spb)
            start = int(note.beat * spb * SR)
            place(dry, cache[key], start, gain, pan)
            if echo:
                place(send, cache[key], start, gain * echo, pan)
    kit = drum_kit(rng)
    for beat, drum, velocity in track.drums:
        gain, pan = DRUM_MIX[drum]
        place(dry, kit[drum], int(beat * spb * SR), gain * velocity, pan)
    mix = dry + ping_pong(send, int(0.75 * spb * SR))
    if track.reverb:
        mix = mix + track.reverb * hall_reverb(mix, track.reverb_seconds, rng)
    if track.loop:
        # Fold the tail (releases, echoes, cymbals) back onto the start: seamless loop.
        mix[: total - length] += mix[length:]
        mix = mix[:length]
    else:
        fade = int(0.9 * SR)
        mix[-fade:] *= np.linspace(1, 0, fade)[:, None] ** 2
    mix = np.tanh(mix * 1.1)  # gentle glue / soft limiting
    return mix * (PEAK / max(1e-9, np.abs(mix).max()))


# ---------------------------------------------------------------------------------------------
# Composition helpers
# ---------------------------------------------------------------------------------------------


def melody(track: Track, voice: str, start_bar: int, bars: list[list[tuple[str | None, float]]], velocity: float = 1.0) -> None:
    beat = start_bar * track.beats_per_bar
    for bar in bars:
        assert abs(sum(d for _, d in bar) - track.beats_per_bar) < 1e-6, bar
        for name, duration in bar:
            if name:
                track.add(voice, beat, duration, midi(name), velocity)
            beat += duration


def pads(track: Track, chords: list[str], octave: int = 4, velocity: float = 1.0, first_bar: int = 0) -> None:
    for i, name in enumerate(chords):
        _, tones = chord(name, octave)
        for tone in tones:
            track.add("pad", (first_bar + i) * 4, 4, tone, velocity)


def arpeggio(track: Track, voice: str, chords: list[str], first_bar: int, pattern: list[int], step: float, octave: int = 5, velocity: float = 0.8) -> None:
    for i, name in enumerate(chords):
        _, tones = chord(name, octave)
        tones = tones + [tones[0] + 12, tones[1] + 12]
        for j in range(int(4 / step)):
            track.add(voice, (first_bar + i) * 4 + j * step, step, tones[pattern[j % len(pattern)]], velocity)


def bassline(track: Track, chords: list[str], first_bar: int, rhythm: list[tuple[float, float, int]], octave: int = 2) -> None:
    """rhythm: (beat offset, length, semitones over the root) per bar."""
    for i, name in enumerate(chords):
        root, _ = chord(name, octave)
        for offset, length, interval in rhythm:
            track.add("bass", (first_bar + i) * 4 + offset, length, root + interval)


def drums(track: Track, first_bar: int, bars: int, pattern: dict[str, list[float]], velocity: float = 1.0) -> None:
    for bar in range(first_bar, first_bar + bars):
        for drum, beats in pattern.items():
            for beat in beats:
                track.hit(bar * 4 + beat, drum, velocity)


SIXTEENTHS = [i * 0.25 for i in range(16)]
EIGHTHS = [i * 0.5 for i in range(8)]
OFFBEATS = [i + 0.5 for i in range(4)]


# ---------------------------------------------------------------------------------------------
# The tracks
# ---------------------------------------------------------------------------------------------


def menu_theme() -> Track:
    """Title screen: epic, arcade, moderate energy. D minor, 112 BPM, 16 bars."""
    t = Track(bpm=112, bars=16)
    prog = ["Dm", "Bb", "F", "C"] * 2 + ["Dm", "Bb", "Gm", "A"] + ["Dm", "Bb", "F", "C"]
    pads(t, prog, octave=4)
    arpeggio(t, "pluck", prog, 0, [0, 1, 2, 3, 2, 1, 4, 2], 0.5, octave=5, velocity=0.7)
    bassline(t, prog[4:], 4, [(0, 1.5, 0), (1.5, 0.5, 0), (2, 1, 12), (3, 0.5, 0), (3.5, 0.5, 7)])
    melody(t, "lead", 4, [
        [("A4", 1), ("D5", 0.5), ("E5", 0.5), ("F5", 1.5), ("E5", 0.5)],
        [("D5", 1), ("C5", 0.5), ("Bb4", 0.5), ("F5", 2)],
        [("A4", 0.5), ("C5", 0.5), ("F5", 1), ("A5", 1.5), ("G5", 0.5)],
        [("G5", 1), ("F5", 0.5), ("E5", 0.5), ("C5", 2)],
        [("A4", 1), ("D5", 0.5), ("E5", 0.5), ("F5", 1), ("A5", 1)],
        [("Bb5", 1.5), ("A5", 0.5), ("F5", 1), ("D5", 1)],
        [("G5", 1), ("Bb5", 1), ("D6", 1.5), ("C6", 0.5)],
        [("A5", 1), ("G5", 0.5), ("F5", 0.5), ("E5", 1), ("C#5", 1)],
        [("D6", 2), ("A5", 1), ("F5", 1)],
        [("Bb5", 1.5), ("A5", 0.5), ("G5", 1), ("F5", 1)],
        [("A5", 1), ("C6", 1), ("F6", 1.5), ("E6", 0.5)],
        [("E6", 1), ("D6", 0.5), ("C6", 0.5), ("A5", 1), ("E5", 1)],
    ])
    melody(t, "chip", 12, [
        [("D6", 0.5), ("F6", 0.5), ("A6", 0.5), (None, 2.5)],
        [("Bb5", 0.5), ("D6", 0.5), ("F6", 0.5), (None, 2.5)],
        [("A5", 0.5), ("C6", 0.5), ("F6", 0.5), (None, 2.5)],
        [("G5", 0.5), ("C6", 0.5), ("E6", 0.5), (None, 2.5)],
    ], velocity=0.6)
    # Intro: heartbeat kick and toms; then a half-time groove.
    drums(t, 0, 4, {"kick": [0, 2], "tom": [3.5]}, velocity=0.7)
    drums(t, 4, 12, {"kick": [0, 1.75, 2.5], "snare": [1, 3], "hat": EIGHTHS, "ohat": [3.5]})
    for bar in (0, 4, 8, 12):
        t.hit(bar * 4, "crash", 0.9)
    drums(t, 15, 1, {"tom": [3, 3.25, 3.5, 3.75]}, velocity=0.8)
    return t


def select_theme() -> Track:
    """Character select: faster, anticipation and competition. E minor, 140 BPM, 16 bars."""
    t = Track(bpm=140, bars=16)
    prog = ["Em", "C", "D", "B", "Em", "C", "Am", "B"] * 2
    pads(t, prog, octave=4, velocity=0.8)
    arpeggio(t, "chip", prog, 0, [0, 2, 1, 2, 3, 2, 1, 2], 0.25, octave=5, velocity=0.55)
    bassline(t, prog, 0, [(x, 0.5, 0 if i % 4 != 3 else 12) for i, x in enumerate(EIGHTHS)])
    for bar, name in enumerate(prog):
        root, _ = chord(name.rstrip("m") + "5", 3)
        for beat in (0, 1.5, 3):  # synth stabs on the off-pattern
            t.add("power", bar * 4 + beat, 0.5, root, 0.7)
    melody(t, "lead", 8, [
        [("E5", 0.5), ("G5", 0.5), ("B5", 0.5), ("G5", 0.5), ("A5", 0.5), ("G5", 0.5), ("E5", 1)],
        [("E5", 0.5), ("G5", 0.5), ("C6", 1), ("B5", 0.5), ("A5", 0.5), ("G5", 1)],
        [("F#5", 0.5), ("A5", 0.5), ("D6", 1), ("C6", 0.5), ("B5", 0.5), ("A5", 1)],
        [("B5", 1.5), ("A5", 0.5), ("G5", 0.5), ("F#5", 0.5), ("D#5", 1)],
        [("E5", 0.5), ("E5", 0.5), ("G5", 0.5), ("B5", 0.5), ("E6", 1), ("D6", 1)],
        [("C6", 1), ("B5", 0.5), ("A5", 0.5), ("G5", 1), ("E5", 1)],
        [("A5", 0.5), ("C6", 0.5), ("E6", 1), ("D6", 0.5), ("C6", 0.5), ("B5", 1)],
        [("B5", 2), ("D#6", 1), ("F#6", 1)],
    ])
    drums(t, 0, 16, {"kick": [0, 1, 2, 3], "clap": [1, 3], "hat": SIXTEENTHS, "ohat": OFFBEATS})
    drums(t, 7, 1, {"snare": [3, 3.25, 3.5, 3.75]}, velocity=0.8)
    drums(t, 15, 1, {"snare": [2.5, 3, 3.25, 3.5, 3.75]}, velocity=0.9)
    for bar in (0, 8):
        t.hit(bar * 4, "crash")
    return t


def partner_summit_theme() -> Track:
    """Fight on the Partner Summit stage: intense, driving. A minor, 150 BPM, 24 bars."""
    t = Track(bpm=150, bars=24)
    section_a = ["Am", "Am", "F", "G", "Am", "Am", "F", "E"]
    section_b = ["Am", "F", "C", "G", "Am", "F", "G", "E"]
    section_c = ["Dm", "Dm", "Am", "Am", "F", "G", "E", "E"]
    prog = section_a + section_b + section_c
    gallop = [0, 0.75, 1.5, 2, 2.75, 3.5]
    for bar, name in enumerate(prog):
        root, _ = chord(name.rstrip("m") + "5", 3)
        for beat in gallop:
            t.add("power", bar * 4 + beat, 0.5 if beat % 1 else 0.75, root - 12, 0.9)
    # Octave-jumping eighth-note bass.
    bassline(t, prog, 0, [(x, 0.5, 12 if i % 2 else 0) for i, x in enumerate(EIGHTHS)], octave=2)
    pads(t, section_b + section_c, octave=4, velocity=0.7, first_bar=8)
    arpeggio(t, "chip", section_b, 8, [0, 1, 2, 4, 2, 1], 0.25, octave=5, velocity=0.4)
    melody(t, "lead", 8, [
        [("E5", 0.5), ("A5", 0.5), ("B5", 0.5), ("C6", 1), ("B5", 0.5), ("A5", 1)],
        [("C6", 0.5), ("B5", 0.5), ("A5", 0.5), ("F5", 1.5), ("E5", 1)],
        [("G5", 1), ("C6", 1), ("E6", 1), ("D6", 1)],
        [("D6", 1.5), ("C6", 0.5), ("B5", 1), ("G5", 1)],
        [("A5", 0.5), ("A5", 0.5), ("C6", 0.5), ("E6", 1), ("D6", 0.5), ("C6", 1)],
        [("F6", 1), ("E6", 0.5), ("D6", 0.5), ("C6", 1), ("A5", 1)],
        [("B5", 1), ("D6", 1), ("G6", 1), ("F6", 1)],
        [("E6", 2), ("G#5", 1), ("B5", 1)],
        [("F5", 2), ("A5", 2)],
        [("D6", 1.5), ("C6", 0.5), ("A5", 2)],
        [("E5", 2), ("A5", 1), ("C6", 1)],
        [("B5", 1.5), ("A5", 0.5), ("E5", 2)],
        [("F5", 1), ("A5", 1), ("C6", 1), ("F6", 1)],
        [("G6", 1.5), ("F6", 0.5), ("D6", 1), ("B5", 1)],
        [("G#5", 1), ("B5", 1), ("E6", 1), ("G#6", 1)],
        [("B6", 2), (None, 2)],
    ])
    groove = {"kick": [0, 0.75, 1.5, 2, 2.75, 3.25], "snare": [1, 3], "hat": SIXTEENTHS}
    drums(t, 0, 24, groove)
    for fill_bar in (7, 15):
        drums(t, fill_bar, 1, {"snare": [3, 3.25, 3.5, 3.75]}, velocity=0.85)
    drums(t, 23, 1, {"tom": [2, 2.5, 3], "snare": [3.5, 3.75]}, velocity=0.9)
    for bar in (0, 8, 16):
        t.hit(bar * 4, "crash")
    return t


def story_map_theme() -> Track:
    """Brazil travel map: adventure, lighter rhythm. D major, 120 BPM, 16 bars."""
    t = Track(bpm=120, bars=16)
    prog = ["D", "A", "Bm", "G", "D", "C", "G", "A", "D", "A", "Bm", "G", "Em", "G", "A", "A"]
    pads(t, prog, octave=4, velocity=0.75)
    arpeggio(t, "pluck", prog, 0, [0, 2, 3, 2, 1, 2, 4, 2], 0.5, octave=5, velocity=0.65)
    bassline(t, prog, 0, [(0, 1, 0), (1.5, 0.5, 0), (2, 1, 7), (3, 1, 12)])
    melody(t, "lead", 0, [
        [("F#5", 1), ("A5", 0.5), ("D6", 0.5), ("C#6", 1), ("A5", 1)],
        [("E5", 1), ("A5", 1), ("C#6", 1.5), ("B5", 0.5)],
        [("D6", 1), ("B5", 0.5), ("F#5", 0.5), ("B5", 1), ("D6", 1)],
        [("E6", 1.5), ("D6", 0.5), ("B5", 1), ("G5", 1)],
        [("A5", 1), ("F#5", 0.5), ("A5", 0.5), ("D6", 1), ("F#6", 1)],
        [("E6", 1), ("C6", 1), ("G5", 1), ("E5", 1)],
        [("D6", 1), ("B5", 0.5), ("G5", 0.5), ("B5", 1), ("D6", 1)],
        [("C#6", 2), ("A5", 1), ("E5", 1)],
    ], velocity=0.85)
    melody(t, "lead", 12, [
        [("G5", 1), ("B5", 1), ("E6", 1.5), ("D6", 0.5)],
        [("D6", 1), ("B5", 1), ("G5", 1), ("B5", 1)],
        [("C#6", 1), ("E6", 1), ("A6", 1.5), ("G6", 0.5)],
        [("E6", 2), ("C#6", 1), ("A5", 1)],
    ], velocity=0.85)
    melody(t, "chip", 8, [
        [("A6", 0.5), (None, 1.5), ("F#6", 0.5), (None, 1.5)],
        [("E6", 0.5), (None, 1.5), ("C#6", 0.5), (None, 1.5)],
        [("D6", 0.5), (None, 1.5), ("F#6", 0.5), (None, 1.5)],
        [("G6", 0.5), (None, 1.5), ("D6", 0.5), (None, 1.5)],
    ], velocity=0.5)
    drums(t, 0, 16, {"kick": [0, 2.5], "clap": [1, 3], "hat": EIGHTHS}, velocity=0.85)
    drums(t, 0, 16, {"hat": OFFBEATS}, velocity=0.5)
    for bar in (0, 8):
        t.hit(bar * 4, "crash", 0.7)
    return t


def victory_sting() -> Track:
    """Arcade-fighter victory fanfare (about 6.5 s), B-flat major, 150 BPM. Original melody in
    the genre's language: an orchestra hit on the downbeat, a triplet brass call doubled in
    octaves over strings and a driving bass, IV-V lift with a snare roll and timpani, then a
    held tonic chord with a bell sparkle and the hall ringing out."""
    t = Track(bpm=150, bars=3, loop=False, reverb=0.28, reverb_seconds=2.2, tail_seconds=1.9)

    def hit(beat: float, names: list[str], velocity: float = 1.0) -> None:
        for name in names:
            t.add("stab", beat, 0.5, midi(name), velocity)

    # Bar 1: hit, then the brass call (triplet pickup to a high F).
    hit(0, ["Bb3", "D4", "F4", "Bb4", "D5", "F5"])
    t.hit(0, "kick")
    t.hit(0, "crash", 0.6)
    t.add("timpani", 0, 1, midi("Bb1"), 0.55)
    call = [("F4", 1, 1 / 3), ("Bb4", 4 / 3, 1 / 3), ("D5", 5 / 3, 1 / 3), ("F5", 2, 0.75),
            ("Eb5", 2.75, 0.25), ("D5", 3, 0.5), ("Eb5", 3.5, 0.5)]
    # Bar 2: IV then V, the line climbs; bar 3: the tonic, held.
    call += [("G5", 4, 1.0), ("F5", 5, 0.5), ("Eb5", 5.5, 0.5), ("F5", 6, 1 / 3),
             ("G5", 6 + 1 / 3, 1 / 3), ("A5", 6 + 2 / 3, 1 / 3), ("Bb5", 7, 0.5), ("C6", 7.5, 0.5)]
    for name, beat, length in call:
        t.add("horn", beat, length, midi(name))
        t.add("horn", beat, length, midi(name) - 12, 0.75)  # octave doubling, like a section
    for tone in ("D5", "F5", "Bb5", "D6"):
        t.add("horn", 8, 4, midi(tone), 0.95)
    t.add("horn", 8, 4, midi("Bb4"), 0.8)

    # Harmony: strings bed and brass chord stabs on the changes.
    for beat, length, names in ((1, 3, ("Bb3", "D4", "F4")), (4, 2, ("Eb4", "G4", "Bb4")),
                                (6, 2, ("F4", "A4", "C5")), (8, 4, ("Bb3", "D4", "F4", "Bb4"))):
        for name in names:
            t.add("strings", beat, length, midi(name), 0.9)
    hit(4, ["Eb4", "G4", "Bb4", "Eb5"], 0.7)
    hit(6, ["F4", "A4", "C5", "F5"], 0.75)
    hit(8, ["Bb3", "D4", "F4", "Bb4", "D5", "F5"], 1.0)

    # Driving bass in eighths, then the low tonic.
    for beat, root in ((1, "Bb1"), (4, "Eb2"), (6, "F2")):
        span = 3 if root == "Bb1" else 2
        for i in range(int(span * 2)):
            t.add("bass", beat + i / 2, 0.45, midi(root) + (12 if i % 2 else 0), 0.5)
    t.add("bass", 8, 3.5, midi("Bb1"), 0.6)

    # Drums: light backbeat, a snare roll crescendo into the last bar, timpani on the changes.
    for beat in (1, 2, 3, 4, 5):
        t.hit(beat, "kick", 0.45 if beat % 2 else 0.55)
    for beat in (2, 4):
        t.hit(beat, "snare", 0.6)
    for i in range(16):
        t.hit(6 + i / 8, "snare", 0.2 + 0.45 * i / 15)
    t.add("timpani", 4, 1, midi("Eb2"), 0.45)
    t.add("timpani", 6, 1, midi("F2"), 0.5)
    for i in range(6):
        t.add("timpani", 7 + i / 6, 0.2, midi("F2"), 0.22 + 0.05 * i)
    t.hit(8, "kick")
    t.hit(8, "crash", 0.8)
    t.add("timpani", 8, 1, midi("Bb1"), 0.6)

    # Sparkle over the final chord.
    for i, name in enumerate(("Bb5", "D6", "F6", "Bb6", "D7", "F7")):
        t.add("bell", 8.25 + i * 0.25, 0.25, midi(name), 0.7 - 0.06 * i)
    return t


TRACKS = {
    "menu-theme": (menu_theme, 11),
    "character-select-theme": (select_theme, 23),
    "partner-summit-theme": (partner_summit_theme, 37),
    "story-map-theme": (story_map_theme, 41),
    "victory-sting": (victory_sting, 53),
}


def write_wav(path: Path, audio: np.ndarray) -> None:
    pcm = (np.clip(audio, -1, 1) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as out:
        out.setnchannels(2)
        out.setsampwidth(2)
        out.setframerate(SR)
        out.writeframes(pcm.tobytes())


def encode(wav: Path, name: str) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    common = ["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav), "-map_metadata", "-1"]
    subprocess.run(common + ["-c:a", "libvorbis", "-q:a", "4", str(OUT_DIR / f"{name}.ogg")], check=True)
    subprocess.run(common + ["-c:a", "aac", "-b:a", "128k", str(OUT_DIR / f"{name}.m4a")], check=True)


def main(names: list[str]) -> None:
    with tempfile.TemporaryDirectory() as tmp:
        for name in names or list(TRACKS):
            build, seed = TRACKS[name]
            track = build()
            audio = render(track, seed)
            wav = Path(tmp) / f"{name}.wav"
            write_wav(wav, audio)
            encode(wav, name)
            print(f"{name}: {len(audio) / SR:.2f} s, {track.bpm:g} BPM, {'loop' if track.loop else 'one-shot'}")


if __name__ == "__main__":
    main(sys.argv[1:])
