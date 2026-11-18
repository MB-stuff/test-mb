"""Генерирует фоновую музыку для музея (webcore / dreamy lo-fi).
Всё синтезируется с нуля: никаких сэмплов, никаких чужих треков.
Каждый трек — бесшовная петля (хвосты нот и реверб заворачиваются в начало).

Запуск: python3 tools/make_music.py   (нужны numpy, scipy, ffmpeg)
"""
import os, subprocess
import numpy as np
from scipy.signal import butter, lfilter, sosfilt

SR = 44100
OUT = os.path.join(os.path.dirname(__file__), '..', 'museum', 'music')
rng = np.random.default_rng(7)


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def lp(x, fc, order=2):
    sos = butter(order, fc / (SR / 2), 'low', output='sos')
    return sosfilt(sos, x)


def hp(x, fc, order=2):
    sos = butter(order, fc / (SR / 2), 'high', output='sos')
    return sosfilt(sos, x)


def bp(x, f1, f2, order=2):
    sos = butter(order, [f1 / (SR / 2), f2 / (SR / 2)], 'band', output='sos')
    return sosfilt(sos, x)


class Loop:
    def __init__(self, seconds):
        self.L = int(round(seconds * SR))
        self.bus = {}

    def add(self, bus, t, sig, pan=0.0, gain=1.0):
        """Кладёт моно-сигнал в стерео-шину с заворотом через конец петли."""
        if bus not in self.bus:
            self.bus[bus] = np.zeros((2, self.L))
        b = self.bus[bus]
        gl = gain * np.cos((pan + 1) * np.pi / 4) * 1.414
        gr = gain * np.sin((pan + 1) * np.pi / 4) * 1.414
        s = int(round(t * SR)) % self.L
        n = len(sig)
        pos = 0
        while pos < n:
            chunk = min(n - pos, self.L - s)
            b[0, s:s + chunk] += sig[pos:pos + chunk] * gl
            b[1, s:s + chunk] += sig[pos:pos + chunk] * gr
            pos += chunk
            s = 0


def env(n_on, a, d, s, r):
    a_n, d_n, r_n = int(a * SR), int(d * SR), int(r * SR)
    n_on = max(n_on, a_n + d_n)
    e = np.concatenate([
        np.linspace(0, 1, a_n, endpoint=False),
        np.linspace(1, s, d_n, endpoint=False),
        np.full(n_on - a_n - d_n, s),
        np.linspace(s, 0, r_n),
    ])
    return e


# ---------------- инструменты ----------------

def pad(m, dur, bright=1400, detune=0.12):
    f = mtof(m)
    n = int(dur * SR)
    e = env(n, 1.4, 0.8, 0.8, 2.2)
    t = np.arange(len(e)) / SR
    out = np.zeros(len(e))
    for k, dt in enumerate((-detune, 0, detune)):
        ff = f * 2 ** (dt / 12)
        ph = rng.random()
        out += 2 * ((t * ff + ph) % 1.0) - 1
    out = lp(out / 3, bright, 2)
    return out * e * 0.5


def epiano(m, dur, vel=1.0):
    f = mtof(m)
    n = int(dur * SR)
    e = env(n, 0.005, 1.2, 0.35, 0.6)
    t = np.arange(len(e)) / SR
    idx = 1.6 * np.exp(-t / 0.25) * vel
    mod = np.sin(2 * np.pi * f * t) * idx
    car = np.sin(2 * np.pi * f * t + mod)
    tine = np.sin(2 * np.pi * f * 7.1 * t) * np.exp(-t / 0.03) * 0.15
    trem = 1 + 0.12 * np.sin(2 * np.pi * 4.5 * t)
    return (car + tine) * e * trem * 0.35 * vel


