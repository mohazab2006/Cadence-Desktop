/**
 * M8 Course Copilot: extracted text, chunks, summaries, assessment scope, availability, study plan.
 */
import { getDatabase, executeWithRetry } from './client';
import { generateId } from '../lib/utils';
import type {
  AssetExtractedText,
  AssetChunk,
  AssetSummary,
  AssessmentScopeLink,
  AvailabilityBlock,
  StudyPlanBlock,
} from '../lib/types';

// --- Asset extracted text ---
export async function getExtractedTextByAssetId(assetId: string): Promise<AssetExtractedText | null> {
  const db = await getDatabase();
  const rows = await db.select<any[]>('SELECT * FROM asset_extracted_text WHERE asset_id = ?', [assetId]);
  if (!rows[0]) return null;
  const r = rows[0];
  return { asset_id: r.asset_id, full_text: r.full_text, page_info_json: r.page_info_json ?? null, indexed_at: r.indexed_at };
}

export async function upsertExtractedText(input: {
  asset_id: string;
  full_text: string;
  page_info_json?: string | null;
}): Promise<void> {
  const now = new Date().toISOString();
  await executeWithRetry(
    `INSERT INTO asset_extracted_text (asset_id, full_text, page_info_json, indexed_at)
     VALUES (?, ?, ?, ?) ON CONFLICT(asset_id) DO UPDATE SET full_text = ?, page_info_json = ?, indexed_at = ?`,
    [input.asset_id, input.full_text, input.page_info_json ?? null, now, input.full_text, input.page_info_json ?? null, now]
  );
}

export async function deleteExtractedText(assetId: string): Promise<void> {
  await executeWithRetry('DELETE FROM asset_extracted_text WHERE asset_id = ?', [assetId]);
}

// --- Asset chunks ---
export async function getChunksByAssetId(assetId: string): Promise<AssetChunk[]> {
  const db = await getDatabase();
  const rows = await db.select<any[]>(
    'SELECT * FROM asset_chunks WHERE asset_id = ? ORDER BY chunk_index',
    [assetId]
  );
  return rows.map((r) => ({
    id: r.id,
    asset_id: r.asset_id,
    chunk_index: r.chunk_index,
    snippet: r.snippet,
    page_start: r.page_start ?? null,
    page_end: r.page_end ?? null,
    created_at: r.created_at,
  }));
}

export async function insertChunks(assetId: string, chunks: { snippet: string; page_start?: number | null; page_end?: number | null }[]): Promise<void> {
  await executeWithRetry('DELETE FROM asset_chunks WHERE asset_id = ?', [assetId]);
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    await executeWithRetry(
      `INSERT INTO asset_chunks (id, asset_id, chunk_index, snippet, page_start, page_end, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [generateId(), assetId, i, c.snippet, c.page_start ?? null, c.page_end ?? null]
    );
  }
}

// --- Asset summaries ---
export async function getSummaryByAssetId(assetId: string): Promise<AssetSummary | null> {
  const db = await getDatabase();
  const rows = await db.select<any[]>('SELECT * FROM asset_summaries WHERE asset_id = ?', [assetId]);
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    asset_id: r.asset_id,
    summary_bullets: r.summary_bullets,
    key_concepts: r.key_concepts,
    formulas_code: r.formulas_code ?? null,
    updated_at: r.updated_at,
  };
}

export async function upsertAssetSummary(input: {
  asset_id: string;
  summary_bullets: string;
  key_concepts: string;
  formulas_code?: string | null;
}): Promise<void> {
  const now = new Date().toISOString();
  await executeWithRetry(
    `INSERT INTO asset_summaries (asset_id, summary_bullets, key_concepts, formulas_code, updated_at)
     VALUES (?, ?, ?, ?, ?) ON CONFLICT(asset_id) DO UPDATE SET summary_bullets = ?, key_concepts = ?, formulas_code = ?, updated_at = ?`,
    [
      input.asset_id,
      input.summary_bullets,
      input.key_concepts,
      input.formulas_code ?? null,
      now,
      input.summary_bullets,
      input.key_concepts,
      input.formulas_code ?? null,
      now,
    ]
  );
}

// --- Assessment scope links ---
export async function getScopeLinksByTaskId(taskId: string): Promise<AssessmentScopeLink[]> {
  const db = await getDatabase();
  const rows = await db.select<any[]>(
    'SELECT * FROM assessment_scope_links WHERE task_id = ? ORDER BY created_at',
    [taskId]
  );
  return rows.map((r) => ({
    id: r.id,
    task_id: r.task_id,
    asset_id: r.asset_id,
    chunk_id: r.chunk_id ?? null,
    confidence: r.confidence,
    explanation: r.explanation,
    created_at: r.created_at,
  }));
}

export async function addScopeLink(input: {
  task_id: string;
  asset_id: string;
  chunk_id?: string | null;
  confidence: number;
  explanation: string;
}): Promise<AssessmentScopeLink> {
  const id = generateId();
  const now = new Date().toISOString();
  await executeWithRetry(
    `INSERT INTO assessment_scope_links (id, task_id, asset_id, chunk_id, confidence, explanation, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, input.task_id, input.asset_id, input.chunk_id ?? null, input.confidence, input.explanation, now]
  );
  return {
    id,
    task_id: input.task_id,
    asset_id: input.asset_id,
    chunk_id: input.chunk_id ?? null,
    confidence: input.confidence,
    explanation: input.explanation,
    created_at: now,
  };
}

