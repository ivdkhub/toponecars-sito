#!/usr/bin/env bash
# Ciclo di adattamento tipografico: scatta, misura, corregge, ripete.
# Poche passate bastano perche' ogni passo e' una soluzione, non un tentativo.
set -e
N=${1:-3}
for i in $(seq 1 "$N"); do
  echo "--- passata $i di $N"
  node tools/pixel-shoot.js > /dev/null
  python tools/fit-type.py | tail -25
  echo
done
