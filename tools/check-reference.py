# -*- coding: utf-8 -*-
"""Verifica che i fotogrammi di riposo coincidano con le foto di riferimento.

Le due nuove scene non hanno un mockup di UI da copiare: hanno una foto che
mostra come devono apparire da ferme. La verifica sensata e' quindi un'altra —
controllare che l'ultimo fotogramma della clip sia davvero quell'immagine.

Le foto sono lo stesso fotogramma a risoluzione maggiore (2752x1536 contro
1928x1072), quindi la corrispondenza e' il semplice ridimensionamento. Si prova
comunque un piccolo assestamento, limitato a poche frazioni di percento di scala
e a pochi pixel di traslazione: senza quel limite la ricerca scappa via, perche'
gran parte dell'immagine e' giallo piatto e rimpicciolire la foto finche' resta
un colore solo abbassa il residuo pur non allineando niente (provato: arrivava a
scala 2,3 dichiarando un residuo migliore).
"""
import json
import os

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOOLS = os.path.join(ROOT, "tools")
# I fotogrammi di riposo NON stanno piu' fra i media serviti: nel sito si vede un
# solo poster, e sei PNG da un megabyte l'uno non avevano ragione di essere
# caricati sul sito. Li scrive tools/build-media.py qui accanto.
MEDIA = os.path.join(ROOT, "tools", "frames")
REF = os.path.join(ROOT, "animazioni_da_aggiungere")

# foto di riferimento -> fotogramma di riposo che deve riprodurla
PAIRS = [
    ("retro-highview.png", "poster-5.png", "scena 5 — vista dall'alto"),
    ("retro-ruotescomposte.png", "poster-6.png", "scena 6 — ruote scomposte"),
]

# Limiti dell'assestamento: oltre questi valori non si sta piu' allineando.
SCALA_MAX = 0.02      # +/- 2 %
SHIFT_MAX = 6.0       # +/- 6 px


def sample(ref, s, tx, ty, size):
    """Porta la foto sulle dimensioni del fotogramma.

    `s` e' la scala IN AVANTI (quanto si rimpicciolisce la foto), perche' e'
    cosi' che warpAffine interpreta la matrice: la inverte lui internamente.
    Usarla al contrario ingrandisce invece di ridurre, e il residuo schizza da 2
    a 49 senza che niente lo faccia sospettare.

    INTER_AREA e non LANCZOS4: si sta riducendo, e ridurre senza media d'area
    produce aliasing sui dettagli fini.
    """
    w, h = size
    warp = np.array([[s, 0.0, tx], [0.0, s, ty]], dtype=np.float32)
    return cv2.warpAffine(ref, warp, (w, h), flags=cv2.INTER_AREA,
                          borderMode=cv2.BORDER_REPLICATE)


def align(ref, target):
    h, w = target.shape[:2]
    base = w / float(ref.shape[1])          # quanto va rimpicciolita la foto
    roi = (slice(int(h * 0.10), int(h * 0.95)), slice(int(w * 0.08), int(w * 0.92)))
    tg = target[roi].astype(np.int16)

    def residuo(s, tx, ty):
        got = sample(ref, s, tx, ty, (w, h))[roi].astype(np.int16)
        return float(np.abs(tg - got).mean())

    partenza = residuo(base, 0.0, 0.0)
    best = (partenza, base, 0.0, 0.0)
    for ds in np.linspace(-SCALA_MAX, SCALA_MAX, 9):
        for tx in np.linspace(-SHIFT_MAX, SHIFT_MAX, 7):
            for ty in np.linspace(-SHIFT_MAX, SHIFT_MAX, 7):
                s = base * (1.0 + float(ds))
                r = residuo(s, float(tx), float(ty))
                if r < best[0]:
                    best = (r, s, float(tx), float(ty))
    return best, base, partenza


def main():
    out = {}
    os.makedirs(os.path.join(TOOLS, "shots"), exist_ok=True)
    for ref_name, poster_name, label in PAIRS:
        ref = cv2.imread(os.path.join(REF, ref_name))
        pos = cv2.imread(os.path.join(MEDIA, poster_name))
        if ref is None or pos is None:
            print("manca un file per", label)
            continue
        h, w = pos.shape[:2]
        (res, s, tx, ty), base, partenza = align(ref, pos)
        aligned = sample(ref, s, tx, ty, (w, h))
        d = np.abs(pos.astype(np.int16) - aligned.astype(np.int16)).max(axis=2)

        entry = {
            "riferimento": ref_name, "fotogramma": poster_name,
            "fotoPx": [ref.shape[1], ref.shape[0]], "fotogrammaPx": [w, h],
            "scalaSemplice": round(base, 5),
            "scalaAssestata": round(s, 5),
            "spostamento": [round(tx, 1), round(ty, 1)],
            "residuoMedioPrima": round(partenza, 3),
            "residuoMedioDopo": round(res, 3),
            "residuoMediano": float(np.median(d)),
            "oltre8pct": round(float((d > 8).mean()) * 100, 2),
        }
        out[label] = entry
        print("%-28s residuo medio %.2f (ridimensionamento semplice: %.2f)  "
              "mediano %.0f  oltre8 %.1f%%  scala %.4f  spostamento %+.1f,%+.1f"
              % (label, res, partenza, entry["residuoMediano"],
                 entry["oltre8pct"], s, tx, ty))
        cv2.imwrite(os.path.join(TOOLS, "shots", "ref-%s" % poster_name),
                    np.vstack([cv2.resize(aligned, (900, 500)), cv2.resize(pos, (900, 500))]))

    with open(os.path.join(TOOLS, "reference-report.json"), "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=2, ensure_ascii=False)
    print("")
    print("scritto tools/reference-report.json")


if __name__ == "__main__":
    main()
