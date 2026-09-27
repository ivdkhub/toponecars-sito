# -*- coding: utf-8 -*-
"""
Prepara i video della pagina "Contenuti" (l'iPhone nella card dedicata).

Sorgenti: tutti gli .mp4 in video-sezione-contenuti/. Per ciascuno produce in
assets/media/contenuti/:

  <nome>.av1.mp4    1080x1920  AV1   il formato servito quasi a tutti
  <nome>.hevc.mp4   1080x1920  HEVC  Safari e iOS
  <nome>.h264.mp4   1080x1920  H.264 rete di sicurezza: e' il file originale
  <nome>.webp       primo fotogramma, mostrato finche' il video non parte

Risoluzione piena su tutte e tre: lo schermo del telefono e' piccolo, ma su un
monitor 4K arriva a oltre 500 pixel reali di larghezza, e la regola del
progetto e' non ridurre cio' che si serve su schermi grandi. L'audio e' copiato
cosi' com'e' (HE-AAC), senza ricodificarlo: il telefono ha il pulsante per
attivarlo.

A differenza delle clip delle scene, qui il sorgente e' GIA' compresso (circa
1,5 Mbit/s, come esce da un telefono o da Instagram). Ricodificarlo alla
qualita' delle clip lo gonfiava senza aggiungere nulla (misurato su
iprodotticheusiamo, 8,95 MB: AV1 CRF 24 14,4 MB, HEVC CRF 24 9,5 MB, H.264 CRF
20 17 MB). Quindi:
  - H.264 non si ricodifica: e' l'originale, solo riordinato con faststart
    perche' parta prima di essere scaricato tutto;
  - HEVC e AV1 usano il CRF che resta alla stessa somiglianza con l'originale
    (SSIM ~0,99, la soglia che il progetto gia' considera "stessa resa", vedi
    build-media.py) pesando meno: HEVC CRF 26 -> 6,6 MB, SSIM 0,9906;
    AV1 CRF 36 -> 5,1 MB, SSIM 0,9909.

Stampa anche assets/js/contenuti-data.js con l'elenco dei video, cosi' la
pagina sa quali file esistono senza doverli cercare.

Idempotente: rigenera solo cio' che manca o e' piu' vecchio del sorgente.
"""
import hashlib
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "video-sezione-contenuti")
OUT = os.path.join(ROOT, "assets", "media", "contenuti")
DATA = os.path.join(ROOT, "assets", "js", "contenuti-data.js")

COMMON = ["-pix_fmt", "yuv420p", "-movflags", "+faststart", "-g", "60", "-c:a", "copy"]

# Ogni sorgente e' compresso a modo suo: il CRF che va bene per uno (1080p a
# 1,5 Mbit/s) su un altro (720p a 2 Mbit/s) scendeva a SSIM 0,979. Quindi il CRF
# non e' fisso: si parte dal primo della lista e si scende finche' la resa non
# arriva alla soglia. Se prima di arrivarci il file pesa gia' quanto il
# sorgente, la codifica non serve a niente e quel formato non si pubblica: il
# browser ripiega sull'originale H.264.
SOGLIA_SSIM = 0.9895

