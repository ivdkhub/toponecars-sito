# -*- coding: utf-8 -*-
"""Risolve font-size e letter-spacing confrontando mockup e rendering.

Il metodo e' quello imposto dalla specifica: si misura larghezza e altezza della
stringa nel mockup, si misura la STESSA stringa nel rendering e si risolve per
font-size e letter-spacing, invece di indovinare a occhio.

Le incognite sono tre, e tre sono le misure che le determinano:

    altezza   H = b * f                    -> font-size
    larghezza W = a * f + (n-1) * l         -> letter-spacing (n = caratteri)
    densita'  C = massa / (W*H)             -> font-weight (solo lo spessore dei
                                               tratti cambia la densita')

Da una misura del rendering con (f, l, peso) noti:

    f' = f * H_mock / H_render
    l' = ( W_mock - (W_render - (n-1)*l) * H_mock/H_render ) / (n-1)
    peso' = peso * (C_mock / C_render) ** ALPHA

Trascurare il peso e' l'errore classico: il ciclo compenserebbe un carattere
troppo stretto con un tracking assurdo, e il testo resterebbe diverso.

L'inchiostro e' estratto dalle due immagini con la stessa identica pipeline, cosi'
l'allargamento dovuto all'antialiasing e' presente in entrambe le misure e si
semplifica nel rapporto. Bastano due o tre passate per convergere.

Uso:
    node tools/pixel-shoot.js && python tools/fit-type.py
    python tools/fit-type.py --dry        misura e stampa senza riscrivere nulla
"""
import json
import os
import re
import sys

import cv2
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import targets as T  # noqa: E402

ROOT = T.ROOT
TOOLS = T.TOOLS
SHOTS = os.path.join(TOOLS, "shots")
TYPE_CSS = os.path.join(ROOT, "assets", "css", "type.css")

# Il rendering di ogni blocco vive nello scatto del blocco corrispondente.
SHOT_OF_MOCKUP = {"1": 1, "2": 2, "3": 3}

# specimen -> (variabile font-size, variabile letter-spacing)
VARS = {
    "menu.servizi": ("--menu-link-fs", "--menu-link-ls"),
    "menu.contenuti": ("--menu-link-fs", "--menu-link-ls"),
    "menu.recensioni": ("--menu-link-fs", "--menu-link-ls"),
    "menu.vieni": ("--menu-cta-fs", "--menu-cta-ls"),
    "menu.testdrive": ("--menu-ghost-fs", "--menu-ghost-ls"),
    "b1.title1": ("--b1-title1-fs", "--b1-title1-ls"),
    "b1.title2": ("--b1-title2-fs", "--b1-title2-ls"),
    "b1.value1": ("--b1-value-fs", "--b1-value-ls"),
    "b1.value2": ("--b1-value-fs", "--b1-value-ls"),
    "b1.value3": ("--b1-value-fs", "--b1-value-ls"),
    "b1.label1": ("--b1-label-fs", "--b1-label-ls"),
    "b1.label2": ("--b1-label-fs", "--b1-label-ls"),
    "b1.label3": ("--b1-label-fs", "--b1-label-ls"),
    "b2.line1": ("--b2-line-fs", "--b2-line-ls"),
    "b2.line2": ("--b2-line-fs", "--b2-line-ls"),
    "b2.line3": ("--b2-line-fs", "--b2-line-ls"),
}
NOTE_VARS = ("--b3-note-fs", "--b3-note-ls")

# specimen -> variabile del peso. Aldrich ha un solo peso, quindi le note non
# compaiono qui.
WEIGHT_VARS = {
    "menu.servizi": "--menu-link-w", "menu.contenuti": "--menu-link-w",
    "menu.recensioni": "--menu-link-w",
    "menu.vieni": "--menu-cta-w", "menu.testdrive": "--menu-ghost-w",
    "b1.title1": "--b1-title1-w", "b1.title2": "--b1-title2-w",
    "b1.value1": "--b1-value-w", "b1.value2": "--b1-value-w", "b1.value3": "--b1-value-w",
    "b1.label1": "--b1-label-w", "b1.label2": "--b1-label-w", "b1.label3": "--b1-label-w",
    "b2.line1": "--b2-line-w", "b2.line2": "--b2-line-w", "b2.line3": "--b2-line-w",
}

