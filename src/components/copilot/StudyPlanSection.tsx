/**
 * M8: Editable study plan per course. Generate from target grade + assets; preview before save.
 */
import { useState } from 'react';
import { useStudyPlanBlocks, useUpsertStudyPlanBlocks } from '../../hooks/useCopilot';
import { useCourseAssets } from '../../hooks/useCourseAssets';
import type { StudyPlanBlock } from '../../lib/types';

type DraftBlock = Omit<StudyPlanBlock, 'id' | 'course_id' | 'created_at' | 'updated_at'> & { id?: string };

interface StudyPlanSectionProps {
  courseId: string | null;
}

function toLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}:00`;
}

export default function StudyPlanSection({ courseId }: StudyPlanSectionProps) {
  const { data: blocks = [] } = useStudyPlanBlocks(courseId);
  const upsertBlocks = useUpsertStudyPlanBlocks(courseId);
  const { data: assets = [] } = useCourseAssets(courseId);
  const [draft, setDraft] = useState<DraftBlock[] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const displayBlocks: (StudyPlanBlock | DraftBlock)[] = draft ?? blocks;

  const handleGenerate = () => {
    setGenerating(true);
    try {
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(9, 0, 0, 0);
      const newBlocks: Omit<StudyPlanBlock, 'id' | 'course_id' | 'created_at' | 'updated_at'>[] = [];
      const lectureAssets = assets.filter((a) => a.asset_type === 'lecture' || a.asset_type === 'tutorial');
      for (let day = 0; day < 14; day++) {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + day);
        d.setHours(9, 0, 0, 0);
        const end = new Date(d);
        end.setHours(10, 30, 0, 0);
        if (lectureAssets[day % Math.max(1, lectureAssets.length)]) {
          const asset = lectureAssets[day % lectureAssets.length];
          newBlocks.push({
            task_id: null,
            title: `Review: ${asset.file_name}`,
            start: toLocalISO(d),
            end: toLocalISO(end),
            linked_asset_ids: JSON.stringify([asset.id]),
            block_type: 'review',
          });
        } else {
          newBlocks.push({
            task_id: null,
            title: 'Practice / problems',
            start: toLocalISO(d),
            end: toLocalISO(end),
            linked_asset_ids: '[]',
            block_type: 'practice',
          });
        }
      }
      setDraft(newBlocks);
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!courseId || !displayBlocks.length) return;
    setSaving(true);
    try {
      await upsertBlocks.mutateAsync(
        displayBlocks.map((b) => ({
          task_id: b.task_id,
          title: b.title,
          start: b.start,
          end: b.end,
          linked_asset_ids: b.linked_asset_ids,
          block_type: b.block_type as 'review' | 'practice' | 'other',
        }))
      );
      setDraft(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscardDraft = () => {
    setDraft(null);
  };

  if (!courseId) return null;

  return (
    <div className="mt-6 rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-foreground">Study plan</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 disabled:opacity-50"
          >
            {generating ? '…' : 'Generate plan'}
          </button>
          {draft && (
            <>
              <button type="button" onClick={handleSave} disabled={saving} className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground">
                Save plan
              </button>
              <button type="button" onClick={handleDiscardDraft} className="text-xs px-2 py-1 rounded border border-border">
                Discard
              </button>
            </>
          )}
        </div>
      </div>
      {draft && (
        <p className="text-xs text-muted-foreground mb-2">Preview: edit below and click Save plan, or Discard to keep current.</p>
      )}
      {displayBlocks.length === 0 ? (
        <p className="text-xs text-muted-foreground">No study blocks. Generate a plan (1–2 weeks) then save.</p>
      ) : (
        <ul className="space-y-1.5 text-xs max-h-48 overflow-y-auto">
          {displayBlocks.slice(0, 14).map((b, i) => (
            <li key={b.id || i} className="flex justify-between gap-2 py-1 border-b border-border/50">
              <span className="truncate">{b.title}</span>
              <span className="text-muted-foreground shrink-0">
                {new Date(b.start).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
