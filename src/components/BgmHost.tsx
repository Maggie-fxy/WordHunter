'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { BgmProvider, useBgm } from '@/hooks/useBgm';

function BgmPlayer() {
  const { isPlaying } = useBgm();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // 创建 Audio 实例
    if (!audioRef.current) {
      audioRef.current = new Audio('/bgm.mp3');
      audioRef.current.loop = true;
      audioRef.current.volume = 0.5;
    }

    const audio = audioRef.current;

    if (isPlaying) {
      audio.play().catch(e => {
        console.log('BGM autoplay blocked:', e);
      });
    } else {
      audio.pause();
    }

    return () => {
      // 组件卸载时不销毁 audio，保持播放
    };
  }, [isPlaying]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return null;
}

export function BgmHost({ children }: { children: ReactNode }) {
  return (
    <BgmProvider>
      <BgmPlayer />
      {children}
    </BgmProvider>
  );
}