# La densita' d'inchiostro cresce circa come il peso elevato a 0.55, quindi per
# invertirla si usa l'esponente reciproco.
WEIGHT_ALPHA = 1.6
WEIGHT_DAMP = 0.3
WEIGHT_RANGE = (250.0, 700.0)

# Il peso NON viene adattato automaticamente, ed e' una scelta, non una
# dimenticanza. La densita' d'inchiostro dovrebbe determinarlo in modo
# indipendente da dimensione e spaziatura, ma la soglia che estrae l'inchiostro
# risente del contrasto: sui testi semitrasparenti (il titolo fantasma al 21%,
# il bottone chiaro) mangia i bordi e restituisce un peso gonfiato. Peggio, peso
# e letter-spacing governano entrambi la larghezza, quindi adattarli insieme
# rende il sistema indeterminato e il ciclo oscilla invece di convergere
# (verificato: il peso della card saliva 480 -> 519 -> 582 -> 618 senza fermarsi).
#
# Tenendo il peso a 400 il tracking residuo resta piccolo e credibile
# (|ls| < 0.05 em su tutto tranne le note in Aldrich, dichiaratamente spaziate),
# e il sistema torna ben posto: due misure, due incognite.
WEIGHT_FITTED = set()

# Anche font-size e letter-spacing vengono smorzati: le tre grandezze si
# influenzano a vicenda e un passo pieno farebbe oscillare il ciclo.
FS_DAMP = 0.7
LS_DAMP = 0.7

# Correzioni di posizione: quale variabile muovere in base allo scarto misurato.
# dx e dy sono in unita' di design e vengono sommati al valore corrente.
PREV_LINE = {"b1.title2": "b1.title1", "b2.line2": "b2.line1"}

# Riquadro pieno che fa da fondo a un testo: limita la finestra della morfologia.
CONTAINER_OF = {
    "menu.servizi": "menu", "menu.contenuti": "menu", "menu.recensioni": "menu",
    "menu.vieni": "menu.vieni", "menu.testdrive": "menu.testdrive",
    "b1.value1": "card1", "b1.label1": "card1",
    "b1.value2": "card2", "b1.label2": "card2",
    "b1.value3": "card3", "b1.label3": "card3",
}

POSITION = {
    "b1.title1": {"x": "--b1-title-x", "y": "--b1-title-y"},
    "b1.title2": {"gap": "--b1-title-gap"},
    "b1.value1": {"y": "--b1-value-y"},
    "b1.label1": {"y": "--b1-label-y"},
    "b2.line1": {"x": "--b2-line-x", "y": "--b2-line-y"},
    "b2.line2": {"height": "--b2-line-height"},
}


def read_css():
    txt = open(TYPE_CSS, encoding="utf-8").read()
    vals = {m.group(1): float(m.group(2))
            for m in re.finditer(r"(--[a-z0-9-]+):\s*(-?[\d.]+);", txt)}
    return txt, vals


def write_css(txt, vals):
    def sub(m):
        name = m.group(1)
        if name in vals:
            return "%s: %s;" % (name, fmt(vals[name]))
        return m.group(0)
    out = re.sub(r"(--[a-z0-9-]+):\s*-?[\d.]+;", sub, txt)
    open(TYPE_CSS, "w", encoding="utf-8").write(out)


def fmt(v):
    r = round(v, 3)
    return ("%.3f" % r).rstrip("0").rstrip(".") if r != int(r) else str(int(r))


def shot(block, kind):
    p = os.path.join(SHOTS, "%s-%d.png" % (kind, block))
    im = cv2.imread(p, cv2.IMREAD_UNCHANGED)
    if im is None:
        sys.exit("manca lo scatto %s — esegui prima: node tools/pixel-shoot.js" % p)
    if im.ndim == 3 and im.shape[2] == 4:
        im = cv2.cvtColor(im, cv2.COLOR_BGRA2BGR)
    return im


SHOTCACHE = {}


def render_masks(block):
    if block not in SHOTCACHE:
        ui = shot(block, "ui")
        bg = shot(block, "bg")
        h = min(ui.shape[0], bg.shape[0])
        w = min(ui.shape[1], bg.shape[1])
        d = np.abs(ui[:h, :w].astype(np.int16) - bg[:h, :w].astype(np.int16)).max(axis=2)
        SHOTCACHE[block] = (ui, (d > T.THR).astype(np.uint8))
    return SHOTCACHE[block]


def render_text_mask(ui, container, kernel=71):
    # Stessa identica funzione usata sul mockup: e' il punto in cui le due
    # misure devono essere confrontabili.
    return T.text_mask(ui, container, kernel)


