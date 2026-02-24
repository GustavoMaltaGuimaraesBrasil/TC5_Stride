"""Analysis endpoints - upload image, run pipeline, retrieve results."""

import logging
import mimetypes
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.database import Analysis, get_session
from app.models.schemas import (
    AnalysisListItem,
    AnalysisResponse,
    DiagramAnalysis,
    STRIDEReport,
)
from app.services import vision, stride, report

logger = logging.getLogger(__name__)
router = APIRouter()

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"}


def _image_url(analysis_id: int) -> str:
    return f"/api/analysis/{analysis_id}/image"


def _delete_file_if_exists(path: Path):
    try:
        if path.exists():
            path.unlink()
    except Exception:
        logger.warning("Falha ao remover arquivo %s", path, exc_info=True)


@router.post("/analysis", response_model=AnalysisResponse, status_code=201)
async def create_analysis(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
):
    """Upload an architecture diagram and run the full STRIDE pipeline."""
    original_filename = file.filename or "upload"
    ext = Path(original_filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            400,
            (
                f"Tipo de arquivo não suportado: {ext}. "
                "Use PNG, JPG, JPEG, GIF, WEBP ou BMP."
            ),
        )

    unique_name = f"{uuid.uuid4().hex}{ext}"
    upload_path = Path(settings.upload_dir) / unique_name
    with open(upload_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    analysis_record = Analysis(
        image_filename=original_filename,
        image_path=str(upload_path),
        status="processing",
    )
    session.add(analysis_record)
    await session.commit()
    await session.refresh(analysis_record)

    try:
        logger.info("Stage 1: Extracting diagram (analysis_id=%d)", analysis_record.id)
        diagram = await vision.extract_diagram(str(upload_path))

        analysis_record.diagram_json = diagram.model_dump()

        logger.info("Stage 2: STRIDE analysis (analysis_id=%d)", analysis_record.id)
        stride_report = await stride.analyze_stride(diagram)

        analysis_record.stride_json = stride_report.model_dump()
        analysis_record.status = "done"
        analysis_record.error_message = None
        analysis_record.completed_at = datetime.now(timezone.utc)

        await session.commit()
        await session.refresh(analysis_record)

        return AnalysisResponse(
            id=analysis_record.id,
            image_filename=analysis_record.image_filename,
            image_url=_image_url(analysis_record.id),
            status=analysis_record.status,
            diagram=diagram,
            stride=stride_report,
            error_message=analysis_record.error_message,
            created_at=analysis_record.created_at,
            completed_at=analysis_record.completed_at,
        )

    except Exception:
        logger.exception("Pipeline failed for analysis_id=%d", analysis_record.id)
        analysis_record.status = "error"
        analysis_record.error_message = "Falha na execucao do pipeline. Consulte os logs do servidor."
        await session.commit()
        raise HTTPException(500, "Falha no pipeline de análise. Consulte os logs do backend.")


@router.get("/analysis", response_model=list[AnalysisListItem])
async def list_analyses(session: AsyncSession = Depends(get_session)):
    """List all past analyses (most recent first)."""
    result = await session.execute(select(Analysis).order_by(Analysis.created_at.desc()))
    rows = result.scalars().all()
    items = []
    for row in rows:
        threat_count = 0
        if row.stride_json and "threats" in row.stride_json:
            threat_count = len(row.stride_json["threats"])
        items.append(
            AnalysisListItem(
                id=row.id,
                image_filename=row.image_filename,
                image_url=_image_url(row.id),
                status=row.status,
                threat_count=threat_count,
                created_at=row.created_at,
            )
        )
    return items


@router.get("/analysis/{analysis_id}", response_model=AnalysisResponse)
async def get_analysis(analysis_id: int, session: AsyncSession = Depends(get_session)):
    """Get full details of a specific analysis."""
    result = await session.execute(select(Analysis).where(Analysis.id == analysis_id))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Análise não encontrada")

    diagram = DiagramAnalysis.model_validate(row.diagram_json) if row.diagram_json else None
    stride_data = STRIDEReport.model_validate(row.stride_json) if row.stride_json else None

    return AnalysisResponse(
        id=row.id,
        image_filename=row.image_filename,
        image_url=_image_url(row.id),
        status=row.status,
        diagram=diagram,
        stride=stride_data,
        error_message=row.error_message,
        created_at=row.created_at,
        completed_at=row.completed_at,
    )


@router.get("/analysis/{analysis_id}/pdf")
async def download_pdf(analysis_id: int, session: AsyncSession = Depends(get_session)):
    """Download the STRIDE analysis as a formatted PDF."""
    result = await session.execute(select(Analysis).where(Analysis.id == analysis_id))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Análise não encontrada")
    if row.status != "done":
        raise HTTPException(400, "A análise ainda não foi concluída")

    diagram = DiagramAnalysis.model_validate(row.diagram_json)
    stride_data = STRIDEReport.model_validate(row.stride_json)

    pdf_bytes = report.generate_pdf(
        diagram,
        stride_data,
        row.image_filename,
        row.image_path,
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=stride_report_{analysis_id}.pdf"},
    )


@router.get("/analysis/{analysis_id}/image")
async def get_analysis_image(analysis_id: int, session: AsyncSession = Depends(get_session)):
    """Return the original uploaded image for a specific analysis."""
    result = await session.execute(select(Analysis).where(Analysis.id == analysis_id))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Análise não encontrada")

    image_path = Path(row.image_path)
    if not image_path.exists():
        raise HTTPException(404, "Imagem da análise não encontrada")

    media_type, _ = mimetypes.guess_type(image_path.name)
    return FileResponse(
        path=str(image_path),
        media_type=media_type or "application/octet-stream",
        filename=row.image_filename,
    )


@router.delete("/analysis/{analysis_id}", status_code=204)
async def delete_analysis(analysis_id: int, session: AsyncSession = Depends(get_session)):
    """Delete a saved analysis and its uploaded image."""
    result = await session.execute(select(Analysis).where(Analysis.id == analysis_id))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Análise não encontrada")

    original_path = Path(row.image_path)
    normalized_path = original_path.with_suffix(".normalized.png")

    await session.delete(row)
    await session.commit()

    _delete_file_if_exists(original_path)
    _delete_file_if_exists(normalized_path)
