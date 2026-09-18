# -*- coding: utf-8 -*-
"""Confronta il rendering con il mockup, elemento per elemento.

L'"inchiostro" viene estratto IN MODO IDENTICO dalle due immagini:

    inchiostro = ( |immagine_con_UI - immagine_senza_UI| )  oltre soglia

Per il rendering le due immagini sono due scatti della stessa pagina (con e
senza la UI), quindi la sottrazione e' esatta. Per il mockup l'immagine "senza
UI" e' il fotogramma video riallineato con precisione sub-pixel (align-mockups.py).
Stessa soglia, stessa operazione, stesso significato: i due bounding box sono
confrontabili.

Per ogni elemento stampa lo scostamento di posizione e di dimensione in pixel.
Si itera sulle correzioni finche' tutto non rientra entro 1-2 px.

Uso:
    python tools/pixel-compare.py            tutti i blocchi
    python tools/pixel-compare.py 1          solo il blocco 1
"""
import json
import os
import sys

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOOLS = os.path.join(ROOT, "tools")
SHOTS = os.path.join(TOOLS, "shots")
MOCK = os.path.join(ROOT, "mockup ui sample")

THRESHOLD = 40          # stessa soglia sulle due immagini
TOLERANCE = 2.0         # px: entro questo scarto un elemento e' considerato a posto

# Regioni di interesse, in pixel del mockup corrispondente. Sono generose: il
# bounding box viene poi ricavato dall'inchiostro, non dalla regione.
#
# Il modo dice come isolare l'inchiostro, e vale per ENTRAMBE le immagini:
#   "video" = differenza contro il fotogramma di sfondo. Adatto a cio' che sta
#             direttamente sopra il video (titoli, contenitori, note).
#   "testo" = differenza contro lo sfondo locale della riga. Serve quando il
#             testo sta dentro un contenitore pieno (le voci di menu sulla
#             barra, i numeri dentro le card): li' il confronto col video
#             segnerebbe tutto il contenitore invece del testo.
ELEMENTS = {
    1: [
        ("logo",                   (1495,   8, 1715,   88), 2, "video", None),
        ("barra menu",             ( 150,  85, 1760,  165), 1, "video", None),
        ("menu: Servizi",          (1100, 106, 1180,  142), 1, "testo", (1020, 106, 1260, 142)),
        ("menu: Contenuti",        (1180, 106, 1272,  142), 1, "testo", (1100, 106, 1352, 142)),
        ("menu: Recensioni",       (1272, 106, 1372,  142), 1, "testo", (1192, 106, 1372, 142)),
        ("menu: Vieni a trovarci", (1382, 110, 1498,  136), 1, "testo", (1380, 110, 1500, 136)),
        ("menu: Test Drive",       (1540, 110, 1680,  136), 1, "testo", (1528, 110, 1692, 136)),
        ("bottone chiaro",         (1360,  98, 1516,  148), 3, "video", None),
        ("titolo: Porsche 911",    ( 180, 205,  620,  273), 2, "video", None),
        ("titolo: GT3 RS",         ( 180, 274,  560,  345), 2, "video", None),
        ("card 1",                 ( 938, 860, 1206,  996), 6, "video", None),
        ("card 2",                 (1202, 860, 1470,  996), 6, "video", None),
        ("card 3",                 (1466, 860, 1734,  996), 6, "video", None),
        ("card 1: valore",         ( 960, 882, 1190,  946), 2, "testo", ( 955, 882, 1195, 946)),
        ("card 1: didascalia",     ( 960, 946, 1190,  980), 1, "testo", ( 955, 946, 1195, 980)),
        ("card 2: valore",         (1224, 882, 1454,  946), 2, "testo", (1219, 882, 1459, 946)),
        ("card 2: didascalia",     (1224, 946, 1454,  980), 1, "testo", (1219, 946, 1459, 980)),
        ("card 3: valore",         (1488, 882, 1718,  946), 2, "testo", (1483, 882, 1723, 946)),
        ("card 3: didascalia",     (1488, 946, 1718,  980), 1, "testo", (1483, 946, 1723, 980)),
    ],
    2: [
        ("barra menu",             ( 150,  85, 1760,  165), 1, "video", None),
        ("headline riga 1",        ( 200, 156,  700,  213), 2, "video", None),
        ("headline riga 2",        ( 200, 214,  760,  270), 2, "video", None),
        ("headline riga 3",        ( 200, 271,  660,  326), 2, "video", None),
        ("titolo gigante",         (   0, 880,  700, 1061), 8, "video", None),
    ],
    3: [
        ("barra menu",             ( 150,  85, 1760,  165), 1, "video", None),
        ("nota: cerchio",          (1552, 155, 1880,  290), 2, "bianco", None),
        ("nota: pneumatico",       (  70, 405,  410,  615), 2, "bianco", None),
        ("nota: pinza",            (1545, 518, 1895,  685), 2, "bianco", None),
        ("nota: disco",            (  60, 678,  355,  808), 2, "bianco", None),
        ("nota: campana",          (  40, 812,  345,  885), 2, "bianco", None),
        # Finestre strette attraverso la linea: un rettangolo ampio
        # raccoglierebbe anche i bordi del cerchione, che nella maschera del
        # chiaro sono forti quanto il tratto.
        ("linea: pinza",           (1300, 570, 1400,  596), 1, "bianco", None),
        ("linea: cerchio",         (1400, 205, 1490,  228), 1, "bianco", None),
        ("linea: pneumatico",      ( 450, 300,  560,  325), 1, "bianco", None),
        ("linea: disco",           ( 560, 600,  700,  622), 1, "bianco", None),
    ],
}

