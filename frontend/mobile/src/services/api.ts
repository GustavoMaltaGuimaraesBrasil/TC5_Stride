// Change this to your backend URL.
// For Android emulator use 10.0.2.2, for physical device use your computer's LAN IP.
const API_BASE = 'http://10.0.2.2:8000/api'; // Android emulator
// const API_BASE = 'http://localhost:8000/api'; // iOS simulator
// const API_BASE = 'http://192.168.x.x:8000/api'; // Physical device (use your LAN IP)

const EXT_TO_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
};

const MIME_TO_EXT: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'image/heif': '.heif',
};

const SUPPORTED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
]);

function inferMimeType(filename: string, uri: string, mimeType?: string): string {
  if (mimeType) return mimeType;

  const lowerFilename = filename.toLowerCase();
  for (const [ext, knownMime] of Object.entries(EXT_TO_MIME)) {
    if (lowerFilename.endsWith(ext)) return knownMime;
  }

  const lowerUri = uri.toLowerCase();
  for (const [ext, knownMime] of Object.entries(EXT_TO_MIME)) {
    if (lowerUri.includes(ext)) return knownMime;
  }

  return 'image/jpeg';
}

function ensureFilename(filename: string, mimeType: string): string {
  const cleanName = filename.trim();
  const hasExt = /\.[a-z0-9]+$/i.test(cleanName);
  if (hasExt) return cleanName;

  const ext = MIME_TO_EXT[mimeType] ?? '.jpg';
  return `${cleanName || 'diagram'}${ext}`;
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

export interface DiagramAnalysis {
  components: Component[];
  groups: Group[];
  flows: Flow[];
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

export interface STRIDEReport {
  summary: ThreatSummary;
  threats: Threat[];
  recommendations: string[];
}

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

export interface AnalysisListItem {
  id: number;
  image_filename: string;
  status: string;
  threat_count: number;
  created_at: string;
}

export async function uploadAndAnalyze(
  imageUri: string,
  filename: string,
  mimeType?: string,
): Promise<AnalysisResponse> {
  const normalizedMimeType = inferMimeType(filename, imageUri, mimeType);
  if (!SUPPORTED_MIME_TYPES.has(normalizedMimeType)) {
    throw new Error(
      `Unsupported image format (${normalizedMimeType}). Use PNG, JPG, JPEG, GIF, or WEBP.`,
    );
  }
  const normalizedFilename = ensureFilename(filename, normalizedMimeType);

  const formData = new FormData();
  formData.append('file', {
    uri: imageUri,
    name: normalizedFilename,
    type: normalizedMimeType,
  } as any);

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
