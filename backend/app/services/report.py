"""Report Service — Generate PDF reports from STRIDE analysis results."""

import io
import logging
from datetime import datetime, timezone

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
)

from app.models.schemas import DiagramAnalysis, STRIDEReport

logger = logging.getLogger(__name__)

_SEVERITY_COLORS = {
    "critical": colors.HexColor("#DC2626"),
    "high": colors.HexColor("#EA580C"),
    "medium": colors.HexColor("#CA8A04"),
    "low": colors.HexColor("#2563EB"),
}


def generate_pdf(
    diagram: DiagramAnalysis,
    report: STRIDEReport,
    image_filename: str,
) -> bytes:
    """Generate a PDF report and return it as bytes."""
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
    styles.add(ParagraphStyle(
        "ThreatTitle",
        parent=styles["Heading3"],
        spaceAfter=4,
    ))

    elements = []

    # ── Title ──
    elements.append(Paragraph("STRIDE Threat Analysis Report", styles["Title"]))
    elements.append(Spacer(1, 4 * mm))
    elements.append(Paragraph(
        f"Source: {image_filename}<br/>"
        f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
        styles["Normal"],
    ))
    elements.append(Spacer(1, 8 * mm))

    # ── Summary table ──
    elements.append(Paragraph("Executive Summary", styles["Heading2"]))
    summary_data = [
        ["Total Threats", "Critical", "High", "Medium", "Low"],
        [
            str(report.summary.total_threats),
            str(report.summary.critical),
            str(report.summary.high),
            str(report.summary.medium),
            str(report.summary.low),
        ],
    ]
    summary_table = Table(summary_data, colWidths=[80, 60, 60, 60, 60])
    summary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E293B")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 8 * mm))

    # ── Architecture overview ──
    elements.append(Paragraph("Architecture Overview", styles["Heading2"]))
    elements.append(Paragraph(
        f"Components: {len(diagram.components)} &nbsp;|&nbsp; "
        f"Groups: {len(diagram.groups)} &nbsp;|&nbsp; "
        f"Flows: {len(diagram.flows)}",
        styles["Normal"],
    ))
    elements.append(Spacer(1, 4 * mm))

    # Components table
    if diagram.components:
        comp_data = [["ID", "Name", "Type", "Group"]]
        for c in diagram.components:
            comp_data.append([c.id, c.name, c.type, c.group or "—"])
        comp_table = Table(comp_data, colWidths=[40, 140, 100, 80])
        comp_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#334155")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ]))
        elements.append(comp_table)
    elements.append(Spacer(1, 8 * mm))

    # ── Threats ──
    elements.append(Paragraph("Threat Details", styles["Heading2"]))
    elements.append(Spacer(1, 4 * mm))

    for threat in report.threats:
        sev_color = _SEVERITY_COLORS.get(threat.severity, colors.grey)
        elements.append(Paragraph(
            f'<font color="{sev_color.hexval()}">[{threat.severity.upper()}]</font> '
            f'{threat.stride_category} — {threat.target_name}',
            styles["ThreatTitle"],
        ))
        elements.append(Paragraph(f"<b>Description:</b> {threat.description}", styles["Normal"]))
        elements.append(Paragraph(f"<b>Mitigation:</b> {threat.mitigation}", styles["Normal"]))
        if threat.affected_flows:
            elements.append(Paragraph(
                f"<b>Affected flows:</b> {', '.join(threat.affected_flows)}",
                styles["Normal"],
            ))
        elements.append(Spacer(1, 4 * mm))

    # ── Recommendations ──
    if report.recommendations:
        elements.append(PageBreak())
        elements.append(Paragraph("Recommendations", styles["Heading2"]))
        for i, rec in enumerate(report.recommendations, 1):
            elements.append(Paragraph(f"{i}. {rec}", styles["Normal"]))
            elements.append(Spacer(1, 2 * mm))

    doc.build(elements)
    return buffer.getvalue()
