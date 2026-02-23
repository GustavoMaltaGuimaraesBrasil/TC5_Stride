#!/usr/bin/env python
"""
Prepara os arquivos do dataset baixado manualmente.

Faz a normalização dos nomes, copia as imagens para `data/raw/images`
e cria um manifesto JSON com metadados por arquivo.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import unicodedata
from datetime import datetime
from pathlib import Path
from typing import Iterable


SUPPORTED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".svg"}


def normalize_filename(name: str) -> str:
    name = name.strip().replace(" ", "_")
    normalized = unicodedata.normalize("NFKD", name)
    normalized = normalized.encode("ascii", "ignore").decode("ascii")
    normalized = re.sub(r"[^A-Za-z0-9._-]", "", normalized)
    if not normalized:
        return "image"
    return normalized.lower()


def iter_images(root: Path, extensions: set[str]) -> Iterable[Path]:
    for path in root.rglob("*"):
        if path.is_file() and path.suffix.lower() in extensions:
            yield path


def sha1_of_file(path: Path) -> str:
    hash_obj = hashlib.sha1()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(8192), b""):
            hash_obj.update(chunk)
    return hash_obj.hexdigest()


def copy_images(
    source: Path,
    destination: Path,
    extensions: set[str],
    skip_existing: bool,
) -> list[dict]:
    destination.mkdir(parents=True, exist_ok=True)
    existing: set[str] = set(p.name for p in destination.iterdir() if p.is_file())
    entries: list[dict] = []

    for original in iter_images(source, extensions):
        stem = normalize_filename(original.stem)
        ext = original.suffix.lower()
        candidate = f"{stem}{ext}"
        counter = 1
        while candidate in existing:
            candidate = f"{stem}_{counter}{ext}"
            counter += 1
        existing.add(candidate)
        target = destination / candidate

        if skip_existing and target.exists():
            continue

        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(original.read_bytes())  # copy2 alternatives could preserve metadata

        entries.append(
            {
                "original_path": str(original),
                "target_path": str(target),
                "normalized_name": candidate,
                "extension": ext,
                "size_bytes": original.stat().st_size,
                "sha1": sha1_of_file(target),
            }
        )

    return entries


def write_manifest(manifest_path: Path, data: dict) -> None:
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(data, indent=2, ensure_ascii=True))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Prepara o dataset de diagramas.")
    parser.add_argument(
        "--source",
        type=Path,
        default=Path("data/software-architecture-dataset"),
        help="Pasta onde o dataset (PNG/JPG/SVG) foi baixado.",
    )
    parser.add_argument(
        "--dest",
        type=Path,
        default=Path("data/raw/images"),
        help="Destino das imagens normalizadas.",
    )
    parser.add_argument(
        "--manifest",
        type=Path,
        default=Path("data/raw/manifest.json"),
        help="Arquivo JSON resumindo os arquivos preparados.",
    )
    parser.add_argument(
        "--extensions",
        type=str,
        help="Extensões adicionais separadas por vírgula (ex: .bmp,.tiff).",
    )
    parser.add_argument(
        "--skip-existing",
        action="store_true",
        help="Não sobrescrever arquivos já existentes em --dest.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    source = args.source.expanduser().resolve()
    dest = args.dest.expanduser().resolve()
    manifest_path = args.manifest.expanduser().resolve()
    extensions = SUPPORTED_EXTENSIONS.copy()
    if args.extensions:
        extensions.update(ext.strip().lower() for ext in args.extensions.split(",") if ext.strip())

    if not source.exists():
        raise SystemExit(f"Fonte não encontrada: {source}")

    copied = copy_images(source, dest, extensions, args.skip_existing)
    manifest = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "source": str(source),
        "destination": str(dest),
        "total_copied": len(copied),
        "files": copied,
    }

    write_manifest(manifest_path, manifest)
    print(f"{len(copied)} arquivos preparados em {dest}")
    print(f"Manifesto salvo em {manifest_path}")


if __name__ == "__main__":
    main()
