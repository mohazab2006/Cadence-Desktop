/**
 * Voice input settings for Command Center. Stored in localStorage.
 * No raw audio is stored; only user preferences.
 */

const KEY_ENABLED = 'studynflow_voice_enabled';
const KEY_LANG = 'studynflow_voice_lang';
const KEY_AUTO_SUBMIT = 'studynflow_voice_auto_submit';

export type VoicePermissionStatus = 'granted' | 'denied' | 'prompt' | 'unsupported';

export interface VoiceSettings {
  enabled: boolean;
  language: string;
  autoSubmitAfterSpeech: boolean;
}

const DEFAULT_SETTINGS: VoiceSettings = {
  enabled: true,
  language: 'en-US',
  autoSubmitAfterSpeech: false,
};

export function getVoiceSettings(): VoiceSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const enabled = localStorage.getItem(KEY_ENABLED);
    const language = localStorage.getItem(KEY_LANG);
    const autoSubmit = localStorage.getItem(KEY_AUTO_SUBMIT);
    return {
      enabled: enabled === null ? true : enabled === 'true',
      language: language || DEFAULT_SETTINGS.language,
      autoSubmitAfterSpeech: autoSubmit === 'true',
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function setVoiceEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(KEY_ENABLED, String(enabled));
  } catch {
    /* ignore */
  }
}

export function setVoiceLanguage(language: string): void {
  try {
    localStorage.setItem(KEY_LANG, language);
  } catch {
    /* ignore */
  }
}

export function setVoiceAutoSubmit(autoSubmit: boolean): void {
  try {
    localStorage.setItem(KEY_AUTO_SUBMIT, String(autoSubmit));
  } catch {
    /* ignore */
  }
}

/** Common recognition languages for the settings dropdown */
export const VOICE_LANGUAGES: { value: string; label: string }[] = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'es-ES', label: 'Spanish' },
  { value: 'fr-FR', label: 'French' },
  { value: 'de-DE', label: 'German' },
  { value: 'it-IT', label: 'Italian' },
  { value: 'pt-BR', label: 'Portuguese (Brazil)' },
  { value: 'ja-JP', label: 'Japanese' },
  { value: 'ko-KR', label: 'Korean' },
  { value: 'zh-CN', label: 'Chinese (Simplified)' },
];