def musicbox(m, vel=1.0, detune_cents=0.0):
    f = mtof(m) * 2 ** (detune_cents / 1200)
    n = int(2.2 * SR)
    t = np.arange(n) / SR
    s = (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.9)
         + 0.35 * np.sin(2 * np.pi * f * 3.0 * t) * np.exp(-t / 0.35)
         + 0.12 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t / 0.12))
    s[:40] *= np.linspace(0, 1, 40)
    return s * 0.3 * vel


def vibes(m, vel=1.0):
    f = mtof(m)
    n = int(2.0 * SR)
    t = np.arange(n) / SR
    s = (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t / 0.2))
    s *= np.exp(-t / 0.7) * (1 + 0.25 * np.sin(2 * np.pi * 5.5 * t))
    s[:30] *= np.linspace(0, 1, 30)
    return s * 0.3 * vel


def pulse(m, dur, width=0.25, vel=1.0, cutoff=3000, vib=True):
    f = mtof(m)
    n = int(dur * SR)
    e = env(n, 0.004, 0.08, 0.6, 0.06)
    t = np.arange(len(e)) / SR
    fm = f * (1 + (0.004 * np.sin(2 * np.pi * 5.5 * t) * np.clip(t / 0.25, 0, 1) if vib else 0))
    ph = np.cumsum(fm) / SR
    s = np.where((ph % 1.0) < width, 1.0, -1.0)
    s = lp(s, cutoff, 2)
    return s * e * 0.18 * vel


def bass(m, dur, vel=1.0):
    f = mtof(m)
    n = int(dur * SR)
    e = env(n, 0.008, 0.25, 0.7, 0.12)
    t = np.arange(len(e)) / SR
    s = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.2)
    return np.tanh(s * 1.4) * e * 0.45 * vel


def kick(vel=1.0):
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    f = 45 + 80 * np.exp(-t / 0.04)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.18)
    s += lp(rng.standard_normal(n), 2000) * np.exp(-t / 0.004) * 0.3
    return np.tanh(s * 1.5) * 0.55 * vel


def snare(vel=1.0):
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    s = bp(rng.standard_normal(n), 900, 6000) * np.exp(-t / 0.09) * 0.7
    s += np.sin(2 * np.pi * 185 * t) * np.exp(-t / 0.05) * 0.5
    return lp(s, 5000) * 0.35 * vel


def hat(vel=1.0, length=0.05):
    n = int(0.15 * SR)
    t = np.arange(n) / SR
    s = hp(rng.standard_normal(n), 7000) * np.exp(-t / length)
    return s * 0.12 * vel


def shaker(vel=1.0):
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    e = np.minimum(t / 0.02, 1) * np.exp(-t / 0.04)
    return bp(rng.standard_normal(n), 4000, 10000) * e * 0.08 * vel


# ---------------- эффекты ----------------

def reverb(x, seconds=2.8, damp=5000, predelay=0.02, seed=1):
    """Циклическая свёртка с синтетическим IR — хвост заворачивается в начало петли."""
    r = np.random.default_rng(seed)
    L = x.shape[1]
    n = int(seconds * SR)
    t = np.arange(n) / SR
    out = np.zeros_like(x)
    for ch in range(2):
        ir = r.standard_normal(n) * np.exp(-t * 6.9 / seconds)
        ir = lp(ir, damp, 1)
        pd = int(predelay * SR)
        ir = np.concatenate([np.zeros(pd), ir])[:n]
        ir /= np.sqrt(np.sum(ir ** 2))
        irf = np.zeros(L)
        irf[:min(n, L)] = ir[:min(n, L)]
        out[ch] = np.real(np.fft.ifft(np.fft.fft(x[ch]) * np.fft.fft(irf)))
    return out


