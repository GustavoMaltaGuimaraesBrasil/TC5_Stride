"""STRIDE Service — Stage 2: Generate STRIDE threat analysis from structured diagram data."""

import json
import logging
from pathlib import Path

import httpx
from openai import AsyncOpenAI

from app.config import settings
from app.models.schemas import DiagramAnalysis, STRIDEReport, Threat
from app.services import rag

logger = logging.getLogger(__name__)

_PROMPT_DIR = Path(__file__).resolve().parent.parent / "prompts"
_STRIDE_SYSTEM_PROMPT = (_PROMPT_DIR / "stride_system.md").read_text(encoding="utf-8")


async def analyze_stride(diagram: DiagramAnalysis) -> STRIDEReport:
    """
    Receive the structured diagram JSON (Stage 1 output) and produce
    a STRIDE threat report using a second LLM call + deterministic rules.
    """
    client = AsyncOpenAI(
        api_key=settings.openai_api_key,
        http_client=httpx.AsyncClient(trust_env=False),
    )

    diagram_json = diagram.model_dump_json(indent=2)
    component_types = ", ".join(sorted({c.type for c in diagram.components})) or "unknown"
    rag_query = (
        f"components={len(diagram.components)} types={component_types} "
        f"flows={len(diagram.flows)} groups={len(diagram.groups)} "
        f"focus=stride threats mitigations trust boundary crossing"
    )
    rag_chunks = rag.retrieve_stride_context(rag_query, top_k=5)
    rag_context = rag.format_context_for_prompt(rag_chunks)

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
                    "Analise a arquitetura abaixo para ameacas STRIDE. "
                    "Responda os campos textuais em portugues (pt-BR) e foque nos fluxos "
                    "que cruzam fronteiras de confianca.\n\n"
                    "RAG CONTEXT (use these ids in reference_ids):\n"
                    f"{rag_context}\n\n"
                    "ARCHITECTURE JSON:\n"
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

    for t in report.threats:
        if not t.reference_ids:
            t.reference_ids = rag.default_reference_ids()
        if not t.evidence:
            ev: list[str] = []
            if t.target_name:
                ev.append(f"Componente alvo: {t.target_name} ({t.target_id})")
            if t.affected_flows:
                ev.append(f"Fluxos afetados: {', '.join(t.affected_flows)}")
            if not ev:
                ev.append("Derivado do papel do componente na arquitetura e do mapeamento STRIDE.")
            t.evidence = ev

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
            "desc": "Sem autenticacao forte, um atacante pode se passar por um(a) {type} legitimo(a).",
            "mitigation": "Implementar autenticacao multifator e mTLS na comunicacao entre servicos.",
        },
        "Tampering": {
            "types": ["database", "storage", "queue"],
            "desc": "Dados em {name} podem ser alterados por atores nao autorizados se faltarem controles de integridade.",
            "mitigation": "Usar checksums, assinaturas digitais e controle de escrita baseado em papeis.",
        },
        "Repudiation": {
            "types": ["service", "api_gateway", "web_app"],
            "desc": "{name} pode nao ter logs suficientes para provar quais acoes foram executadas e por quem.",
            "mitigation": "Implementar trilha de auditoria centralizada, imutavel, com timestamp e identificacao de usuario.",
        },
        "Information Disclosure": {
            "types": ["database", "storage", "cache", "external"],
            "desc": "Dados sensiveis em {name} podem ser expostos se nao houver criptografia em repouso e em transito.",
            "mitigation": "Criptografar dados em repouso (AES-256) e em transito (TLS 1.2+), com acesso de menor privilegio.",
        },
        "Denial of Service": {
            "types": ["api_gateway", "load_balancer", "web_app", "service"],
            "desc": "{name} fica exposto a ataques de negacao de servico sem controle de taxa.",
            "mitigation": "Implementar rate limiting, auto scaling e protecao DDoS (por exemplo, WAF e CDN).",
        },
        "Elevation of Privilege": {
            "types": ["auth", "service", "database"],
            "desc": "Verificacoes de autorizacao insuficientes em {name} podem permitir elevacao de privilegio.",
            "mitigation": "Aplicar menor privilegio, RBAC e validacao de autorizacao sempre no lado servidor.",
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
                    Threat(
                        id=f"t{next_id}",
                        stride_category=category,
                        target_id=comp.id,
                        target_name=comp.name,
                        description=rule["desc"].format(type=comp.type, name=comp.name),
                        severity="medium",
                        mitigation=rule["mitigation"],
                        affected_flows=[],
                        evidence=[f"Tipo do componente alvo: {comp.type}", "Regra de cobertura basica STRIDE aplicada."],
                        reference_ids=rag.default_reference_ids(),
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
