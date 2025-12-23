'use client';

import { useCallback, useRef } from 'react';

export function useTTS() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // 使用有道词典在线发音 API（兼容微信浏览器）
  const speakEnglish = useCallback((text: string) => {
    try {
      // 停止之前的播放
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      
      // 有道词典发音 API
      const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(text)}&type=2`;
      
      const audio = new Audio(url);
      audio.volume = 1;
      audioRef.current = audio;
      
      audio.play().catch(e => {
        console.log('TTS播放失败:', e);
        // 降级到原生 speechSynthesis
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'en-US';
          utterance.rate = 0.9;
          window.speechSynthesis.speak(utterance);
        }
      });
    } catch (e) {
      console.log('TTS错误:', e);
    }
  }, []);

  const speakChinese = useCallback((text: string) => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      
      // 有道词典中文发音
      const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(text)}&type=1`;
      
      const audio = new Audio(url);
      audio.volume = 1;
      audioRef.current = audio;
      
      audio.play().catch(e => {
        console.log('TTS播放失败:', e);
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'zh-CN';
          window.speechSynthesis.speak(utterance);
        }
      });
    } catch (e) {
      console.log('TTS错误:', e);
    }
  }, []);

  const speak = useCallback((text: string, lang: string = 'en-US') => {
    if (lang.startsWith('zh')) {
      speakChinese(text);
    } else {
      speakEnglish(text);
    }
  }, [speakEnglish, speakChinese]);

  return {
    speak,
    speakEnglish,
    speakChinese,
  };
}