def tape(x, wow=0.0016, flutter=0.00025):
    """Плавающая высота как у старой кассеты (циклично, без шва)."""
    L = x.shape[1]
    dur = L / SR
    fw = max(1, round(0.45 * dur)) / dur
    ff = max(1, round(5.7 * dur)) / dur
    n = np.arange(L)
    d = (wow * (1 + np.sin(2 * np.pi * fw * n / SR)) + flutter * (1 + np.sin(2 * np.pi * ff * n / SR))) * SR
    pos = (n - d) % L
    i0 = np.floor(pos).astype(int)
    fr = pos - i0
    i1 = (i0 + 1) % L
    return x[:, i0] * (1 - fr) + x[:, i1] * fr


def vinyl(L, level=0.006, crackle=0.02, seed=3):
    r = np.random.default_rng(seed)
    hiss = hp(lp(r.standard_normal((2, L)), 9000), 300) * level
    c = np.zeros((2, L))
    k = int(L / SR * 9)
    pos = r.integers(0, L, k)
    c[r.integers(0, 2, k), pos] = r.standard_normal(k) * crackle * 4
    c = hp(c, 1500)
    return hiss + c


def master(x, target=0.89, lowpass=11000):
    x = lp(x, lowpass, 2)
    x = np.tanh(x * 1.3) / np.tanh(1.3)
    x = x / (np.max(np.abs(x)) + 1e-9) * target
    return x


