# -*- coding: utf-8 -*-
"""Estrae il colore "pieno" di un testo: il plateau al centro dei tratti.

Prendere il pixel piu' scuro o la media sbaglia sempre, perche' i bordi sono
antialiasati. Qui si guarda l'istogramma dei colori della regione e si prende il
picco piu' lontano dallo sfondo con almeno una certa massa: e' il colore reale
con cui il testo e' stato disegnato.
"""
import sys

import numpy as np

sys.path.insert(0, __file__.rsplit("\\", 1)[0] if "\\" in __file__ else ".")
from measure import load  # noqa: E402


def plateau(img, box, min_share=0.004):
    x0, y0, x1, y1 = box
    sub = img[y0:y1, x0:x1].reshape(-1, 3).astype(int)
    q = (sub // 4)                                   # quantizza a 64 livelli
    keys = q[:, 0] * 4096 + q[:, 1] * 64 + q[:, 2]
    uniq, counts = np.unique(keys, return_counts=True)
    bg_key = uniq[counts.argmax()]
    bg = np.array([(bg_key // 4096) % 64, (bg_key // 64) % 64, bg_key % 64]) * 4 + 2
    best, best_d = None, -1
    for k, c in zip(uniq, counts):
        if c / len(sub) < min_share:
            continue
        col = np.array([(k // 4096) % 64, (k // 64) % 64, k % 64]) * 4 + 2
        d = np.linalg.norm(col - bg)
        if d > best_d:
            best_d, best = d, col
    if best is None:
        return bg, bg
    # media esatta dei pixel dentro il bucket vincente
    sel = sub[np.abs(sub - best).max(axis=1) <= 3]
    core = sel.mean(axis=0) if len(sel) else best
    return bg, core


def fmt(c):
    return "rgb(%d, %d, %d)" % (c[2], c[1], c[0])


REGIONS = {
    "1": {
        "titolo riga 1 (Porsche 911)": (228, 224, 540, 270),
        "titolo riga 2 (GT3 RS)":      (226, 278, 486, 332),
        "card numero":                 (1009, 890, 1140, 946),
        "card didascalia":             (1030, 952, 1130, 980),
        "menu voce":                   (1110, 108, 1270, 140),
        "menu Vieni a trovarci testo": (1385, 108, 1495, 140),
        "menu Test Drive testo":       (1525, 108, 1650, 140),
        "pill sfondo (zona vuota)":    (300, 100, 900, 148),
    },
    "2": {
        "headline":                    (205, 160, 760, 330),
        "testo gigante di sfondo":     (20, 880, 700, 1055),
    },
    "3": {
        "annotazione":                 (1355, 160, 1680, 285),
        "linea guida":                 (1200, 205, 1360, 225),
    },
}

if __name__ == "__main__":
    for n, regions in REGIONS.items():
        img, _ = load(n)
        print("=== mockup", n)
        for label, box in regions.items():
            bg, core = plateau(img, box)
            print("   %-30s sfondo %-20s testo %s" % (label, fmt(bg), fmt(core)))
