"""Schemas Pydantic para validacao de entrada e saida da API."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


# Etapa 1: extracao do diagrama (Vision)

class Component(BaseModel):
    id: str = Field(..., description="Identificador unico do componente (ex.: c1).")
    name: str = Field(..., description="Nome legivel do componente (ex.: API Gateway).")
    type: str = Field(..., description="Tipo do componente (ex.: api_gateway, database).")
    group: str | None = Field(None, description="Grupo/fronteira ao qual o componente pertence.")


class Group(BaseModel):
    id: str
    name: str
    type: str = Field("trust_boundary", description="Tipo do grupo (ex.: trust_boundary, vpc, subnet).")
    component_ids: list[str] = []


class Flow(BaseModel):
    from_id: str
    to_id: str
    label: str | None = None
    protocol: str | None = None
    bidirectional: bool = False


class DiagramAnalysis(BaseModel):
    """Saida da Etapa 1 (Vision)."""
    context_summary: str = ""
    components: list[Component] = []
    groups: list[Group] = []
    flows: list[Flow] = []


# Etapa 2: relatorio STRIDE

class Threat(BaseModel):
    id: str
    stride_category: str = Field(
        ...,
        description=(
            "Categoria STRIDE: Spoofing, Tampering, Repudiation, "
            "Information Disclosure, Denial of Service, Elevation of Privilege."
        ),
    )
    target_id: str
    target_name: str
    description: str
    severity: str = Field(..., description="Severidade: critical, high, medium, low.")
    mitigation: str
    affected_flows: list[str] = Field(default_factory=list, description="Fluxos afetados (ex.: c1 -> c2).")
    evidence: list[str] = Field(default_factory=list, description="Evidencias usadas para justificar a ameaca.")
    reference_ids: list[str] = Field(default_factory=list, description="Referencias de conhecimento usadas na mitigacao.")


class ThreatSummary(BaseModel):
    total_threats: int = 0
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0


class STRIDEReport(BaseModel):
    """Saida da Etapa 2 (STRIDE)."""
    summary: ThreatSummary = Field(default_factory=ThreatSummary)
    threats: list[Threat] = []
    recommendations: list[str] = []


# Respostas da API

class AnalysisResponse(BaseModel):
    id: int
    image_filename: str
    image_url: str | None = None
    status: str
    diagram: DiagramAnalysis | None = None
    stride: STRIDEReport | None = None
    error_message: str | None = None
    created_at: datetime
    completed_at: datetime | None = None

    model_config = {"from_attributes": True}


class AnalysisListItem(BaseModel):
    id: int
    image_filename: str
    image_url: str | None = None
    status: str
    threat_count: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class TTSSpeechRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Texto em pt-BR para sintetizar em voz.")


class TTSSpeechResponse(BaseModel):
    audioBase64: str
    format: str = "mp3"


class TranscriptionResponse(BaseModel):
    text: str
    model_used: str