BLOCKS = {
    1: {"mockup": "1.png", "bg": "bg-1.png", "shot_ui": "ui-1.png", "shot_bg": "bg-1.png"},
    2: {"mockup": "2.png", "bg": "bg-2.png", "shot_ui": "ui-2.png", "shot_bg": "bg-2.png"},
    3: {"mockup": "3.png", "bg": "bg-3.png", "shot_ui": "ui-3.png", "shot_bg": "bg-3.png"},
}

# Il menu vive nella posizione del mockup 1 anche nei blocchi 2 e 3: e' una
# deroga voluta e documentata, quindi qui si dichiara lo scostamento atteso
# invece di segnalarlo come errore. Valori misurati per template matching.
MENU_OFFSET = {1: (0, 0), 2: (6, -56), 3: (-3, -63)}

# Nei mockup la pastiglia di evidenziazione sta sempre su "Vieni a trovarci".
# Nella pagina invece segue la scena, per richiesta esplicita: sul blocco 1 e'
# su "Servizi", sul 2 su "Contenuti", sul 3 su "Recensioni". Le righe qui sotto
# confrontano quindi due cose diverse per costruzione: si misurano lo stesso,
# perche' sparire dal rapporto sarebbe peggio, ma non contano come scarto.
EVIDENZIAZIONE = {
    1: {"menu: Servizi", "menu: Contenuti", "bottone chiaro"},
    2: {"menu: Contenuti", "menu: Servizi", "menu: Recensioni", "bottone chiaro"},
    3: {"menu: Recensioni", "menu: Contenuti", "menu: Vieni a trovarci", "bottone chiaro"},
}

BORDER = 5


def imread(path):
    im = cv2.imread(path, cv2.IMREAD_UNCHANGED)
    if im is None:
        sys.exit("manca " + path)
    if im.ndim == 3 and im.shape[2] == 4:
        im = cv2.cvtColor(im, cv2.COLOR_BGRA2BGR)
    return im


