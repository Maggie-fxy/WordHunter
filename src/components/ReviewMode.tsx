'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Keyboard, ArrowLeft, Lightbulb } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useGame } from '@/context/GameContext';
import { WordRecord } from '@/types';
import { getWordById, getRandomOptions } from '@/data/wordBank';
import { useSound } from '@/hooks/useSound';

interface ReviewModeProps {
  onBack: () => void;
}

// 检查图片URL是否有效
const isValidImageUrl = (url: string | undefined | null): boolean => {
  if (!url || url.trim() === '') return false;
  // 检查是否是base64图片（需要有实际内容）
  if (url.startsWith('data:image/')) {
    // 确保base64有实际数据（至少有逗号后的内容）
    const commaIndex = url.indexOf(',');
    if (commaIndex === -1 || url.length <= commaIndex + 10) return false;
    return true;
  }
  // 检查是否是http/https URL
  if (url.startsWith('http://') || url.startsWith('https://')) return true;
  return false;
};

export function ReviewMode({ onBack }: ReviewModeProps) {
  const { state, dispatch, syncReviewProgress, isLoggedIn } = useGame();
  const { userData, reviewWord, reviewOptions, reviewPhase } = state;
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [spellingInput, setSpellingInput] = useState('');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [hintLevel, setHintLevel] = useState(0); // 0=无提示, 1=首字母, 2=首字母+末字母
  const [attemptCount, setAttemptCount] = useState(0); // 尝试次数
  const [showWrongHint, setShowWrongHint] = useState(false); // 显示错误提示
  const { playClick, playSuccess, playError } = useSound();
  
  // 定时器引用，用于清理
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  // 组件是否已卸载
  const isMountedRef = useRef(true);
  // 是否正在处理中，防止重复触发
  const isProcessingRef = useRef(false);
  
  // 清理所有定时器
  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(timer => clearTimeout(timer));
    timersRef.current = [];
  }, []);
  
  // 安全的setTimeout，会自动追踪并在组件卸载时清理
  const safeSetTimeout = useCallback((callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      if (isMountedRef.current) {
        callback();
      }
    }, delay);
    timersRef.current.push(timer);
    return timer;
  }, []);
  
  // 组件卸载时清理
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearAllTimers();
    };
  }, [clearAllTimers]);

  useEffect(() => {
    setSelectedAnswer(null);
    setSpellingInput('');
    setIsCorrect(null);
    setCurrentImage(null);
    setHintLevel(0);
    setAttemptCount(0);
    setShowWrongHint(false);
    isProcessingRef.current = false;
  }, []);

  // 获取可复习的单词（有收集记录且未掌握的，至少1张有效图片）
  const getReviewableWords = useCallback((): WordRecord[] => {
    return Object.values(userData.wordRecords).filter(
      record => {
        // 过滤出有效图片
        const validImages = record.images.filter(img => isValidImageUrl(img.url));
        return validImages.length >= 1 && !record.mastered;
      }
    );
  }, [userData.wordRecords]);

  // 开始新的复习
  const startNewReview = useCallback((excludeWordIds: string[] = []) => {
    // 防止重复触发
    if (isProcessingRef.current) {
      console.log('正在处理中，跳过重复调用');
      return;
    }
    
    // 清理之前的定时器
    clearAllTimers();
    
    const reviewableRecords = getReviewableWords().filter(
      record => !excludeWordIds.includes(record.wordId)
    );
    console.log('可复习的单词记录:', reviewableRecords.length);
    if (reviewableRecords.length === 0) return;

    // 随机选择一个单词
    const randomRecord = reviewableRecords[Math.floor(Math.random() * reviewableRecords.length)];
    const word = getWordById(randomRecord.wordId);
    console.log('选中的单词:', word?.word, '图片数量:', randomRecord.images.length);
    if (!word) return;

    // 过滤出有效图片，然后随机选择一张
    const validImages = randomRecord.images.filter(img => isValidImageUrl(img.url));
    if (validImages.length === 0) {
      console.log('没有有效图片，跳过此单词，尝试下一个');
      // 递归调用，排除当前无效图片的单词
      startNewReview([...excludeWordIds, randomRecord.wordId]);
      return;
    }
    const randomImage = validImages[Math.floor(Math.random() * validImages.length)];
    const imageUrl = randomImage?.url;
    console.log('选中的图片:', imageUrl?.substring(0, 50) + '...');
    
    // 再次验证图片URL有效性
    if (!isValidImageUrl(imageUrl)) {
      console.log('选中的图片URL无效，跳过此单词');
      startNewReview([...excludeWordIds, randomRecord.wordId]);
      return;
    }
    setCurrentImage(imageUrl);

    // 判断是选择题还是默写
    const shouldSpell = randomRecord.choiceCorrect >= 1;
    
    if (shouldSpell) {
      // 直接进入默写模式
      dispatch({ 
        type: 'START_REVIEW', 
        payload: { word, options: [] } 
      });
      // 使用 SKIP_TO_SPELLING 直接进入默写阶段，不增加 choiceCorrect 计数
      // 这里必须同步执行：如果依赖 setTimeout，组件在快速切换模式时卸载会清理定时器，导致卡在 CHOICE 且 options 为空
      dispatch({ type: 'SKIP_TO_SPELLING' });
    } else {
      // 选择题模式
      const options = getRandomOptions(word, 4);
      dispatch({ 
        type: 'START_REVIEW', 
        payload: { word, options } 
      });
    }

    setSelectedAnswer(null);
    setSpellingInput('');
    setIsCorrect(null);
    setHintLevel(0);
    setAttemptCount(0);
    setShowWrongHint(false);
  }, [getReviewableWords, dispatch, clearAllTimers, safeSetTimeout]);

  // 初始化 - 只在组件首次挂载时执行一次
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if (hasInitializedRef.current) return;
    
    const reviewableRecords = getReviewableWords();
    if (reviewableRecords.length > 0) {
      hasInitializedRef.current = true;
      startNewReview();
    }
  }, [reviewWord, getReviewableWords, startNewReview]);

  // 撒花/撒钻石特效
  const triggerConfetti = useCallback(() => {
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };
    
    // 撒钻石效果（使用黄色和金色）
    confetti({
      ...defaults,
      particleCount: 50,
      origin: { x: 0.5, y: 0.6 },
      colors: ['#FFD54F', '#F2C94C', '#FFF4CC', '#FFE082'],
    });
    
    // 使用 safeSetTimeout 确保组件卸载后不会执行
    safeSetTimeout(() => {
      confetti({
        ...defaults,
        particleCount: 30,
        origin: { x: 0.3, y: 0.7 },
        colors: ['#FFD54F', '#F2C94C', '#FFF4CC'],
      });
      confetti({
        ...defaults,
        particleCount: 30,
        origin: { x: 0.7, y: 0.7 },
        colors: ['#FFD54F', '#F2C94C', '#FFF4CC'],
      });
    }, 150);
  }, [safeSetTimeout]);

  // 处理选择题答案
  const handleChoiceAnswer = (answer: string) => {
    if (selectedAnswer) return; // 已经选过了
    
    playClick();
    setSelectedAnswer(answer);
    const correct = answer === reviewWord?.word;
    setIsCorrect(correct);
    
    if (correct) {
      playSuccess();
      triggerConfetti();
      isProcessingRef.current = true;
      // 正确后停留1.5秒，然后进入默写阶段
      safeSetTimeout(() => {
        dispatch({ type: 'ANSWER_CHOICE', payload: answer });
        // 登录用户同步复习进度到云端
        if (isLoggedIn && reviewWord) {
          const record = userData.wordRecords[reviewWord.id];
          if (record) {
            syncReviewProgress(
              reviewWord.id,
              record.choiceCorrect + 1,
              record.spellingCorrect,
              record.mastered
            );
          }
        }
        // 重置状态准备默写
        setSelectedAnswer(null);
        setIsCorrect(null);
        setSpellingInput('');
        isProcessingRef.current = false;
      }, 1500);
    } else {
      playError();
      dispatch({ type: 'ANSWER_CHOICE', payload: answer });
    }
  };

  // 处理默写答案
  const handleSpellingSubmit = () => {
    if (!spellingInput.trim()) return;
    
    playClick();
    const correct = spellingInput.toLowerCase().trim() === reviewWord?.word.toLowerCase();
    const newAttemptCount = attemptCount + 1;
    setAttemptCount(newAttemptCount);
    
    if (correct) {
      playSuccess();
      setIsCorrect(true);
      setShowWrongHint(false);
      triggerConfetti();
      isProcessingRef.current = true;
      // 正确后停留1.5秒，然后自动进入下一题
      safeSetTimeout(() => {
        dispatch({ type: 'ANSWER_SPELLING', payload: spellingInput });
        // 登录用户同步复习进度到云端
        if (isLoggedIn && reviewWord) {
          const record = userData.wordRecords[reviewWord.id];
          if (record) {
            syncReviewProgress(
              reviewWord.id,
              record.choiceCorrect,
              record.spellingCorrect + 1,
              true // 默写正确，标记为已掌握
            );
          }
        }
        // 再等0.5秒后自动开始下一题
        safeSetTimeout(() => {
          isProcessingRef.current = false;
          startNewReview();
        }, 500);
      }, 1500);
    } else if (newAttemptCount >= 3) {
      // 第三次失败，无法获得碎片，直接显示结果
      playError();
      setIsCorrect(false);
      setShowWrongHint(false);
      dispatch({ type: 'ANSWER_SPELLING', payload: '' }); // 传空字符串表示失败
    } else {
      // 还有机会，清空输入让用户重试
      playError();
      setSpellingInput('');
      setShowWrongHint(true);
      // 2秒后隐藏错误提示
      safeSetTimeout(() => setShowWrongHint(false), 2000);
    }
  };

  // 下一题
  const handleNext = () => {
    playClick();
    startNewReview();
  };

  const reviewableCount = getReviewableWords().length;

  const fallbackImageUrl = (() => {
    if (!reviewWord) return null;
    const record = userData.wordRecords[reviewWord.id];
    if (!record) return null;
    const valid = record.images.filter(img => isValidImageUrl(img.url));
    return valid.length > 0 ? valid[0].url : null;
  })();

  const displayImageUrl = currentImage || fallbackImageUrl;

  if (reviewableCount === 0) {
    return (
      <div className="h-screen grass-bg flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <h2 className="text-2xl font-black text-[#5D4037] mb-2">暂无可复习的单词</h2>
          <p className="text-[#1B5E20] mb-10">去狩猎模式收集更多单词吧！</p>
          <div className="flex justify-center">
            <motion.button
              whileHover={{ scale: 1.05, rotate: 3 }}
              whileTap={{ scale: 0.95, y: 10 }}
              onClick={() => {
                playClick();
                onBack();
              }}
              className="btn-3d-lg w-32 h-32 rounded-full bg-[#FF5252] border-[#B71C1C] text-white font-black flex items-center justify-center"
            >
              <span className="text-base font-black tracking-wide text-center drop-shadow-md">START<br/>HUNTING</span>
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen grass-bg flex flex-col overflow-hidden">
      {/* 顶部导航 */}
      <header className="flex items-center justify-between px-4 py-3 wood-bg border-b-4 border-[#5D4037]">
        <motion.button
          whileTap={{ scale: 0.95, y: 2 }}
          onClick={() => {
            playClick();
            onBack();
          }}
          className="btn-3d p-2 rounded-xl bg-[#FFB74D] border-[#F57C00]"
        >
          <ArrowLeft className="w-5 h-5 text-white drop-shadow-md" strokeWidth={2.5} />
        </motion.button>
        <h1 className="text-xl font-black text-white drop-shadow-md">复习模式</h1>
        <div className="w-10" />
      </header>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        {reviewWord && (
          <>
            {/* 图片展示区 - 占1/2 */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 max-h-[50%] bg-white rounded-3xl border-4 border-[#5D4037] border-b-[14px] overflow-hidden mb-4"
            >
              {displayImageUrl ? (
                <img
                  src={displayImageUrl}
                  alt="Review"
                  className="w-full h-full object-contain p-4"
                  style={{
                    background: 'linear-gradient(135deg, #C8E6C9 0%, #A5D6A7 100%)',
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#C8E6C9]">
                  <span className="text-[#5D4037] font-black">无图片</span>
                </div>
              )}
            </motion.div>

            {/* 答题区 */}
            <AnimatePresence mode="wait">
              {reviewPhase === 'CHOICE' && (
                <motion.div
                  key="choice"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-3"
                >
                  <p className="text-center text-[#5D4037] font-black text-lg mb-4">🤔 这是什么？</p>
                  <div className="grid grid-cols-2 gap-3">
                    {reviewOptions.map((option, index) => {
                      const isSelected = selectedAnswer === option.word;
                      const isCorrectAnswer = option.word === reviewWord.word;
                      const showCorrect = selectedAnswer && isCorrectAnswer;
                      const showWrong = isSelected && !isCorrectAnswer;
                      
                      return (
                        <motion.button
                          key={option.id}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ 
                            opacity: 1, 
                            scale: 1,
                            x: showWrong ? [0, -5, 5, -5, 5, 0] : 0,
                          }}
                          transition={{ 
                            delay: index * 0.1,
                            x: { duration: 0.4 }
                          }}
                          whileTap={{ scale: 0.95, y: 4 }}
                          whileHover={{ scale: selectedAnswer ? 1 : 1.02 }}
                          onClick={() => handleChoiceAnswer(option.word)}
                          disabled={selectedAnswer !== null}
                          className={`btn-3d p-4 rounded-2xl font-bold text-lg transition-all relative overflow-hidden ${
                            showCorrect
                              ? 'bg-[#66BB6A] border-[#2E7D32]'
                              : showWrong
                                ? 'bg-[#FF5252] border-[#B71C1C]'
                                : 'bg-white border-[#5D4037]'
                          }`}
                        >
                          <span className={`text-xl relative z-10 font-black ${
                            showCorrect || showWrong ? 'text-white drop-shadow-md' : 'text-[#5D4037]'
                          }`}>{option.word}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {reviewPhase === 'SPELLING' && (
                <motion.div
                  key="spelling"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  <div className="text-center">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-[#5D4037]">
                        ❤️ {3 - attemptCount}
                      </span>
                      <p className="text-[#5D4037] font-black text-lg">✏️ 请拼写这个单词</p>
                      {/* 提示按钮 */}
                      <motion.button
                        whileTap={{ scale: 0.95, y: 2 }}
                        onClick={() => {
                          playClick();
                          setHintLevel(prev => Math.min(prev + 1, 2));
                        }}
                        disabled={hintLevel >= 2}
                        className={`btn-3d p-2 rounded-xl ${
                          hintLevel > 0 
                            ? 'bg-[#FFB74D] border-[#F57C00]' 
                            : 'bg-gray-200 border-gray-400'
                        } ${hintLevel >= 2 ? 'opacity-50' : ''}`}
                        title={hintLevel === 0 ? '显示首字母' : hintLevel === 1 ? '显示末字母' : '已用完提示'}
                      >
                        <Lightbulb className={`w-4 h-4 ${hintLevel > 0 ? 'text-white' : 'text-gray-500'}`} strokeWidth={2.5} />
                      </motion.button>
                    </div>
                    <div className="inline-block bg-[#C8E6C9] px-4 py-2 rounded-2xl border-4 border-[#2E7D32] border-b-8">
                      <span className="text-base font-black text-[#1B5E20]">{reviewWord.cn}</span>
                    </div>
                  </div>

                  {/* 拼写提示 - 根据提示等级显示 */}
                  <AnimatePresence>
                    {hintLevel > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-center"
                      >
                        <div className="inline-block bg-[#FFF8E1] px-4 py-2 rounded-2xl border-4 border-[#F57C00] border-b-8">
                          <p className="text-sm text-[#5D4037] font-bold">
                            💡 首字母: <span className="font-black text-[#FF5252]">{reviewWord.word[0].toUpperCase()}</span>
                            {hintLevel >= 2 && (
                              <>
                                {' · '}
                                末字母: <span className="font-black text-[#FF5252]">{reviewWord.word[reviewWord.word.length - 1].toUpperCase()}</span>
                              </>
                            )}
                            {' · '}
                            共 <span className="font-black text-[#FF5252]">{reviewWord.word.length}</span> 个字母
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {/* 错误提示 */}
                  <AnimatePresence>
                    {showWrongHint && attemptCount > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-center"
                      >
                        <span className="text-sm text-[#FF5252] font-black">❌ 拼写错误，再试一次！</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={spellingInput}
                      onChange={(e) => setSpellingInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && handleSpellingSubmit()}
                      placeholder="输入英文单词..."
                      className={`flex-1 p-4 rounded-2xl border-4 font-black text-xl text-center bg-white focus:outline-none ${
                        showWrongHint ? 'border-[#FF5252] animate-wiggle' : 'border-[#5D4037]'
                      }`}
                      style={{ borderBottomWidth: '8px' }}
                      autoFocus
                    />
                    <motion.button
                      whileTap={{ scale: 0.95, y: 4 }}
                      onClick={handleSpellingSubmit}
                      className="btn-3d p-4 bg-[#4FC3F7] border-[#0288D1] rounded-2xl"
                    >
                      <Keyboard className="w-6 h-6 text-white drop-shadow-md" strokeWidth={2.5} />
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {reviewPhase === 'RESULT' && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center space-y-4"
                >
                  <div className={`w-20 h-20 rounded-full border-4 border-b-8 flex items-center justify-center mx-auto ${
                    isCorrect ? 'bg-[#66BB6A] border-[#2E7D32]' : 'bg-[#FF5252] border-[#B71C1C]'
                  }`}>
                    {isCorrect ? (
                      <Check className="w-10 h-10 text-white drop-shadow-md" strokeWidth={3} />
                    ) : (
                      <X className="w-10 h-10 text-white drop-shadow-md" strokeWidth={3} />
                    )}
                  </div>
                  
                  <div>
                    <p className="text-3xl font-black text-[#5D4037]">{isCorrect ? '🎉 正确！' : '😢 错误'}</p>
                    {!isCorrect && (
                      <p className="text-[#1B5E20] mt-2 font-bold">
                        正确答案: <span className="font-black text-[#FF5252]">{reviewWord.word}</span>
                      </p>
                    )}
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.95, y: 4 }}
                    onClick={handleNext}
                    className="btn-3d px-8 py-3 bg-[#4FC3F7] border-[#0288D1] text-white rounded-2xl font-black"
                  >
                    <span className="drop-shadow-md">NEXT</span>
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}
