# -*- coding: utf-8 -*-
"""Misura sui mockup il riquadro d'inchiostro di ogni stringa di testo.

Il risultato (tools/targets.json) e' l'ingresso di tools/solve-type.js, che da
larghezza e altezza misurate ricava font-size e letter-spacing risolvendo un
sistema, invece di tirare a indovinare a occhio.

Tre modi di isolare l'inchiostro, scelti in base a cosa c'e' sotto al testo:
  video     differenza contro il fotogramma video ricostruito
  testo     differenza contro lo sfondo locale (testo dentro un contenitore pieno)
  bianco    maschera per luminosita' e bassa saturazione (le note del mockup 3,
            dove lo sfondo e' la ruota, satura e pienissima di bordi)
"""
import json
import os
import sys

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOOLS = os.path.join(ROOT, "tools")
MOCK = os.path.join(ROOT, "mockup ui sample")

THR = 40

GEOM = {}


def load(n):
    m = cv2.imread(os.path.join(MOCK, "%s.png" % n), cv2.IMREAD_UNCHANGED)
    if m.ndim == 3 and m.shape[2] == 4:
        m = cv2.cvtColor(m, cv2.COLOR_BGRA2BGR)
    b = cv2.imread(os.path.join(TOOLS, "bg-%s.png" % n))
    h, w = m.shape[:2]
    s = min(w / 1440.0, h / 810.0)
    GEOM[n] = {"w": w, "h": h, "s": s, "ox": (w - 1440.0 * s) / 2.0, "oy": (h - 810.0 * s) / 2.0}
    return m, b


IMGS = {n: load(n) for n in ("1", "2", "3")}


def mask_video(n):
    m, b = IMGS[n]
    d = np.abs(m.astype(np.int16) - b.astype(np.int16)).max(axis=2)
    out = (d > THR).astype(np.uint8)
    out[:5, :] = 0; out[-5:, :] = 0; out[:, :5] = 0; out[:, -5:] = 0
    return out


def text_mask(img, container, kernel=71, thr=THR):
    """Isola il testo dentro un contenitore pieno.

    Il fondo si ottiene togliendo le strutture sottili con un elemento
    strutturante orizzontale piu' largo del glifo piu' largo. Le due polarita'
    vanno tenute separate: prendere il massimo fra apertura e chiusura accende
    SEMPRE tutto, perche' dove il testo e' chiaro la chiusura segna il fondo e
    viceversa. Si sceglie quindi la polarita' che accende meno pixel, perche' il
    testo e' sempre la minoranza della sua riga.
    """
    x0, y0, x1, y1 = container
    g = cv2.cvtColor(img[y0:y1, x0:x1], cv2.COLOR_BGR2GRAY)
    k = cv2.getStructuringElement(cv2.MORPH_RECT, (kernel, 1))
    lighter = (cv2.subtract(g, cv2.morphologyEx(g, cv2.MORPH_OPEN, k)) > thr).astype(np.uint8)
    darker = (cv2.subtract(cv2.morphologyEx(g, cv2.MORPH_CLOSE, k), g) > thr).astype(np.uint8)
    chosen = lighter if lighter.sum() <= darker.sum() else darker
    full = np.zeros(img.shape[:2], np.uint8)
    full[y0:y1, x0:x1] = chosen
    return full


def mask_text(n, container, kernel=71):
    m, _ = IMGS[n]
    return text_mask(m, container, kernel)


def mask_white(n):
    """Testo chiaro isolato con due condizioni indipendenti.

    Da sola la soglia su luminosita' e saturazione prende anche i riflessi
    chiari del carbonio; da sola la differenza col video prende anche i bordi
    dell'auto (la ricostruzione dello sfondo non e' perfetta al pixel). La loro
    intersezione lascia solo cio' che e' insieme chiaro e assente dal video:
    il testo.
    """
    m, _ = IMGS[n]
    hsv = cv2.cvtColor(m, cv2.COLOR_BGR2HSV)
    bright = ((hsv[:, :, 1] < 60) & (hsv[:, :, 2] > 170)).astype(np.uint8)
    return (bright & mask_video(n)).astype(np.uint8)


def box(mask, roi, min_run=1):
    x0, y0, x1, y1 = roi
    sub = mask[y0:y1, x0:x1]
    cols = sub.sum(axis=0)
    rows = sub.sum(axis=1)
    xs = np.where(cols >= min_run)[0]
    ys = np.where(rows >= min_run)[0]
    if not len(xs) or not len(ys):
        return None
    bx0, bx1 = int(xs.min()), int(xs.max())
    by0, by1 = int(ys.min()), int(ys.max())
    # La massa (pixel accesi dentro il riquadro) serve a dedurre il PESO del
    # carattere: font-size e letter-spacing governano altezza e larghezza, ma
    # solo lo spessore dei tratti dice quanto e' pesante il font.
    mass = int(sub[by0:by1 + 1, bx0:bx1 + 1].sum())
    return {"x": bx0 + x0, "y": by0 + y0,
            "w": bx1 - bx0 + 1, "h": by1 - by0 + 1, "mass": mass}