def ink(fore, back, thr=THRESHOLD, border=0):
    h = min(fore.shape[0], back.shape[0])
    w = min(fore.shape[1], back.shape[1])
    d = np.abs(fore[:h, :w].astype(np.int16) - back[:h, :w].astype(np.int16)).max(axis=2)
    m = (d > thr).astype(np.uint8)
    if border:
        m[:border, :] = 0
        m[-border:, :] = 0
        m[:, :border] = 0
        m[:, -border:] = 0
    return m


def local_ink(img, container, thr=THRESHOLD, kernel=71):
    """Inchiostro rispetto allo sfondo LOCALE, dentro un contenitore pieno.

    Le due polarita' (testo piu' chiaro / piu' scuro del fondo) vanno tenute
    separate e non unite con un massimo: unendole si accende sempre tutto il
    contenitore. Si tiene quella che accende meno pixel, perche' il testo e'
    la minoranza della sua riga.
    """
    cx0, cy0, cx1, cy1 = container
    g = cv2.cvtColor(img[cy0:cy1, cx0:cx1], cv2.COLOR_BGR2GRAY)
    k = cv2.getStructuringElement(cv2.MORPH_RECT, (kernel, 1))
    lighter = (cv2.subtract(g, cv2.morphologyEx(g, cv2.MORPH_OPEN, k)) > thr).astype(np.uint8)
    darker = (cv2.subtract(cv2.morphologyEx(g, cv2.MORPH_CLOSE, k), g) > thr).astype(np.uint8)
    chosen = lighter if lighter.sum() <= darker.sum() else darker
    full = np.zeros(img.shape[:2], np.uint8)
    full[cy0:cy1, cx0:cx1] = chosen
    return full


def bbox(mask, roi, min_run):
    x0, y0, x1, y1 = roi
    sub = mask[y0:y1, x0:x1]
    cols = sub.sum(axis=0)
    rows = sub.sum(axis=1)
    xs = np.where(cols >= min_run)[0]
    ys = np.where(rows >= min_run)[0]
    if not len(xs) or not len(ys):
        return None
    total = float(sub.sum())
    cy = float((np.arange(sub.shape[0]) * rows).sum() / total) if total else 0.0
    cx = float((np.arange(sub.shape[1]) * cols).sum() / total) if total else 0.0
    return {
        "x": int(xs.min()) + x0, "y": int(ys.min()) + y0,
        "w": int(xs.max() - xs.min()) + 1, "h": int(ys.max() - ys.min()) + 1,
        "cx": cx + x0, "cy": cy + y0, "mass": int(total),
    }


