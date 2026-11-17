import { Platform } from 'react-native';
import * as Speech from 'expo-speech';

function webSpeechAvailable(): boolean {
  if (Platform.OS !== 'web') return true;
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
}

/** Pronuncia `text` em português do Brasil. `rate` 1.0 = normal, 0.7 = pausado. Nunca lança. */
export function speakPtBR(text: string, rate = 1.0): void {
  if (!text || !webSpeechAvailable()) return;
  try {
    Speech.stop().catch(() => undefined);
    Speech.speak(text, {
      language: 'pt-BR',
      rate,
      onError: () => undefined,
    });
  } catch {
    // sem voz disponível (ex.: navegador sem pt-BR): falha silenciosa
  }
}

export function stopSpeaking(): void {
  if (!webSpeechAvailable()) return;
  try {
    Speech.stop().catch(() => undefined);
  } catch {
    // ignore
  }
}
