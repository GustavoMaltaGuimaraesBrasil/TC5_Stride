const API_BASE = '/api';

import type { AnalysisListItem, AnalysisResponse } from '../../../src/types/analysis';
export type {
  AnalysisListItem,
  AnalysisResponse,
  Component,
  DiagramAnalysis,
  Flow,
  Group,
  STRIDEReport,
  Threat,
  ThreatSummary,
} from '../../../src/types/analysis';

export async function uploadAndAnalyze(file: File): Promise<AnalysisResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/analysis`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Falha na analise');
  }

  return res.json();
}

export async function getAnalysis(id: number): Promise<AnalysisResponse> {
  const res = await fetch(`${API_BASE}/analysis/${id}`);
  if (!res.ok) throw new Error('Falha ao buscar analise');
  return res.json();
}

export async function listAnalyses(): Promise<AnalysisListItem[]> {
  const res = await fetch(`${API_BASE}/analysis`);
  if (!res.ok) throw new Error('Falha ao buscar analises');
  return res.json();
}

export function getPdfUrl(id: number): string {
  return `${API_BASE}/analysis/${id}/pdf`;
}