def design(n, b):
    g = GEOM[n]
    return {
        "x": round((b["x"] - g["ox"]) / g["s"], 2),
        "y": round((b["y"] - g["oy"]) / g["s"], 2),
        "w": round(b["w"] / g["s"], 2),
        "h": round(b["h"] / g["s"], 2),
        "right": round(1440 - (b["x"] + b["w"] - g["ox"]) / g["s"], 2),
        "bottom": round(810 - (b["y"] + b["h"] - g["oy"]) / g["s"], 2),
        "coverage": round(b.get("mass", 0) / float(b["w"] * b["h"]), 4),
    }


# id, mockup, testo, famiglia, roi, modo, contenitore, min_run
SPECIMENS = [
    # ---- barra del menu (mockup 1) -------------------------------------------
    ("menu.servizi",    "1", "Servizi",          "Albert Sans", (1108, 108, 1178, 140), "testo", (1020, 108, 1260, 140), 1),
    ("menu.contenuti",  "1", "Contenuti",        "Albert Sans", (1182, 108, 1268, 140), "testo", (1100, 108, 1352, 140), 1),
    ("menu.recensioni", "1", "Recensioni",       "Albert Sans", (1276, 108, 1370, 140), "testo", (1196, 108, 1372, 140), 1),
    ("menu.vieni",      "1", "Vieni a trovarci", "Albert Sans", (1384, 110, 1496, 136), "testo", (1380, 110, 1500, 136), 1),
    ("menu.testdrive",  "1", "Test Drive",       "Albert Sans", (1546, 110, 1674, 136), "testo", (1528, 110, 1692, 136), 1),

    # ---- blocco 1 -------------------------------------------------------------
    ("b1.title1",  "1", "Porsche 911",      "Albert Sans", ( 180, 205,  620, 273), "video", None, 2),
    ("b1.title2",  "1", "GT3 RS",           "Albert Sans", ( 180, 274,  560, 340), "video", None, 2),
    ("b1.value1",  "1", "4.0l",             "Albert Sans", ( 960, 880, 1190, 947), "testo", ( 955, 880, 1195, 947), 2),
    ("b1.label1",  "1", "ogni 100 km",      "Albert Sans", ( 960, 947, 1190, 982), "testo", ( 955, 947, 1195, 982), 1),
    ("b1.value2",  "1", "518",              "Albert Sans", (1224, 880, 1454, 947), "testo", (1219, 880, 1459, 947), 2),
    ("b1.label2",  "1", "cavalli tedeschi", "Albert Sans", (1224, 947, 1454, 982), "testo", (1219, 947, 1459, 982), 1),
    ("b1.value3",  "1", "3.2S",             "Albert Sans", (1488, 880, 1718, 947), "testo", (1483, 880, 1723, 947), 2),
    ("b1.label3",  "1", "da 0 a 100 km /h", "Albert Sans", (1488, 947, 1718, 982), "testo", (1483, 947, 1723, 982), 1),

    # ---- blocco 2 -------------------------------------------------------------
    ("b2.line1", "2", "How we engineer",     "Albert Sans", (200, 158,  760, 212), "video", None, 2),
    ("b2.line2", "2", "the next generation", "Albert Sans", (200, 215,  790, 268), "video", None, 2),
    ("b2.line3", "2", "of performance.",     "Albert Sans", (200, 272,  700, 325), "video", None, 2),
]

# Le note del mockup 3 sono paragrafi: si misura riga per riga, perche' e' la
# singola riga a dover combaciare.
NOTE_BLOCKS = {
    "b3.cerchio": {
        "roi": (1490, 150, 1895, 300),
        "lines": ["Cerchio forgiato a più", "razze (design a razze", "sdoppiate) con finitura",
                  "satinata color oro/bronzo", "(tipica tonalità Neodyme o", "Satin Aurum di Porsche)."],
    },
    "b3.pneumatico": {
        "roi": (50, 395, 440, 625),
        "lines": ["Uno pneumatico ad", "altissime prestazioni", "Michelin Pilot Sport Cup",
                  "2, una gomma semi-slick", "omologata per uso", "stradale ma progettata",
                  "specificamente per la", "pista, caratterizzata da", "spalla ribassata e mescola",
                  "ad elevato grip."],
    },
    "b3.pinza": {
        "roi": (1510, 515, 1900, 700),
        "lines": ["Pinza fissa monoblocco ad", "alte prestazioni", "(tipicamente a 6 pistoncini",
                  "sull'anteriore), rifinita in", "rosso lucido con il marchio", "PORSCHE in bianco a",
                  "contrasto, posizionata a", "ridosso del disco."],
    },
    "b3.disco": {
        "roi": (45, 678, 375, 812),
        "lines": ["Disco cross-drilled per", "massimizzare la", "dissipazione del",
                  "calore, pulire le", "pastiglie e disperdere i", "gas di frenata."],
    },
    "b3.campana": {
        "roi": (35, 812, 360, 895),
        "lines": ["Fissato alla campana", "centrale tramite", "perni/boccole."],
    },
}


