import { useState } from 'react';
import { useCreateTask } from '../../hooks/useTasks';
import ImportOutlineWizard from '../import/ImportOutlineWizard';
import { getVoiceSettings } from '../../services/voiceSettings';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';

interface TopBarProps {
  onOpenCommand?: () => void;
}

export default function TopBar({ onOpenCommand }: TopBarProps) {
  const [quickAddValue, setQuickAddValue] = useState('');
  const [importWizardOpen, setImportWizardOpen] = useState(false);
  const createTask = useCreateTask();
  const voiceSettings = getVoiceSettings();
  const {
    isSupported: voiceSupported,
    isListening,
    transcript: liveTranscript,
    startListening,
    stopListening,
  } = useSpeechRecognition({
    language: voiceSettings.language,
    onResult(transcript, isFinal) {
      if (isFinal && transcript.trim()) setQuickAddValue(transcript.trim());
    },
  });
  const showVoice = voiceSettings.enabled && voiceSupported;
  const displayValue = isListening ? (liveTranscript || quickAddValue) : quickAddValue;

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddValue.trim()) return;

    try {
      await createTask.mutateAsync({
        title: quickAddValue.trim(),
        status: 'todo',
      });
      setQuickAddValue('');
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  return (
    <>
      <header className="border-b border-border bg-background px-8 pt-4 pb-5">
        <div className="rounded-xl border border-border bg-muted/40 shadow-sm flex items-stretch gap-0 overflow-hidden">
          <form onSubmit={handleQuickAdd} className="flex-1 flex min-w-0 items-center">
            <input
              type="text"
              value={displayValue}
              onChange={(e) => !isListening && setQuickAddValue(e.target.value)}
              placeholder="Add a task..."
              className="flex-1 min-w-0 bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-0 border-0"
              readOnly={isListening}
            />
            {showVoice && (
              <div className="pr-2 flex items-center">
                {isListening ? (
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
                ) : (
                  <button
                    type="button"
                    onClick={startListening}
                    className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    title="Voice input"
                    aria-label="Voice input"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z M12 14v6" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </form>
          <div className="flex items-center gap-2 border-l border-border px-2 py-1.5">
            <button
              type="button"
              onClick={onOpenCommand}
              className="rounded-lg border border-border bg-muted hover:bg-muted/80 px-3 py-2 text-sm font-medium text-muted-foreground whitespace-nowrap transition-colors"
              title="Command Center (Ctrl+K). Voice: Ctrl+Shift+V"
            >
              ⌘K
            </button>
            <button
              type="button"
              onClick={() => setImportWizardOpen(true)}
              className="rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-secondary-foreground px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors"
              title="Import course outline or calendar"
            >
              Import Outline
            </button>
          </div>
        </div>
      </header>
      <ImportOutlineWizard
        isOpen={importWizardOpen}
        onClose={() => setImportWizardOpen(false)}
      />
    </>
  );
}

