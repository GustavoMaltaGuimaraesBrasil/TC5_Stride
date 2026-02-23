const API_BASE = '/api';

export interface AnalysisResponse {
  id: number;
  image_filename: string;
  status: string;
  diagram: DiagramAnalysis | null;
  stride: STRIDEReport | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface DiagramAnalysis {
  components: Component[];
  groups: Group[];
  flows: Flow[];
}

export interface Component {
  id: string;
  name: string;
  type: string;
  group: string | null;
}

export interface Group {
  id: string;
  name: string;
  type: string;
  component_ids: string[];
}

export interface Flow {
  from_id: string;
  to_id: string;
  label: string | null;
  protocol: string | null;
  bidirectional: boolean;
}

export interface STRIDEReport {
  summary: ThreatSummary;
  threats: Threat[];
  recommendations: string[];
}

export interface ThreatSummary {
  total_threats: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface Threat {
  id: string;
  stride_category: string;
  target_id: string;
  target_name: string;
  description: string;
  severity: string;
  mitigation: string;
  affected_flows: string[];
}

export interface AnalysisListItem {
  id: number;
  image_filename: string;
  status: string;
  threat_count: number;
  created_at: string;
}

export async function uploadAndAnalyze(file: File): Promise<AnalysisResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/analysis`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Analysis failed');
  }

  return res.json();
}

export async function getAnalysis(id: number): Promise<AnalysisResponse> {
  const res = await fetch(`${API_BASE}/analysis/${id}`);
  if (!res.ok) throw new Error('Failed to fetch analysis');
  return res.json();
}

export async function listAnalyses(): Promise<AnalysisListItem[]> {
  const res = await fetch(`${API_BASE}/analysis`);
  if (!res.ok) throw new Error('Failed to fetch analyses');
  return res.json();
}

export function getPdfUrl(id: number): string {
  return `${API_BASE}/analysis/${id}/pdf`;
}
