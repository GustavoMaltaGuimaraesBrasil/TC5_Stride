"""Pydantic schemas for API request/response validation."""

from __future__ import annotations
from datetime import datetime
from pydantic import BaseModel, Field


# ── Stage 1: Diagram extraction (Vision) ─────────────────────────

class Component(BaseModel):
    id: str = Field(..., description="Unique component id, e.g. 'c1'")
    name: str = Field(..., description="Human-readable name, e.g. 'API Gateway'")
    type: str = Field(..., description="Component type, e.g. 'api_gateway', 'database'")
    group: str | None = Field(None, description="Group/boundary this component belongs to")


class Group(BaseModel):
    id: str
    name: str
    type: str = Field("trust_boundary", description="e.g. trust_boundary, vpc, subnet")
    component_ids: list[str] = []


class Flow(BaseModel):
    from_id: str
    to_id: str
    label: str | None = None
    protocol: str | None = None
    bidirectional: bool = False


class DiagramAnalysis(BaseModel):
    """Output of Stage 1 (Vision)."""
    components: list[Component] = []
    groups: list[Group] = []
    flows: list[Flow] = []


# ── Stage 2: STRIDE report ───────────────────────────────────────

class Threat(BaseModel):
    id: str
    stride_category: str = Field(..., description="One of: Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege")
    target_id: str
    target_name: str
    description: str
    severity: str = Field(..., description="critical, high, medium, low")
    mitigation: str
    affected_flows: list[str] = Field(default_factory=list, description="Flow descriptions, e.g. 'c1 -> c2'")


class ThreatSummary(BaseModel):
    total_threats: int = 0
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0


class STRIDEReport(BaseModel):
    """Output of Stage 2 (STRIDE)."""
    summary: ThreatSummary = Field(default_factory=ThreatSummary)
    threats: list[Threat] = []
    recommendations: list[str] = []


# ── API response schemas ─────────────────────────────────────────

class AnalysisResponse(BaseModel):
    id: int
    image_filename: str
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
    status: str
    threat_count: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}
