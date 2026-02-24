/** Cliente de API mobile para analise, historico, exclusao e sintese de voz. */

import { NativeModules, Platform } from 'react-native';

/** Executa a funcao resolveApiBase. */
function resolveApiBase(): string {
  const envBase = process.env.EXPO_PUBLIC_API_BASE?.trim();
  if (envBase) return envBase.replace(/\/+$/, '');

  // Infer host from Metro bundle URL, e.g.:
  // http://192.168.3.192:8081/index.bundle?platform=android...
  const scriptURL = String(NativeModules?.SourceCode?.scriptURL ?? '');
  const hostMatch = scriptURL.match(/https?:\/\/([^/:]+):\d+/i);
  const host = hostMatch?.[1] ?? '';
  if (host) {
    if (Platform.OS === 'android' && (host === 'localhost' || host === '127.0.0.1')) {
      return 'http://10.0.2.2:8000/api';
    }
    return `http://${host}:8000/api`;
  }

  // iOS simulator / local fallback.
  return 'http://localhost:8000/api';
}

const API_BASE = resolveApiBase();

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

  const res = await fetch(`${API_BASE}/analysis`, {
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
  const res = await fetch(`${API_BASE}/analysis/${id}`);
  if (!res.ok) throw new Error('Falha ao buscar an\u00e1lise');
  return res.json();
}

/** Executa a funcao listAnalyses. */
export async function listAnalyses(): Promise<AnalysisListItem[]> {
  const res = await fetch(`${API_BASE}/analysis`);
  if (!res.ok) throw new Error('Falha ao buscar an\u00e1lises');
  return res.json();
}

/** Executa a funcao deleteAnalysis. */
export async function deleteAnalysis(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/analysis/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Falha ao excluir an\u00e1lise');
}

/** Executa a funcao synthesizeSpeech. */
export async function synthesizeSpeech(text: string): Promise<{ audioBase64: string; format: string }> {
  const res = await fetch(`${API_BASE}/audio/speech`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error('Falha ao sintetizar audio');
  return res.json();
}

/** Executa a funcao getPdfUrl. */
export function getPdfUrl(id: number): string {
  return `${API_BASE}/analysis/${id}/pdf`;
}

/** Executa a funcao getImageUrl. */
export function getImageUrl(id: number): string {
  return `${API_BASE}/analysis/${id}/image`;
}
