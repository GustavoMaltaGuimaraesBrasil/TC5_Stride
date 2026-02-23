"""STRIDE Service — Stage 2: Generate STRIDE threat analysis from structured diagram data."""

import json
import logging
from pathlib import Path

from openai import AsyncOpenAI

from app.config import settings
from app.models.schemas import DiagramAnalysis, STRIDEReport

logger = logging.getLogger(__name__)

_PROMPT_DIR = Path(__file__).resolve().parent.parent / "prompts"
_STRIDE_SYSTEM_PROMPT = (_PROMPT_DIR / "stride_system.md").read_text(encoding="utf-8")


async def analyze_stride(diagram: DiagramAnalysis) -> STRIDEReport:
    """
    Receive the structured diagram JSON (Stage 1 output) and produce
    a STRIDE threat report using a second LLM call + deterministic rules.
    """
    client = AsyncOpenAI(api_key=settings.openai_api_key)

    diagram_json = diagram.model_dump_json(indent=2)

    logger.info(
        "Sending diagram to STRIDE analysis (%d components, %d flows)",
        len(diagram.components),
        len(diagram.flows),
    )

    response = await client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {
                "role": "system",
                "content": _STRIDE_SYSTEM_PROMPT,
            },
            {
                "role": "user",
                "content": (
                    "Analyze the following software architecture for STRIDE threats. "
                    "Pay special attention to flows crossing trust boundaries.\n\n"
                    f"```json\n{diagram_json}\n```"
                ),
            },
        ],
        temperature=0.2,
        max_tokens=8192,
        response_format={"type": "json_object"},
    )

    raw = response.choices[0].message.content
    logger.info("STRIDE raw response length: %d chars", len(raw))

    data = json.loads(raw)
    report = STRIDEReport.model_validate(data)

    # Deterministic enrichment: ensure summary counts match actual threats
    report.summary.total_threats = len(report.threats)
    report.summary.critical = sum(1 for t in report.threats if t.severity == "critical")
    report.summary.high = sum(1 for t in report.threats if t.severity == "high")
    report.summary.medium = sum(1 for t in report.threats if t.severity == "medium")
    report.summary.low = sum(1 for t in report.threats if t.severity == "low")

    # Deterministic fallback: add baseline threats if LLM missed STRIDE categories
    _ensure_baseline_coverage(diagram, report)

    logger.info(
        "STRIDE report: %d threats (C:%d H:%d M:%d L:%d)",
        report.summary.total_threats,
        report.summary.critical,
        report.summary.high,
        report.summary.medium,
        report.summary.low,
    )
    return report


def _ensure_baseline_coverage(diagram: DiagramAnalysis, report: STRIDEReport):
    """
    Deterministic rules: if the LLM missed entire STRIDE categories,
    add generic baseline threats based on component types.
    """
    categories_found = {t.stride_category for t in report.threats}

    baseline_rules = {
        "Spoofing": {
            "types": ["user", "client", "auth", "external", "api_gateway"],
            "desc": "Without strong authentication, an attacker could impersonate a legitimate {type}.",
            "mitigation": "Implement multi-factor authentication and mutual TLS for service-to-service communication.",
        },
        "Tampering": {
            "types": ["database", "storage", "queue"],
            "desc": "Data in {name} could be modified by unauthorized actors if integrity controls are missing.",
            "mitigation": "Use checksums, digital signatures, and role-based write access.",
        },
        "Repudiation": {
            "types": ["service", "api_gateway", "web_app"],
            "desc": "{name} may lack sufficient logging to prove which actions were performed and by whom.",
            "mitigation": "Implement centralized, tamper-proof audit logging with timestamps and user identification.",
        },
        "Information Disclosure": {
            "types": ["database", "storage", "cache", "external"],
            "desc": "Sensitive data in {name} could be exposed if encryption at rest and in transit is not enforced.",
            "mitigation": "Encrypt data at rest (AES-256) and in transit (TLS 1.2+). Apply least-privilege access.",
        },
        "Denial of Service": {
            "types": ["api_gateway", "load_balancer", "web_app", "service"],
            "desc": "{name} is exposed to potential denial-of-service attacks without rate limiting.",
            "mitigation": "Implement rate limiting, auto-scaling, and DDoS protection (e.g., WAF, CDN).",
        },
        "Elevation of Privilege": {
            "types": ["auth", "service", "database"],
            "desc": "Insufficient authorization checks in {name} could allow privilege escalation.",
            "mitigation": "Enforce principle of least privilege, RBAC, and validate all authorization on the server side.",
        },
    }

    next_id = len(report.threats) + 1
    for category, rule in baseline_rules.items():
        if category in categories_found:
            continue
        # Find first matching component
        for comp in diagram.components:
            if comp.type in rule["types"]:
                report.threats.append(
                    __import__("app.models.schemas", fromlist=["Threat"]).Threat(
                        id=f"t{next_id}",
                        stride_category=category,
                        target_id=comp.id,
                        target_name=comp.name,
                        description=rule["desc"].format(type=comp.type, name=comp.name),
                        severity="medium",
                        mitigation=rule["mitigation"],
                        affected_flows=[],
                    )
                )
                next_id += 1
                break

    # Recalculate summary
    report.summary.total_threats = len(report.threats)
    report.summary.critical = sum(1 for t in report.threats if t.severity == "critical")
    report.summary.high = sum(1 for t in report.threats if t.severity == "high")
    report.summary.medium = sum(1 for t in report.threats if t.severity == "medium")
    report.summary.low = sum(1 for t in report.threats if t.severity == "low")
