'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Lightbulb, Volume2, VolumeX, Music, Mic } from 'lucide-react';
import { useGame, REMOVE_BG_FLAG, MAX_GUEST_IMAGES } from '@/context/GameContext';
import { SplashScreen } from '@/components/SplashScreen';
import { CollectionGrid } from '@/components/CollectionGrid';
import { CameraView } from '@/components/CameraView';
import { VictoryModal } from '@/components/VictoryModal';
import { ReviewMode } from '@/components/ReviewMode';
import { ProfilePage } from '@/components/ProfilePage';
import { WordBook } from '@/components/WordBook';
import { BottomNav } from '@/components/BottomNav';
import { AchievementToast } from '@/components/AchievementToast';
import { AuthModal } from '@/components/AuthModal';
import { useSound } from '@/hooks/useSound';
import { useBgm } from '@/hooks/useBgm';
import { useTTS } from '@/hooks/useTTS';
import { AIRecognitionResult, GameMode } from '@/types';
import { compressImage } from '@/lib/imageUtils';

// 成就定义
const ACHIEVEMENTS = [
  { id: 'collect_5', title: '初出茅庐', desc: '收集5个碎片', icon: 'star' as const, threshold: 5, type: 'collect' },
  { id: 'collect_20', title: '小有成就', desc: '收集20个碎片', icon: 'star' as const, threshold: 20, type: 'collect' },
  { id: 'collect_50', title: '收藏家', desc: '收集50个碎片', icon: 'star' as const, threshold: 50, type: 'collect' },
  { id: 'collect_100', title: '博物馆馆长', desc: '收集100个碎片', icon: 'trophy' as const, threshold: 100, type: 'collect' },
  { id: 'master_5', title: '学习新手', desc: '掌握5个单词', icon: 'zap' as const, threshold: 5, type: 'master' },
  { id: 'master_20', title: '词汇达人', desc: '掌握20个单词', icon: 'zap' as const, threshold: 20, type: 'master' },
  { id: 'master_50', title: '英语高手', desc: '掌握50个单词', icon: 'award' as const, threshold: 50, type: 'master' },
  { id: 'diamond_10', title: '小富翁', desc: '获得10颗钻石', icon: 'diamond' as const, threshold: 10, type: 'diamond' },
  { id: 'diamond_50', title: '钻石大亨', desc: '获得50颗钻石', icon: 'diamond' as const, threshold: 50, type: 'diamond' },
];

