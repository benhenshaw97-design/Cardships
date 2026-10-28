"""Turn the sound uploads in assets/audio/source/ into game files.

One-shots (assets/audio/sfx/) replace the synthesised effect of the same
name in js/audio.js. Ambience beds (assets/audio/ambience/) loop quietly
under each sky; their ends are cross-faded so the loop has no seam.

    python3 tools/build_audio.py      (needs ffmpeg)
"""
import os
import subprocess
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets/audio/source')
RATE = 44100
# name: (source, start s, length s, fade-out s)
SFX = {
    'cannon': ('mixkit-game-gun-shot-1662.mp3', 0.0, 1.1, 0.5),
    'explode': ('mixkit-war-explosions-2773.wav', 0.0, 2.2, 0.8),
    'bigHit': ('mixkit-shatter-shot-explosion-1693.wav', 0.0, 1.6, 0.6),
    'flame': ('mixkit-fireball-spell-1347.wav', 0.0, 1.4, 0.5),
    'spell': ('mixkit-wizard-fire-woosh-1326.wav', 0.0, 1.09, 0.3),
    'splat': ('mixkit-juicy-insect-fast-squish-324.wav', 0.0, 0.8, 0.3),
    'whoosh': ('mixkit-dark-storm-wind-2413.wav', 0.0, 1.6, 0.8),
}
# name: (source, start s, length s, cross-fade s)
AMBIENCE = {
    'rain': ('mixkit-bad-weather-heavy-rain-and-thunder-1261.wav', 0.0, 25.0, 3.0),
    'wind': ('mixkit-wind-blowing-ambience-2658.wav', 2.0, 40.0, 4.0),
    'birds': ('mixkit-little-birds-singing-in-the-trees-17.wav', 0.0, 8.3, 1.5),
    'voices': ('mixkit-psychedelic-fantasy-voices-295.wav', 0.0, 32.0, 4.0),
    'bloodstorm': ('mixkit-evil-storm-atmosphere-2404.wav', 5.0, 45.0, 4.0),
    'roomtone': ('mixkit-dark-cinematic-room-tone-3081.wav', 2.0, 40.0, 4.0),
}


def load(src, start, length):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(start), '-t', str(length), '-i', os.path.join(SRC, src),
                          '-ac', '1', '-ar', str(RATE), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def save(x, path, peak):
    x = x / max(1e-6, np.abs(x).max()) * peak
    os.makedirs(os.path.dirname(path), exist_ok=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(RATE), '-ac', '1', '-i', '-',
                    '-c:a', 'libmp3lame', '-b:a', '80k', path], input=x.astype(np.float32).tobytes(), check=True)
    print('wrote', os.path.relpath(path, ROOT))


def main():
    for name, (src, start, length, fade) in SFX.items():
        x = load(src, start, length)
        n = int(fade * RATE)
        x[-n:] *= np.linspace(1, 0, n) ** 2
        x[:64] *= np.linspace(0, 1, 64)
        save(x, os.path.join(ROOT, 'assets/audio/sfx', name + '.mp3'), 0.9)
    for name, (src, start, length, xf) in AMBIENCE.items():
        x = load(src, start, length + xf)
        n = int(xf * RATE)
        # Fade the extra tail into the head: playing the result on loop has no seam.
        body, tail = x[:-n].copy(), x[-n:]
        k = np.linspace(0, 1, n)
        body[:n] = body[:n] * np.sqrt(k) + tail * np.sqrt(1 - k)
        save(body, os.path.join(ROOT, 'assets/audio/ambience', name + '.mp3'), 0.8)


if __name__ == '__main__':
    main()
