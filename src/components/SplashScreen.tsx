'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Camera } from 'lucide-react';
import '@/styles/splash.css';

interface SplashScreenProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export function SplashScreen({ onComplete, onSkip }: SplashScreenProps) {
  const [canSkip, setCanSkip] = useState(false);
  const [isShutterActive, setIsShutterActive] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [progress, setProgress] = useState(0);
  const isCompletedRef = useRef(false);
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  // 清理定时器
  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(timer => clearTimeout(timer));
    timersRef.current = [];
  }, []);

  // 完成动画处理
  const handleComplete = useCallback(() => {
    if (isCompletedRef.current) return;
    isCompletedRef.current = true;

    // 先淡出内容
    setIsFadingOut(true);
    
    // 200ms后显示转场遮罩
    const shutterTimer = setTimeout(() => {
      setIsShutterActive(true);
    }, 200);
    timersRef.current.push(shutterTimer);
    
    // 800ms后完成转场
    const completeTimer = setTimeout(() => {
      clearAllTimers();
      onComplete();
    }, 800);
    
    timersRef.current.push(completeTimer);
  }, [onComplete, clearAllTimers]);

  // 跳过动画
  const handleSkip = useCallback(() => {
    if (!canSkip || isCompletedRef.current) return;
    
    if (onSkip) {
      onSkip();
    }
    
    handleComplete();
  }, [canSkip, onSkip, handleComplete]);

  // 初始化动画序列
  useEffect(() => {
    // 动态加载进度 - 平滑递增，约3秒完成
    let currentProgress = 0;
    const progressTimer = setInterval(() => {
      // 使用缓动效果：开始快，接近100%时变慢
      const remaining = 100 - currentProgress;
      const increment = Math.max(0.5, remaining * 0.08 + Math.random() * 2);
      currentProgress = Math.min(100, currentProgress + increment);
      setProgress(currentProgress);
      
      if (currentProgress >= 100) {
        clearInterval(progressTimer);
      }
    }, 50); // 更频繁更新，动画更流畅

    // 1秒后允许跳过
    const skipTimer = setTimeout(() => {
      setCanSkip(true);
    }, 1000);
    
    timersRef.current.push(skipTimer);

    return () => {
      clearInterval(progressTimer);
      clearAllTimers();
    };
  }, [clearAllTimers]);

  // 键盘ESC跳过
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && canSkip) {
        handleSkip();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [canSkip, handleSkip]);

  // 点击跳过（非按钮区域）
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.start-hunt-btn') && canSkip) {
      handleSkip();
    }
  }, [canSkip, handleSkip]);

  return (
    <div 
      className="splash-screen" 
      onClick={handleContainerClick}
      style={{
        opacity: isFadingOut ? 0 : 1,
        transition: 'opacity 0.4s ease-out'
      }}
    >
      {/* 背景图案 */}
      <div className="background-pattern"></div>

      {/* 怪兽 */}
      <div className="monster-container">
        <img 
          src="/splash/Monster.png" 
          alt="Monster" 
          className="monster-image"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const fallback = document.createElement('div');
            fallback.className = 'monster-fallback';
            fallback.textContent = '🦖';
            target.parentElement?.appendChild(fallback);
          }}
        />
      </div>

      {/* Logo */}
      <div className="logo-text-container">
        <img 
          src="/splash/Wordhunter.png" 
          alt="Word Hunter" 
          className="logo-text-image"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const fallback = document.createElement('h1');
            fallback.className = 'logo-text-fallback';
            fallback.textContent = 'WORD\nHUNTER';
            target.parentElement?.insertBefore(fallback, target);
          }}
        />
        <p className="tagline">Gotta Catch &apos;Em Words!</p>
      </div>

      {/* 开始按钮 */}
      <div className="button-container">
        <button 
          className="start-hunt-btn"
          onClick={handleComplete}
        >
          <span className="btn-text">START HUNTING</span>
          <Camera className="camera-icon" strokeWidth={2.5} />
        </button>
      </div>

      {/* 加载进度 */}
      <div className="loading-progress">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="progress-text">Loading... {Math.round(progress)}%</p>
      </div>

      {/* 跳过提示 */}
      <div className={`skip-hint ${canSkip ? 'visible' : ''}`}>
        💡 Click to skip
      </div>

      {/* 快门转场遮罩 */}
      <div className={`shutter-overlay ${isShutterActive ? 'active' : ''}`}>
        <div className="shutter-ring"></div>
      </div>
    </div>
  );
}

export default SplashScreen;
