from __future__ import annotations

import json
import mimetypes
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any

import httpx
from PIL import Image


SUPPORTED_EXT = {".png", ".jpg", ".jpeg", ".gif", ".webp"}
INPUT_IMAGE_EXT = SUPPORTED_EXT | {".bmp"}
INPUT_DIR = Path("teste")
API_BASE = "http://127.0.0.1:8000/api"


@dataclass
class ImageResult:
    file_name: str
    uploaded_name: str
    status: str
    analysis_id: int | None
    components: int
    groups: int
    flows: int
    threats: int
    recommendations: int
    stride_categories: list[str]
    score: int
    verdict: str
    error: str | None = None


def ensure_uploadable(path: Path, temp_dir: Path) -> Path:
    if path.suffix.lower() in SUPPORTED_EXT:
        return path

    converted = temp_dir / f"{path.stem}.png"
    with Image.open(path) as img:
        img.convert("RGB").save(converted, format="PNG")
    return converted


def score_result(payload: dict[str, Any]) -> tuple[int, str]:
    diagram = payload.get("diagram") or {}
    stride = payload.get("stride") or {}

    components = len(diagram.get("components") or [])
    groups = len(diagram.get("groups") or [])
    flows = len(diagram.get("flows") or [])
    threats = stride.get("threats") or []
    recs = stride.get("recommendations") or []
    summary = stride.get("summary") or {}
    categories = {t.get("stride_category") for t in threats if t.get("stride_category")}

    score = 0
    if payload.get("status") == "done":
        score += 40
    if components >= 5:
        score += 15
    elif components >= 2:
        score += 8
    if groups >= 1:
        score += 5
    if flows >= 2:
        score += 10
    elif flows >= 1:
        score += 5
    if len(threats) >= 8:
        score += 20
    elif len(threats) >= 4:
        score += 12
    elif len(threats) >= 1:
        score += 6
    if len(recs) >= 3:
        score += 5
    elif len(recs) >= 1:
        score += 3
    if summary.get("total_threats") == len(threats):
        score += 5
    if len(categories) >= 4:
        score += 10
    elif len(categories) >= 2:
        score += 5

    score = min(score, 100)
    if score >= 80:
        verdict = "excelente"
    elif score >= 65:
        verdict = "bom"
    elif score >= 50:
        verdict = "regular"
    else:
        verdict = "fraco"
    return score, verdict


def run() -> int:
    if not INPUT_DIR.exists():
        print("ERRO: pasta 'teste' nao encontrada.")
        return 1

    files = sorted(
        [p for p in INPUT_DIR.iterdir() if p.is_file() and p.suffix.lower() in INPUT_IMAGE_EXT]
    )
    if not files:
        print("ERRO: pasta 'teste' vazia.")
        return 1

    results: list[ImageResult] = []
    temp_dir = INPUT_DIR / ".tmp_uploads"
    temp_dir.mkdir(parents=True, exist_ok=True)

    with httpx.Client(timeout=300.0) as client:
        for f in files:
            try:
                upload_path = ensure_uploadable(f, temp_dir)
                ext = upload_path.suffix.lower()
                mime = mimetypes.types_map.get(ext, "application/octet-stream")

                with upload_path.open("rb") as file_bytes:
                    response = client.post(
                        f"{API_BASE}/analysis",
                        files={"file": (upload_path.name, file_bytes, mime)},
                    )
                response.raise_for_status()
                payload = response.json()

                diagram = payload.get("diagram") or {}
                stride = payload.get("stride") or {}
                threats = stride.get("threats") or []
                categories = sorted(
                    {t.get("stride_category") for t in threats if t.get("stride_category")}
                )
                score, verdict = score_result(payload)

                results.append(
                    ImageResult(
                        file_name=f.name,
                        uploaded_name=upload_path.name,
                        status=str(payload.get("status") or "unknown"),
                        analysis_id=payload.get("id"),
                        components=len(diagram.get("components") or []),
                        groups=len(diagram.get("groups") or []),
                        flows=len(diagram.get("flows") or []),
                        threats=len(threats),
                        recommendations=len(stride.get("recommendations") or []),
                        stride_categories=categories,
                        score=score,
                        verdict=verdict,
                    )
                )
            except Exception as exc:
                results.append(
                    ImageResult(
                        file_name=f.name,
                        uploaded_name=f.name,
                        status="error",
                        analysis_id=None,
                        components=0,
                        groups=0,
                        flows=0,
                        threats=0,
                        recommendations=0,
                        stride_categories=[],
                        score=0,
                        verdict="fraco",
                        error=str(exc),
                    )
                )

    avg_score = round(sum(r.score for r in results) / len(results), 1)
    success_count = sum(1 for r in results if r.status == "done")
    good_count = sum(1 for r in results if r.score >= 65)

    summary = {
        "total_images": len(results),
        "successful": success_count,
        "failed": len(results) - success_count,
        "average_score": avg_score,
        "good_or_better": good_count,
        "verdict": (
            "bom trabalho"
            if avg_score >= 65 and success_count == len(results)
            else "precisa melhorar"
        ),
        "results": [asdict(r) for r in results],
    }

    report_path = INPUT_DIR / "test_report.json"
    report_path.write_text(json.dumps(summary, ensure_ascii=True, indent=2), encoding="utf-8")

    print(json.dumps(summary, ensure_ascii=True, indent=2))
    print(f"\nRelatorio salvo em: {report_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(run())
