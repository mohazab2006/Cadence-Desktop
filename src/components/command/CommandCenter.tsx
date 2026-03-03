import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseCommand, type CommandIntent } from '../../services/commandParser';
import { useCreateTask } from '../../hooks/useTasks';
import { useCourses } from '../../hooks/useCourses';
import { useTasks } from '../../hooks/useTasks';
import {
  computeNeededFinal,
  computeProjectedOverall,
} from '../../services/gradeMath';
import {
  getVoiceSettings,
  setVoiceEnabled,
  setVoiceLanguage,
  setVoiceAutoSubmit,
  VOICE_LANGUAGES,
  type VoiceSettings,
} from '../../services/voiceSettings';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';

interface CommandCenterProps {
  isOpen: boolean;
  onClose: () => void;
  pageContext?: { courseCode?: string };
}

export default function CommandCenter({ isOpen, onClose, pageContext }: CommandCenterProps) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<{ intent: CommandIntent; message: string; confirmAction?: () => void } | null>(null);
  const [voiceSettingsOpen, setVoiceSettingsOpen] = useState(false);
  const [voiceSettings, setVoiceSettingsState] = useState<VoiceSettings>(getVoiceSettings);
  const navigate = useNavigate();

  const updateVoiceSetting = useCallback(<K extends keyof VoiceSettings>(key: K, value: VoiceSettings[K]) => {
    setVoiceSettingsState((s) => ({ ...s, [key]: value }));
    if (key === 'enabled') setVoiceEnabled(value as boolean);
    if (key === 'language') setVoiceLanguage(value as string);
    if (key === 'autoSubmitAfterSpeech') setVoiceAutoSubmit(value as boolean);
  }, []);
  const createTask = useCreateTask();
  const { data: courses = [] } = useCourses();
  const { data: allSchoolTasks = [] } = useTasks({ workspace: 'school', includeCompleted: true });

  const runQuery = useCallback(
    (intent: CommandIntent) => {
      if (intent.type === 'query_focus') {
        setResult({
          intent,
          message: 'Open the Home page to see your Focus widget (top tasks by due date and weight).',
        });
        return;
      }
      if (intent.type === 'query_needed_final') {
        const course = intent.courseCode
          ? courses.find((c) => c.code.toUpperCase() === intent.courseCode?.toUpperCase())
          : courses[0];
        if (!course) {
          setResult({ intent, message: 'No course found. Add a course or specify course code (e.g. COMP2401).' });
          return;
        }
        const courseTasks = allSchoolTasks.filter((t) => t.course_id === course.id);
        const finalTask = courseTasks.find((t) => (t.type || '').toLowerCase() === 'final');
        if (!finalTask?.grade?.weight_percent) {
          setResult({ intent, message: `${course.code}: No final exam with weight found. Add a Final task with weight.` });
          return;
        }
        const nonFinal = courseTasks.filter((t) => t.id !== finalTask.id);
        const known = computeProjectedOverall(nonFinal);
        const target = intent.targetPercent ?? course.target_grade_default ?? 90;
        const needed = computeNeededFinal({
          target,
          knownContribution: known,
          finalWeightPercent: Number(finalTask.grade.weight_percent),
        });
        const msg =
          needed === null
            ? `${course.code}: Cannot compute (check weights).`
            : `To get ${target}% in ${course.code}, you need ${needed.toFixed(1)}% on the final (weight ${finalTask.grade.weight_percent}%).`;
        setResult({ intent, message: msg });
        return;
      }
      if (intent.type === 'query_drop_lowest') {
        const course = courses.find((c) => c.code.toUpperCase() === intent.courseCode);
        if (!course) {
          setResult({ intent, message: `Course ${intent.courseCode} not found.` });
          return;
        }
        setResult({
          intent,
          message: `Open ${course.code} to add or edit "Drop lowest" rules in the Course rules section. No data will be changed here.`,
          confirmAction: () => {
            navigate('/school');
            onClose();
            setResult(null);
            setInput('');
          },
        });
        return;
      }
      if (intent.type === 'add_task') {
        const courseId = intent.courseCode
          ? courses.find((c) => c.code.toUpperCase() === intent.courseCode?.toUpperCase())?.id
          : null;
        const preview = [
          `Create task: "${intent.title}"`,
          intent.dueAt ? `Due: ${new Date(intent.dueAt).toLocaleString()}` : null,
          intent.courseCode ? `Course: ${intent.courseCode}` : 'No course',
          intent.isRecurring ? 'Recurring (create in Life to set schedule)' : null,
        ]
          .filter(Boolean)
          .join(' · ');
        setResult({
          intent,
          message: preview,
          confirmAction: async () => {
            try {
              await createTask.mutateAsync({
                title: intent.title,
                due_at: intent.dueAt ?? undefined,
                course_id: courseId ?? undefined,
                workspace: courseId ? 'school' : 'life',
                status: 'todo',
              });
              setResult({ intent, message: 'Task created.' });
              setInput('');
              setTimeout(() => onClose(), 800);
            } catch (e) {
              setResult({ intent, message: 'Failed: ' + String((e as Error).message) });
            }
          },
        });
        return;
      }
      if (intent.type === 'ambiguous') {
        setResult({ intent, message: intent.message });
        return;
      }
      setResult({ intent, message: 'Try "Add assignment in COMP2401 due Friday 11:59" or "What do I need on the final?"' });
    },
    [courses, allSchoolTasks, createTask, navigate, onClose]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const intent = parseCommand(input, pageContext);
    runQuery(intent);
  };

  const {
    isSupported: voiceSupported,
    isListening,
    error: voiceError,
    transcript: liveTranscript,
    startListening,
    stopListening,
    resetError: resetVoiceError,
  } = useSpeechRecognition({
    language: voiceSettings.language,
    onResult(transcript, isFinal) {
      if (isFinal && transcript.trim()) {
        setInput(transcript.trim());
        resetVoiceError();
        if (voiceSettings.autoSubmitAfterSpeech) {
          const intent = parseCommand(transcript.trim(), pageContext);
          runQuery(intent);
        }
      }
    },
    onError() {
      // Error state is set in hook; we show it in UI
    },
  });

  const showVoice = voiceSettings.enabled && voiceSupported;
  const displayInput = isListening ? (liveTranscript || input) : input;

  useEffect(() => {
    if (isOpen) setVoiceSettingsState(getVoiceSettings());
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setInput('');
      setResult(null);
      setVoiceSettingsOpen(false);
      if (isListening) stopListening();
    }
  }, [isOpen, isListening, stopListening]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isListening) stopListening();
        else onClose();
        return;
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'V') {
        e.preventDefault();
        if (isOpen && showVoice && !isListening) startListening();
      }
    };
    if (isOpen) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, showVoice, isListening, startListening, stopListening]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50 px-4" onClick={onClose}>
      <div
        className="bg-background border border-border rounded-xl shadow-xl w-full max-w-xl overflow-hidden"
        role="dialog"
        aria-label="Command Center"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <span className="text-muted-foreground shrink-0">⌘K</span>
            <input
              type="text"
              value={displayInput}
              onChange={(e) => !isListening && setInput(e.target.value)}
              placeholder="Add task, ask 'what should I focus?', 'what do I need on final?', 'drop lowest COMP2401'..."
              className="flex-1 min-w-0 bg-transparent outline-none placeholder:text-muted-foreground text-sm"
              autoFocus
              readOnly={isListening}
            />
            {showVoice && (
              <div className="flex items-center gap-1 shrink-0">
                {isListening ? (
                  <>
                    <span className="flex gap-0.5 items-end h-5 [&>span]:min-h-1" aria-hidden>
                      {[0, 1, 2, 3, 4].map((i) => (
                        <span
                          key={i}
                          className="w-1 bg-primary rounded-full animate-voice-bar"
                          style={{ animationDelay: `${i * 0.1}s` }}
                        />
                      ))}
                    </span>
                    <button
                      type="button"
                      onClick={stopListening}
                      className="p-2 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors"
                      title="Stop listening"
                      aria-label="Stop listening"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <rect x="6" y="6" width="12" height="12" rx="2" />
                      </svg>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={startListening}
                    className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    title="Voice input (Ctrl+Shift+V)"
                    aria-label="Start voice input"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z M12 14v6" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>
        </form>

        {voiceError && (
          <div className="px-4 py-2 border-t border-border bg-muted/50">
            <p className="text-xs text-muted-foreground">
              {voiceError === 'no-speech' && 'No speech detected. Try again or type your command.'}
              {voiceError === 'permission-denied' && 'Microphone access denied. Enable it in browser settings to use voice.'}
              {voiceError === 'network' && 'Recognition unavailable (network). Try again or type your command.'}
              {voiceError === 'aborted' && 'Listening stopped.'}
              {voiceError === 'unsupported' && 'Voice input is not supported in this browser.'}
              {voiceError === 'unknown' && 'Something went wrong. Try typing your command.'}
            </p>
            <button
              type="button"
              onClick={resetVoiceError}
              className="mt-1 text-xs text-primary hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {result && (
          <div className="p-4 border-t border-border">
            <p className="text-sm text-foreground whitespace-pre-wrap">{result.message}</p>
            {result.confirmAction && (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={result.confirmAction}
                  className="px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setResult(null)}
                  className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground space-y-2">
          <p>
            Examples: Add assignment in COMP2401 due Friday 11:59 · What do I need on the final? · Drop lowest quiz in COMP2401
          </p>
          <div>
            <button
              type="button"
              onClick={() => setVoiceSettingsOpen((o) => !o)}
              className="text-muted-foreground hover:text-foreground underline"
            >
              {voiceSettingsOpen ? 'Hide' : 'Show'} voice settings
            </button>
            {voiceSettingsOpen && (
              <div className="mt-2 p-3 rounded-lg bg-muted/40 space-y-3">
                <VoiceSettingsPanel
                  settings={voiceSettings}
                  onEnabledChange={(v) => updateVoiceSetting('enabled', v)}
                  onLanguageChange={(v) => updateVoiceSetting('language', v)}
                  onAutoSubmitChange={(v) => updateVoiceSetting('autoSubmitAfterSpeech', v)}
                  isSupported={voiceSupported}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes voice-bar {
          0%, 100% { transform: scaleY(0.35); }
          50% { transform: scaleY(1); }
        }
        .animate-voice-bar {
          height: 16px;
          transform-origin: bottom;
          animation: voice-bar 0.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

function VoiceSettingsPanel({
  settings,
  onEnabledChange,
  onLanguageChange,
  onAutoSubmitChange,
  isSupported,
}: {
  settings: VoiceSettings;
  onEnabledChange: (v: boolean) => void;
  onLanguageChange: (v: string) => void;
  onAutoSubmitChange: (v: boolean) => void;
  isSupported: boolean;
}) {
  const [permStatus, setPermStatus] = useState<'unknown' | 'granted' | 'denied' | 'prompt'>('unknown');

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
      setPermStatus('unknown');
      return;
    }
    navigator.permissions
      .query({ name: 'microphone' as PermissionName })
      .then((s) => {
        setPermStatus(s.state as 'granted' | 'denied' | 'prompt');
        s.onchange = () => setPermStatus(s.state as 'granted' | 'denied' | 'prompt');
      })
      .catch(() => setPermStatus('unknown'));
  }, []);

  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center justify-between">
        <label className="text-foreground">Enable voice input</label>
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
          className="rounded border-border"
        />
      </div>
      <div>
        <label className="text-foreground block mb-1">Recognition language</label>
        <select
          value={settings.language}
          onChange={(e) => onLanguageChange(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
        >
          {VOICE_LANGUAGES.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center justify-between">
        <label className="text-foreground">Auto-submit after speech (show preview)</label>
        <input
          type="checkbox"
          checked={settings.autoSubmitAfterSpeech}
          onChange={(e) => onAutoSubmitChange(e.target.checked)}
          className="rounded border-border"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Microphone: {permStatus === 'granted' ? 'Allowed' : permStatus === 'denied' ? 'Denied' : permStatus === 'prompt' ? 'Ask when you use voice' : 'Unknown'}
        {!isSupported && ' · Voice not supported in this browser.'}
      </p>
      <p className="text-xs text-muted-foreground">
        Recognition may use online services when available. No audio is stored.
      </p>
    </div>
  );
}
