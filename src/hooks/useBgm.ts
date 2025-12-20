'use client';

import { useCallback, useRef, useEffect, useState } from 'react';

// 贪吃蛇风格背景音乐 - 8-bit电子游戏风格
export function useBgm() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const isPlayingRef = useRef(false);
  const nodesRef = useRef<{
    oscillators: OscillatorNode[];
    gains: GainNode[];
    masterGain: GainNode | null;
  }>({ oscillators: [], gains: [], masterGain: null });
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasAutoStartedRef = useRef(false); // 是否已自动启动过

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // 贪吃蛇风格的音符序列 - 经典8-bit游戏旋律
  const melodyNotes = [
    // 主旋律 - 简单重复的上行下行模式
    330, 330, 392, 392, 440, 440, 392, 0,   // E4, E4, G4, G4, A4, A4, G4, rest
    349, 349, 330, 330, 294, 294, 262, 0,   // F4, F4, E4, E4, D4, D4, C4, rest
    330, 392, 440, 523, 440, 392, 330, 0,   // E4, G4, A4, C5, A4, G4, E4, rest
    294, 330, 294, 262, 247, 262, 294, 0,   // D4, E4, D4, C4, B3, C4, D4, rest
  ];

  const bassNotes = [
    // 低音 - 稳定的节奏基础
    131, 0, 165, 0,   // C3, rest, E3, rest
    147, 0, 131, 0,   // D3, rest, C3, rest
    165, 0, 196, 0,   // E3, rest, G3, rest
    131, 0, 131, 0,   // C3, rest, C3, rest
  ];

  // 播放背景音乐
  const playBgm = useCallback(() => {
    if (isPlayingRef.current) return;
    
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      isPlayingRef.current = true;
      setIsPlaying(true);

      // 创建主音量控制
      const masterGain = ctx.createGain();
      masterGain.gain.value = 0.12; // 背景音乐音量较低
      masterGain.connect(ctx.destination);
      nodesRef.current.masterGain = masterGain;

      let noteIndex = 0;
      const noteInterval = 150; // 贪吃蛇风格更快的节奏 150ms

      const playNote = () => {
        if (!isPlayingRef.current) return;

        const currentCtx = audioContextRef.current;
        if (!currentCtx) return;

        const melodyFreq = melodyNotes[noteIndex % melodyNotes.length];
        
        // 旋律音 - 只在非休止符时播放
        if (melodyFreq > 0) {
          const melodyOsc = currentCtx.createOscillator();
          const melodyGain = currentCtx.createGain();
          melodyOsc.connect(melodyGain);
          melodyGain.connect(masterGain);
          
          melodyOsc.frequency.value = melodyFreq;
          melodyOsc.type = 'square'; // 方波 - 经典8-bit音色
          
          melodyGain.gain.setValueAtTime(0.25, currentCtx.currentTime);
          melodyGain.gain.exponentialRampToValueAtTime(0.01, currentCtx.currentTime + 0.12);
          
          melodyOsc.start(currentCtx.currentTime);
          melodyOsc.stop(currentCtx.currentTime + 0.12);
        }

        // 低音 (每4个音符一个)
        if (noteIndex % 4 === 0) {
          const bassFreq = bassNotes[Math.floor(noteIndex / 4) % bassNotes.length];
          if (bassFreq > 0) {
            const bassOsc = currentCtx.createOscillator();
            const bassGain = currentCtx.createGain();
            bassOsc.connect(bassGain);
            bassGain.connect(masterGain);
            
            bassOsc.frequency.value = bassFreq;
            bassOsc.type = 'square'; // 方波低音
            
            bassGain.gain.setValueAtTime(0.15, currentCtx.currentTime);
            bassGain.gain.exponentialRampToValueAtTime(0.01, currentCtx.currentTime + 0.3);
            
            bassOsc.start(currentCtx.currentTime);
            bassOsc.stop(currentCtx.currentTime + 0.3);
          }
        }

        noteIndex++;
      };

      // 立即播放第一个音符
      playNote();
      
      // 设置循环播放
      intervalRef.current = setInterval(playNote, noteInterval);

    } catch (e) {
      console.log('BGM not available:', e);
      isPlayingRef.current = false;
      setIsPlaying(false);
    }
  }, [getAudioContext]);

  // 停止背景音乐
  const stopBgm = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // 淡出主音量
    if (nodesRef.current.masterGain && audioContextRef.current) {
      const ctx = audioContextRef.current;
      nodesRef.current.masterGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    }
  }, []);

  // 切换背景音乐
  const toggleBgm = useCallback(() => {
    if (isPlayingRef.current) {
      stopBgm();
    } else {
      playBgm();
    }
  }, [playBgm, stopBgm]);

  // 首次用户交互时自动开启背景音乐
  useEffect(() => {
    const handleFirstInteraction = () => {
      if (!hasAutoStartedRef.current && !isPlayingRef.current) {
        hasAutoStartedRef.current = true;
        playBgm();
      }
      // 移除监听器
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };

    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('touchstart', handleFirstInteraction);

    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, [playBgm]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      stopBgm();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stopBgm]);

  return { playBgm, stopBgm, toggleBgm, isPlaying };
}
