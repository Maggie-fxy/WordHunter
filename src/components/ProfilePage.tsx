'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Diamond, Trophy, Calendar, Hash, RotateCcw, Award, Star, Zap, Target } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useGame } from '@/context/GameContext';

interface ProfilePageProps {
  onBack?: () => void;
}

// 数字滚动动画组件 - 只在首次渲染时动画
function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const [displayValue, setDisplayValue] = useState(value);
  const hasAnimatedRef = useRef(false);
  
  useEffect(() => {
    // 只在首次渲染时执行动画
    if (hasAnimatedRef.current) {
      setDisplayValue(value);
      return;
    }
    
    hasAnimatedRef.current = true;
    const duration = 800;
    const steps = 15;
    const increment = value / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [value]);
  
  return <span className={className}>{displayValue}</span>;
}

// 成就定义
const ACHIEVEMENTS = [
  { id: 'collect_5', title: '初出茅庐', desc: '收集5个碎片', icon: Star, threshold: 5, type: 'collect' },
  { id: 'collect_20', title: '小有成就', desc: '收集20个碎片', icon: Star, threshold: 20, type: 'collect' },
  { id: 'collect_50', title: '收藏家', desc: '收集50个碎片', icon: Star, threshold: 50, type: 'collect' },
  { id: 'collect_100', title: '博物馆馆长', desc: '收集100个碎片', icon: Trophy, threshold: 100, type: 'collect' },
  { id: 'master_5', title: '学习新手', desc: '掌握5个单词', icon: Zap, threshold: 5, type: 'master' },
  { id: 'master_20', title: '词汇达人', desc: '掌握20个单词', icon: Zap, threshold: 20, type: 'master' },
  { id: 'master_50', title: '英语高手', desc: '掌握50个单词', icon: Award, threshold: 50, type: 'master' },
  { id: 'diamond_10', title: '小富翁', desc: '获得10颗钻石', icon: Diamond, threshold: 10, type: 'diamond' },
  { id: 'diamond_50', title: '钻石大亨', desc: '获得50颗钻石', icon: Diamond, threshold: 50, type: 'diamond' },
];

