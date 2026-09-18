# -*- coding: utf-8 -*-
"""
Prepara i media per la landing page.

Per ogni video sorgente produce la stessa clip in piu' codifiche, avanti e
riavvolta, sotto assets/media/<variante>/:

  av1/      1928x1072  AV1      qualita' piena, il formato servito quasi a tutti
  av1-sd/   1280x712   AV1      schermi piccoli
  hevc/     1928x1072  HEVC     Safari e iOS, che non decodificano AV1 senza
  hevc-sd/  1280x712   HEVC     hardware recente
  h264-sd/  1280x712   H.264    rete di sicurezza per browser senza AV1 ne' HEVC

Piu' due file serviti direttamente:
  assets/media/poster.webp   primo fotogramma della scena 0 (l'unico poster che
                             si vede davvero: lo stato di riposo delle altre
                             scene e' un fotogramma video in pausa, non un'immagine)
  assets/media/logo.webp     lo stesso logo, senza il peso del PNG

e i fotogrammi di riposo in tools/frames/poster-K.png, che NON vengono serviti:
li leggono soltanto align-mockups.py e check-reference.py.

Perche' AV1: a parita' di SSIM misurato sul materiale di questo progetto pesa
circa un quarto dell'H.264 CRF 16 usato in origine (t1: 5,45 MB -> 1,24 MB con
SSIM 0,9916 contro 0,9911 dell'H.264 CRF 20). Non e' un compromesso sulla
qualita': e' lo stesso fotogramma con un codec migliore.

Stampa inoltre le metriche delle giunzioni fra clip consecutive: il materiale
sorgente NON combacia fotogramma per fotogramma e il difetto va documentato.

Idempotente: rigenera solo cio' che manca o e' piu' vecchio del sorgente.
"""
import json
import os
import subprocess
import sys

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "video")
OUT = os.path.join(ROOT, "assets", "media")
FRAMES = os.path.join(ROOT, "tools", "frames")
CLIPS = ["1", "2", "3", "4", "5"]

# GOP di 24 (un fotogramma chiave al secondo) e rilevamento dei cambi di scena
# riattivato. Il GOP di 12 forzato della prima versione serviva allo scrubbing
# manuale del currentTime, che pero' e' un percorso di emergenza: con i file
# riavvolti presenti si imbocca solo se il browser respinge play(). Un secondo
# di GOP tiene il seek abbastanza preciso e restituisce circa il 10% del peso.
GOP = ["-g", "24", "-keyint_min", "12"]
COMMON = ["-an", "-pix_fmt", "yuv420p", "-movflags", "+faststart"] + GOP

# Le varianti, in ordine di preferenza: la prima che il browser sa decodificare
# e' quella che verra' servita (vedi assets/js/config.js).
VARIANTS = [
    {
        "dir": "av1",
        "scale": None,
        "args": ["-c:v", "libaom-av1", "-crf", "24", "-b:v", "0",
                 "-cpu-used", "6", "-row-mt", "1", "-tiles", "2x1"],
    },
    {
        "dir": "av1-sd",
        "scale": 1280,
        "args": ["-c:v", "libaom-av1", "-crf", "28", "-b:v", "0",
                 "-cpu-used", "7", "-row-mt", "1"],
    },
    {
        "dir": "hevc",
        "scale": None,
        "args": ["-c:v", "libx265", "-crf", "24", "-preset", "medium", "-tag:v", "hvc1"],
    },
    {
        "dir": "hevc-sd",
        "scale": 1280,
        "args": ["-c:v", "libx265", "-crf", "26", "-preset", "medium", "-tag:v", "hvc1"],
    },
    {
        "dir": "h264-sd",
        "scale": 1280,
        "args": ["-c:v", "libx264", "-crf", "23", "-preset", "slow"],
    },
]


def ffmpeg_exe():
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        pass
    from shutil import which
    exe = which("ffmpeg")
    if not exe:
        sys.exit("ffmpeg non disponibile: `pip install imageio-ffmpeg` oppure `winget install Gyan.FFmpeg`")
    return exe


FFMPEG = ffmpeg_exe()


def run(args):
    p = subprocess.run([FFMPEG, "-hide_banner", "-loglevel", "error", "-y"] + args,
                       capture_output=True, text=True)
    if p.returncode != 0:
        sys.exit("ffmpeg fallito (codice %d):\n%s\n%s\n%s"
                 % (p.returncode, " ".join(args), p.stdout, p.stderr))


def stale(dst, src):
    return not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(src)


def filtergraph(variant, reverse):
    """Catena di filtri: prima il riavvolgimento, poi l'eventuale riduzione."""
    steps = []
    if reverse:
        # -vf reverse tiene tutti i fotogrammi in RAM: ~300 MB per clip, accettabile.
        steps.append("reverse")
    if variant["scale"]:
        # -2 conserva il rapporto d'aspetto arrotondando a un numero pari, come
        # richiesto da yuv420p.
        steps.append("scale=%d:-2:flags=lanczos" % variant["scale"])
    return ",".join(steps)


def encode(src, dst, variant, reverse):
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    vf = filtergraph(variant, reverse)
    args = ["-i", src]
    if vf:
        args += ["-vf", vf]
    run(args + COMMON + variant["args"] + [dst])


