/**
 * M8 Course Copilot: Course Assets panel. Upload by type, list with tags, View/Delete, Re-run indexing.
 */
import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCourseAssets, useDeleteCourseAsset } from '../../hooks/useCourseAssets';
import { useAssetSummary, useAssetExtractedText } from '../../hooks/useCopilot';
import { saveCourseAssetFile } from '../../services/courseAssetFs';
import * as courseAssetsRepo from '../../db/courseAssets.repo';
import { indexAssetFromFile, reindexAsset } from '../../services/copilotIndexing';
import type { CourseAsset } from '../../lib/types';
import { AssetType } from '../../lib/types';

const ASSET_TYPE_LABELS: Record<string, string> = {
  [AssetType.OUTLINE]: 'Outline',
  [AssetType.CALENDAR]: 'Calendar',
  [AssetType.LECTURE]: 'Lecture',
  [AssetType.TUTORIAL]: 'Tutorial',
  [AssetType.OTHER]: 'Other',
};

interface CourseAssetsPanelProps {
  courseId: string | null;
  courseCode?: string;
  onAssignCourse?: (assetId: string) => void;
  /** When set, open View modal for this asset (e.g. from Lectures list). */
  viewAssetId?: string | null;
  onClearViewAssetId?: () => void;
}

export default function CourseAssetsPanel({ courseId, courseCode: _courseCode, onAssignCourse, viewAssetId, onClearViewAssetId }: CourseAssetsPanelProps) {
  const queryClient = useQueryClient();
  const { data: assets = [] } = useCourseAssets(courseId);
  const deleteAsset = useDeleteCourseAsset();
  const [uploadType, setUploadType] = useState<string>(AssetType.LECTURE);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [reindexingId, setReindexingId] = useState<string | null>(null);
  const [viewAsset, setViewAsset] = useState<CourseAsset | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const effectiveViewAsset = viewAsset ?? (viewAssetId ? assets.find((a) => a.id === viewAssetId) ?? null : null);

  const openView = (asset: CourseAsset | null) => {
    setViewAsset(asset);
    if (!asset) onClearViewAssetId?.();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !courseId) return;
    e.target.value = '';
    setUploading(true);
    setUploadProgress('Saving file…');
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const assetId = crypto.randomUUID();
      const relativePath = await saveCourseAssetFile(assetId, file.name, bytes);
      await courseAssetsRepo.createCourseAsset({
        id: assetId,
        course_id: courseId,
        file_name: file.name,
        file_path: relativePath,
        content_type: file.type || null,
        file_size: file.size,
        asset_type: uploadType,
        source: null,
      });
      setUploadProgress('Extracting text & indexing…');
      const result = await indexAssetFromFile(assetId, file, uploadType, setUploadProgress);
      if (!result.ok) {
        setUploadProgress(`Indexing failed: ${result.error}`);
        setTimeout(() => setUploadProgress(null), 3000);
      }
      queryClient.invalidateQueries({ queryKey: ['courseAssets'] });
      queryClient.invalidateQueries({ queryKey: ['assetSummary'] });
      queryClient.invalidateQueries({ queryKey: ['assetChunks'] });
      queryClient.invalidateQueries({ queryKey: ['assetExtractedText'] });
    } catch (err) {
      setUploadProgress('Error: ' + String((err as Error).message));
      setTimeout(() => setUploadProgress(null), 4000);
    } finally {
      setUploading(false);
    }
  };

  const handleReindex = async (asset: CourseAsset) => {
    setReindexingId(asset.id);
    try {
      const result = await reindexAsset(asset, (msg) => setUploadProgress(msg));
      if (!result.ok) alert('Re-index failed: ' + result.error);
    } finally {
      setReindexingId(null);
      queryClient.invalidateQueries({ queryKey: ['courseAssets'] });
      queryClient.invalidateQueries({ queryKey: ['assetSummary'] });
      queryClient.invalidateQueries({ queryKey: ['assetChunks'] });
      queryClient.invalidateQueries({ queryKey: ['assetExtractedText'] });
    }
  };

  const handleDelete = (asset: CourseAsset) => {
    if (!confirm(`Remove "${asset.file_name}"? This cannot be undone.`)) return;
    deleteAsset.mutate(asset.id);
    if (effectiveViewAsset?.id === asset.id) openView(null);
  };

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-foreground">Course Assets</span>
        {courseId && (
          <div className="flex items-center gap-2">
            <select
              value={uploadType}
              onChange={(e) => setUploadType(e.target.value)}
              className="text-xs rounded border border-border bg-background px-2 py-1"
            >
              {Object.entries(ASSET_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,image/*"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              Upload
            </button>
          </div>
        )}
      </div>
      {uploadProgress && (
        <div className="text-xs text-muted-foreground mb-2">{uploadProgress}</div>
      )}
      <ul className="space-y-2">
        {assets.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-border/50 last:border-0">
            <div className="min-w-0 flex-1 flex items-center gap-2">
              <span className="truncate text-sm text-foreground" title={a.file_name}>{a.file_name}</span>
              <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {ASSET_TYPE_LABELS[a.asset_type as string] ?? a.asset_type ?? 'Other'}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button type="button" onClick={() => openView(a)} className="text-xs text-primary hover:underline">
                View
              </button>
              <button
                type="button"
                onClick={() => handleReindex(a)}
                disabled={reindexingId !== null}
                className="text-xs text-muted-foreground hover:underline disabled:opacity-50"
              >
                {reindexingId === a.id ? '…' : 'Re-index'}
              </button>
              <button type="button" onClick={() => handleDelete(a)} className="text-xs text-red-600 hover:underline">
                Delete
              </button>
              {!courseId && onAssignCourse && (
                <button type="button" onClick={() => onAssignCourse(a.id)} className="text-xs text-primary hover:underline">
                  Assign
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {assets.length === 0 && (
        <p className="text-xs text-muted-foreground py-2">No assets. Upload outline, calendar, or lecture files.</p>
      )}

      {effectiveViewAsset && (
        <AssetViewModal asset={effectiveViewAsset} onClose={() => openView(null)} />
      )}
    </div>
  );
}

function AssetViewModal({ asset, onClose }: { asset: CourseAsset; onClose: () => void }) {
  const { data: summary } = useAssetSummary(asset.id);
  const { data: extracted } = useAssetExtractedText(asset.id);

  const bullets = summary?.summary_bullets ? (() => { try { return JSON.parse(summary.summary_bullets) as string[]; } catch { return []; } })() : [];
  const concepts = summary?.key_concepts ? (() => { try { return JSON.parse(summary.key_concepts) as string[]; } catch { return []; } })() : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-background border border-border rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-border flex justify-between items-center">
          <h3 className="font-medium truncate">{asset.file_name}</h3>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <div className="p-4 overflow-y-auto flex-1 text-sm space-y-4">
          {bullets.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1">Summary</h4>
              <ul className="list-disc list-inside space-y-0.5">
                {bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          )}
          {concepts.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1">Key concepts</h4>
              <p className="text-muted-foreground">{concepts.join(', ')}</p>
            </div>
          )}
          {extracted?.full_text && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1">Extracted text</h4>
              <div className="rounded border border-border p-2 bg-muted/30 max-h-48 overflow-y-auto whitespace-pre-wrap text-xs">
                {extracted.full_text.slice(0, 3000)}{extracted.full_text.length > 3000 ? '…' : ''}
              </div>
            </div>
          )}
          {!summary && !extracted && (
            <p className="text-muted-foreground">Not indexed yet. Use Re-index to extract content.</p>
          )}
        </div>
      </div>
    </div>
  );
}
