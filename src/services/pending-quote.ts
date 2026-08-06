import AsyncStorage from '@react-native-async-storage/async-storage';

import { PendingQuote } from '@/services/types';

const KEY = 'jka_pending_quote';

export async function savePendingQuote(quote: PendingQuote) {
  await AsyncStorage.setItem(KEY, JSON.stringify(quote));
}

export async function getPendingQuote(): Promise<PendingQuote | null> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function clearPendingQuote() {
  await AsyncStorage.removeItem(KEY);
}