def note_lines(n, roi, count):
    """Separa le righe di una nota.

    L'interlinea e' strettissima e le code delle lettere toccano la riga sotto,
    quindi un taglio per fasce orizzontali mescolerebbe righe adiacenti. Si
    prendono invece le componenti connesse dell'inchiostro e si assegna ognuna
    alla riga il cui centro e' piu' vicino, usando il passo stimato per
    autocorrelazione.
    """
    return segment_lines(mask_white(n), roi, count)


def segment_lines(mask, roi, count):
    """Stessa segmentazione, applicabile a qualunque maschera: serve anche al
    rendering, che va misurato esattamente come il mockup."""
    x0, y0, x1, y1 = roi
    sub = mask[y0:y1, x0:x1]
    prof = sub.sum(axis=1).astype(float)
    if prof.max() == 0:
        return None
    p = prof - prof.mean()
    ac = np.correlate(p, p, "full")[len(p) - 1:]
    pitch = None
    for lag in range(12, 45):
        if ac[lag] > ac[lag - 1] and ac[lag] >= ac[lag + 1]:
            if pitch is None or ac[lag] > ac[pitch]:
                pitch = lag
    if pitch is None:
        return None
    first = int(np.argmax(prof > prof.max() * 0.25))
    centres = [first + (i + 0.5) * pitch - 2 for i in range(count)]

    num, lab, stats, cent = cv2.connectedComponentsWithStats((sub * 255).astype(np.uint8), 8)
    buckets = [[] for _ in range(count)]
    for i in range(1, num):
        x, y, w, h, area = stats[i]
        if area < 4 or h > pitch * 1.6:
            continue                      # rumore, oppure una macchia che attraversa piu' righe
        cy = y + h / 2.0
        j = int(np.argmin([abs(cy - c) for c in centres]))
        if abs(cy - centres[j]) > pitch * 0.75:
            continue
        buckets[j].append((x, y, w, h))
    out = []
    for parts in buckets:
        if not parts:
            out.append(None)
            continue
        bx0 = min(p2[0] for p2 in parts)
        by0 = min(p2[1] for p2 in parts)
        bx1 = max(p2[0] + p2[2] for p2 in parts)
        by1 = max(p2[1] + p2[3] for p2 in parts)
        mass = int(sub[int(by0):int(by1), int(bx0):int(bx1)].sum())
        out.append({"x": int(bx0) + x0, "y": int(by0) + y0,
                    "w": int(bx1 - bx0), "h": int(by1 - by0), "mass": mass})
    return out, pitch


def main():
    data = {"geometry": {k: {kk: round(vv, 5) for kk, vv in v.items()} for k, v in GEOM.items()},
            "specimens": {}, "notes": {}}
    video = {n: mask_video(n) for n in ("1", "2", "3")}

    for sid, n, text, family, roi, mode, container, min_run in SPECIMENS:
        mask = mask_text(n, container) if mode == "testo" else video[n]
        b = box(mask, roi, min_run)
        if b is None:
            print("!! inchiostro non trovato:", sid)
            continue
        data["specimens"][sid] = {
            "mockup": n, "text": text, "family": family,
            "px": b, "design": design(n, b), "s": round(GEOM[n]["s"], 5),
        }
        print("%-16s px %5d,%-5d %4dx%-3d | design x %7.2f y %7.2f  w %7.2f h %6.2f  %s"
              % (sid, b["x"], b["y"], b["w"], b["h"],
                 data["specimens"][sid]["design"]["x"], data["specimens"][sid]["design"]["y"],
                 data["specimens"][sid]["design"]["w"], data["specimens"][sid]["design"]["h"], text))

    print()
    for nid, spec in NOTE_BLOCKS.items():
        res = note_lines("3", spec["roi"], len(spec["lines"]))
        if not res:
            print("!! righe non trovate:", nid)
            continue
        boxes, pitch = res
        g = GEOM["3"]
        entry = {"mockup": "3", "family": "Aldrich", "pitchPx": pitch,
                 "pitchDesign": round(pitch / g["s"], 3), "lines": []}
        entry["pitchPx"] = int(pitch)
        for text, b in zip(spec["lines"], boxes):
            entry["lines"].append({"text": text, "px": b, "design": design("3", b) if b else None})
        data["notes"][nid] = entry
        print("%-16s %d righe, passo %d px (design %.2f)" % (nid, len(spec["lines"]), pitch, pitch / g["s"]))
        for ln in entry["lines"]:
            if ln["px"]:
                print("     %5d,%-5d %4dx%-3d | design x %7.2f y %7.2f w %7.2f h %6.2f  %s"
                      % (ln["px"]["x"], ln["px"]["y"], ln["px"]["w"], ln["px"]["h"],
                         ln["design"]["x"], ln["design"]["y"], ln["design"]["w"], ln["design"]["h"], ln["text"]))

    with open(os.path.join(TOOLS, "targets.json"), "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2, ensure_ascii=False)
    print("\nscritto tools/targets.json")


if __name__ == "__main__":
    main()