def frames(path):
    cap = cv2.VideoCapture(path)
    out = []
    while True:
        ok, fr = cap.read()
        if not ok:
            break
        out.append(fr)
    cap.release()
    return out


def delta(a, b):
    d = np.abs(a.astype(np.int16) - b.astype(np.int16))
    return {
        "meanAbs": round(float(d.mean()), 3),
        "max": int(d.max()),
        "pctOver8": round(float((d.max(axis=2) > 8).mean()) * 100, 2),
    }


def main():
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(FRAMES, exist_ok=True)
    report = {"variants": [], "clips": [], "seams": [], "reverseSeams": []}

    for variant in VARIANTS:
        total = 0
        for n in CLIPS:
            src = os.path.join(SRC, n + ".mp4")
            for reverse in (False, True):
                name = "t%s.rev.mp4" % n if reverse else "t%s.mp4" % n
                dst = os.path.join(OUT, variant["dir"], name)
                if stale(dst, src):
                    print("encode", variant["dir"] + "/" + name, flush=True)
                    encode(src, dst, variant, reverse)
                total += os.path.getsize(dst)
        report["variants"].append({"dir": variant["dir"], "bytes": total})
        print("  %-8s %6.1f MB" % (variant["dir"], total / 1e6), flush=True)

    # Riferimento per le misure: la variante di qualita' piena.
    ref_dir = os.path.join(OUT, VARIANTS[0]["dir"])
    fwd_frames = {n: frames(os.path.join(ref_dir, "t%s.mp4" % n)) for n in CLIPS}

    # Fotogrammi di riposo. La scena 1 e' il primo fotogramma di t1; le scene 2..6
    # sono gli ultimi fotogrammi di t1..t5. Restano in tools/frames perche' li
    # leggono soltanto gli strumenti di verifica: nel sito si vede un solo poster.
    posters = [("poster-1.png", fwd_frames["1"][0])]
    for i, n in enumerate(CLIPS, start=2):
        posters.append(("poster-%d.png" % i, fwd_frames[n][-1]))
    for name, img in posters:
        cv2.imwrite(os.path.join(FRAMES, name), img, [cv2.IMWRITE_PNG_COMPRESSION, 9])
    print("scritti %d fotogrammi di riferimento in tools/frames/" % len(posters))

    # L'unico poster servito: quello della scena 0, in WebP. Era un PNG da 524 KB
    # e ne bastano una trentina.
    poster_web = os.path.join(OUT, "poster.webp")
    cv2.imwrite(poster_web, fwd_frames["1"][0], [cv2.IMWRITE_WEBP_QUALITY, 88])
    print("poster.webp", os.path.getsize(poster_web), "byte")

    # Il logo: stesso disegno, canale alfa conservato, un terzo del peso.
    logo_png = os.path.join(OUT, "logo.png")
    logo_web = os.path.join(OUT, "logo.webp")
    if os.path.exists(logo_png) and stale(logo_web, logo_png):
        run(["-i", logo_png, "-c:v", "libwebp", "-lossless", "1", logo_web])
        print("logo.webp", os.path.getsize(logo_web), "byte")

    for n in CLIPS:
        f = fwd_frames[n]
        cap = cv2.VideoCapture(os.path.join(ref_dir, "t%s.mp4" % n))
        fps = cap.get(cv2.CAP_PROP_FPS)
        cap.release()
        entry = {
            "clip": "t%s.mp4" % n, "frames": len(f), "fps": round(fps, 3),
            "w": f[0].shape[1], "h": f[0].shape[0],
            "duration": round(len(f) / fps, 3),
            "bytes": {},
        }
        for variant in VARIANTS:
            d = os.path.join(OUT, variant["dir"])
            entry["bytes"][variant["dir"]] = [
                os.path.getsize(os.path.join(d, "t%s.mp4" % n)),
                os.path.getsize(os.path.join(d, "t%s.rev.mp4" % n)),
            ]
        report["clips"].append(entry)

    # Cucitura "difettosa": ultimo fotogramma della clip N contro il primo della clip N+1.
    # E' la giunzione che l'utente percepirebbe come uno scatto.
    for a, b in zip(CLIPS, CLIPS[1:]):
        d = delta(fwd_frames[a][-1], fwd_frames[b][0])
        d.update({"from": "t%s.mp4 (ultimo)" % a, "to": "t%s.mp4 (primo)" % b})
        report["seams"].append(d)
        print("seam t%s->t%s" % (a, b), d)

    # Cucitura del reverse: il primo fotogramma di tN.rev DEVE coincidere con
    # l'ultimo di tN, altrimenti lo scroll all'indietro scatterebbe alla partenza.
    for n in CLIPS:
        r = frames(os.path.join(ref_dir, "t%s.rev.mp4" % n))
        d = delta(fwd_frames[n][-1], r[0])
        d.update({"pair": "t%s.mp4 (ultimo) vs t%s.rev.mp4 (primo)" % (n, n), "revFrames": len(r)})
        report["reverseSeams"].append(d)
        print("reverse seam t%s" % n, d)

    with open(os.path.join(ROOT, "tools", "media-report.json"), "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=2, ensure_ascii=False)
    print("\nscritto tools/media-report.json")


if __name__ == "__main__":
    main()