def run(block):
    cfg = BLOCKS[block]
    mock = imread(os.path.join(MOCK, cfg["mockup"]))
    mock_bg = imread(os.path.join(TOOLS, cfg["bg"]))
    shot_ui = imread(os.path.join(SHOTS, cfg["shot_ui"]))
    shot_bg = imread(os.path.join(SHOTS, cfg["shot_bg"]))

    ink_mock = ink(mock, mock_bg, border=BORDER)
    ink_shot = ink(shot_ui, shot_bg)

    # Sulla ruota del blocco 3 la sola differenza col video non basta: la
    # ricostruzione dello sfondo lascia i bordi del cerchione, forti quanto il
    # testo. Si incrocia allora con una soglia su chiarezza e bassa saturazione,
    # che il metallo dorato non supera. Stessa identica operazione sulle due
    # immagini, altrimenti il confronto non significherebbe nulla.
    def bianco(img, base):
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        bright = ((hsv[:, :, 1] < 60) & (hsv[:, :, 2] > 170)).astype(np.uint8)
        return (bright & base).astype(np.uint8)

    white_mock = bianco(mock, ink_mock)
    white_shot = bianco(shot_ui, ink_shot)

    cv2.imwrite(os.path.join(SHOTS, "ink-mock-%d.png" % block), ink_mock * 255)
    cv2.imwrite(os.path.join(SHOTS, "ink-shot-%d.png" % block), ink_shot * 255)

    # Sovrapposizione per l'ispezione a occhio: mockup in magenta, rendering in verde.
    over = np.zeros((*ink_mock.shape, 3), np.uint8)
    over[:, :, 2] = ink_mock * 255
    over[:, :, 0] = ink_mock * 255
    h = min(over.shape[0], ink_shot.shape[0])
    w = min(over.shape[1], ink_shot.shape[1])
    over[:h, :w, 1] = np.maximum(over[:h, :w, 1], ink_shot[:h, :w] * 255)
    cv2.imwrite(os.path.join(SHOTS, "overlay-%d.png" % block), over)

    mdx, mdy = MENU_OFFSET[block]
    rows = []
    print("=== blocco %d  (mockup %s)" % (block, cfg["mockup"]))
    print("    %-22s %-26s %-26s %s" % ("elemento", "mockup  x,y  w x h", "render  x,y  w x h", "scarto  dx,dy  dw,dh"))
    for name, roi, min_run, mode, container in ELEMENTS[block]:
        # Gli elementi della barra nei mockup 2 e 3 stanno piu' in alto: si
        # sposta la regione sul mockup, non il risultato.
        shift = (mdx, mdy) if name.startswith(("barra menu", "menu:", "bottone")) else (0, 0)
        roi_m = tuple(v + shift[i % 2] for i, v in enumerate(roi))
        if mode == "testo":
            con_m = tuple(v + shift[i % 2] for i, v in enumerate(container))
            a = bbox(local_ink(mock, con_m), roi_m, min_run)
            b = bbox(local_ink(shot_ui, container), roi, min_run)
        elif mode == "bianco":
            a = bbox(white_mock, roi_m, min_run)
            b = bbox(white_shot, roi, min_run)
        else:
            a = bbox(ink_mock, roi_m, min_run)
            b = bbox(ink_shot, roi, min_run)
        if a is None or b is None:
            print("    %-22s %s" % (name, "inchiostro non trovato (%s)" % ("mockup" if a is None else "render")))
            rows.append({"name": name, "found": False})
            continue
        dx = b["x"] - (a["x"] - shift[0])
        dy = b["y"] - (a["y"] - shift[1])
        dw = b["w"] - a["w"]
        dh = b["h"] - a["h"]
        worst = max(abs(dx), abs(dy), abs(dw), abs(dh))
        # Nei blocchi 2 e 3 la barra del menu e' spostata di proposito (vedi
        # REPORT.md): si misura lo stesso, ma non conta come scarto.
        informative = (name == "barra menu" and block != 1)             or name in EVIDENZIAZIONE.get(block, set())
        flag = "i " if informative else (
            "  " if worst <= TOLERANCE else ("~ " if worst <= 2 * TOLERANCE else "! "))
        print("  %s %-22s %5d,%-5d %4dx%-4d      %5d,%-5d %4dx%-4d      %+4d,%+4d  %+4d,%+4d"
              % (flag, name, a["x"], a["y"], a["w"], a["h"], b["x"], b["y"], b["w"], b["h"], dx, dy, dw, dh))
        rows.append({"name": name, "found": True, "mockup": a, "render": b,
                     "dx": dx, "dy": dy, "dw": dw, "dh": dh, "worst": worst,
                     "informative": informative})
    bad = [r for r in rows if r.get("found") and not r.get("informative") and r["worst"] > TOLERANCE]
    print("    %d elementi su %d entro %.0f px" % (len(rows) - len(bad) - sum(1 for r in rows if not r.get("found")),
                                                   len(rows), TOLERANCE))
    return rows


if __name__ == "__main__":
    which = [int(sys.argv[1])] if len(sys.argv) > 1 else [1, 2, 3]
    report = {}
    for b in which:
        report[b] = run(b)
        print()
    with open(os.path.join(TOOLS, "pixel-report.json"), "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=2, ensure_ascii=False)