export function ProfilePage({ onBack }: ProfilePageProps) {
  const { state } = useGame();
  const { userData } = state;

  // 计算已掌握的单词数
  const masteredCount = Object.values(userData.wordRecords).filter(r => r.mastered).length;
  const collectedCount = Object.values(userData.wordRecords).filter(r => r.images.length > 0).length;
  
  // 计算已解锁的成就
  const unlockedAchievements = ACHIEVEMENTS.filter(a => {
    if (a.type === 'collect') return userData.totalCollected >= a.threshold;
    if (a.type === 'master') return masteredCount >= a.threshold;
    if (a.type === 'diamond') return userData.diamonds >= a.threshold;
    return false;
  });

  // 生成用户ID（基于首次使用时间）
  const userId = `WC${String(userData.totalCollected + 1000).padStart(6, '0')}`;
  
  // 模拟注册日期
  const registerDate = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  // 重置游戏
  const handleReset = () => {
    if (confirm('确定要重置所有游戏进度吗？此操作不可撤销！')) {
      localStorage.removeItem('wordcaps_user_data');
      window.location.reload();
    }
  };

  return (
    <div className="h-screen grass-bg flex flex-col overflow-hidden pb-20">
      {/* Header */}
      <header className="px-4 py-6 text-center wood-bg border-b-4 border-[#5D4037]">
        <h1 className="text-2xl font-black text-white drop-shadow-md">🎫 My Hunter Pass</h1>
        <p className="text-white/80 text-sm mt-1 font-bold">你的狩猎通行证</p>
      </header>

      {/* License Card - 2.5D卡通风格 */}
      <div className="px-4 mt-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#FF5252] rounded-3xl p-5 border-4 border-[#B71C1C] border-b-[14px] relative overflow-hidden"
        >
          {/* 背景装饰 */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          
          <div className="flex items-start gap-4 relative z-10">
            {/* 头像 */}
            <div className="w-20 h-20 bg-white rounded-2xl border-4 border-[#5D4037] border-b-8 flex items-center justify-center flex-shrink-0">
              <span className="text-4xl">🦊</span>
            </div>
            
            {/* 信息 */}
            <div className="flex-1 text-white">
              <h2 className="text-xl font-black mb-3 drop-shadow-md">Word Hunter</h2>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 opacity-70" strokeWidth={2.5} />
                  <span className="font-mono font-black drop-shadow-md">{userId}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 opacity-70" strokeWidth={2.5} />
                  <span className="font-bold drop-shadow-md">{registerDate}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* 底部装饰线 */}
          <div className="mt-4 pt-3 border-t border-white/20 flex justify-between items-center">
            <span className="text-xs text-white/80 font-black">WORDCAPS OFFICIAL</span>
            <span className="text-xs text-white/80 font-mono font-bold">v1.0</span>
          </div>
        </motion.div>
      </div>

      {/* Stats Grid - 2个大方块 */}
      <div className="px-4 grid grid-cols-2 gap-4 mb-6">
        {/* 钻石数 */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl p-5 border-4 border-[#5D4037] border-b-[14px]"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 bg-[#4FC3F7] rounded-xl border-4 border-[#0288D1] flex items-center justify-center">
              <Diamond className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
          </div>
          <p className="text-4xl font-black text-[#5D4037]">
            <AnimatedNumber value={userData.diamonds} />
          </p>
          <p className="text-sm text-[#1B5E20] mt-1 font-bold">💎 Diamonds</p>
        </motion.div>

        {/* 已掌握 */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl p-5 border-4 border-[#5D4037] border-b-[14px]"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 bg-[#66BB6A] rounded-xl border-4 border-[#2E7D32] flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
          </div>
          <p className="text-4xl font-black text-[#5D4037]">
            <AnimatedNumber value={masteredCount} />
          </p>
          <p className="text-sm text-[#1B5E20] mt-1 font-bold">🏆 Mastered</p>
        </motion.div>
      </div>

      {/* 额外统计 */}
      <div className="px-4 mb-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border-4 border-[#5D4037] border-b-8"
        >
          <div className="flex justify-around text-center">
            <div>
              <p className="text-2xl font-black text-[#5D4037]">{collectedCount}</p>
              <p className="text-xs text-[#1B5E20] font-bold">已收集</p>
            </div>
            <div className="w-px bg-[#5D4037]/20" />
            <div>
              <p className="text-2xl font-black text-[#5D4037]">{userData.totalCollected}</p>
              <p className="text-xs text-[#1B5E20] font-bold">总照片</p>
            </div>
            <div className="w-px bg-[#5D4037]/20" />
            <div>
              <p className="text-2xl font-black text-[#5D4037]">
                {collectedCount > 0 ? Math.round((masteredCount / collectedCount) * 100) : 0}%
              </p>
              <p className="text-xs text-[#1B5E20] font-bold">掌握率</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* 成就区域 */}
      <div className="px-4 mb-4 flex-1 overflow-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-[#5D4037] flex items-center gap-2">
              <Award className="w-4 h-4 text-[#FFB74D]" strokeWidth={2.5} />
              🏅 成就
            </h3>
            <span className="text-xs font-black text-[#FF5252]">
              {unlockedAchievements.length}/{ACHIEVEMENTS.length}
            </span>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            {ACHIEVEMENTS.map((achievement, index) => {
              const isUnlocked = unlockedAchievements.some(a => a.id === achievement.id);
              const Icon = achievement.icon;
              
              return (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={isUnlocked ? { scale: 1.05 } : {}}
                  transition={{ delay: index * 0.03 }}
                  className={`p-3 rounded-2xl text-center relative overflow-hidden ${
                    isUnlocked 
                      ? 'bg-[#FFB74D] border-4 border-[#F57C00] border-b-8' 
                      : 'bg-white/50 border-4 border-dashed border-[#5D4037]/30'
                  }`}
                >
                  <div 
                    className={`w-8 h-8 mx-auto mb-1 rounded-full flex items-center justify-center ${
                      isUnlocked ? 'bg-white' : 'bg-[#5D4037]/10'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isUnlocked ? 'text-[#F57C00]' : 'text-[#5D4037]/50'}`} strokeWidth={2.5} />
                  </div>
                  <p className={`text-xs font-black ${isUnlocked ? 'text-white drop-shadow-md' : 'text-[#5D4037]/50'}`}>
                    {achievement.title}
                  </p>
                  <p className={`text-[10px] mt-0.5 font-bold ${isUnlocked ? 'text-white/80' : 'text-[#5D4037]/30'}`}>{achievement.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Footer - Reset Button */}
      <div className="px-4 mt-auto">
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          whileTap={{ scale: 0.95, y: 4 }}
          onClick={handleReset}
          className="btn-3d w-full py-3 bg-gray-200 border-gray-400 text-gray-500 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-[#FF5252] hover:border-[#B71C1C] hover:text-white transition-colors"
        >
          <RotateCcw className="w-4 h-4" strokeWidth={2.5} />
          Reset Game
        </motion.button>
      </div>
    </div>
  );
}
