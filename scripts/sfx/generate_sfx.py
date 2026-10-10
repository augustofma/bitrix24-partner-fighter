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


def sfx_special_vibe(rng):
    """ALAIO VIBECODE!: a burst of keyboard typing, a synthwave "vibe" wobble with a rising
    arpeggio, then a glitchy release and a punchy hit."""
    keys = mix(*[at(bandpass(rng.uniform(-1, 1, int(0.018 * SR)), 1800, 6000) * decay(0.018, 220)
                    * (0.35 + 0.25 * rng.uniform()), i * 0.02 + rng.uniform(0, 0.004)) for i in range(7)])
    wob_len = 0.26
    t = seconds(wob_len)
    lfo = 0.5 + 0.5 * np.sin(2 * np.pi * 9 * t)
    wob = saw(2 * np.pi * np.cumsum(np.full(len(t), 110.0)) / SR, 20) + saw(2 * np.pi * np.cumsum(np.full(len(t), 110.8)) / SR, 20)
    wob = lowpass(wob * (0.3 + 0.7 * lfo), 2400) * np.linspace(0.2, 1, len(t)) * 0.45
    arp = mix(*[at(note(f, 0.07, "square", 30) * 0.22, 0.05 + i * 0.026) for i, f in enumerate((659, 784, 988, 1319, 1568, 1976))])
    glitch_len = 0.16
    glitch = highpass(rng.uniform(-1, 1, int(glitch_len * SR)), 2500) * (rng.uniform(0, 1, int(glitch_len * SR)) > 0.7)
    glitch = glitch * np.repeat(rng.uniform(0, 1, int(glitch_len * SR) // 220 + 1) > 0.4, 220)[: int(glitch_len * SR)] * 0.45
    hit = np.sin(sweep(240, 60, 0.25)) * decay(0.25, 11)
    return mix(keys, wob, arp, at(glitch, 0.2), at(hit, 0.2))


def sfx_special_gpt(rng):
    """GPTMAKER!: blocks clicking together and a servo whir as the agent is built, a friendly
    two-tone robot "beep-boop", then a buzzing beam charge and a heavy hit."""
    clicks = mix(*[at(bandpass(rng.uniform(-1, 1, int(0.02 * SR)), 900, 4000) * decay(0.02, 160) * 0.55, i * 0.034) for i in range(5)])
    servo_len = 0.2
    t = seconds(servo_len)
    servo_phase = sweep(220, 520, servo_len)
    servo = (np.sin(servo_phase) + 0.4 * np.sin(2 * servo_phase) + 0.2 * np.sin(3 * servo_phase)) * (0.6 + 0.4 * np.sin(2 * np.pi * 30 * t)) * 0.3
    beep = mix(note(880, 0.08, "square", 20) * 0.3, at(note(1175, 0.11, "square", 18) * 0.3, 0.08))
    buzz_len = 0.12
    buzz = lowpass(saw(sweep(90, 180, buzz_len), 24), 3200) * np.linspace(0.3, 1, int(buzz_len * SR)) * 0.4
    boom = np.sin(sweep(170, 42, 0.38)) * decay(0.38, 8)
    crack = highpass(rng.uniform(-1, 1, int(0.08 * SR)), 3000) * decay(0.08, 40) * 0.4
    return mix(clicks, at(servo, 0.02), at(beep, 0.1), at(buzz, 0.17), at(boom, 0.28), at(crack, 0.28))


def sfx_special_fluidz(rng):
    """FLUIDZ!: liquid "bloops" (bubbles whose pitch jumps up as they pop), a gurgling pour
    rising in pitch, then a wet splash."""
    bloops = mix(*[at(np.sin(sweep(300 + 140 * i, 900 + 260 * i, 0.06, curve=0.5)) * decay(0.06, 35) * 0.45,
                      0.03 + i * 0.045 + rng.uniform(0, 0.01)) for i in range(5)])
    pour_len = 0.2
    t = seconds(pour_len)
    gurgle = 0.5 + 0.5 * np.sin(2 * np.pi * (14 + 30 * t / pour_len) * t)
    pour = bandpass(rng.uniform(-1, 1, len(t)), 500, 2600) * gurgle * np.linspace(0.2, 0.8, len(t)) * 0.45
    splash_len = 0.32
    splash = bandpass(rng.uniform(-1, 1, int(splash_len * SR)), 900, 7000) * decay(splash_len, 11) * 0.7
    drops = mix(*[at(np.sin(sweep(1400 + 300 * i, 2400 + 300 * i, 0.03)) * decay(0.03, 80) * 0.25,
                     0.26 + i * 0.03 + rng.uniform(0, 0.01)) for i in range(4)])
    thud = np.sin(sweep(180, 70, 0.2)) * decay(0.2, 14) * 0.8
    return mix(bloops, at(pour, 0.04), at(splash, 0.22), drops, at(thud, 0.22))



def sfx_special_alaio_strike(rng):
    """ALAIO STRIKE!: the storm gathers (a rising rumble and electric crackle on the raised
    fist), then a huge thunderclap when the lightning falls (~0.4 s, the move's active frames)
    and a long rolling rumble across the stage, with a cartoon "zzzt" buzz on top."""
    gather_len = 0.4
    t = seconds(gather_len)
    gather = lowpass(rng.uniform(-1, 1, len(t)), 220) * np.linspace(0.1, 1, len(t)) ** 2 * 1.6
    crackle_len = 0.38
    n = int(crackle_len * SR)
    crackle = highpass(rng.uniform(-1, 1, n), 3500) * (rng.uniform(0, 1, n) > 0.93) * np.linspace(0.2, 0.7, n)
    zzzt_len = 0.3
    zt = seconds(zzzt_len)
    zzzt = lowpass(saw(2 * np.pi * np.cumsum(120 + 60 * np.sin(2 * np.pi * 23 * zt)) / SR, 24), 2600)
    zzzt = zzzt * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 31 * zt))) * np.linspace(0.1, 0.35, len(zt))
    clap = highpass(rng.uniform(-1, 1, int(0.12 * SR)), 1200) * decay(0.12, 26)
    boom = np.sin(sweep(130, 34, 0.5)) * decay(0.5, 5) * 1.1
    roll_len = 1.0
    rt = seconds(roll_len)
    roll = lowpass(rng.uniform(-1, 1, len(rt)), 160) * decay(roll_len, 2.6)
    roll = roll * (0.6 + 0.4 * np.sin(2 * np.pi * 5 * rt + 1.2)) * 2.2
    return mix(gather, at(crackle, 0.02), at(zzzt, 0.08), at(clap, 0.4), at(boom, 0.4), at(roll, 0.44))



