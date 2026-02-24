"""Endpoints de analise: upload de imagem, execucao do pipeline e consulta de resultados."""

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
from app.models.schemas import AnalysisListItem, AnalysisResponse, DiagramAnalysis, STRIDEReport
from app.services import report, stride, vision

logger = logging.getLogger(__name__)
router = APIRouter()

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"}


def _image_url(analysis_id: int) -> str:
    """Executa o metodo _image_url."""
    return f"/api/analysis/{analysis_id}/image"


def _delete_file_if_exists(path: Path):
    """Executa o metodo _delete_file_if_exists."""
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
    """Executa o metodo create_analysis."""
    # Usa o nome original do arquivo para rastreabilidade no historico.
    original_filename = file.filename or "upload"
    # Extrai extensao para validar tipo de entrada.
    ext = Path(original_filename).suffix.lower()
    # Bloqueia extensoes nao suportadas antes de gravar em disco.
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            400,
            (
                f"Tipo de arquivo nao suportado: {ext}. "
                "Use PNG, JPG, JPEG, GIF, WEBP ou BMP."
            ),
        )

    # Gera nome unico para evitar colisao entre uploads com o mesmo nome.
    unique_name = f"{uuid.uuid4().hex}{ext}"
    # Define caminho final no diretorio de uploads configurado.
    upload_path = Path(settings.upload_dir) / unique_name
    # Persiste arquivo bruto no disco local.
    with open(upload_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Cria registro inicial com status de processamento.
    analysis_record = Analysis(
        image_filename=original_filename,
        image_path=str(upload_path),
        status="processing",
    )
    # Salva no banco para disponibilizar id ao frontend.
    session.add(analysis_record)
    await session.commit()
    await session.refresh(analysis_record)

    try:
        # Etapa 1: extracao estruturada da arquitetura a partir da imagem.
        logger.info("Etapa 1: extraindo diagrama (analysis_id=%d)", analysis_record.id)
        diagram = await vision.extract_diagram(str(upload_path))

        # Armazena resultado da etapa de Vision no registro.
        analysis_record.diagram_json = diagram.model_dump()

        # Etapa 2: geracao de ameacas e mitigacoes STRIDE.
        logger.info("Etapa 2: analise STRIDE (analysis_id=%d)", analysis_record.id)
        stride_report = await stride.analyze_stride(diagram)

        # Atualiza o registro com saida final e status concluido.
        analysis_record.stride_json = stride_report.model_dump()
        analysis_record.status = "done"
        analysis_record.error_message = None
        analysis_record.completed_at = datetime.now(timezone.utc)

        # Confirma transacao final de sucesso.
        await session.commit()
        await session.refresh(analysis_record)

        # Retorna payload completo para exibicao imediata no cliente.
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
        # Em falha, registra erro para permitir abertura posterior no historico.
        logger.exception("Pipeline falhou para analysis_id=%d", analysis_record.id)
        analysis_record.status = "error"
        analysis_record.error_message = "Falha na execucao do pipeline. Consulte os logs do servidor."
        await session.commit()
        raise HTTPException(500, "Falha no pipeline de analise. Consulte os logs do backend.")


@router.get("/analysis", response_model=list[AnalysisListItem])
async def list_analyses(session: AsyncSession = Depends(get_session)):
    """Executa o metodo list_analyses."""
    # Lista do mais recente para o mais antigo para melhorar UX.
    result = await session.execute(select(Analysis).order_by(Analysis.created_at.desc()))
    rows = result.scalars().all()

    # Mapeia entidade de banco para item enxuto de listagem.
    items: list[AnalysisListItem] = []
    for row in rows:
        # Deriva contagem de ameacas da estrutura STRIDE salva.
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
    """Executa o metodo get_analysis."""
    # Busca registro completo por id.
    result = await session.execute(select(Analysis).where(Analysis.id == analysis_id))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Analise nao encontrada")

    # Reconstroi objetos tipados para resposta consistente da API.
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
    """Executa o metodo download_pdf."""
    # Busca analise para montar relatorio.
    result = await session.execute(select(Analysis).where(Analysis.id == analysis_id))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Analise nao encontrada")
    # Garante que apenas analises concluidas possam gerar PDF.
    if row.status != "done":
        raise HTTPException(400, "A analise ainda nao foi concluida")

    # Reconstrucao dos objetos usados pelo gerador de relatorio.
    diagram = DiagramAnalysis.model_validate(row.diagram_json)
    stride_data = STRIDEReport.model_validate(row.stride_json)

    # Gera bytes do PDF com imagem, contexto e listagens STRIDE.
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
    """Executa o metodo get_analysis_image."""
    # Busca caminho da imagem original da analise.
    result = await session.execute(select(Analysis).where(Analysis.id == analysis_id))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Analise nao encontrada")

    # Valida existencia fisica do arquivo no disco.
    image_path = Path(row.image_path)
    if not image_path.exists():
        raise HTTPException(404, "Imagem da analise nao encontrada")

    # Para formatos com baixa compatibilidade no app mobile (ex.: BMP/HEIC),
    # prioriza a versao normalizada em PNG quando existir.
    normalized_path = image_path.with_suffix(".normalized.png")
    serve_path = image_path
    media_type, _ = mimetypes.guess_type(image_path.name)
    if image_path.suffix.lower() in {".bmp", ".heic", ".heif"} and normalized_path.exists():
        serve_path = normalized_path
        media_type = "image/png"

    return FileResponse(
        path=str(serve_path),
        media_type=media_type or "application/octet-stream",
        headers={"Cache-Control": "no-store"},
    )


@router.delete("/analysis/{analysis_id}", status_code=204)
async def delete_analysis(analysis_id: int, session: AsyncSession = Depends(get_session)):
    """Executa o metodo delete_analysis."""
    # Busca registro a ser removido.
    result = await session.execute(select(Analysis).where(Analysis.id == analysis_id))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Analise nao encontrada")

    # Calcula caminhos dos arquivos associados ao registro.
    original_path = Path(row.image_path)
    normalized_path = original_path.with_suffix(".normalized.png")

    # Remove primeiro do banco para manter consistencia transacional.
    await session.delete(row)
    await session.commit()

    # Remove arquivos de disco apos commit.
    _delete_file_if_exists(original_path)
    _delete_file_if_exists(normalized_path)
