# -*- coding: utf-8 -*-
"""Misura gli elementi dei mockup in unita' di design.

Non si tira a indovinare nulla a occhio: ogni elemento viene isolato sottraendo
lo sfondo video ricostruito (vedi align-mockups.py), poi se ne prende il bounding
box dell'inchiostro con precisione sub-pixel e lo si converte nel sistema
1440x810 imposto dalla specifica.

Conversione: il canvas 1440x810 sta dentro la finestra del mockup con
    s  = min(W/1440, H/810)
    ox = (W - 1440*s) / 2
    oy = (H -  810*s) / 2
quindi  x_design = (x_mockup - ox) / s.

Uso:
    python tools/measure.py                 elenca i blocchi trovati
    python tools/measure.py 1 x0 y0 x1 y1   misura una regione specifica
"""
import json
import os
import sys

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MOCK = os.path.join(ROOT, "mockup ui sample")
TOOLS = os.path.join(ROOT, "tools")

# La scala di riferimento e' quella del mockup 1: e' il piu' alto (1066 px) ed e'
# l'unico che contiene il logo, quindi definisce la posizione comune del menu.
REFERENCE = "1"


def mock_path(n):
    return os.path.join(MOCK, "%s.png" % n)


def load(n):
    m = cv2.imread(mock_path(n), cv2.IMREAD_UNCHANGED)
    if m.ndim == 3 and m.shape[2] == 4:
        m = cv2.cvtColor(m, cv2.COLOR_BGRA2BGR)
    b = cv2.imread(os.path.join(TOOLS, "bg-%s.png" % n))
    return m, b


def geometry(n):
    m = cv2.imread(mock_path(n), cv2.IMREAD_UNCHANGED)
    h, w = m.shape[:2]
    s = min(w / 1440.0, h / 810.0)
    return {"w": w, "h": h, "s": s,
            "ox": (w - 1440.0 * s) / 2.0, "oy": (h - 810.0 * s) / 2.0}


def to_design(n, x, y, g=None):
    g = g or geometry(n)
    return ((x - g["ox"]) / g["s"], (y - g["oy"]) / g["s"])


# Lo sfondo ricostruito ai bordi e' estrapolato (BORDER_REPLICATE), quindi li'
# la differenza e' rumore: quella cornice va esclusa da ogni misura.
BORDER = 5


def ink(n, thr=40):
    """Maschera dell'inchiostro della UI: |mockup - sfondo| oltre soglia."""
    m, b = load(n)
    d = np.abs(m.astype(np.int16) - b.astype(np.int16)).max(axis=2)
    mask = (d > thr).astype(np.uint8)
    mask[:BORDER, :] = 0
    mask[-BORDER:, :] = 0
    mask[:, :BORDER] = 0
    mask[:, -BORDER:] = 0
    return mask


def local_ink(n, roi, thr=40):
    """Inchiostro di un testo dentro un contenitore pieno (card, pillola).

    Li' la differenza contro il video segna tutto il contenitore: il testo si
    isola invece rispetto al colore dominante della regione, che e' il colore
    del contenitore stesso.
    """
    m, _ = load(n)
    sub = m[roi[1]:roi[3], roi[0]:roi[2]].astype(np.int16)
    flat = sub.reshape(-1, 3)
    # colore dominante = mediana per canale, robusta rispetto al testo
    base = np.median(flat, axis=0)
    d = np.abs(sub - base).max(axis=2)
    mask = np.zeros(m.shape[:2], np.uint8)
    mask[roi[1]:roi[3], roi[0]:roi[2]] = (d > thr).astype(np.uint8)
    return mask


def ink_bbox(mask, roi=None, min_run=1):
    """Bounding box dell'inchiostro dentro una regione, con soglia sul numero di
    pixel per riga/colonna per ignorare il rumore isolato."""
    sub = mask if roi is None else mask[roi[1]:roi[3], roi[0]:roi[2]]
    cols = sub.sum(axis=0)
    rows = sub.sum(axis=1)
    xs = np.where(cols >= min_run)[0]
    ys = np.where(rows >= min_run)[0]
    if not len(xs) or not len(ys):
        return None
    x0, x1 = int(xs.min()), int(xs.max())
    y0, y1 = int(ys.min()), int(ys.max())
    off = (0, 0) if roi is None else (roi[0], roi[1])
    return (x0 + off[0], y0 + off[1], x1 + off[0] + 1, y1 + off[1] + 1)


def report(n, name, box, g=None):
    g = g or geometry(n)
    if box is None:
        return {"name": name, "found": False}
    x0, y0, x1, y1 = box
    dx0, dy0 = to_design(n, x0, y0, g)
    dx1, dy1 = to_design(n, x1, y1, g)
    return {
        "name": name,
        "mockup": {"x": x0, "y": y0, "w": x1 - x0, "h": y1 - y0},
        "design": {
            "x": round(dx0, 2), "y": round(dy0, 2),
            "w": round(dx1 - dx0, 2), "h": round(dy1 - dy0, 2),
            "right": round(1440 - dx1, 2), "bottom": round(810 - dy1, 2),
        },
    }


def main():
    if len(sys.argv) >= 6:
        n = sys.argv[1]
        roi = tuple(int(v) for v in sys.argv[2:6])
        thr = int(sys.argv[6]) if len(sys.argv) > 6 else 40
        mode = sys.argv[7] if len(sys.argv) > 7 else "video"
        mask = local_ink(n, roi, thr) if mode == "local" else ink(n, thr)
        print(json.dumps(report(n, "roi", ink_bbox(mask, roi)), indent=2))
        return

    for n in ("1", "2", "3"):
        g = geometry(n)
        print("=== mockup %s  %dx%d  s=%.5f ox=%.2f oy=%.2f"
              % (n, g["w"], g["h"], g["s"], g["ox"], g["oy"]))
        mask = ink(n)
        solid = cv2.morphologyEx(mask * 255, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
        num, lab, stats, _ = cv2.connectedComponentsWithStats(solid, 8)
        rows = [(stats[i][4], *stats[i][:4]) for i in range(1, num) if stats[i][4] >= 600]
        for a, x, y, w, h in sorted(rows, key=lambda r: -r[0])[:16]:
            dx, dy = to_design(n, x, y, g)
            print("   area%8d | px %5d,%5d %5dx%-5d | design %7.1f,%7.1f %7.1fx%-7.1f"
                  % (a, x, y, w, h, dx, dy, w / g["s"], h / g["s"]))


if __name__ == "__main__":
    main()