# (suffisso, lista di CRF da provare in ordine, argomenti con {crf}).
# None come argomenti = nessuna ricodifica: il file originale, rimesso in un
# contenitore con faststart.
VARIANTS = [
    ("av1", [36, 32, 28, 24],
     ["-c:v", "libaom-av1", "-crf", "{crf}", "-b:v", "0",
      "-cpu-used", "6", "-row-mt", "1", "-tiles", "1x2"]),
    ("hevc", [26, 23, 20],
     ["-c:v", "libx265", "-crf", "{crf}", "-preset", "medium", "-tag:v", "hvc1"]),
    ("h264", None, None),
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
        sys.exit("ffmpeg fallito (codice %d):\n%s\n%s" % (p.returncode, " ".join(args), p.stderr))


def stale(dst, src):
    return not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(src)


def titolo(nome):
    """Il nome del file come titolo leggibile, se non c'e' di meglio. Solo la
    prima lettera diventa maiuscola: le altre restano come sono ("RS6"). Il
    titolo vero si corregge in contenuti-data.js, e la rigenerazione lo tiene."""
    t = nome.replace("-", " ").replace("_", " ").strip()
    return t[:1].upper() + t[1:]


def slug(nome):
    """Nome di file sicuro negli indirizzi web: minuscole, cifre e trattini.
    "Anche tu hai una RS6 (domanda)" -> "anche-tu-hai-una-rs6-domanda"."""
    import re
    import unicodedata
    s = unicodedata.normalize("NFKD", nome).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def ssim(a, b):
    """SSIM medio di a rispetto a b, calcolato da ffmpeg."""
    p = subprocess.run([FFMPEG, "-hide_banner", "-i", a, "-i", b, "-lavfi", "ssim", "-f", "null", "-"],
                       capture_output=True, text=True)
    for riga in p.stderr.splitlines():
        if "All:" in riga:
            return float(riga.split("All:")[1].split()[0])
    return None


def main():
    os.makedirs(OUT, exist_ok=True)
    video = sorted(f for f in os.listdir(SRC) if f.lower().endswith(".mp4"))
    if not video:
        sys.exit("Nessun .mp4 in " + SRC)

    elenco = []
    for f in video:
        src = os.path.join(SRC, f)
        leggibile = os.path.splitext(f)[0]
        nome = slug(leggibile)
        peso_src = os.path.getsize(src)
        for suff, crfs, args in VARIANTS:
            dst = os.path.join(OUT, "%s.%s.mp4" % (nome, suff))
            scartato = dst + ".scartato"
            if not stale(dst, src) or not stale(scartato, src):
                continue
            print("  codifica %s -> %s" % (f, os.path.relpath(dst, ROOT)), flush=True)
            if args is None:
                run(["-i", src, "-c", "copy", "-movflags", "+faststart", dst])
                continue
            # La regola del progetto: la ricodifica deve pesare meno E restare
            # alla stessa resa. Qui si misura, non si presume.
            riuscito = False
            for crf in crfs:
                run(["-i", src] + COMMON + [a.replace("{crf}", str(crf)) for a in args] + [dst])
                q = ssim(dst, src)
                peso = os.path.getsize(dst)
                print("    %s CRF %d: %.2f MB (%.0f%% del sorgente), SSIM %s" % (
                    suff, crf, peso / 1e6, 100 * peso / peso_src, "%.4f" % q if q else "?"), flush=True)
                if peso >= peso_src:
                    break
                if q is not None and q >= SOGLIA_SSIM:
                    riuscito = True
                    break
            if not riuscito:
                # Nessun CRF arriva alla soglia pesando meno del sorgente: il
                # formato non si pubblica. Il segnaposto evita di riprovarci a
                # ogni esecuzione finche' il sorgente non cambia.
                os.remove(dst)
                open(scartato, "w").close()
                print("    %s non pubblicato: non batte l'originale" % suff, flush=True)
        poster = os.path.join(OUT, nome + ".webp")
        if stale(poster, src):
            run(["-i", src, "-frames:v", "1", "-c:v", "libwebp", "-quality", "90", poster])
        formati = [s for s, _, _ in VARIANTS if os.path.exists(os.path.join(OUT, "%s.%s.mp4" % (nome, s)))]
        print("%s  sorgente %.2f MB  ->  %s" % (f, peso_src / 1e6, "  ".join(
            "%s %.2f MB" % (s, os.path.getsize(os.path.join(OUT, "%s.%s.mp4" % (nome, s))) / 1e6)
            for s in formati)))
        # Impronta dei file pubblicati (nome e peso): va negli indirizzi, perche'
        # i media sono in cache per un anno (vercel.json) e un video sostituito
        # deve avere un indirizzo nuovo.
        pubblicati = sorted(x for x in os.listdir(OUT) if x.startswith(nome + ".") and not x.endswith(".scartato"))
        firma = "|".join("%s:%d" % (x, os.path.getsize(os.path.join(OUT, x))) for x in pubblicati)
        v = hashlib.sha1(firma.encode("utf-8")).hexdigest()[:8]
        elenco.append({"id": nome, "titolo": titolo(leggibile), "v": v, "formati": formati})

    # I titoli gia' scritti a mano in contenuti-data.js si conservano.
    vecchi = {}
    if os.path.exists(DATA):
        testo = open(DATA, encoding="utf-8").read()
        inizio = testo.find("[")
        try:
            for v in json.loads(testo[inizio:testo.rfind("]") + 1]):
                vecchi[v["id"]] = v
        except Exception:
            pass
    # Si conservano solo i campi scritti a mano (il titolo): i formati sono
    # quelli appena verificati sul disco.
    elenco = [dict(v, **{k: vecchi[v["id"]][k] for k in vecchi.get(v["id"], {}) if k == "titolo"})
              for v in elenco]

    with open(DATA, "w", encoding="utf-8") as fh:
        fh.write("// FILE GENERATO da tools/build-contenuti.py a partire da video-sezione-contenuti/.\n"
                 "// I titoli si possono correggere a mano: la rigenerazione li conserva.\n"
                 "export const VIDEO_CONTENUTI = ")
        fh.write(json.dumps(elenco, ensure_ascii=False, indent=2))
        fh.write(";\n")
    print("%d video -> %s" % (len(elenco), os.path.relpath(DATA, ROOT)))


if __name__ == "__main__":
    main()
