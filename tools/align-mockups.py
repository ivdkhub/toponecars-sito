# -*- coding: utf-8 -*-
"""Allinea ogni mockup al fotogramma video che gli fa da sfondo.

I mockup sono screenshot 1:1 di una pagina in cui il video riempie la finestra.
Stimando con precisione sub-pixel la similarita' (scala uniforme + traslazione)
fra fotogramma e mockup si ricostruisce lo sfondo: la differenza mockup - sfondo
isola l'"inchiostro" della sola UI, che e' l'unico modo affidabile di misurare
testo sovrapposto a uno sfondo non uniforme.

La scala e' vincolata a essere uniforme perche' il video viene ridimensionato in
modo proporzionale: lasciarla anisotropa fa divergere l'ottimizzazione su un
minimo locale peggiore (verificato: ECC affine dava scaleX 1.0095 / scaleY 1.0055
con residuo molto piu' alto).
"""
import json
import os

import cv2
import numpy as np
from scipy.optimize import minimize

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MOCK = os.path.join(ROOT, "mockup ui sample")
# I fotogrammi di riposo NON stanno piu' fra i media serviti: nel sito si vede un
# solo poster, e sei PNG da un megabyte l'uno non avevano ragione di essere
# caricati sul sito. Li scrive tools/build-media.py qui accanto.
MEDIA = os.path.join(ROOT, "tools", "frames")
PAIRS = [("1.png", "poster-2.png"), ("2.png", "poster-3.png"), ("3.png", "poster-4.png")]


def load_bgr(path):
    im = cv2.imread(path, cv2.IMREAD_UNCHANGED)
    if im.ndim == 3 and im.shape[2] == 4:
        im = cv2.cvtColor(im, cv2.COLOR_BGRA2BGR)
    return im


def warp_of(p):
    s, tx, ty = p
    return np.array([[s, 0.0, tx], [0.0, s, ty]], dtype=np.float32)


def sample(frame, p, size):
    return cv2.warpAffine(frame, warp_of(p), size, flags=cv2.INTER_LANCZOS4,
                          borderMode=cv2.BORDER_REPLICATE)


def main():
    out = {}
    for mname, pname in PAIRS:
        M = load_bgr(os.path.join(MOCK, mname))
        F = load_bgr(os.path.join(MEDIA, pname))
        h, w = M.shape[:2]
        mg = cv2.cvtColor(M, cv2.COLOR_BGR2GRAY).astype(np.float32)
        fg = cv2.cvtColor(F, cv2.COLOR_BGR2GRAY).astype(np.float32)

        # Si valuta solo la fascia centrale: la UI vive ai bordi e falserebbe la stima.
        roi = (slice(int(h * 0.25), int(h * 0.82)), slice(int(w * 0.18), int(w * 0.95)))
        target = mg[roi]

        def cost(p):
            got = sample(fg, p, (w, h))[roi]
            a = target - target.mean()
            b = got - got.mean()
            denom = np.sqrt((a * a).sum() * (b * b).sum()) + 1e-9
            return 1.0 - float((a * b).sum() / denom)      # 1 - correlazione normalizzata

        best = None
        for s0 in (1.0056, 1.0076, 1.0096):
            for tx0 in (4.0, 8.0, 12.0):
                r = minimize(cost, [s0, tx0, 0.0], method="Nelder-Mead",
                             options={"xatol": 1e-4, "fatol": 1e-9, "maxiter": 4000})
                if best is None or r.fun < best.fun:
                    best = r
        s, tx, ty = best.x
        bg = sample(F, best.x, (w, h))
        cv2.imwrite(os.path.join(ROOT, "tools", "bg-" + mname), bg)

        d = np.abs(M.astype(np.int16) - bg.astype(np.int16)).max(axis=2)
        out[mname] = {
            "poster": pname,
            "mockupSize": [w, h],
            # warp mockup -> fotogramma
            "mockupToFrame": {"scale": round(float(s), 6),
                              "tx": round(float(tx), 3), "ty": round(float(ty), 3)},
            # scala con cui il fotogramma appare nel mockup
            "frameInMockupScale": round(1.0 / float(s), 6),
            "ncc": round(1.0 - float(best.fun), 6),
            "residualMedianCentre": float(np.median(d[roi])),
            "residualP90Centre": float(np.percentile(d[roi], 90)),
        }
        print(mname, json.dumps(out[mname]))
    with open(os.path.join(ROOT, "tools", "align.json"), "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=2)


if __name__ == "__main__":
    main()
