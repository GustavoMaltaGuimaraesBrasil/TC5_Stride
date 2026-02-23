#!/usr/bin/env python
"""
Baixa imagens do repositório drawio-diagrams e salva versões normalizadas em data/raw/images.

Isso garante que o dataset tenha imagens reais aprovadas no inventário e permite que o pipeline
já comece com alguns diagramas antes de coletar mais manualmente.
"""

from __future__ import annotations

import argparse
import re
import shutil
import tempfile
import unicodedata
import urllib.request
from pathlib import Path
from typing import Iterable
from zipfile import ZipFile


SUPPORTED_EXTENSIONS = {".png", ".svg", ".jpg", ".jpeg"}


def normalize_filename(name: str) -> str:
    name = name.strip().replace(" ", "_")
    normalized = unicodedata.normalize("NFKD", name)
    normalized = normalized.encode("ascii", "ignore").decode("ascii")
    normalized = re.sub(r"[^A-Za-z0-9._-]", "", normalized)
    if not normalized:
        return "image"
    return normalized.lower()


def download_zip(url: str, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(url) as response, target.open("wb") as stream:
        for chunk in iter(lambda: response.read(8192), b""):
            stream.write(chunk)


def iter_entries(
    archive: ZipFile, extensions: set[str], limit: int, subdirs: Iterable[str]
) -> Iterable[tuple[Path, bytes]]:
    count = 0
    for info in archive.infolist():
        if info.is_dir():
            continue
        path = Path(info.filename)
        if subdirs and not any(part in subdirs for part in path.parts):
            continue
        suffix = path.suffix.lower()
        if suffix not in extensions:
            continue
        data = archive.read(info)
        yield path, data
        count += 1
        if limit and count >= limit:
            break


def write_image(dest: Path, source_path: Path, data: bytes, used_names: set[str]) -> None:
    stem = normalize_filename(source_path.stem)
    ext = source_path.suffix.lower()
    name = f"{stem}{ext}"
    counter = 1
    while name in used_names:
        name = f"{stem}_{counter}{ext}"
        counter += 1
    used_names.add(name)
    target = dest / name
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Baixa imagens aprovadas do repositório drawio-diagrams."
    )
    parser.add_argument(
        "--url",
        type=str,
        default="https://github.com/jgraph/drawio-diagrams/archive/refs/heads/master.zip",
        help="URL do ZIP do repositório contendo diagramas.",
    )
    parser.add_argument(
        "--dest",
        type=Path,
        default=Path("data/raw/images"),
        help="Pasta onde as imagens serão copiadas.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=30,
        help="Número máximo de imagens a extrair.",
    )
    parser.add_argument(
        "--subdirs",
        type=str,
        default="templates,diagrams",
        help="Subdiretórios dentro do zip para priorizar.",
    )
    parser.add_argument(
        "--keep-zip",
        action="store_true",
        help="Não apaga o zip baixado (útil para inspeção).",
    )
    args = parser.parse_args()

    dest = args.dest.expanduser().resolve()
    extensions = {ext.lower() for ext in SUPPORTED_EXTENSIONS}
    subdirs = {part.strip() for part in args.subdirs.split(",") if part.strip()}

    with tempfile.TemporaryDirectory() as temp_dir:
        temp_zip = Path(temp_dir) / "repo.zip"
        print(f"Baixando {args.url} para {temp_zip}...")
        download_zip(args.url, temp_zip)

        with ZipFile(temp_zip) as archive:
            used_names: set[str] = set(p.name for p in dest.iterdir() if p.is_file()) if dest.exists() else set()
            extracted = 0
            for source_path, data in iter_entries(archive, extensions, args.limit, subdirs):
                write_image(dest, source_path, data, used_names)
                extracted += 1
                print(f"  -> {source_path} ({len(data)} bytes)")

        if args.keep_zip:
            final_zip = dest.parent / f"drawio-master.zip"
            shutil.copy(temp_zip, final_zip)
            print(f"ZIP preservado em {final_zip}")

        print(f"{extracted} imagens adicionadas a {dest}")


if __name__ == "__main__":
    main()
