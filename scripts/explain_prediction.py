"""Print a text explanation (in Portuguese) of the model's prediction for a fight. No LLM and no network: see backend/explainer.

Usage (from the repo root):
    python -m scripts.explain_prediction "Alex Pereira" "Israel Adesanya"
    python -m scripts.explain_prediction "Alex Pereira" "Israel Adesanya" --verbose   # also the checks that failed, if any
"""

from __future__ import annotations

import argparse
import io
import logging
import sys
from pathlib import Path

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.explainer.fontes import LutadorNaoEncontrado, LutaInvalida
from backend.explainer.grafo import explicar_luta


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Explain the model's prediction for a fight, in Portuguese.")
    parser.add_argument("fighter_a")
    parser.add_argument("fighter_b")
    parser.add_argument("--verbose", action="store_true", help="say on stderr which checks failed when the short text is printed")
    args = parser.parse_args(argv)

    # The Windows console is not always UTF-8, and the text has accents.
    for stream in (sys.stdout, sys.stderr):
        if isinstance(stream, io.TextIOWrapper):
            stream.reconfigure(encoding="utf-8")
    logging.getLogger("backend").setLevel(logging.WARNING)

    if not args.fighter_a.strip() or not args.fighter_b.strip():
        print("Informe os dois lutadores.", file=sys.stderr)
        return 2
    try:
        estado = explicar_luta(args.fighter_a, args.fighter_b)
    except (LutadorNaoEncontrado, LutaInvalida) as error:
        print(error, file=sys.stderr)
        return 2
    print(estado["texto"])
    if args.verbose and estado["usou_fallback"]:
        print("\nTexto curto usado. Checagens que falharam:", file=sys.stderr)
        for erro in estado["validacao"].erros:
            print(f"- {erro}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