def sfx_special_n8n(rng):
    """N8N!: a workflow runs: quick digital "blips" as the nodes pop in (rising), a whoosh of
    data along the connections, then a bright two-note "success" chime and a punchy hit."""
    blips = mix(*[at(note(660 + 140 * i, 0.05, "square", 40) * 0.28, 0.02 + i * 0.05) for i in range(4)])
    flow_len = 0.18
    flow = bandpass(rng.uniform(-1, 1, int(flow_len * SR)), 1500, 6000) * np.linspace(0.1, 0.8, int(flow_len * SR)) * 0.4
    chime = mix(note(1319, 0.09, "sine", 14) * 0.35, at(note(1760, 0.16, "sine", 10) * 0.35, 0.07))
    hit = np.sin(sweep(200, 60, 0.22)) * decay(0.22, 12) * 0.9
    click = highpass(rng.uniform(-1, 1, int(0.03 * SR)), 3000) * decay(0.03, 90) * 0.4
    return mix(blips, at(flow, 0.2), at(chime, 0.36), at(hit, 0.36), at(click, 0.36))


def sfx_special_190(rng):
    """CHAMA O 190!: a two-tone siren (wee-woo) as the patrol car rushes in, a tyre screech as it
    brakes, then a cartoon burst of shots (sharp cracks with a low thump) landing on the rival."""
    siren = mix(*[
        at(np.sin(np.cumsum(np.full(int(0.11 * SR), 2 * np.pi * hz / SR))) * decay(0.11, 3) * 0.32, i * 0.11)
        for i, hz in enumerate([960, 740, 960])
    ])
    screech_len = 0.16
    screech = bandpass(rng.uniform(-1, 1, int(screech_len * SR)), 2500, 5200) * decay(screech_len, 6) * 0.35
    shots = []
    for i in range(6):
        crack = highpass(rng.uniform(-1, 1, int(0.05 * SR)), 1800) * decay(0.05, 70) * 0.75
        thump = np.sin(sweep(180, 60, 0.07)) * decay(0.07, 30) * 0.5
        shots.append(at(mix(crack, thump), 0.3 + i * 0.045))
    hit = np.sin(sweep(160, 50, 0.24)) * decay(0.24, 11) * 0.7
    return mix(siren, at(screech, 0.16), *shots, at(hit, 0.32))


def sfx_special_powerzap(rng):
    """POWER COMBO starts (POWERZAP): a fast rising energy charge (a low saw sweeping up under a
    filtered whoosh) that cuts into a short punchy thump: the messages are fired."""
    charge_len = 0.26
    charge = lowpass(saw(sweep(90, 420, charge_len, 0.7), 14), 2200) * np.linspace(0.2, 1, int(charge_len * SR)) * 0.35
    whoosh = bandpass(rng.uniform(-1, 1, int(charge_len * SR)), 700, 3500)
    whoosh *= np.sin(np.pi * seconds(charge_len) / charge_len) ** 2 * 0.4
    fire = np.sin(sweep(170, 60, 0.18)) * decay(0.18, 14) * 0.8
    crack = highpass(rng.uniform(-1, 1, int(0.04 * SR)), 2200) * decay(0.04, 70) * 0.35
    return mix(charge, whoosh, at(mix(fire, crack), charge_len - 0.02))


