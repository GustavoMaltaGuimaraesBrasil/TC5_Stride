"""Servico de relatorio: gera PDF com resultados STRIDE."""

import io
import logging
from datetime import datetime, timezone

from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Image as RLImage
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.models.schemas import DiagramAnalysis, STRIDEReport

logger = logging.getLogger(__name__)

_SEVERITY_COLORS = {
    "critical": colors.HexColor("#DC2626"),
    "high": colors.HexColor("#EA580C"),
    "medium": colors.HexColor("#CA8A04"),
    "low": colors.HexColor("#2563EB"),
}

_SEVERITY_LABEL_PT = {
    "critical": "CRITICO",
    "high": "ALTO",
    "medium": "MEDIO",
    "low": "BAIXO",
}

_STRIDE_LABEL_PT = {
    "Spoofing": "Falsificacao de Identidade",
    "Tampering": "Violacao de Integridade",
    "Repudiation": "Repudio",
    "Information Disclosure": "Divulgacao de Informacao",
    "Denial of Service": "Negacao de Servico",
    "Elevation of Privilege": "Elevacao de Privilegio",
}


def _build_uploaded_image_flowables(image_path: str, styles, max_width: float) -> list:
    """Executa o metodo _build_uploaded_image_flowables."""
    flowables: list = []
    try:
        with PILImage.open(image_path) as src:
            src_rgb = src.convert("RGB")
            img_buffer = io.BytesIO()
            src_rgb.save(img_buffer, format="PNG")
            img_buffer.seek(0)

            max_height = 90 * mm
            img_w, img_h = src_rgb.size

            draw_w = max_width
            draw_h = draw_w * (img_h / img_w)
            if draw_h > max_height:
                draw_h = max_height
                draw_w = draw_h * (img_w / img_h)

            flowables.append(Paragraph("Diagrama Enviado", styles["Heading2"]))
            img_flow = RLImage(img_buffer, width=draw_w, height=draw_h)
            # Evita que o buffer seja coletado antes do ReportLab consumir a imagem.
            img_flow._img_buffer = img_buffer
            flowables.append(img_flow)
            flowables.append(Spacer(1, 8 * mm))
    except Exception:
        logger.exception("Falha ao renderizar imagem enviada no PDF")

    return flowables


def generate_pdf(
    diagram: DiagramAnalysis,
    report: STRIDEReport,
    image_filename: str,
    image_path: str | None = None,
) -> bytes:
    """Executa o metodo generate_pdf."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )

    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            "ThreatTitle",
            parent=styles["Heading3"],
            spaceAfter=4,
        )
    )

    elements = []

    # Cabecalho principal do relatorio.
    elements.append(Paragraph("Relatorio de Analise de Ameacas STRIDE", styles["Title"]))
    elements.append(Spacer(1, 4 * mm))
    elements.append(
        Paragraph(
            f"Origem: {image_filename}<br/>"
            f"Gerado em: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
            styles["Normal"],
        )
    )
    elements.append(Spacer(1, 8 * mm))

    # Imagem original enviada pelo usuario.
    if image_path:
        elements.extend(_build_uploaded_image_flowables(image_path, styles, doc.width))

    # Contexto da infraestrutura antes das listagens de ameacas.
    if diagram.context_summary:
        elements.append(Paragraph("Contexto da Infraestrutura", styles["Heading2"]))
        elements.append(Paragraph(diagram.context_summary, styles["Normal"]))
        elements.append(Spacer(1, 6 * mm))

    # Resumo executivo com contagem por severidade.
    elements.append(Paragraph("Resumo Executivo", styles["Heading2"]))
    summary_data = [
        ["Total de Ameacas", "Critico", "Alto", "Medio", "Baixo"],
        [
            str(report.summary.total_threats),
            str(report.summary.critical),
            str(report.summary.high),
            str(report.summary.medium),
            str(report.summary.low),
        ],
    ]
    summary_table = Table(summary_data, colWidths=[80, 60, 60, 60, 60])
    summary_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E293B")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ]
        )
    )
    elements.append(summary_table)
    elements.append(Spacer(1, 8 * mm))

    # Visao geral da arquitetura extraida.
    elements.append(Paragraph("Visao Geral da Arquitetura", styles["Heading2"]))
    elements.append(
        Paragraph(
            f"Componentes: {len(diagram.components)} &nbsp;|&nbsp; "
            f"Grupos: {len(diagram.groups)} &nbsp;|&nbsp; "
            f"Fluxos: {len(diagram.flows)}",
            styles["Normal"],
        )
    )
    elements.append(Spacer(1, 4 * mm))

    if diagram.components:
        comp_data = [["ID", "Nome", "Tipo", "Grupo"]]
        for c in diagram.components:
            comp_data.append([c.id, c.name, c.type, c.group or "-"])
        comp_table = Table(comp_data, colWidths=[40, 140, 100, 80])
        comp_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#334155")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
                ]
            )
        )
        elements.append(comp_table)
    elements.append(Spacer(1, 8 * mm))

    # Bloco principal de ameacas.
    elements.append(Paragraph("Detalhes das Ameacas", styles["Heading2"]))
    elements.append(Spacer(1, 4 * mm))

    for threat in report.threats:
        sev_color = _SEVERITY_COLORS.get(threat.severity, colors.grey)
        sev_label = _SEVERITY_LABEL_PT.get(threat.severity, threat.severity.upper())
        stride_label = _STRIDE_LABEL_PT.get(threat.stride_category, threat.stride_category)
        elements.append(
            Paragraph(
                f'<font color="{sev_color.hexval()}">[{sev_label}]</font> '
                f"{stride_label} - {threat.target_name}",
                styles["ThreatTitle"],
            )
        )
        elements.append(Paragraph(f"<b>Descricao:</b> {threat.description}", styles["Normal"]))
        elements.append(Paragraph(f"<b>Mitigacao:</b> {threat.mitigation}", styles["Normal"]))
        if threat.affected_flows:
            elements.append(Paragraph(f"<b>Fluxos afetados:</b> {', '.join(threat.affected_flows)}", styles["Normal"]))
        if threat.evidence:
            elements.append(Paragraph(f"<b>Evidencias:</b> {'; '.join(threat.evidence)}", styles["Normal"]))
        if threat.reference_ids:
            elements.append(Paragraph(f"<b>Referencias:</b> {', '.join(threat.reference_ids)}", styles["Normal"]))
        elements.append(Spacer(1, 4 * mm))

    # Recomendações finais em nova pagina quando existirem.
    if report.recommendations:
        elements.append(PageBreak())
        elements.append(Paragraph("Recomendacoes", styles["Heading2"]))
        for i, rec in enumerate(report.recommendations, 1):
            elements.append(Paragraph(f"{i}. {rec}", styles["Normal"]))
            elements.append(Spacer(1, 2 * mm))

    doc.build(elements)
    return buffer.getvalue()