RECTS = {}


def rects(block):
    if block not in RECTS:
        p = os.path.join(SHOTS, "rects-%d.json" % block)
        RECTS[block] = json.load(open(p, encoding="utf-8")) if os.path.exists(p) else {}
    return RECTS[block]


def render_roi(block, sid, pad=6):
    """Regione di misura ricavata dal box dell'elemento, allargata di poco.

    Serve perche' nel rendering un testo di larghezza diversa si sposta: una
    regione fissa lo taglierebbe e la misura direbbe una sciocchezza.
    """
    r = rects(block).get(sid)
    if not r:
        return None
    ui, _ = render_masks(block)
    h, w = ui.shape[:2]
    return (max(0, int(r["x"]) - pad), max(0, int(r["y"]) - pad),
            min(w, int(r["x"] + r["w"]) + pad + 1), min(h, int(r["y"] + r["h"]) + pad + 1))


def box_in_line(mask, line_box, pad_x=10):
    """Riquadro d'inchiostro di UNA riga di testo.

    Il box CSS di una riga e' alto quanto la line-height, che qui e' piu' stretta
    dell'occhio del carattere: le aste salgono e le code scendono oltre il box,
    mentre appena sopra e sotto c'e' la riga vicina. Si guardano quindi le
    componenti connesse in una finestra allargata e si tengono solo quelle il cui
    centro cade dentro il box della riga.
    """
    x0, y0, x1, y1 = line_box
    hgt = max(4, y1 - y0)
    wx0 = max(0, x0 - pad_x)
    wx1 = min(mask.shape[1], x1 + pad_x)
    wy0 = max(0, int(y0 - hgt * 0.7))
    wy1 = min(mask.shape[0], int(y1 + hgt * 0.7))
    sub = (mask[wy0:wy1, wx0:wx1] * 255).astype(np.uint8)
    num, lab, stats, cent = cv2.connectedComponentsWithStats(sub, 8)
    parts = []
    for i in range(1, num):
        bx, by, bw, bh, area = stats[i]
        if area < 3:
            continue
        # Con interlinee strettissime la coda di una lettera tocca l'asta della
        # riga sotto e le due diventano una macchia sola: una componente molto
        # piu' alta del box di riga appartiene a due righe e va scartata.
        if bh > hgt * 1.25:
            continue
        # Nessuna tolleranza sul centro: un glifo appartiene alla riga il cui
        # box contiene il suo centro. Allargando anche di poco si finisce per
        # inglobare la riga vicina (nella card, la didascalia sotto al numero).
        cy = wy0 + by + bh / 2.0
        if not (y0 <= cy <= y1):
            continue
        parts.append((bx, by, bw, bh, area))
    if not parts:
        return None
    px0 = min(p[0] for p in parts); py0 = min(p[1] for p in parts)
    px1 = max(p[0] + p[2] for p in parts); py1 = max(p[1] + p[3] for p in parts)
    mass = int(sub[py0:py1, px0:px1].sum() // 255)
    return {"x": px0 + wx0, "y": py0 + wy0, "w": px1 - px0, "h": py1 - py0, "mass": mass}


CARD_SPECIMENS = {
    "b1.value1": ("card1", 0), "b1.label1": ("card1", 1),
    "b1.value2": ("card2", 0), "b1.label2": ("card2", 1),
    "b1.value3": ("card3", 0), "b1.label3": ("card3", 1),
}


def measure_card(sid):
    """Numero e didascalia di una card, separati dal vuoto che li divide.

    Non si usano i box CSS delle due righe: nella card stanno a contatto, e
    appena una correzione di margine li fa sovrapporre l'assegnazione dei glifi
    all'una o all'altra riga si inverte e il ciclo di adattamento comincia a
    oscillare. Il vuoto orizzontale fra numero e didascalia, invece, c'e' sempre.
    """
    owner, which = CARD_SPECIMENS[sid]
    r = rects(1).get(owner)
    if not r:
        return None
    ui, _ = render_masks(1)
    inset = 4
    cont = (int(r["x"]) + inset, int(r["y"]) + inset,
            int(r["x"] + r["w"]) - inset, int(r["y"] + r["h"]) - inset)
    mask = render_text_mask(ui, cont)
    sub = mask[cont[1]:cont[3], cont[0]:cont[2]]
    rows = sub.sum(axis=1)
    on = rows > 0
    bands = []
    start = None
    for i, v in enumerate(on):
        if v and start is None:
            start = i
        elif not v and start is not None:
            bands.append((start, i))
            start = None
    if start is not None:
        bands.append((start, len(on)))
    # fonde le bande separate da un vuoto di uno o due pixel (i puntini della i,
    # le code sottili) e scarta quel che resta troppo esile per essere una riga
    merged = []
    for b in bands:
        if merged and b[0] - merged[-1][1] <= 2:
            merged[-1] = (merged[-1][0], b[1])
        else:
            merged.append(b)
    bands = [b for b in merged if b[1] - b[0] >= 6]
    if len(bands) < 2:
        return None
    # la banda piu' alta e' il numero, l'ultima e' la didascalia
    a, b = (bands[0], bands[-1])
    band = a if which == 0 else b
    strip = sub[band[0]:band[1]]
    cols = strip.sum(axis=0)
    xs = np.where(cols > 0)[0]
    if not len(xs):
        return None
    x0, x1 = int(xs.min()), int(xs.max())
    return {"x": x0 + cont[0], "y": band[0] + cont[1],
            "w": x1 - x0 + 1, "h": band[1] - band[0],
            "mass": int(strip[:, x0:x1 + 1].sum())}


def measure_render(sid, mockup, roi, mode, container, min_run):
    if sid in CARD_SPECIMENS:
        return measure_card(sid)
    block = SHOT_OF_MOCKUP[mockup]
    ui, video = render_masks(block)
    line_box = render_roi(block, sid, pad=0)
    if line_box is None:
        return T.box(video if mode != "testo" else render_text_mask(ui, container), roi, min_run)
    if mode == "testo":
        # Il contenitore del rendering si allarga attorno al testo ma non puo'
        # uscire dal riquadro pieno che gli fa da fondo (la card, la barra): fuori
        # da li' c'e' il video e la morfologia perderebbe senso.
        cont = [max(0, line_box[0] - 70), max(0, line_box[1] - 6),
                min(ui.shape[1], line_box[2] + 70), min(ui.shape[0], line_box[3] + 6)]
        owner = rects(block).get(CONTAINER_OF.get(sid, ""))
        if owner:
            cont[0] = max(cont[0], int(owner["x"]) + 3)
            cont[2] = min(cont[2], int(owner["x"] + owner["w"]) - 3)
        mask = render_text_mask(ui, tuple(cont))
    else:
        mask = video
    return box_in_line(mask, line_box)


def to_design(mockup, b):
    if b is None:
        return None
    return T.design(mockup, b)


def main():
    dry = "--dry" in sys.argv
    tg = json.load(open(os.path.join(TOOLS, "targets.json"), encoding="utf-8"))
    txt, vals = read_css()
    proposals = {}          # variabile -> lista di valori proposti
    measured = {}           # specimen -> misure, per le correzioni di posizione
    print("%-16s %-28s %-28s %s" % ("specimen", "mockup  w x h  (design)", "render  w x h  (design)", "correzione"))

    def note(var, value):
        proposals.setdefault(var, []).append(value)

    for sid, mockup, text, family, roi, mode, container, min_run in T.SPECIMENS:
        target = tg["specimens"].get(sid)
        if not target:
            continue
        r = to_design(mockup, measure_render(sid, mockup, roi, mode, container, min_run))
        if r is None:
            print("%-16s inchiostro non trovato nel rendering" % sid)
            continue
        m = target["design"]
        n = len(text)
        fs_var, ls_var = VARS[sid]
        fs, ls = vals[fs_var], vals[ls_var]
        k = m["h"] / r["h"]
        fs_new = fs + (fs * k - fs) * FS_DAMP
        ls_raw = (m["w"] - (r["w"] - (n - 1) * ls) * k) / (n - 1)
        ls_new = ls + (ls_raw - ls) * LS_DAMP
        note(fs_var, fs_new)
        note(ls_var, ls_new)

        w_var = WEIGHT_VARS.get(sid)
        w_new = None
        if w_var in WEIGHT_FITTED and r["coverage"] > 0:
            w = vals[w_var]
            raw = w * (m["coverage"] / r["coverage"]) ** WEIGHT_ALPHA
            w_new = min(max(w + (raw - w) * WEIGHT_DAMP, WEIGHT_RANGE[0]), WEIGHT_RANGE[1])
            note(w_var, w_new)
        measured[sid] = {"mockup": m, "render": r}
        print("%-16s %7.2f x %-6.2f c%.3f   %7.2f x %-6.2f c%.3f   fs %6.2f>%6.2f  ls %+5.2f>%+5.2f  peso %s"
              % (sid, m["w"], m["h"], m["coverage"], r["w"], r["h"], r["coverage"],
                 fs, fs_new, ls, ls_new,
                 ("%3.0f>%3.0f" % (vals[w_var], w_new)) if w_new is not None else "  -"))

    # --- note del blocco 3: una sola coppia di parametri per tutte le righe ----
    for nid, spec in T.NOTE_BLOCKS.items():
        entry = tg["notes"].get(nid)
        if not entry:
            continue
        res = render_note_lines(nid, spec, len(spec["lines"]))
        if not res:
            print("%-16s righe non trovate nel rendering" % nid)
            continue
        rlines, _ = res
        fs, ls = vals[NOTE_VARS[0]], vals[NOTE_VARS[1]]
        ks, lss = [], []
        for tline, rbox in zip(entry["lines"], rlines):
            if not tline["design"] or rbox is None:
                continue
            rd = T.design("3", rbox)
            n = len(tline["text"])
            if n < 2 or rd["h"] <= 0:
                continue
            k = tline["design"]["h"] / rd["h"]
            ks.append(k)
            lss.append((tline["design"]["w"] - (rd["w"] - (n - 1) * ls) * k) / (n - 1))
        if len(ks) >= 3:
            # mediana: qualche riga e' sporcata dai bordi della ruota. Sotto le
            # tre righe utili la mediana non e' affidabile e si preferisce non
            # toccare nulla piuttosto che inseguire una misura sbagliata.
            k = float(np.median(ks))
            k = min(max(k, 0.85), 1.18)      # un passo non puo' stravolgere la misura
            note(NOTE_VARS[0], fs * k)
            note(NOTE_VARS[1], float(np.median(lss)))
            print("%-16s %d righe utili   fs %6.2f -> %6.2f   ls %+5.2f -> %+5.2f"
                  % (nid, len(ks), fs, fs * k, ls, float(np.median(lss))))

    # --- posizioni: si somma lo scarto misurato del riquadro d'inchiostro ------
    for sid, knobs in POSITION.items():
        mm = measured.get(sid)
        if not mm:
            continue
        m, r = mm["mockup"], mm["render"]
        if "x" in knobs:
            note(knobs["x"], vals[knobs["x"]] + (m["x"] - r["x"]))
        if "y" in knobs:
            note(knobs["y"], vals[knobs["y"]] + (m["y"] - r["y"]))
        if "gap" in knobs:
            # distanza fra la riga precedente e questa: la si corregge sulla
            # differenza di quota, non sulla posizione assoluta
            prev = measured.get(PREV_LINE[sid])
            if prev:
                dm = m["y"] - prev["mockup"]["y"]
                dr = r["y"] - prev["render"]["y"]
                note(knobs["gap"], vals[knobs["gap"]] + (dm - dr))
        if "height" in knobs:
            prev = measured.get(PREV_LINE[sid])
            if prev:
                dm = m["y"] - prev["mockup"]["y"]
                dr = r["y"] - prev["render"]["y"]
                note(knobs["height"], vals[knobs["height"]] + (dm - dr))

    print()
    changed = {}
    for var, values in proposals.items():
        new = float(np.median(values))
        old = vals[var]
        if abs(new - old) > 1e-3:
            changed[var] = new
            print("  %-20s %8s -> %-8s  (%d misure)" % (var, fmt(old), fmt(new), len(values)))
    if not changed:
        print("  nessuna correzione: i parametri sono gia' a posto")
    if dry:
        print("\n(--dry: type.css non e' stato toccato)")
        return
    vals.update(changed)
    write_css(txt, vals)
    print("\naggiornato assets/css/type.css")


def render_note_lines(nid, spec, count):
    ui, video = render_masks(3)
    hsv = cv2.cvtColor(ui, cv2.COLOR_BGR2HSV)
    bright = ((hsv[:, :, 1] < 60) & (hsv[:, :, 2] > 170)).astype(np.uint8)
    mask = (bright & video).astype(np.uint8)
    roi = render_roi(3, nid, pad=8) or spec["roi"]
    return T.segment_lines(mask, roi, count)


if __name__ == "__main__":
    main()
