/**
 * M8: Indexing pipeline for course assets. Extract text → chunk → optional summary.
 * All local; no cloud. Uses existing extractText for File, and Tauri fs to read stored assets.
 */
import * as copilotRepo from '../db/copilot.repo';
import type { CourseAsset } from '../lib/types';
import { extractTextFromFile, type ExtractProgressCallback } from './extractText';

const CHUNK_MAX_CHARS = 600;
const CHUNK_OVERLAP = 80;

export type IndexingProgress = (message: string) => void;

/** Chunk full text into study chunks (by paragraphs, then by size). */
export function chunkText(fullText: string, _pageRanges?: { page: number; startChar: number; endChar: number }[]): { snippet: string; page_start: number | null; page_end: number | null }[] {
  const chunks: { snippet: string; page_start: number | null; page_end: number | null }[] = [];
  const paragraphs = fullText.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  let offset = 0;
  for (const para of paragraphs) {
    offset += para.length + 2;
    if (para.length <= CHUNK_MAX_CHARS) {
      chunks.push({ snippet: para.trim(), page_start: null, page_end: null });
      continue;
    }
    for (let i = 0; i < para.length; i += CHUNK_MAX_CHARS - CHUNK_OVERLAP) {
      const end = Math.min(i + CHUNK_MAX_CHARS, para.length);
      const snippet = para.slice(i, end).trim();
      if (snippet.length > 0) chunks.push({ snippet, page_start: null, page_end: null });
    }
  }
  if (chunks.length === 0 && fullText.trim()) {
    chunks.push({ snippet: fullText.trim().slice(0, CHUNK_MAX_CHARS), page_start: null, page_end: null });
  }
  return chunks;
}

/** Generate a deterministic summary from extracted text (bullets + key terms). No AI. */
export function generateSummaryFromText(fullText: string): { bullets: string[]; concepts: string[]; formulas: string[] } {
  const bullets: string[] = [];
  const lines = fullText.split(/\n/).map((l) => l.trim()).filter(Boolean);
  for (let i = 0; i < Math.min(7, lines.length); i++) {
    const line = lines[i];
    if (line.length > 10 && line.length < 200) bullets.push(line);
  }
  const words = fullText.split(/\s+/).filter((w) => w.length > 2);
  const counts = new Map<string, number>();
  for (const w of words) {
    const key = w.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    if (key.length < 4) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const concepts = [...counts.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([k]) => k);
  const formulaLike = fullText.match(/(?:[A-Za-z_]+\s*=\s*[^\n]+|\\[a-zA-Z]+\s*\{[^}]*\}|\[[\d\s\.]+\])/g) ?? [];
  const formulas = [...new Set(formulaLike)].slice(0, 10);
  return { bullets, concepts, formulas };
}

/** Index a course asset from a File (e.g. after upload). Saves extracted text, chunks, and for lecture/tutorial a summary. */
export async function indexAssetFromFile(
  assetId: string,
  file: File,
  assetType: string,
  onProgress?: ExtractProgressCallback
): Promise<{ ok: boolean; error?: string }> {
  try {
    const result = await extractTextFromFile(file, onProgress);
    if (result.error || !result.text.trim()) {
      return { ok: false, error: result.error ?? 'No text extracted' };
    }
    await copilotRepo.upsertExtractedText({ asset_id: assetId, full_text: result.text });
    const chunks = chunkText(result.text);
    await copilotRepo.insertChunks(assetId, chunks);
    if (assetType === 'lecture' || assetType === 'tutorial') {
      const { bullets, concepts, formulas } = generateSummaryFromText(result.text);
      await copilotRepo.upsertAssetSummary({
        asset_id: assetId,
        summary_bullets: JSON.stringify(bullets),
        key_concepts: JSON.stringify(concepts),
        formulas_code: formulas.length ? JSON.stringify(formulas) : null,
      });
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String((e as Error).message) };
  }
}

/** Read stored asset file via Tauri fs and return as File for extraction. */
export async function readStoredAssetAsFile(asset: CourseAsset): Promise<File | null> {
  try {
    const { readFile } = await import('@tauri-apps/plugin-fs');
    const { BaseDirectory } = await import('@tauri-apps/api/path');
    const bytes = await readFile(asset.file_path, { baseDir: BaseDirectory.AppData });
    const mime = asset.content_type || (asset.file_name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');
    const blob = new Blob([bytes], { type: mime });
    return new File([blob], asset.file_name, { type: mime });
  } catch {
    return null;
  }
}

/** Re-run indexing for an existing asset (read from disk). */
export async function reindexAsset(asset: CourseAsset, onProgress?: IndexingProgress): Promise<{ ok: boolean; error?: string }> {
  const file = await readStoredAssetAsFile(asset);
  if (!file) return { ok: false, error: 'Could not read file from disk' };
  return indexAssetFromFile(asset.id, file, asset.asset_type || 'other', onProgress);
}
