/**
 * Speech-to-text via Web Speech API. Used only as alternate input for Command Center.
 * No audio is stored or uploaded beyond the browser's recognition service.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onnomatch: (() => void) | null;
  onaudiostart: (() => void) | null;
  onsoundstart: (() => void) | null;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

export type SpeechRecognitionErrorType =
  | 'no-speech'
  | 'partial'
  | 'network'
  | 'permission-denied'
  | 'not-allowed'
  | 'aborted'
  | 'unsupported'
  | 'unknown';

export interface UseSpeechRecognitionResult {
  isSupported: boolean;
  isListening: boolean;
  error: SpeechRecognitionErrorType | null;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  resetError: () => void;
}

function getRecognitionConstructor(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export function useSpeechRecognition(options: {
  language: string;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (type: SpeechRecognitionErrorType, message?: string) => void;
  onEnd?: () => void;
}): UseSpeechRecognitionResult {
  const { language, onResult, onError, onEnd } = options;
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<SpeechRecognitionErrorType | null>(null);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isSupported = Boolean(getRecognitionConstructor());

  const resetError = useCallback(() => setError(null), []);

  const stopListening = useCallback(() => {
    const rec = recognitionRef.current;
    if (rec) {
      try {
        rec.abort();
      } catch {
        try {
          rec.stop();
        } catch {
          /* ignore */
        }
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    setError(null);
    setTranscript('');
    const Ctor = getRecognitionConstructor();
    if (!Ctor) {
      setError('unsupported');
      onError?.('unsupported');
      return;
    }

    const rec = new Ctor();
    recognitionRef.current = rec;
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = language;

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let full = '';
      for (let i = 0; i < e.results.length; i++) {
        full += e.results.item(i).item(0).transcript;
        if (i < e.results.length - 1) full += ' ';
      }
      const isFinal = e.results.item(e.results.length - 1).isFinal;
      setTranscript(full);
      onResult?.(full, isFinal);
    };

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      const err = (e.error || 'unknown').toLowerCase();
      let type: SpeechRecognitionErrorType = 'unknown';
      if (err === 'no-speech') type = 'no-speech';
      else if (err === 'aborted') type = 'aborted';
      else if (err === 'network') type = 'network';
      else if (err === 'not-allowed' || err === 'service-not-allowed') type = 'permission-denied';
      else if (err === 'language-not-supported') type = 'unsupported';
      setError(type);
      onError?.(type, e.message);
      setIsListening(false);
      recognitionRef.current = null;
    };

    rec.onend = () => {
      if (recognitionRef.current === rec) {
        recognitionRef.current = null;
        setIsListening(false);
      }
      onEnd?.();
    };

    rec.onnomatch = () => {
      setError('no-speech');
      onError?.('no-speech');
    };

    try {
      rec.start();
      setIsListening(true);
    } catch (err) {
      setError('permission-denied');
      onError?.('permission-denied');
      recognitionRef.current = null;
    }
  }, [language, onResult, onError, onEnd]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          /* ignore */
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    error,
    transcript,
    startListening,
    stopListening,
    resetError,
  };
}