export async function deleteScopeLink(id: string): Promise<void> {
  await executeWithRetry('DELETE FROM assessment_scope_links WHERE id = ?', [id]);
}

// --- Availability blocks ---
export async function getAllAvailabilityBlocks(): Promise<AvailabilityBlock[]> {
  const db = await getDatabase();
  const rows = await db.select<any[]>('SELECT * FROM availability_blocks ORDER BY start_time, day_of_week');
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    start_time: r.start_time,
    end_time: r.end_time,
    day_of_week: r.day_of_week ?? null,
    recurrence: r.recurrence || 'none',
    start_date: r.start_date ?? null,
    end_date: r.end_date ?? null,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}

export async function createAvailabilityBlock(input: Omit<AvailabilityBlock, 'id' | 'created_at' | 'updated_at'>): Promise<AvailabilityBlock> {
  const id = generateId();
  const now = new Date().toISOString();
  await executeWithRetry(
    `INSERT INTO availability_blocks (id, title, start_time, end_time, day_of_week, recurrence, start_date, end_date, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.title,
      input.start_time,
      input.end_time,
      input.day_of_week ?? null,
      input.recurrence || 'none',
      input.start_date ?? null,
      input.end_date ?? null,
      now,
      now,
    ]
  );
  return { ...input, id, created_at: now, updated_at: now };
}

export async function updateAvailabilityBlock(
  id: string,
  patch: Partial<Pick<AvailabilityBlock, 'title' | 'start_time' | 'end_time' | 'day_of_week' | 'recurrence' | 'start_date' | 'end_date'>>
): Promise<void> {
  const now = new Date().toISOString();
  const keys = Object.keys(patch) as (keyof typeof patch)[];
  if (keys.length === 0) return;
  const setClause = [...keys.map((k) => `${k} = ?`), 'updated_at = ?'].join(', ');
  const values = [...keys.map((k) => (patch as any)[k]), now, id];
  await executeWithRetry(`UPDATE availability_blocks SET ${setClause} WHERE id = ?`, values);
}

export async function deleteAvailabilityBlock(id: string): Promise<void> {
  await executeWithRetry('DELETE FROM availability_blocks WHERE id = ?', [id]);
}

// --- Study plan blocks ---
export async function getAllStudyPlanBlocks(): Promise<StudyPlanBlock[]> {
  const db = await getDatabase();
  const rows = await db.select<any[]>('SELECT * FROM study_plan_blocks ORDER BY start');
  return rows.map((r) => ({
    id: r.id,
    course_id: r.course_id,
    task_id: r.task_id ?? null,
    title: r.title,
    start: r.start,
    end: r.end,
    linked_asset_ids: r.linked_asset_ids || '[]',
    block_type: r.block_type || 'review',
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}

export async function getStudyPlanBlocksByCourseId(courseId: string): Promise<StudyPlanBlock[]> {
  const db = await getDatabase();
  const rows = await db.select<any[]>(
    'SELECT * FROM study_plan_blocks WHERE course_id = ? ORDER BY start',
    [courseId]
  );
  return rows.map((r) => ({
    id: r.id,
    course_id: r.course_id,
    task_id: r.task_id ?? null,
    title: r.title,
    start: r.start,
    end: r.end,
    linked_asset_ids: r.linked_asset_ids || '[]',
    block_type: r.block_type || 'review',
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}

export async function upsertStudyPlanBlocks(courseId: string, blocks: Omit<StudyPlanBlock, 'id' | 'course_id' | 'created_at' | 'updated_at'>[]): Promise<void> {
  const now = new Date().toISOString();
  await executeWithRetry('DELETE FROM study_plan_blocks WHERE course_id = ?', [courseId]);
  for (const b of blocks) {
    const id = generateId();
    await executeWithRetry(
      `INSERT INTO study_plan_blocks (id, course_id, task_id, title, start, "end", linked_asset_ids, block_type, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, courseId, b.task_id ?? null, b.title, b.start, b.end, b.linked_asset_ids || '[]', b.block_type || 'review', now, now]
    );
  }
}

export async function deleteStudyPlanBlocksByCourseId(courseId: string): Promise<void> {
  await executeWithRetry('DELETE FROM study_plan_blocks WHERE course_id = ?', [courseId]);
}
