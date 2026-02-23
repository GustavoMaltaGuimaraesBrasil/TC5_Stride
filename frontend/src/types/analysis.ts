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
  context_summary: string;
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
  evidence: string[];
  reference_ids: string[];
}

export interface AnalysisListItem {
  id: number;
  image_filename: string;
  status: string;
  threat_count: number;
  created_at: string;
}