def export(name, x):
    os.makedirs(OUT, exist_ok=True)
    wav = os.path.join(OUT, name + '.raw')
    pcm = (np.clip(x.T, -1, 1) * 32767).astype('<i2')
    pcm.tofile(wav)
    mp3 = os.path.join(OUT, name + '.mp3')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 's16le', '-ar', str(SR), '-ac', '2',
                    '-i', wav, '-c:a', 'libmp3lame', '-b:a', '112k', mp3], check=True)
    os.remove(wav)
    print(name, f'{x.shape[1] / SR:.1f}s', os.path.getsize(mp3) // 1024, 'KB')


def mix(lp_, buses, wet):
    L = lp_.L
    dry = np.zeros((2, L))
    send = np.zeros((2, L))
    for k, g in buses.items():
        if k in lp_.bus:
            dry += lp_.bus[k] * g
            send += lp_.bus[k] * g * wet.get(k, 0.0)
    return dry, send


# =============== ТРЕК 1: Зал ожидания (лобби/ротонда) ===============

def track_lobby():
    bpm = 72
    beat = 60 / bpm
    bar = beat * 4
    bars = 32
    lo = Loop(bar * bars)
    prog = [
        ([57, 61, 64, 68, 71], 33), ([56, 59, 63, 66, 70], 32), ([54, 57, 61, 64, 68], 30), ([59, 64, 66, 69], 35),
        ([57, 61, 64, 68, 71], 33), ([56, 59, 63, 66, 70], 32), ([56, 61, 64, 68, 71], 37), ([59, 64, 66, 69], 35),
    ]
    melody = [
        [(0, 80), (0.75, 76), (1.5, 73), (2, 71), (3, 76)],
        [(0, 75), (1, 78), (1.5, 71), (2.5, 75), (3.5, 78)],
        [(0, 80), (0.5, 78), (1, 76), (2, 73), (3, 69)],
        [(0, 71), (1, 76), (2, 78), (2.5, 81), (3, 83)],
        [(0, 85), (1, 83), (1.5, 80), (2, 76), (3, 80)],
        [(0, 78), (1, 75), (2, 71), (3, 75)],
        [(0, 76), (0.5, 80), (1, 83), (2, 87), (3, 85)],
        [(0, 83), (2, 78), (3, 76)],
    ]
    arp = [0, 2, 1, 3, 2, 4, 3, 1]
    for b in range(bars):
        ch, root = prog[b % 8]
        t0 = b * bar
        for i, m in enumerate(ch):
            lo.add('pad', t0, pad(m, bar, bright=1100 + 300 * (b // 8 % 2)), pan=(i / (len(ch) - 1) - 0.5) * 0.8, gain=0.22)
        if b >= 4:
            lo.add('bass', t0, bass(root + 12, bar * 0.9), gain=0.5)
        if 8 <= b < 16 or b >= 24:
            for bt, m in melody[b % 8]:
                lo.add('box', t0 + bt * beat, musicbox(m, 0.9), pan=0.25 * np.sin(bt + b), gain=0.8)
        if b >= 16:
            for k in range(8):
                m = ch[arp[k] % len(ch)] + 12
                lo.add('ep', t0 + k * beat / 2, epiano(m, beat / 2, 0.55 + 0.2 * (k % 2 == 0)), pan=0.4 * np.sin(k * 0.8), gain=0.5)
        for k in range(8):
            lo.add('shk', t0 + k * beat / 2 + (0.04 if k % 2 else 0), shaker(0.6 if k % 2 else 1.0), pan=0.3, gain=1.0 if b >= 8 else 0.0)
    dry, send = mix(lo, {'pad': 1, 'bass': 1, 'box': 1, 'ep': 1, 'shk': 1},
                    {'pad': 0.5, 'box': 0.8, 'ep': 0.6, 'shk': 0.2, 'bass': 0.05})
    out = dry + reverb(send, 3.5) * 0.9
    out = tape(out) + vinyl(lo.L)
    export('lobby', master(out))


# =============== ТРЕК 2: Канамори (lo-fi hip-hop) ===============

def track_sayaka():
    bpm = 84
    beat = 60 / bpm
    bar = beat * 4
    bars = 32
    sw = 0.17 * beat  # свинг
    lo = Loop(bar * bars)
    A = [([53, 57, 60, 64], 38), ([53, 57, 59, 64], 31), ([52, 55, 59, 62], 36), ([55, 59, 60, 64], 33)]
    B = [([57, 60, 64, 67], 41), ([55, 59, 62, 66], 40), ([53, 57, 60, 64], 38), ([55, 60, 62, 65], 31)]
    melA = [
        [(0, 69), (0.5, 72), (1, 74), (2, 76), (3, 74)],
        [(0, 77), (1, 76), (1.5, 74), (2, 71), (3.5, 74)],
        [(0, 76), (1, 79), (2, 83), (3, 81)],
        [(0, 79), (1, 76), (2, 72), (2.5, 71), (3, 69)],
    ]
    melB = [
        [(0, 72), (0.5, 76), (1, 79), (2, 81), (3, 84)],
        [(0, 83), (1, 79), (2, 78), (3, 76)],
        [(0, 77), (1, 76), (1.5, 74), (2, 72), (3, 69)],
        [(0, 72), (1, 74), (2, 77), (3, 79)],
    ]
    def st(x):  # свинг для восьмых
        return x * beat + (sw if (x * 2) % 2 == 1 else 0)
    for b in range(bars):
        sec = (b // 8) % 2
        ch, root = (A if sec == 0 else B)[b % 4]
        t0 = b * bar
        for m in ch:
            lo.add('ep', t0, epiano(m, beat * 2.2, 0.8), pan=(m - 58) / 20, gain=0.55)
            lo.add('ep', t0 + st(2.5), epiano(m, beat * 0.9, 0.5), pan=(m - 58) / 20, gain=0.4)
            lo.add('pad', t0, pad(m + 12, bar, bright=900), gain=0.06)
        lo.add('bass', t0, bass(root, beat * 1.5), gain=0.75)
        lo.add('bass', t0 + st(2.5), bass(root + (7 if b % 2 else 12), beat * 0.8), gain=0.6)
        if b >= 2:
            for x in (0, 2.5) if b % 4 != 3 else (0, 1.5, 2.5):
                lo.add('drm', t0 + st(x), kick(), gain=0.9)
            for x in (1, 3):
                lo.add('drm', t0 + st(x), snare(), pan=0.05, gain=0.8)
            for k in range(8):
                lo.add('drm', t0 + st(k / 2), hat(0.9 if k % 2 == 0 else 0.55), pan=-0.25, gain=1)
        if b >= 16:
            mel = (melA if sec == 0 else melB)[b % 4]
            for x, m in mel:
                lo.add('vib', t0 + st(x), vibes(m, 0.9), pan=0.2, gain=0.85)
    dry, send = mix(lo, {'ep': 1, 'pad': 1, 'bass': 1, 'drm': 1, 'vib': 1},
                    {'ep': 0.35, 'pad': 0.5, 'drm': 0.12, 'vib': 0.55})
    out = dry + reverb(send, 2.2, damp=4000) * 0.8
    out = lp(out, 7500)
    out = tape(out, wow=0.0022) + vinyl(lo.L, level=0.008, crackle=0.03, seed=11)
    export('sayaka', master(out, lowpass=9000))


# =============== ТРЕК 3: Кара (ночной чиптюн/синтвейв) ===============

def track_kara():
    bpm = 100
    beat = 60 / bpm
    bar = beat * 4
    bars = 32
    lo = Loop(bar * bars)
    A = [([57, 60, 64], 33), ([57, 60, 65], 29), ([55, 60, 64], 36), ([55, 59, 62], 31)]
    B = [([57, 62, 65], 38), ([57, 60, 64], 33), ([58, 62, 65, 69], 34), ([56, 59, 64], 40)]
    melA = [
        [(0, 76, 0.75), (0.75, 74, 0.75), (1.5, 72, 0.5), (2, 69, 1), (3, 72, 0.5), (3.5, 74, 0.5)],
        [(0, 72, 1), (1, 69, 1), (2, 72, 0.5), (2.5, 74, 0.5), (3, 76, 1)],
        [(0, 79, 1), (1, 76, 0.5), (1.5, 74, 0.5), (2, 72, 1), (3, 74, 1)],
        [(0, 74, 1), (1, 71, 1), (2, 67, 1), (3, 71, 0.5), (3.5, 74, 0.5)],
    ]
    melB = [
        [(0, 77, 1), (1, 76, 0.5), (1.5, 74, 0.5), (2, 72, 1), (3, 74, 1)],
        [(0, 76, 1), (1, 72, 1), (2, 69, 1), (3, 72, 1)],
        [(0, 74, 1), (1, 77, 1), (2, 81, 1), (3, 79, 1)],
        [(0, 80, 1.5), (1.5, 76, 0.5), (2, 71, 1), (3, 68, 1)],
    ]
    for b in range(bars):
        sec = (b // 8) % 2
        ch, root = (A if sec == 0 else B)[b % 4]
        t0 = b * bar
        for i, m in enumerate(ch):
            lo.add('pad', t0, pad(m, bar, bright=1600, detune=0.18), pan=(i - 1) * 0.5, gain=0.18)
        # арпеджио 16-ми, чиповый пульс
        tones = sorted(ch) + [ch[0] + 12]
        pat = [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 0, 2, 1, 3]
        for k in range(16):
            m = tones[pat[k] % len(tones)] + 12
            lo.add('arp', t0 + k * beat / 4, pulse(m, beat / 4 * 0.8, width=0.125, vel=0.6, cutoff=2200, vib=False),
                   pan=0.35 if k % 2 else -0.35, gain=0.55 if b >= 2 else 0.25)
        for k in range(8):
            lo.add('bass', t0 + k * beat / 2, bass(root + (12 if k % 2 else 0), beat / 2 * 0.8, 0.9), gain=0.55)
        if b >= 4:
            for x in (0, 2):
                lo.add('drm', t0 + x * beat, kick(0.9), gain=0.8)
            for x in (1, 3):
                lo.add('drm', t0 + x * beat, snare(0.9), gain=0.75)
            for k in range(8):
                lo.add('drm', t0 + k * beat / 2, hat(0.8 if k % 2 else 0.4, 0.03), pan=0.2, gain=1)
        if 8 <= b < 16 or b >= 24:
            for x, m, d in (melA if sec == 0 else melB)[b % 4]:
                lo.add('lead', t0 + x * beat, pulse(m, d * beat * 0.9, width=0.25, vel=0.9, cutoff=3200), gain=0.75)
    dry, send = mix(lo, {'pad': 1, 'arp': 1, 'bass': 1, 'drm': 1, 'lead': 1},
                    {'pad': 0.5, 'arp': 0.45, 'drm': 0.25, 'lead': 0.5})
    out = dry + reverb(send, 2.6, damp=6000) * 0.85
    out = tape(out, wow=0.0012) + vinyl(lo.L, level=0.004, crackle=0.01, seed=5)
    export('kara', master(out, lowpass=12000))


# =============== ТРЕК 4: Подсобка (лиминальный эмбиент) ===============

def track_service():
    bpm = 60
    beat = 1.0
    bar = 4.0
    bars = 16
    lo = Loop(bar * bars)
    L = lo.L
    t = np.arange(L) / SR
    dur = L / SR
    # гул вентиляции
    air = lp(hp(rng.standard_normal(L), 80), 600) * (0.6 + 0.4 * np.sin(2 * np.pi * (round(0.07 * dur) / dur) * t))
    # «лампа»: 100 Гц + обертоны, тихо
    hum = sum(np.sin(2 * np.pi * 100 * k * t) / k ** 1.5 for k in range(1, 6)) * 0.03
    lo.add('amb', 0, air * 0.25 + hum)
    chords = [[48, 55, 59, 64], [44, 51, 55, 60]]
    for b in range(0, bars, 4):
        ch = chords[(b // 4) % 2]
        for m in ch:
            lo.add('pad', b * bar, pad(m, bar * 4, bright=700, detune=0.25), pan=(m - 55) / 15, gain=0.22)
    notes = [76, 79, 83, 84, 72, 71, 79, 76, 88, 83]
    r = np.random.default_rng(42)
    for i in range(22):
        tt = r.uniform(0, bar * bars)
        lo.add('box', tt, musicbox(notes[i % len(notes)], 0.7, detune_cents=-35), pan=r.uniform(-0.8, 0.8), gain=0.6)
    dry, send = mix(lo, {'amb': 1, 'pad': 1, 'box': 0.5}, {'pad': 0.7, 'box': 1.5, 'amb': 0.1})
    out = dry + reverb(send, 5.0, damp=3000, predelay=0.06) * 1.0
    out = tape(out, wow=0.003, flutter=0.0004)
    export('service', master(out, target=0.75, lowpass=8000))


# =============== ТРЕК 5: Зал ожидания (сюрреалистичная лифтовая босанова) ===============

def whistle(m0, m1, dur, vel=1.0):
    """Свистящий лид с глиссандо — немного не от мира сего."""
    n = int(dur * SR)
    e = env(n, 0.03, 0.1, 0.8, 0.12)
    t = np.arange(len(e)) / SR
    glide = np.clip(t / 0.12, 0, 1)
    f = mtof(m0) * (1 - glide) + mtof(m1) * glide
    f = f * (1 + 0.006 * np.sin(2 * np.pi * 6 * t))
    ph = np.cumsum(f) / SR
    s = np.sin(2 * np.pi * ph) + 0.08 * np.sin(4 * np.pi * ph)
    s += lp(rng.standard_normal(len(e)), 3000) * 0.015
    return s * e * 0.22 * vel


def woodblock(vel=1.0, f=900):
    n = int(0.08 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * f * t) * np.exp(-t / 0.015) * 0.25 * vel


def track_dream():
    bpm = 112
    beat = 60 / bpm
    bar = beat * 4
    bars = 32
    lo = Loop(bar * bars)
    prog = [([53, 57, 60, 64], 41), ([52, 55, 59, 62], 40), ([51, 55, 58, 62], 39), ([50, 53, 57, 60], 38),
            ([55, 58, 62, 65], 43), ([54, 57, 61, 64], 42), ([53, 56, 60, 63], 37), ([55, 59, 62, 65], 43)]
    mel = [
        [(0, 76, 76, 1.5), (1.5, 74, 72, 0.5), (2, 72, 72, 1), (3, 69, 71, 1)],
        [(0, 71, 71, 1), (1, 74, 74, 0.5), (1.5, 76, 79, 1.5), (3, 74, 74, 1)],
        [(0, 70, 70, 1.5), (1.5, 74, 74, 0.5), (2, 77, 75, 2)],
        [(0, 72, 72, 1), (1, 69, 69, 1), (2, 65, 67, 2)],
        [(0, 74, 74, 1), (1, 77, 77, 0.5), (1.5, 81, 81, 1.5), (3, 79, 79, 1)],
        [(0, 76, 76, 1.5), (1.5, 73, 73, 0.5), (2, 69, 69, 2)],
        [(0, 75, 72, 1), (1, 72, 72, 1), (2, 68, 68, 1), (3, 72, 72, 1)],
        [(0, 74, 74, 2), (2, 71, 71, 1), (3, 67, 69, 1)],
    ]
    # босанова: «клаве» для аккордов
    comp = [0, 1.5, 3.0, 5.0, 6.5]
    for b in range(bars):
        ch, root = prog[b % 8]
        t0 = b * bar
        for x in [c for c in comp if (c < 4) == (b % 2 == 0)]:
            xx = x if b % 2 == 0 else x - 4
            for m in ch:
                lo.add('ep', t0 + xx * beat, epiano(m + 12 * (m < 55), beat * 0.9, 0.6), pan=(m - 58) / 18, gain=0.45)
        lo.add('bass', t0, bass(root, beat * 1.4), gain=0.7)
        lo.add('bass', t0 + 1.5 * beat, bass(root + 7, beat * 0.5), gain=0.5)
        lo.add('bass', t0 + 2 * beat, bass(root + 7, beat * 1.4), gain=0.65)
        lo.add('bass', t0 + 3.5 * beat, bass(root, beat * 0.5), gain=0.5)
        if b >= 2:
            for k in range(16):
                lo.add('perc', t0 + k * beat / 4, shaker(0.9 if k % 4 == 2 else 0.5), pan=0.4, gain=0.9)
            for x in (0, 1.5, 3, 6.5 / 2 + 0.25):
                lo.add('perc', t0 + x * beat, woodblock(0.8, 850 if x else 1100), pan=-0.3, gain=0.8)
            for x in (0, 2):
                lo.add('perc', t0 + x * beat, kick(0.5), gain=0.5)
        if 8 <= b < 24:
            for x, m0, m1, d in mel[b % 8]:
                lo.add('lead', t0 + x * beat, whistle(m0 - 1, m1, d * beat * 0.95), pan=0.15, gain=0.9)
        if b >= 24:
            for x, m0, m1, d in mel[b % 8]:
                lo.add('box', t0 + x * beat, musicbox(m1 + 12, 0.6, detune_cents=-20), pan=-0.3, gain=0.6)
    dry, send = mix(lo, {'ep': 1, 'bass': 1, 'perc': 1, 'lead': 1, 'box': 1}, {'ep': 0.4, 'lead': 0.5, 'perc': 0.15, 'box': 0.9})
    out = dry + reverb(send, 2.4, damp=5000) * 0.8
    out = tape(out, wow=0.0035, flutter=0.0005) + vinyl(lo.L, level=0.005, crackle=0.015, seed=21)
    export('dream', master(out, lowpass=10000))


if __name__ == '__main__':
    import sys
    only = sys.argv[1:]
    for name, fn in [('lobby', track_lobby), ('sayaka', track_sayaka), ('kara', track_kara), ('service', track_service), ('dream', track_dream)]:
        if not only or name in only:
            fn()
