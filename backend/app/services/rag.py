"""RAG local leve para referencias STRIDE."""

from __future__ import annotations

import re
from pathlib import Path


_KB_PATH = Path(__file__).resolve().parent.parent / "knowledge" / "stride_rag.md"
_HEADER_RE = re.compile(r"^##\s+\[(?P<id>[A-Z0-9\-]+)\]\s+(?P<title>.+)$")
_WORD_RE = re.compile(r"[a-zA-Z0-9_]+")


def _tokenize(text: str) -> set[str]:
    """Executa o metodo _tokenize."""
    return {w.lower() for w in _WORD_RE.findall(text)}


def _load_chunks() -> list[dict[str, str]]:
    """Executa o metodo _load_chunks."""
    raw = _KB_PATH.read_text(encoding="utf-8")
    chunks: list[dict[str, str]] = []
    current: dict[str, str] | None = None

    for line in raw.splitlines():
        m = _HEADER_RE.match(line.strip())
        if m:
            if current:
                current["text"] = current["text"].strip()
                chunks.append(current)
            current = {"id": m.group("id"), "title": m.group("title"), "text": ""}
            continue
        if current is not None:
            current["text"] += line + "\n"

    if current:
        current["text"] = current["text"].strip()
        chunks.append(current)

    return chunks


_CHUNKS = _load_chunks()


def retrieve_stride_context(query: str, top_k: int = 5) -> list[dict[str, str]]:
    """Executa o metodo retrieve_stride_context."""
    query_tokens = _tokenize(query)
    scored: list[tuple[int, dict[str, str]]] = []

    for c in _CHUNKS:
        text = f"{c['title']} {c['text']}"
        score = len(query_tokens & _tokenize(text))
        scored.append((score, c))

    scored.sort(key=lambda x: x[0], reverse=True)
    selected = [c for score, c in scored if score > 0][:top_k]
    if not selected:
        selected = _CHUNKS[:top_k]
    return selected


def format_context_for_prompt(chunks: list[dict[str, str]]) -> str:
    """Executa o metodo format_context_for_prompt."""
    lines: list[str] = []
    for c in chunks:
        lines.append(f"[{c['id']}] {c['title']}")
        lines.append(c["text"])
        lines.append("")
    return "\n".join(lines).strip()


def default_reference_ids() -> list[str]:
    """Executa o metodo default_reference_ids."""
    return ["STRIDE-007", "STRIDE-008"]
