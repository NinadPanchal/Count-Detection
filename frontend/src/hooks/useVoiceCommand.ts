"use client";
import { useState, useCallback, useRef } from "react";

interface VoiceState {
  isListening: boolean;
  transcript: string;
  error: string | null;
}

export function useVoiceCommand(onCommand: (cmd: string) => void) {
  const [state, setState] = useState<VoiceState>({ isListening: false, transcript: "", error: null });
  const recognitionRef = useRef<any>(null);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setState(s => ({ ...s, error: "Speech recognition not supported" }));
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    recognition.onstart = () => setState(s => ({ ...s, isListening: true, error: null }));

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join("");
      setState(s => ({ ...s, transcript }));
      if (event.results[0].isFinal) {
        onCommand(transcript.toLowerCase());
      }
    };

    recognition.onend = () => setState(s => ({ ...s, isListening: false }));
    recognition.onerror = (e: any) => setState(s => ({ ...s, isListening: false, error: e.error }));

    recognition.start();
  }, [onCommand]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setState(s => ({ ...s, isListening: false }));
  }, []);

  return { ...state, startListening, stopListening };
}
