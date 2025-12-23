'use client';

import { useCallback, useEffect, useState } from 'react';

const BGM_ENABLED_KEY = 'wordcaps_bgm_enabled';

export function useBgm() {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(BGM_ENABLED_KEY);
      // 默认常开：首次进入（没有设置过）也开启背景音乐
      if (raw === null) {
        localStorage.setItem(BGM_ENABLED_KEY, '1');
        setIsPlaying(true);
        return;
      }
      setIsPlaying(raw === '1');
    } catch {
      setIsPlaying(true);
    }
  }, []);

  const persist = useCallback((enabled: boolean) => {
    try {
      localStorage.setItem(BGM_ENABLED_KEY, enabled ? '1' : '0');
    } catch {
      // ignore
    }
  }, []);

  const playBgm = useCallback(() => {
    setIsPlaying(true);
    persist(true);
  }, [persist]);

  const stopBgm = useCallback(() => {
    setIsPlaying(false);
    persist(false);
  }, [persist]);

  const toggleBgm = useCallback(() => {
    setIsPlaying(prev => {
      const next = !prev;
      persist(next);
      return next;
    });
  }, [persist]);

  return { playBgm, stopBgm, toggleBgm, isPlaying };
}
