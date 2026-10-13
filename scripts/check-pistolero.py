"""Comprueba que cada ejercicio del Pistolero imprime exactamente su salida esperada.

Uso (desde la raíz del proyecto):
    python scripts/check-pistolero.py

Lee lib/game/raid/pistolero-ejercicios.ts con Node (strip-types), corre cada
`solution` (Python con exec, SQL con sqlite3 en memoria, filas `col1|col2`) y
la compara con `expected` igual que el servidor (normalizeOutput).
"""
import contextlib
import io
import json
import pathlib
import sqlite3
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = (ROOT / "lib/game/raid/pistolero-ejercicios.ts").as_uri()

dump = subprocess.run(
    ["node", "--no-warnings", "--experimental-strip-types", "--input-type=module", "-e",
     f"const m = await import({json.dumps(SRC)}); console.log(JSON.stringify(m.PISTOLERO_EXERCISES))"],
    capture_output=True, text=True, encoding="utf-8", check=True,
)
exercises = json.loads(dump.stdout)


def normalize(s: str) -> str:
    return "\n".join(line.rstrip() for line in s.strip().replace("\r\n", "\n").split("\n"))


def run_python(code: str) -> str:
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        exec(code, {})
    return buf.getvalue()


def run_sql(seed: str, code: str) -> str:
    db = sqlite3.connect(":memory:")
    db.executescript(seed)
    rows = db.execute(code).fetchall()
    return "\n".join("|".join(str(v) for v in row) for row in rows)


fails = 0
for e in exercises:
    try:
        out = run_python(e["solution"]) if e["type"] == "python" else run_sql(e.get("seedSQL", ""), e["solution"])
    except Exception as exc:  # noqa: BLE001
        out = f"ERROR: {exc}"
    ok = normalize(out) == normalize(e["expected"])
    fails += not ok
    print(("OK  " if ok else "MAL ") + f"{e['id']:<14} {e['tier']:<8} {e['title']}")
    if not ok:
        print("   esperado:", repr(normalize(e["expected"])))
        print("   salió:   ", repr(normalize(out)))

print(f"\n{len(exercises) - fails}/{len(exercises)} ejercicios bien")
sys.exit(1 if fails else 0)
