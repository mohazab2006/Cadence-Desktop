/**
 * M8: Study scope for an assessment task. Lists linked lectures; Edit opens modal to add/remove.
 */
import { useState } from 'react';
import { useAssessmentScopeLinks } from '../../hooks/useCopilot';
import { useCourseAssets } from '../../hooks/useCourseAssets';
import * as copilotRepo from '../../db/copilot.repo';
import { useQueryClient } from '@tanstack/react-query';
import type { CourseAsset } from '../../lib/types';

interface AssessmentScopeSectionProps {
  taskId: string;
  courseId: string | null;
  taskTitle: string;
}

export default function AssessmentScopeSection({ taskId, courseId, taskTitle }: AssessmentScopeSectionProps) {
  const queryClient = useQueryClient();
  const { data: links = [] } = useAssessmentScopeLinks(taskId);
  const { data: assets = [] } = useCourseAssets(courseId);
  const [editOpen, setEditOpen] = useState(false);

  const assetById = (id: string) => assets.find((a) => a.id === id);

  return (
    <div className="mt-4 pt-4 border-t border-border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">Study scope</span>
        <button type="button" onClick={() => setEditOpen(true)} className="text-xs text-primary hover:underline">
          Edit scope
        </button>
      </div>
      {links.length === 0 ? (
        <p className="text-xs text-muted-foreground">No lectures linked. Click Edit scope to add.</p>
      ) : (
        <ul className="text-xs space-y-1">
          {links.map((link) => {
            const asset = assetById(link.asset_id);
            return (
              <li key={link.id} className="flex justify-between gap-2">
                <span className="truncate" title={link.explanation}>
                  {asset?.file_name ?? link.asset_id}
                  {link.confidence < 1 && ` (${Math.round(link.confidence * 100)}%)`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {editOpen && (
        <AssessmentScopeEditModal
          taskId={taskId}
          taskTitle={taskTitle}
          assets={assets}
          links={links}
          onClose={() => {
            setEditOpen(false);
            queryClient.invalidateQueries({ queryKey: ['assessmentScope'] });
          }}
        />
      )}
    </div>
  );
}

function AssessmentScopeEditModal({
  taskId,
  taskTitle,
  assets,
  links,
  onClose,
}: {
  taskId: string;
  taskTitle: string;
  assets: CourseAsset[];
  links: { id: string; asset_id: string; explanation: string; confidence: number }[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [addAssetId, setAddAssetId] = useState('');
  const [explanation, setExplanation] = useState('');
  const [confidence, setConfidence] = useState(0.8);

  const handleAdd = async () => {
    if (!addAssetId.trim()) return;
    await copilotRepo.addScopeLink({
      task_id: taskId,
      asset_id: addAssetId,
      chunk_id: null,
      confidence,
      explanation: explanation.trim() || 'Manually linked',
    });
    queryClient.invalidateQueries({ queryKey: ['assessmentScope'] });
    setAddAssetId('');
    setExplanation('');
  };

  const handleRemove = async (linkId: string) => {
    await copilotRepo.deleteScopeLink(linkId);
    queryClient.invalidateQueries({ queryKey: ['assessmentScope'] });
  };

  const linkedIds = new Set(links.map((l) => l.asset_id));
  const availableAssets = assets.filter((a) => !linkedIds.has(a.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-background border border-border rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-border flex justify-between items-center">
          <h3 className="font-medium">Study scope: {taskTitle}</h3>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <div className="p-4 overflow-y-auto space-y-4">
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2">Linked lectures</h4>
            <ul className="space-y-1">
              {links.map((link) => {
                const asset = assets.find((a) => a.id === link.asset_id);
                return (
                  <li key={link.id} className="flex justify-between items-center gap-2 text-sm">
                    <span className="truncate">{asset?.file_name ?? link.asset_id}</span>
                    <button type="button" onClick={() => handleRemove(link.id)} className="text-red-600 hover:underline text-xs">
                      Remove
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          {availableAssets.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2">Add link</h4>
              <select
                value={addAssetId}
                onChange={(e) => setAddAssetId(e.target.value)}
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm mb-2"
              >
                <option value="">Select asset…</option>
                {availableAssets.map((a) => (
                  <option key={a.id} value={a.id}>{a.file_name}</option>
                ))}
              </select>
              <input
                type="text"
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Reason (e.g. Covers Lectures 1–6)"
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm mb-2"
              />
              <div className="flex items-center gap-2 mb-2">
                <label className="text-xs">Confidence</label>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.1}
                  value={confidence}
                  onChange={(e) => setConfidence(Number(e.target.value))}
                  className="w-16 rounded border border-border px-2 py-1 text-sm"
                />
              </div>
              <button type="button" onClick={handleAdd} disabled={!addAssetId} className="text-sm px-3 py-1.5 bg-primary text-primary-foreground rounded">
                Add
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
