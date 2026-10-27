import json, sys, wave
import numpy as np
SR = 44100
log = json.load(open(sys.argv[1])); out = sys.argv[2]; music = sys.argv[3] == '1'
N = int(log['frames'] / 30 * SR) + SR
buf = np.zeros(N)
rng = np.random.default_rng(1)
def add(t, sig, gain=1.0):
    i = int(t * SR)
    if i >= N: return
    j = min(N, i + len(sig)); buf[i:j] += sig[: j - i] * gain
def env(n, a=0.004, d=0.2):
    t = np.arange(n) / SR
    return np.minimum(1, t / a) * np.exp(-t / d)
def tone(f, dur, d=0.15, harm=(1, .35, .12)):
    t = np.arange(int(dur * SR)) / SR
    s = sum(h * np.sin(2 * np.pi * f * (k + 1) * t) for k, h in enumerate(harm))
    return s * env(len(t), d=d)
def noise(dur, d=0.05):
    n = int(dur * SR); return rng.standard_normal(n) * env(n, a=0.001, d=d)
def swap():
    s = noise(0.05, 0.012); return np.convolve(s, np.ones(6) / 6, 'same') * 0.5 + tone(1400, 0.05, 0.01, (1,)) * 0.15
def over(a, b, off=0.0, g=1.0):
    i = int(off * SR); n = max(len(a), i + len(b))
    out = np.zeros(n); out[: len(a)] += a; out[i : i + len(b)] += b * g
    return out
def pop(chain, size, ros, gold):
    base = 523.25 * 2 ** ((min(chain, 9) - 1) * 2 / 12)
    s = over(tone(base, 0.45, 0.16), tone(base * 1.5, 0.45, 0.12), 0, 0.4)
    if size >= 5: s = over(s, tone(base * 2, 0.5, 0.2), 0, 0.3)
    if ros or gold:
        for k, m in enumerate([1, 1.26, 1.5, 2]): s = over(s, tone(base * m, 0.45, 0.2), k * 0.06, 0.5)
    return s * 0.35
def whoosh():
    n = int(0.3 * SR); s = rng.standard_normal(n)
    out = np.zeros(n); a = 0.0
    for i in range(n):
        k = 0.02 + 0.25 * (i / n); a += k * (s[i] - a); out[i] = a
    return out * np.sin(np.pi * np.arange(n) / n) * 0.9
def impact():
    t = np.arange(int(0.6 * SR)) / SR
    f = 110 * np.exp(-t * 6) + 40
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 5)
    n = noise(0.25, 0.06) * 0.35
    s = s * 0.9
    s[: len(n)] += n
    return s
def tick(): return tone(1800, 0.06, 0.012, (1,)) * 0.4
def ding(): return (tone(1046.5, 1.2, 0.5) + tone(1568, 1.2, 0.4) * 0.5) * 0.35
def kick():
    t = np.arange(int(0.25 * SR)) / SR; f = 150 * np.exp(-t * 30) + 45
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 12)
def hat(): return np.convolve(noise(0.04, 0.008), [1, -1], 'same') * 0.4
for e in [x for x in log['log'] if isinstance(x.get('f'), int)]:
    t = e['f'] / 30
    if e['k'] == 'swap': add(t, swap(), 0.8)
    elif e['k'] == 'clear': add(t, pop(e['chain'], e['size'], e.get('ros', 0), e.get('gold', False)))
sounds = {'whoosh': whoosh, 'impact': impact, 'tick': tick, 'ding': ding}
for m in log['marks']:
    if m['k'] in sounds: add(m['f'] / 30, sounds[m['k']](), m.get('g', 1.0))
if music:
    bpm = 118; beat = 60 / bpm
    on = [(m['f'] / 30, m['k']) for m in log['marks'] if m['k'] in ('music-off', 'music-on')]
    def playing(t):
        st = True
        for tt, k in on:
            if tt <= t: st = (k == 'music-on')
        return st
    i = 0; dur = log['frames'] / 30
    while i * beat / 2 < dur:
        t = i * beat / 2
        if playing(t):
            if i % 2 == 0: add(t, kick(), 0.33)
            else: add(t, hat(), 0.18)
            if i % 8 == 4: add(t, noise(0.12, 0.05) * 0.5, 0.25)
        i += 1
peak = np.max(np.abs(buf)) or 1
buf = np.tanh(buf / peak * 1.4) * 0.85
s16 = (buf * 32767).astype(np.int16)
with wave.open(out, 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(s16.tobytes())
