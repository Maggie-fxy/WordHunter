'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { BgmProvider, useBgm } from '@/hooks/useBgm';

function BgmPlayer() {
  const { isPlaying } = useBgm();
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      // 微信浏览器需要用户交互后才能播放
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => {
          console.log('BGM autoplay blocked:', e);
        });
      }
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  // 使用 audio 标签而不是 new Audio()，兼容微信浏览器
  return (
    <audio
      ref={audioRef}
      src="/bgm.mp3"
      loop
      playsInline
      preload="auto"
      style={{ display: 'none' }}
    />
  );
}

export function BgmHost({ children }: { children: ReactNode }) {
  return (
    <BgmProvider>
      <BgmPlayer />
      {children}
    </BgmProvider>
  );
}
