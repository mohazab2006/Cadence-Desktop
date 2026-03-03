/**
 * M8: User-defined availability (fixed/recurring) for calendar-aware study scheduling.
 */
import { useState } from 'react';
import {
  useAvailabilityBlocks,
  useCreateAvailabilityBlock,
  useDeleteAvailabilityBlock,
} from '../../hooks/useCopilot';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AvailabilityBlocksSection() {
  const { data: blocks = [] } = useAvailabilityBlocks();
  const createBlock = useCreateAvailabilityBlock();
  const deleteBlock = useDeleteAvailabilityBlock();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [dayOfWeek, setDayOfWeek] = useState<number | null>(null);
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekly'>('weekly');

  const handleAdd = async () => {
    if (!title.trim()) return;
    await createBlock.mutateAsync({
      title: title.trim(),
      start_time: startTime,
      end_time: endTime,
      day_of_week: recurrence === 'weekly' ? (dayOfWeek ?? 0) : null,
      recurrence: recurrence === 'none' ? 'none' : recurrence,
      start_date: null,
      end_date: null,
    });
    setTitle('');
    setOpen(false);
  };

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-foreground">Availability</span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground"
        >
          Add block
        </button>
      </div>
      <p className="text-xs text-muted-foreground mb-2">Fixed commitments (classes, work) so study plans avoid them.</p>
      <ul className="space-y-1 text-xs">
        {blocks.map((b) => (
          <li key={b.id} className="flex justify-between gap-2 py-1">
            <span className="truncate">{b.title} · {b.start_time}–{b.end_time}</span>
            <span className="text-muted-foreground shrink-0">
              {b.recurrence === 'weekly' && b.day_of_week != null ? DAYS[b.day_of_week] : b.recurrence === 'daily' ? 'Daily' : 'Once'}
            </span>
            <button type="button" onClick={() => deleteBlock.mutate(b.id)} className="text-red-600 hover:underline shrink-0">
              Remove
            </button>
          </li>
        ))}
      </ul>
      {blocks.length === 0 && <p className="text-xs text-muted-foreground">No blocks. Add classes or work hours.</p>}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div className="bg-background border border-border rounded-xl p-4 max-w-sm w-full space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-medium">Add availability block</h3>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. COMP2401 class"
              className="w-full rounded border border-border px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="rounded border border-border px-2 py-1 text-sm" />
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="rounded border border-border px-2 py-1 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Recurrence</label>
              <select value={recurrence} onChange={(e) => setRecurrence(e.target.value as any)} className="w-full rounded border border-border px-2 py-1 text-sm mt-0.5">
                <option value="none">Once</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            {recurrence === 'weekly' && (
              <div>
                <label className="text-xs text-muted-foreground">Day</label>
                <select value={dayOfWeek ?? ''} onChange={(e) => setDayOfWeek(e.target.value === '' ? null : Number(e.target.value))} className="w-full rounded border border-border px-2 py-1 text-sm mt-0.5">
                  {DAYS.map((d, i) => (
                    <option key={d} value={i}>{d}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 text-sm border border-border rounded">Cancel</button>
              <button type="button" onClick={handleAdd} disabled={!title.trim()} className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded disabled:opacity-50">
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
