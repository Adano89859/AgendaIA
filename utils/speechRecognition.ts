// utils/speechRecognition.ts
// Wrapper seguro para expo-speech-recognition.
// El módulo nativo no existe en Expo Go → devuelve un mock para no crashear.

import { useEffect } from 'react';

let nativeModule: any = null;
let useSpeechRecognitionEventFn: any = null;

try {
  const mod = require('expo-speech-recognition');
  nativeModule = mod.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEventFn = mod.useSpeechRecognitionEvent;
} catch {}

export const SpeechRecognitionModule = nativeModule ?? {
  requestPermissionsAsync: async () => ({ granted: false }),
  start: () => {},
  stop: () => {},
};

export function useSpeechRecognitionEvent(
  event: string,
  handler: (e: any) => void
) {
  if (useSpeechRecognitionEventFn) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useSpeechRecognitionEventFn(event, handler);
  } else {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {}, []);
  }
}