export default function HomePage() {
  const { state, dispatch, startNewGame, nextWord, handleCollectionSuccessAction, isLoggedIn } = useGame();
  const { currentWord, collectedImages, phase, userData, showHint, mode } = state;
  const [showVictory, setShowVictory] = useState(false);
  const { playClick, playSuccess, playShutter, playSwitch, playHint, playNav } = useSound();
  const { toggleBgm, isPlaying: isBgmPlaying } = useBgm();
  const { speakEnglish } = useTTS();
  
  // 新增状态
  const [hintLevel, setHintLevel] = useState(0); // 0=无提示, 1=英文提示, 2=中文提示
  const [hintButtonFlashing, setHintButtonFlashing] = useState<1 | 2 | false>(false); // 提示按钮闪烁: 1=引导第一次, 2=引导第二次
  const [isCardSwitching, setIsCardSwitching] = useState(false); // 换词动画状态
  const [countdown, setCountdown] = useState(60); // 60秒倒计时
  const [newImageUrl, setNewImageUrl] = useState<string | null>(null); // 新收集的图片URL（用于动画）
  const [showImageAnimation, setShowImageAnimation] = useState(false); // 显示图片飞入动画
  const [unlockedAchievement, setUnlockedAchievement] = useState<typeof ACHIEVEMENTS[0] | null>(null); // 新解锁的成就
  const [analyzingText, setAnalyzingText] = useState<string>('🔍 豆包AI识别中...');
  const [showSplash, setShowSplash] = useState(true); // 开屏动画状态
  const [showAuthModal, setShowAuthModal] = useState(false); // 显示登录/注册弹窗
  const [forceAuth, setForceAuth] = useState(false); // 是否强制登录（游客收集满5张）
  const prevUserDataRef = useRef(userData); // 用于检测成就变化
  
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const idleTimer2Ref = useRef<NodeJS.Timeout | null>(null); // 第二次提示计时器
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false); // 防止重复处理的锁

  // 初始化游戏
  useEffect(() => {
    if (!currentWord && mode === 'HUNTER') {
      startNewGame();
    }
  }, [currentWord, startNewGame, mode]);

  // 检测成就解锁 - 只在收集新图片时触发，不在初始加载时触发
  const prevTotalCollectedRef = useRef<number>(-1); // -1 表示未初始化
  const mountedTimeRef = useRef<number>(0);
  const shownAchievementsRef = useRef<Set<string>>(new Set()); // 已显示过的成就
  
  // 组件挂载时加载已显示过的成就列表
  useEffect(() => {
    mountedTimeRef.current = Date.now();
    // 从 localStorage 加载已显示过的成就
    try {
      const shown = localStorage.getItem('wordcaps_shown_achievements');
      if (shown) {
        shownAchievementsRef.current = new Set(JSON.parse(shown));
      }
    } catch (e) {
      console.log('Failed to load shown achievements');
    }
  }, []);
  
  useEffect(() => {
    // 组件挂载后2秒内不检测成就
    if (Date.now() - mountedTimeRef.current < 2000) {
      prevTotalCollectedRef.current = userData.totalCollected;
      return;
    }
    
    // 首次有效检测，记录当前值
    if (prevTotalCollectedRef.current === -1) {
      prevTotalCollectedRef.current = userData.totalCollected;
      return;
    }
    
    // 只有当 totalCollected 增加时才检测成就
    if (userData.totalCollected <= prevTotalCollectedRef.current) {
      return;
    }
    
    const prevTotal = prevTotalCollectedRef.current;
    prevTotalCollectedRef.current = userData.totalCollected;
    
    // 检查收集类成就
    for (const achievement of ACHIEVEMENTS) {
      if (achievement.type !== 'collect') continue;
      // 跳过已经显示过的成就
      if (shownAchievementsRef.current.has(achievement.id)) continue;
      
      if (userData.totalCollected >= achievement.threshold) {
        // 标记为已显示并保存到 localStorage
        shownAchievementsRef.current.add(achievement.id);
        try {
          localStorage.setItem('wordcaps_shown_achievements', JSON.stringify(Array.from(shownAchievementsRef.current)));
        } catch (e) {}
        setUnlockedAchievement(achievement);
        return;
      }
    }
    
    // 检查钻石成就
    for (const achievement of ACHIEVEMENTS) {
      if (achievement.type !== 'diamond') continue;
      // 跳过已经显示过的成就
      if (shownAchievementsRef.current.has(achievement.id)) continue;
      
      if (userData.diamonds >= achievement.threshold) {
        // 标记为已显示并保存到 localStorage
        shownAchievementsRef.current.add(achievement.id);
        try {
          localStorage.setItem('wordcaps_shown_achievements', JSON.stringify(Array.from(shownAchievementsRef.current)));
        } catch (e) {}
        setUnlockedAchievement(achievement);
        return;
      }
    }
  }, [userData.totalCollected, userData.diamonds]);

  // 模式切换处理
  const handleModeChange = (newMode: GameMode) => {
    dispatch({ type: 'SET_MODE', payload: newMode });
  };

  // 换词处理（带动画）- 必须在条件返回之前定义
  const handleSwitchWord = useCallback(() => {
    playSwitch();
    setIsCardSwitching(true);
    setTimeout(() => {
      nextWord();
      setHintLevel(0);
      setHintButtonFlashing(false);
      setCountdown(60);
      
      setTimeout(() => {
        setIsCardSwitching(false);
      }, 300);
    }, 300);
  }, [nextWord, playSwitch]);

  // 识别成功后自动跳转下一个单词 - 从图片动画开始后计时，确保用户看到完整动画
  useEffect(() => {
    if (showImageAnimation && mode === 'HUNTER') {
      // 4秒后自动跳转到下一个单词（从动画开始计时）
      const timer = setTimeout(() => {
        // 直接调用换词逻辑，避免循环依赖
        setIsCardSwitching(true);
        setTimeout(() => {
          nextWord();
          setHintLevel(0);
          setHintButtonFlashing(false);
          setCountdown(60);
          
          setTimeout(() => {
            setIsCardSwitching(false);
          }, 300);
        }, 300);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showImageAnimation, nextWord, mode]);

  // 统一的倒计时管理 - 解决竞态条件
  useEffect(() => {
    // 清除旧的计时器
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    // 判断是否应该运行倒计时（开屏动画期间不运行）
    const isCameraActive = phase === 'CAMERA' || phase === 'ANALYZING' || phase === 'FAILED' || phase === 'SUCCESS';
    const shouldRun = mode === 'HUNTER' && !isCameraActive && currentWord && !showSplash;

    if (shouldRun) {
      countdownTimerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            // 倒计时结束，触发换词
            handleSwitchWord();
            return 60;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, [mode, phase, currentWord, handleSwitchWord, showSplash]);

  // 记录上一个单词ID，用于判断是否真正换词了
  const prevWordIdRef = useRef<string | null>(null);
  
  // 单词改变时重置倒计时和提示：
  // - 开屏动画期间不启动
  // - 只有单词ID真正改变时才重置（切换栏目不重置）
  useEffect(() => {
    if (currentWord && mode === 'HUNTER' && !showSplash) {
      if (prevWordIdRef.current !== currentWord.id) {
        prevWordIdRef.current = currentWord.id;
        setCountdown(60);
        setHintLevel(0);
        setHintButtonFlashing(false);
        
        // 清除旧的提示计时器
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        if (idleTimer2Ref.current) clearTimeout(idleTimer2Ref.current);
        
        // 10秒后开始闪烁提示按钮
        idleTimerRef.current = setTimeout(() => {
          setHintButtonFlashing(1);
        }, 10000);
        
        // 20秒后引导第二次提示
        idleTimer2Ref.current = setTimeout(() => {
          setHintButtonFlashing(2);
        }, 20000);
      }
    }
    
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (idleTimer2Ref.current) clearTimeout(idleTimer2Ref.current);
    };
  }, [currentWord?.id, mode, showSplash]);

  // 开屏动画完成回调
  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  // 显示开屏动画
  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  // 根据模式渲染不同页面
  if (mode === 'REVIEW') {
    return (
      <>
        <ReviewMode onBack={() => handleModeChange('HUNTER')} />
        <BottomNav currentMode={mode} onModeChange={handleModeChange} />
      </>
    );
  }

  if (mode === 'COLLECTION') {
    return (
      <>
        <WordBook onBack={() => handleModeChange('HUNTER')} />
        <BottomNav currentMode={mode} onModeChange={handleModeChange} />
      </>
    );
  }

  if (mode === 'WORDBOOK') {
    return (
      <>
        <ProfilePage />
        <BottomNav currentMode={mode} onModeChange={handleModeChange} />
      </>
    );
  }

  // AI 识别处理
  const handleAnalyze = async (imageData: string) => {
    if (!currentWord) return;
    
    // 防止重复处理
    if (isProcessingRef.current) {
      console.log('Already processing, skip');
      return;
    }
    isProcessingRef.current = true;

    try {
      setAnalyzingText('🔍 豆包AI识别中...');
      const response = await fetch('/api/recognize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: imageData,
          targetWord: currentWord.word,
          targetWordCn: currentWord.cn,
        }),
      });

      const result = await response.json();

      if (result.error) {
        dispatch({ type: 'SET_ERROR', payload: result.error });
        dispatch({ type: 'RETRY' });
        isProcessingRef.current = false;
        return;
      }

      const aiResult: AIRecognitionResult = result;

      if (aiResult.is_match) {
        // 播放成功音效
        playSuccess();

        // 识别成功提示（在抠图前给用户一个明确反馈）
        setAnalyzingText('✅ 物品识别成功');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 根据标志位决定是否抠图
        let finalImageUrl = imageData;
        if (REMOVE_BG_FLAG === 1) {
          try {
            setAnalyzingText('🎨 生成贴纸中...');
            const removeBgResponse = await fetch('/api/removebg', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageBase64: imageData }),
            });
            const removeBgResult = await removeBgResponse.json();
            if (removeBgResult.success && removeBgResult.imageUrl) {
              finalImageUrl = removeBgResult.imageUrl;
              console.log('抠图成功，剩余配额:', removeBgResult.remainingCredits);
            } else {
              console.log('抠图失败，使用原图:', removeBgResult.error);
            }
          } catch (e) {
            console.log('抠图请求失败，使用原图:', e);
          }
        } else {
          console.log('抠图开关关闭，使用原图');
        }
        
        // 压缩图片以避免localStorage溢出
        try {
          finalImageUrl = await compressImage(finalImageUrl, 400, 0.6);
        } catch (e) {
          console.log('图片压缩失败，使用原图:', e);
        }
        
        setNewImageUrl(finalImageUrl);
        setShowImageAnimation(true);
        dispatch({
          type: 'ANALYSIS_SUCCESS',
          payload: { result: aiResult, imageUrl: finalImageUrl },
        });

        if (isLoggedIn && currentWord) {
          void handleCollectionSuccessAction(
            currentWord.id,
            finalImageUrl,
            aiResult.detected_object_en
          ).then(success => {
            if (!success) {
              dispatch({ type: 'SET_ERROR', payload: '云端同步失败，请稍后重试' });
            }
          });
        }
        setAnalyzingText('');
        // 2秒后隐藏动画和重置锁
        setTimeout(() => {
          setShowImageAnimation(false);
          setNewImageUrl(null);
          isProcessingRef.current = false;
        }, 2000);
      } else {
        dispatch({ type: 'ANALYSIS_FAILED', payload: aiResult });
        setAnalyzingText('');
        isProcessingRef.current = false;
      }
    } catch (error) {
      console.error('分析错误:', error);
      dispatch({ type: 'SET_ERROR', payload: '网络错误，请重试' });
      dispatch({ type: 'RETRY' });
      setAnalyzingText('');
      isProcessingRef.current = false;
    }
  };

  // 手动确认正确
  const handleForceSuccess = async (imageData: string) => {
    if (!currentWord) return;

    // 防止重复处理
    if (isProcessingRef.current) {
      console.log('Already processing, skip force success');
      return;
    }
    isProcessingRef.current = true;
    
    dispatch({ type: 'START_ANALYZING' });
    
    // 根据标志位决定是否抠图
    let finalImageUrl = imageData;
    if (REMOVE_BG_FLAG === 1) {
      try {
        const removeBgResponse = await fetch('/api/removebg', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: imageData }),
        });
        const removeBgResult = await removeBgResponse.json();
        if (removeBgResult.success && removeBgResult.imageUrl) {
          finalImageUrl = removeBgResult.imageUrl;
          console.log('抠图成功，剩余配额:', removeBgResult.remainingCredits);
        } else {
          console.log('抠图失败，使用原图:', removeBgResult.error);
        }
      } catch (e) {
        console.log('抠图请求失败，使用原图:', e);
      }
    } else {
      console.log('抠图开关关闭，使用原图');
    }
    
    // 压缩图片以避免localStorage溢出
    try {
      finalImageUrl = await compressImage(finalImageUrl, 400, 0.6);
    } catch (e) {
      console.log('图片压缩失败，使用原图:', e);
    }
    
    setNewImageUrl(finalImageUrl);
    setShowImageAnimation(true);
    dispatch({ type: 'FORCE_SUCCESS', payload: finalImageUrl });

    if (isLoggedIn) {
      void handleCollectionSuccessAction(
        currentWord.id,
        finalImageUrl,
        currentWord.word
      ).then(success => {
        if (!success) {
          dispatch({ type: 'SET_ERROR', payload: '云端同步失败，请稍后重试' });
        }
      });
    }
    // 2秒后隐藏动画和重置锁
    setTimeout(() => {
      setShowImageAnimation(false);
      setNewImageUrl(null);
      isProcessingRef.current = false;
    }, 2000);
  };

  // 使用提示（新逻辑：第一次英文，第二次中文）
  const handleUseHint = () => {
    playHint();
    if (hintLevel === 0) {
      // 第一次点击：显示英文提示
      setHintLevel(1);
      setHintButtonFlashing(false);
      // 如果还没到20秒，设置20秒后引导第二次提示
      if (idleTimer2Ref.current) {
        clearTimeout(idleTimer2Ref.current);
      }
      idleTimer2Ref.current = setTimeout(() => {
        setHintButtonFlashing(2);
      }, 10000); // 点击后10秒引导第二次
    } else if (hintLevel === 1) {
      // 第二次点击：显示中文提示
      setHintLevel(2);
      setHintButtonFlashing(false);
      if (idleTimer2Ref.current) {
        clearTimeout(idleTimer2Ref.current);
      }
    }
  };

  // 发音
  const handleSpeak = () => {
    if (currentWord) {
      playClick();
      speakEnglish(currentWord.word);
    }
  };

  // SUCCESS 状态时也保持相机视图，让用户看到成功反馈覆盖层
  const isCameraActive = phase === 'CAMERA' || phase === 'ANALYZING' || phase === 'FAILED' || phase === 'SUCCESS';

  // 开始相机
  const handleStartCamera = () => {
    // 检查游客是否已收集满5张，需要强制登录
    if (!isLoggedIn && userData.totalCollected >= MAX_GUEST_IMAGES) {
      playClick();
      setForceAuth(true);
      setShowAuthModal(true);
      return;
    }
    playClick();
    dispatch({ type: 'START_CAMERA' });
  };

  // 停止相机
  const handleStopCamera = () => {
    playClick();
    dispatch({ type: 'STOP_CAMERA' });
  };

  // 拍照处理
  const handleCapture = async (imageData: string) => {
    dispatch({ type: 'CAPTURE_IMAGE', payload: imageData });
    dispatch({ type: 'START_ANALYZING' });
    await handleAnalyze(imageData);
  };

  // Hunter Page 布局
  return (
    <div className="h-screen flex flex-col grass-bg overflow-hidden pb-24">
      {/* 整体卡片容器 - 带换词动画 */}
      <motion.div
        animate={{
          scale: isCardSwitching ? 0.8 : 1,
          opacity: isCardSwitching ? 0 : 1,
        }}
        transition={{ duration: 0.3 }}
        className="flex-1 flex flex-col"
      >
        {/* Top: 单词卡片区域 */}
        <div className="z-10 px-4 pt-4 pb-2">
          <AnimatePresence mode="wait">
            {currentWord && (
              <motion.div
                key={currentWord.id}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-white rounded-3xl border-4 border-[#5D4037] border-b-[14px] p-4 animate-float"
              >
                {/* 单词和操作按钮 */}
                <div className="flex items-center justify-between mb-2">
                  {/* 左侧：背景音乐 + 发音 */}
                  <div className="flex items-center gap-2">
                    {/* 背景音乐按钮 */}
                    <motion.button
                      whileTap={{ scale: 0.95, y: 2 }}
                      onClick={toggleBgm}
                      className={`btn-3d p-2 rounded-xl ${isBgmPlaying ? 'bg-[#66BB6A] border-[#2E7D32]' : 'bg-gray-200 border-gray-400'}`}
                      title={isBgmPlaying ? '关闭背景音乐' : '开启背景音乐'}
                    >
                      <Music className={`w-5 h-5 ${isBgmPlaying ? 'text-white drop-shadow-md' : 'text-gray-500'}`} strokeWidth={2.5} />
                    </motion.button>
                    
                    {/* 发音按钮 */}
                    <motion.button
                      whileTap={{ scale: 0.95, y: 2 }}
                      onClick={handleSpeak}
                      className="btn-3d p-2 rounded-xl bg-[#4FC3F7] border-[#0288D1]"
                      title="朗读单词"
                    >
                      <Mic className="w-5 h-5 text-white drop-shadow-md" strokeWidth={2.5} />
                    </motion.button>
                  </div>
                  
                  {/* 右侧：提示 + 换词 */}
                  <div className="flex items-center gap-2">
                    {/* 提示按钮 */}
                    <div className="relative">
                      <motion.button
                        whileTap={{ scale: 0.95, y: 2 }}
                        onClick={handleUseHint}
                        disabled={hintLevel >= 2}
                        animate={hintButtonFlashing ? { 
                          scale: [1, 1.1, 1],
                          rotate: [0, 5, -5, 0],
                        } : {}}
                        transition={hintButtonFlashing ? { duration: 1, repeat: Infinity } : {}}
                        className={`btn-3d p-2 rounded-xl ${
                          hintLevel < 2 ? 'bg-[#FFB74D] border-[#F57C00]' : 'bg-gray-200 border-gray-400 opacity-50'
                        }`}
                        title={hintLevel === 0 ? '查看英文提示' : hintLevel === 1 ? '查看中文提示' : '已显示全部提示'}
                      >
                        <Lightbulb className={`w-5 h-5 ${hintLevel < 2 ? 'text-white drop-shadow-md' : 'text-gray-500'}`} strokeWidth={2.5} />
                      </motion.button>
                    </div>
                    
                    {/* 换词按钮 */}
                    <motion.button
                      whileTap={{ scale: 0.95, y: 2 }}
                      onClick={handleSwitchWord}
                      className="btn-3d p-2 rounded-xl bg-[#FF5252] border-[#B71C1C]"
                      title="换一个单词"
                    >
                      <RefreshCw className="w-5 h-5 text-white drop-shadow-md" strokeWidth={2.5} />
                    </motion.button>
                  </div>
                </div>

                {/* 单词显示 - 一开始不显示中文 */}
                <div className="text-center py-3">
                  <h2 className="text-5xl font-black text-text tracking-wide">
                    {currentWord.word}
                  </h2>
                </div>

                {/* 提示显示 - 分级显示：第一次英文，第二次中文 */}
                <AnimatePresence mode="wait">
                  {hintLevel === 1 && (
                    <motion.div
                      key="hint-en"
                      initial={{ opacity: 0, scale: 0.9, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 10 }}
                      transition={{ duration: 0.2 }}
                      className="mt-3"
                    >
                      <div className="p-3 bg-[#FFF8E1] rounded-2xl border-4 border-[#F57C00] border-b-8">
                        <p className="text-base font-black text-[#5D4037] text-center">
                          💡 {currentWord.hintEn || currentWord.hint}
                        </p>
                      </div>
                    </motion.div>
                  )}
                  {hintLevel >= 2 && (
                    <motion.div
                      key="hint-cn"
                      initial={{ opacity: 0, scale: 0.9, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 10 }}
                      transition={{ duration: 0.2 }}
                      className="mt-2 text-center"
                    >
                      <div className="inline-block bg-[#C8E6C9] px-4 py-2 rounded-2xl border-4 border-[#2E7D32] border-b-8">
                        <span className="text-base font-black text-[#1B5E20]">{currentWord.cn} - {currentWord.hint}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Middle: 相机或卡槽区域 */}
        <div className="flex-1 px-4 py-2 overflow-hidden relative">
          {isCameraActive ? (
            /* 相机视图 */
            <div className="h-full rounded-3xl overflow-hidden border-4 border-[#5D4037]">
              <CameraView
                onCapture={handleCapture}
                onClose={handleStopCamera}
                onForceSuccess={handleForceSuccess}
                analyzingText={analyzingText}
              />
            </div>
          ) : (
            /* 2x3 卡槽 Grid + 圆形拍照按钮 */
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-black text-[#5D4037]">
                  📦 收集进度
                </h3>
                <span className="text-sm font-black text-[#FF5252]">{collectedImages.length}/6</span>
              </div>
              
              {/* 收集框 */}
              <div className="mb-4">
                <CollectionGrid images={collectedImages} highlightLast={false} />
              </div>
              
              {/* START HUNTING 按钮 - 2.5D风格 */}
              <div className="flex-1 flex items-center justify-center">
                <motion.button
                  whileHover={{ scale: 1.05, rotate: 3 }}
                  whileTap={{ scale: 0.95, y: 10 }}
                  onClick={handleStartCamera}
                  disabled={!currentWord}
                  className="btn-3d-lg w-40 h-40 rounded-full bg-[#FF5252] border-[#B71C1C] text-white font-black flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-xl font-black tracking-wide drop-shadow-md">START<br/>HUNTING</span>
                </motion.button>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* 图片飞入卡槽动画 */}
      <AnimatePresence>
        {showImageAnimation && newImageUrl && (
          <motion.div
            initial={{ scale: 1, x: '50%', y: '30%', opacity: 1 }}
            animate={{ scale: 0.2, x: '20%', y: '60%', opacity: 0.8 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
            className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
          >
            <img 
              src={newImageUrl} 
              alt="captured" 
              className="w-48 h-48 object-cover rounded-2xl shadow-soft-lg border-4 border-success"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {isBgmPlaying && (
        <div
          className="fixed z-[-1] opacity-0 pointer-events-none"
          style={{ width: 1, height: 1, left: -9999, top: -9999 }}
        >
          <iframe
            frameBorder="no"
            marginWidth={0}
            marginHeight={0}
            width={1}
            height={1}
            allow="autoplay"
            src="https://music.163.com/outchain/player?type=2&id=2075140388&auto=1&height=66"
          />
        </div>
      )}

      {/* 底部倒计时进度条 - 相机模式下隐藏，避免与拍照按钮重叠 */}
      {!isCameraActive && (
      <div className="fixed bottom-28 left-0 right-0 px-4 z-30">
        {/* 倒计时秒数显示在进度条上方 */}
        <div className="flex items-center justify-center mb-1">
          <motion.span 
            className={`text-lg font-black leading-none ${countdown <= 10 ? 'text-[#FF5252]' : 'text-[#5D4037]'}`}
            animate={countdown <= 10 ? { scale: [1, 1.15, 1] } : {}}
            transition={countdown <= 10 ? { duration: 0.5, repeat: Infinity } : {}}
          >
            ⏱️ {countdown}s
          </motion.span>
        </div>
        <motion.div 
          className="h-3 bg-bg-tertiary rounded-full overflow-hidden"
          animate={countdown <= 10 ? { 
            scale: [1, 1.02, 1],
            boxShadow: ['0 0 0 0 rgba(229, 115, 115, 0)', '0 0 8px 2px rgba(229, 115, 115, 0.5)', '0 0 0 0 rgba(229, 115, 115, 0)']
          } : {}}
          transition={countdown <= 10 ? { duration: 0.5, repeat: Infinity } : {}}
        >
          <div
            className={`h-full transition-all duration-1000 ease-linear ${
              countdown <= 10 
                ? 'bg-gradient-to-r from-error to-primary' 
                : countdown <= 30 
                  ? 'bg-gradient-to-r from-primary via-secondary to-success'
                  : 'bg-gradient-to-r from-primary via-secondary to-success'
            }`}
            style={{ width: `${(countdown / 60) * 100}%` }}
          />
        </motion.div>
      </div>
      )}

      {/* 底部导航栏 */}
      <BottomNav currentMode={mode} onModeChange={handleModeChange} />

      {/* 胜利弹窗 */}
      {currentWord && (
        <VictoryModal
          isOpen={showVictory}
          word={currentWord}
          onNextWord={() => { setShowVictory(false); nextWord(); }}
          onViewCollection={() => { setShowVictory(false); handleModeChange('WORDBOOK'); }}
        />
      )}

      {/* 错误提示 */}
      <AnimatePresence>
        {state.error && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-4 right-4 bg-primary text-text-onPrimary px-4 py-3 rounded-2xl shadow-soft-lg z-40"
          >
            <p className="text-sm font-medium">{state.error}</p>
            <button
              onClick={() => dispatch({ type: 'CLEAR_ERROR' })}
              className="absolute top-2 right-3 text-white/80 hover:text-white font-bold"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 成就解锁通知 */}
      <AchievementToast 
        achievement={unlockedAchievement} 
        onClose={() => setUnlockedAchievement(null)} 
      />

      {/* 登录/注册弹窗 */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          setForceAuth(false);
        }}
        forceRegister={forceAuth}
        message={forceAuth ? `你已经收集了 ${MAX_GUEST_IMAGES} 张图片！创建账号后可以继续收集，并且数据会自动保存到云端哦~` : undefined}
      />
    </div>
  );
}
