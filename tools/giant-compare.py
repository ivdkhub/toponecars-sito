# -*- coding: utf-8 -*-
"""Confronto del titolo gigante, glifo per glifo.

Il testo esce dal bordo sinistro e da quello inferiore, quindi il riquadro
complessivo non dice nulla: si confrontano invece le ascisse dei singoli glifi e
la quota della cima dell'inchiostro, misurate nella fascia sotto l'ombra
dell'auto, dove lo sfondo giallo e' pulito.
"""
import os
import sys

import cv2
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import targets as T  # noqa: E402

S = T.GEOM["2"]["s"]


def glyphs(img, y0=955, y1=1055, thr=22, minrun=5):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    band = gray[y0:y1, :img.shape[1]]
    bg = cv2.morphologyEx(band, cv2.MORPH_CLOSE,
                          cv2.getStructuringElement(cv2.MORPH_RECT, (221, 1)))
    mask = ((bg.astype(int) - band.astype(int)) > thr).astype(np.uint8)
    cols = mask.sum(axis=0)
    runs, st = [], None
    for i, v in enumerate(cols):
        if v >= minrun and st is None:
            st = i
        elif v < minrun and st is not None:
            runs.append((st, i))
            st = None
    if st is not None:
        runs.append((st, img.shape[1]))
    merged = []
    for a, b in runs:
        if merged and a - merged[-1][1] < 10:
            merged[-1] = (merged[-1][0], b)
        else:
            merged.append((a, b))
    return [r for r in merged if r[1] - r[0] >= 14]


def top_of(img, x0, x1, y0=930, y1=1055, thr=22):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    band = gray[y0:y1, x0:x1]
    bg = cv2.morphologyEx(band, cv2.MORPH_CLOSE,
                          cv2.getStructuringElement(cv2.MORPH_RECT, (121, 1)))
    mask = ((bg.astype(int) - band.astype(int)) > thr).astype(np.uint8)
    rows = np.where(mask.sum(axis=1) >= 3)[0]
    return int(rows.min()) + y0 if len(rows) else None


mock = T.IMGS["2"][0]
shot = cv2.imread(os.path.join(T.TOOLS, "shots", "ui-2.png"))

gm = glyphs(mock)
gr = glyphs(shot)
print("glifi del titolo gigante (bordo sinistro, px del mockup 2)")
print("   mockup:   ", [a for a, b in gm])
print("   rendering:", [a for a, b in gr])
n = min(len(gm), len(gr))
if n:
    d = [gr[i][0] - gm[i][0] for i in range(n)]
    print("   scarti:   ", d, "  mediana %+.1f px (%+.2f unita' di design)"
          % (float(np.median(d)), float(np.median(d)) / S))

# quota della cima: si usa la 'o' di Porsche, tutta dentro l'immagine
tm = top_of(mock, 1135, 1350)
tr = top_of(shot, 1135, 1350)
print("cima della 'o':  mockup %s  rendering %s  scarto %s px (%.2f unita' di design)"
      % (tm, tr, (tr - tm) if (tm and tr) else "?",
         ((tr - tm) / S) if (tm and tr) else float("nan")))
