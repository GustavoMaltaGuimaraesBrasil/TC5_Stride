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

export async function deleteAnalysis(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/analysis/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Falha ao excluir analise');
}

export async function synthesizeSpeech(text: string): Promise<{ audioBase64: string; format: string }> {
  const res = await fetch(`${API_BASE}/audio/speech`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error('Falha ao sintetizar audio');
  return res.json();
}

export async function transcribeAudio(file: Blob, filename: string): Promise<{ text: string; model_used: string }> {
  const formData = new FormData();
  formData.append('file', file, filename);
  const res = await fetch(`${API_BASE}/audio/transcribe`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Falha ao transcrever audio');
  return res.json();
}

export function getPdfUrl(id: number): string {
  return `${API_BASE}/analysis/${id}/pdf`;
}

export function getImageUrl(id: number): string {
  return `${API_BASE}/analysis/${id}/image`;
}
