# -*- coding: utf-8 -*-
"""Scarica Aldrich e Albert Sans da Google Fonts in locale (woff2, subset latin).

I font NON vanno caricati dalla rete a runtime: questo script li porta una volta
sola dentro assets/fonts/ e stampa le regole @font-face da incollare nel CSS.
"""
import os
import re
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEST = os.path.join(ROOT, "assets", "fonts")
# UA moderno: senza, Google Fonts restituisce ttf/eot invece di woff2.
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")

FAMILIES = [
    ("Albert Sans", "Albert+Sans:wght@100..900", "AlbertSans-Variable"),
    ("Aldrich", "Aldrich", "Aldrich-Regular"),
]


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    return urllib.request.urlopen(req, timeout=30).read()


def main():
    os.makedirs(DEST, exist_ok=True)
    faces = []
    for family, spec, basename in FAMILIES:
        css = get("https://fonts.googleapis.com/css2?family=%s&display=block" % spec).decode("utf-8")
        blocks = re.findall(r"/\*\s*([\w\-\[\]]+)\s*\*/\s*@font-face\s*\{(.*?)\}", css, re.S)
        for subset, body in blocks:
            if subset != "latin":            # la pagina e' solo latina: niente peso inutile
                continue
            url = re.search(r"url\((https://[^)]+\.woff2)\)", body).group(1)
            weight = re.search(r"font-weight:\s*([^;]+);", body).group(1).strip()
            name = basename + ".woff2"
            path = os.path.join(DEST, name)
            data = get(url)
            with open(path, "wb") as fh:
                fh.write(data)
            print("%-28s %6.1f KB  weight %s" % (name, len(data) / 1024, weight))
            faces.append((family, name, weight))
    print()
    for family, name, weight in faces:
        print("@font-face{font-family:'%s';src:url('../fonts/%s') format('woff2');"
              "font-weight:%s;font-style:normal;font-display:block;}" % (family, name, weight))


if __name__ == "__main__":
    main()
