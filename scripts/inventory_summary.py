#!/usr/bin/env python
"""
Converte o inventário em docs/inventario_dataset.md para JSON estruturado.

Ajuda a visualizar rapidamente quais fontes já estão aprovadas, pendentes ou restritas
e pode ser usado no pipeline de coleta/anotação.
"""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, Sequence


def normalize_header(value: str) -> str:
    sanitized = unicodedata.normalize("NFKD", value)
    sanitized = sanitized.encode("ascii", "ignore").decode("ascii")
    sanitized = sanitized.lower()
    sanitized = re.sub(r"[^a-z0-9]+", "_", sanitized)
    sanitized = sanitized.strip("_")
    return sanitized or "column"


def iter_inventory_rows(lines: Sequence[str], header_index: int, column_count: int) -> Iterable[list[str]]:
    for row in lines[header_index + 2 :]:
        stripped = row.strip()
        if not stripped or not stripped.startswith("|"):
            break
        cells = [cell.strip() for cell in stripped.strip("|").split("|")]
        # Ignore malformed rows that do not match the header cell count
        if len(cells) != column_count:
            continue
        yield cells


def parse_inventory(path: Path) -> list[dict[str, str]]:
    content = path.read_text(encoding="utf-8")
    lines = content.splitlines()
    header_index = next(
        index
        for index, line in enumerate(lines)
        if line.lower().strip().startswith("| id | fonte")
    )
    header_line = lines[header_index]
    headers = [normalize_header(cell) for cell in header_line.strip().strip("|").split("|")]
    entries = []
    for row in iter_inventory_rows(lines, header_index, len(headers)):
        entry = {headers[i]: row[i] for i in range(len(headers))}
        entries.append(entry)
    return entries


def summarize(entries: list[dict[str, str]]) -> dict[str, int]:
    counter = Counter()
    for entry in entries:
        status = entry.get("status", "").lower()
        status = re.sub(r"[^a-z]", "", status)
        status = status or "unknown"
        counter[status] += 1
    return dict(counter)


def main() -> None:
    parser = argparse.ArgumentParser(description="Gera JSON com resumo do inventário de dataset.")
    parser.add_argument(
        "--source",
        type=Path,
        default=Path("docs/inventario_dataset.md"),
        help="Arquivo markdown com a tabela do inventário.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("data/raw/inventory_summary.json"),
        help="Arquivo JSON que será atualizado com os dados parseados.",
    )
    args = parser.parse_args()

    source = args.source.expanduser().resolve()
    if not source.exists():
        raise SystemExit(f"Arquivo não encontrado: {source}")

    entries = parse_inventory(source)
    summary = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_sources": len(entries),
        "status_counts": summarize(entries),
        "entries": entries,
    }

    output_path = args.output.expanduser().resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{len(entries)} fontes registradas no inventário e gravadas em {output_path}")


if __name__ == "__main__":
    main()
