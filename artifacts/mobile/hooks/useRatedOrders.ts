import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "mp_rated_order_ids";

// Module-level cache — survives re-renders across all card instances
let cache: Set<string> | null = null;
let loadPromise: Promise<Set<string>> | null = null;

async function loadCache(): Promise<Set<string>> {
  if (cache !== null) return cache;
  if (loadPromise) return loadPromise;
  loadPromise = AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
    const ids: string[] = raw ? (JSON.parse(raw) as string[]) : [];
    cache = new Set(ids);
    return cache;
  }).catch(() => {
    cache = new Set();
    return cache;
  });
  return loadPromise;
}

async function persistCache() {
  if (!cache) return;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...cache])).catch(() => {});
}

export function useRatedOrders() {
  const [snapshot, setSnapshot] = useState<Set<string>>(cache ?? new Set());

  useEffect(() => {
    loadCache().then((s) => setSnapshot(new Set(s)));
  }, []);

  const isRated = useCallback(
    (orderId: string) => snapshot.has(orderId),
    [snapshot],
  );

  const markRated = useCallback((orderId: string) => {
    if (!cache) cache = new Set();
    cache.add(orderId);
    persistCache();
    setSnapshot(new Set(cache));
  }, []);

  return { isRated, markRated };
}
