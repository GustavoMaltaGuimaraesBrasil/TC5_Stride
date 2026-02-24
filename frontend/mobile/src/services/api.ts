/** Cliente de API mobile para analise, historico, exclusao e sintese de voz. */

import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';
import type { AnalysisListItem, AnalysisResponse } from '../../../src/types/analysis';

/** Executa a funcao extractHost. */
function extractHost(raw: string): string {
  // Aceita entradas como:
  // - exp://192.168.0.10:8081
  // - http://192.168.0.10:8081/index.bundle
  // - 192.168.0.10:8081
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';

  const urlMatch = trimmed.match(/^(?:https?|exp):\/\/([^/:?]+)(?::\d+)?/i);
  if (urlMatch?.[1]) return urlMatch[1];

  const hostPortMatch = trimmed.match(/^([^/:?]+)(?::\d+)?$/);
  if (hostPortMatch?.[1]) return hostPortMatch[1];

  return '';
}

/** Executa a funcao getCandidateApiBases. */
function getCandidateApiBases(): string[] {
  const candidates: string[] = [];
  const add = (base: string) => {
    const normalized = String(base || '').trim().replace(/\/+$/, '');
    if (!normalized) return;
    if (!candidates.includes(normalized)) candidates.push(normalized);
  };

  const envBase = process.env.EXPO_PUBLIC_API_BASE?.trim();
  if (envBase) add(envBase);

  // Fonte 1: URL do bundle.
  const scriptURL = String(NativeModules?.SourceCode?.scriptURL ?? '');
  const hostFromScript = extractHost(scriptURL);

  // Fonte 2: host do dev server no Android.
  const serverHost = String((NativeModules as any)?.PlatformConstants?.ServerHost ?? '');
  const hostFromServerHost = extractHost(serverHost);

  // Fonte 3: Expo Constants (Expo Go / Dev Client).
  const hostUri =
    String((Constants as any)?.expoConfig?.hostUri ?? '') ||
    String((Constants as any)?.manifest2?.extra?.expoClient?.hostUri ?? '') ||
    String((Constants as any)?.manifest?.debuggerHost ?? '');
  const hostFromConstants = extractHost(hostUri);

  const hosts = [hostFromScript, hostFromServerHost, hostFromConstants].filter(Boolean);
  for (const host of hosts) {
    if (Platform.OS === 'android' && (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0')) {
      add('http://10.0.2.2:8000/api');
      continue;
    }
    add(`http://${host}:8000/api`);
  }

  // Fallbacks finais.
  if (Platform.OS === 'android') add('http://10.0.2.2:8000/api');
  add('http://localhost:8000/api');
  add('http://127.0.0.1:8000/api');

  return candidates;
}

const API_BASE_CANDIDATES = getCandidateApiBases();
let activeApiBase = API_BASE_CANDIDATES[0];

/** Executa a funcao apiFetch. */
async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const errors: string[] = [];
  const bases = [activeApiBase, ...API_BASE_CANDIDATES.filter((b) => b !== activeApiBase)];

  for (const base of bases) {
    try {
      const response = await fetch(`${base}${path}`, init);
      activeApiBase = base;
      return response;
    } catch (err: any) {
      errors.push(`${base} -> ${err?.message || 'network error'}`);
    }
  }

  throw new Error(`Network request failed. Bases testadas: ${errors.join(' | ')}`);
}

const EXT_TO_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
};

const MIME_TO_EXT: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/bmp': '.bmp',
  'image/x-ms-bmp': '.bmp',
  'image/heic': '.heic',
  'image/heif': '.heif',
};

const SUPPORTED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/x-ms-bmp',
]);

/** Executa a funcao inferMimeType. */
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

/** Executa a funcao ensureFilename. */
function ensureFilename(filename: string, mimeType: string): string {
  const cleanName = filename.trim();
  const hasExt = /\.[a-z0-9]+$/i.test(cleanName);
  if (hasExt) return cleanName;

  const ext = MIME_TO_EXT[mimeType] ?? '.jpg';
  return `${cleanName || 'diagram'}${ext}`;
}

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

/** Executa a funcao uploadAndAnalyze. */
export async function uploadAndAnalyze(
  imageUri: string,
  filename: string,
  mimeType?: string,
): Promise<AnalysisResponse> {
  const normalizedMimeType = inferMimeType(filename, imageUri, mimeType);
  if (!SUPPORTED_MIME_TYPES.has(normalizedMimeType)) {
    throw new Error(
      `Formato de imagem n\u00e3o suportado (${normalizedMimeType}). Use PNG, JPG, JPEG, GIF, WEBP ou BMP.`,
    );
  }
  const normalizedFilename = ensureFilename(filename, normalizedMimeType);

  const formData = new FormData();
  formData.append('file', {
    uri: imageUri,
    name: normalizedFilename,
    type: normalizedMimeType,
  } as any);

  const res = await apiFetch('/analysis', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Falha na an\u00e1lise');
  }

  return res.json();
}

/** Executa a funcao getAnalysis. */
export async function getAnalysis(id: number): Promise<AnalysisResponse> {
  const res = await apiFetch(`/analysis/${id}`);
  if (!res.ok) throw new Error('Falha ao buscar an\u00e1lise');
  return res.json();
}

/** Executa a funcao listAnalyses. */
export async function listAnalyses(): Promise<AnalysisListItem[]> {
  const res = await apiFetch('/analysis');
  if (!res.ok) throw new Error('Falha ao buscar an\u00e1lises');
  return res.json();
}

/** Executa a funcao deleteAnalysis. */
export async function deleteAnalysis(id: number): Promise<void> {
  const res = await apiFetch(`/analysis/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Falha ao excluir an\u00e1lise');
}

/** Executa a funcao synthesizeSpeech. */
export async function synthesizeSpeech(text: string): Promise<{ audioBase64: string; format: string }> {
  const res = await apiFetch('/audio/speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error('Falha ao sintetizar audio');
  return res.json();
}

/** Executa a funcao getPdfUrl. */
export function getPdfUrl(id: number): string {
  return `${activeApiBase}/analysis/${id}/pdf`;
}

/** Executa a funcao getImageUrl. */
export function getImageUrl(id: number): string {
  return `${activeApiBase}/analysis/${id}/image`;
}