def sfx_special_powerbot(rng):
    """POWERBOT finisher lands: a heavy digital boom with a bit-crushed tail and a falling synth
    zap (the strongest hit of the move)."""
    boom_len = 0.5
    boom = np.sin(sweep(150, 38, boom_len, 1.6)) * decay(boom_len, 7) * 0.9
    noise = lowpass(rng.uniform(-1, 1, int(boom_len * SR)), 2600) * decay(boom_len, 9) * 0.5
    crushed = np.round(noise * 6) / 6
    crack = highpass(rng.uniform(-1, 1, int(0.05 * SR)), 1800) * decay(0.05, 60) * 0.5
    zap = saw(sweep(1600, 140, 0.35, 1.4), 10) * decay(0.35, 8) * 0.2
    return np.tanh(mix(boom, crushed, crack, zap) * 2.6)


def sfx_special_hit(rng):
    """A special connects (any special): heavier than a kick: a deep body boom, a sharp crack and
    a short burst of energy sizzling away."""
    body = np.sin(sweep(190, 45, 0.42, 1.5)) * decay(0.42, 8) * 0.95
    thump = np.sin(sweep(320, 110, 0.06)) * decay(0.06, 40) * 0.6
    crack = highpass(rng.uniform(-1, 1, int(0.05 * SR)), 1600) * decay(0.05, 55) * 0.6
    energy = bandpass(rng.uniform(-1, 1, int(0.3 * SR)), 1200, 5000) * decay(0.3, 12) * 0.25
    # Driven like the normal hits (impact()), so it is as dense and loud as a kick, only bigger.
    return np.tanh(mix(attack(body, 1), thump, crack, at(energy, 0.01)) * 3.2)


def crowd_voices(rng, duration: float, count: int, low: float, high: float) -> np.ndarray:
    """Many people at once: band-limited noise "voices", each with its own vowel-ish formant
    and a slightly different onset, summed into one crowd roar."""
    n = int(duration * SR)
    out = np.zeros(n)
    for _ in range(count):
        centre = rng.uniform(low, high)
        voice = bandpass(rng.uniform(-1, 1, n), centre * 0.8, centre * 1.25)
        onset = rng.uniform(0, 0.08)
        env = np.clip((seconds(duration) - onset) / 0.12, 0, 1) * rng.uniform(0.6, 1.0)
        out += voice * env
    return out / count


def sfx_crowd_cheer(rng):
    """The crowd erupts (a special, a KO, a perfect): a roar that swells and fades, with scattered
    claps. No whistles: their high glides sounded like birds over every special."""
    duration = 1.6
    roar = crowd_voices(rng, duration, 24, 350, 1800) * np.exp(-seconds(duration) * 1.6) * 2.4
    claps = []
    for _ in range(26):
        clap = bandpass(rng.uniform(-1, 1, int(0.03 * SR)), 900, 3200) * decay(0.03, 120) * rng.uniform(0.15, 0.35)
        claps.append(at(clap, rng.uniform(0.05, 1.2)))
    return mix(attack(roar, 60), *claps)


def sfx_crowd_ooh(rng):
    """A big hit lands: the crowd goes "ooh!" (a low vowel formant whose pitch rises then
    sags), short and under the hit itself."""
    duration = 0.85
    x = seconds(duration)
    voices = crowd_voices(rng, duration, 18, 280, 650)
    glide = 1 + 0.25 * np.sin(np.pi * np.clip(x / 0.6, 0, 1))
    hum = mix(*[np.sin(np.cumsum(2 * np.pi * hz * glide / SR)) * 0.08 for hz in rng.uniform(170, 260, 6)])
    env = np.clip(x / 0.1, 0, 1) * np.exp(-np.clip(x - 0.15, 0, None) * 4)
    return lowpass(mix(voices * 1.6, hum), 1400) * env


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
    "special-vibe": sfx_special_vibe,
    "special-gpt": sfx_special_gpt,
    "special-fluidz": sfx_special_fluidz,
    "special-alaio-strike": sfx_special_alaio_strike,
    "special-n8n": sfx_special_n8n,
    "special-190": sfx_special_190,
    "special-powerzap": sfx_special_powerzap,
    "special-hit": sfx_special_hit,
    "special-powerbot": sfx_special_powerbot,
    "crowd-cheer": sfx_crowd_cheer,
    "crowd-ooh": sfx_crowd_ooh,
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
