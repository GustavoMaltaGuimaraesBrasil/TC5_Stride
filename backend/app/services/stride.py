"""Servico STRIDE - Estagio 2: gera analise STRIDE a partir dos dados estruturados do diagrama."""

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
    """Executa o metodo analyze_stride."""
    # Serializa diagrama para injetar no prompt de forma estruturada.
    diagram_json = diagram.model_dump_json(indent=2)
    # Resume tipos de componentes para melhorar consulta ao contexto RAG.
    component_types = ", ".join(sorted({c.type for c in diagram.components})) or "unknown"
    # Monta query textual simples para recuperar trechos relevantes da base local.
    rag_query = (
        f"components={len(diagram.components)} types={component_types} "
        f"flows={len(diagram.flows)} groups={len(diagram.groups)} "
        f"focus=stride threats mitigations trust boundary crossing"
    )
    # Recupera e formata contexto adicional para justificar referencias.
    rag_chunks = rag.retrieve_stride_context(rag_query, top_k=5)
    rag_context = rag.format_context_for_prompt(rag_chunks)

    logger.info(
        "Enviando diagrama para analise STRIDE (%d componentes, %d fluxos)",
        len(diagram.components),
        len(diagram.flows),
    )

    # Cliente HTTP dedicado desta chamada para evitar conexoes penduradas.
    async with httpx.AsyncClient(trust_env=False) as http_client:
        # Cliente OpenAI assincorno com chave do ambiente.
        client = AsyncOpenAI(
            api_key=settings.openai_api_key,
            http_client=http_client,
        )
        # Chamada principal da LLM para gerar relatorio STRIDE em JSON.
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

    # Conteudo bruto retornado pela LLM.
    raw = response.choices[0].message.content
    logger.info("STRIDE raw response length: %d chars", len(raw))

    # Parse para dicionario e validacao pelo schema tipado.
    data = json.loads(raw)
    report = STRIDEReport.model_validate(data)

    # Garante campos de rastreabilidade mesmo quando a LLM omitir dados.
    for t in report.threats:
        # Injeta referencias padrao quando nao houver citacoes.
        if not t.reference_ids:
            t.reference_ids = rag.default_reference_ids()
        # Injeta evidencias minimas para manter explicabilidade.
        if not t.evidence:
            ev: list[str] = []
            if t.target_name:
                ev.append(f"Componente alvo: {t.target_name} ({t.target_id})")
            if t.affected_flows:
                ev.append(f"Fluxos afetados: {', '.join(t.affected_flows)}")
            if not ev:
                ev.append("Derivado do papel do componente na arquitetura e do mapeamento STRIDE.")
            t.evidence = ev

    # Enriquecimento deterministico: garante que o resumo reflita as ameacas geradas.
    report.summary.total_threats = len(report.threats)
    report.summary.critical = sum(1 for t in report.threats if t.severity == "critical")
    report.summary.high = sum(1 for t in report.threats if t.severity == "high")
    report.summary.medium = sum(1 for t in report.threats if t.severity == "medium")
    report.summary.low = sum(1 for t in report.threats if t.severity == "low")

    # Fallback deterministico: adiciona cobertura basica se alguma categoria STRIDE faltar.
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
    """Executa o metodo _ensure_baseline_coverage."""
    # Coleta categorias ja existentes para descobrir lacunas.
    categories_found = {t.stride_category for t in report.threats}

    # Regras basicas para cobertura minima por categoria STRIDE.
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

    # Continua ids de ameaças a partir da ultima posicao.
    next_id = len(report.threats) + 1
    # Verifica categoria por categoria se precisa complementar.
    for category, rule in baseline_rules.items():
        if category in categories_found:
            continue
        # Busca o primeiro componente compativel com a regra.
        for comp in diagram.components:
            if comp.type in rule["types"]:
                # Adiciona ameaça sintetica de cobertura basica.
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

    # Recalcula o resumo apos complementar ameacas basicas.
    report.summary.total_threats = len(report.threats)
    report.summary.critical = sum(1 for t in report.threats if t.severity == "critical")
    report.summary.high = sum(1 for t in report.threats if t.severity == "high")
    report.summary.medium = sum(1 for t in report.threats if t.severity == "medium")
    report.summary.low = sum(1 for t in report.threats if t.severity == "low")

