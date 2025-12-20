'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Zap, Diamond, Award, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';

interface Achievement {
  id: string;
  title: string;
  desc: string;
  icon: 'star' | 'trophy' | 'zap' | 'diamond' | 'award';
}

interface AchievementToastProps {
  achievement: Achievement | null;
  onClose: () => void;
}

const iconMap = {
  star: Star,
  trophy: Trophy,
  zap: Zap,
  diamond: Diamond,
  award: Award,
};

export function AchievementToast({ achievement, onClose }: AchievementToastProps) {
  useEffect(() => {
    if (achievement) {
      // 触发多次撒花效果
      const defaults = { startVelocity: 30, spread: 360, ticks: 80, zIndex: 9999 };
      
      // 第一波撒花
      confetti({
        ...defaults,
        particleCount: 100,
        origin: { x: 0.5, y: 0.5 },
        colors: ['#FFD54F', '#F2C94C', '#FFF4CC', '#FFE082', '#FF6B6B'],
      });

      // 延迟第二波撒花
      setTimeout(() => {
        confetti({
          ...defaults,
          particleCount: 60,
          origin: { x: 0.3, y: 0.6 },
          colors: ['#4FC3F7', '#81D4FA', '#B3E5FC'],
        });
        confetti({
          ...defaults,
          particleCount: 60,
          origin: { x: 0.7, y: 0.6 },
          colors: ['#A5D6A7', '#81C784', '#C8E6C9'],
        });
      }, 300);

      // 5秒后自动关闭（延长时间让用户欣赏）
      const timer = setTimeout(() => {
        onClose();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [achievement, onClose]);

  const Icon = achievement ? iconMap[achievement.icon] : Star;

  return (
    <AnimatePresence>
      {achievement && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm cursor-pointer"
          onClick={onClose}
        >
          {/* 背景光晕 */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 2, 1.5], opacity: [0, 0.5, 0.3] }}
            transition={{ duration: 1 }}
            className="absolute w-96 h-96 bg-gradient-radial from-[#FFD54F]/40 via-[#FFD54F]/10 to-transparent rounded-full"
          />
          
          {/* 飘动的星星装饰 */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ 
                x: 0, 
                y: 0, 
                scale: 0, 
                opacity: 0 
              }}
              animate={{ 
                x: [0, (Math.random() - 0.5) * 200],
                y: [0, (Math.random() - 0.5) * 200],
                scale: [0, 1, 0.5],
                opacity: [0, 1, 0],
                rotate: [0, 360]
              }}
              transition={{ 
                duration: 2 + Math.random(), 
                delay: 0.2 + i * 0.1,
                repeat: Infinity,
                repeatDelay: 1
              }}
              className="absolute"
            >
              <Sparkles className="w-6 h-6 text-[#FFD54F]" />
            </motion.div>
          ))}

          <motion.div
            initial={{ scale: 0.3, y: 100, rotate: -15 }}
            animate={{ scale: 1, y: 0, rotate: 0 }}
            exit={{ scale: 0.3, y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 外层发光边框 */}
            <motion.div
              animate={{ 
                boxShadow: [
                  '0 0 20px rgba(255, 213, 79, 0.5)',
                  '0 0 40px rgba(255, 213, 79, 0.8)',
                  '0 0 20px rgba(255, 213, 79, 0.5)'
                ]
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="bg-gradient-to-br from-[#FFD54F] via-[#FFC107] to-[#FF9800] p-1.5 rounded-3xl"
            >
              <div className="bg-gradient-to-br from-[#FFF8E1] to-[#FFECB3] rounded-3xl px-10 py-8 text-center min-w-[340px] relative overflow-hidden">
                {/* 内部光芒动画 */}
                <motion.div
                  animate={{ 
                    rotate: 360,
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 bg-gradient-conic from-[#FFD54F]/0 via-[#FFD54F]/20 to-[#FFD54F]/0"
                />
                
                {/* 顶部装饰丝带 */}
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-2 bg-gradient-to-r from-transparent via-[#FF5252] to-transparent rounded-b-full"
                />
                
                {/* 图标容器 */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                  className="relative w-28 h-28 mx-auto mb-5"
                >
                  {/* 旋转光环 */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0 rounded-full border-4 border-dashed border-[#FFD54F]/60"
                  />
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-2 rounded-full border-2 border-dotted border-[#FF9800]/40"
                  />
                  
                  {/* 图标背景 */}
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="absolute inset-4 bg-gradient-to-br from-[#FFD54F] to-[#FF9800] rounded-full shadow-lg flex items-center justify-center"
                  >
                    <Icon className="w-12 h-12 text-white drop-shadow-md" strokeWidth={2.5} />
                  </motion.div>
                </motion.div>

                {/* 文字内容 */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="relative z-10"
                >
                  <motion.p
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="text-sm text-[#FF5252] font-black mb-2"
                  >
                    🎉 成就解锁！🎉
                  </motion.p>
                  <motion.h3
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, type: 'spring' }}
                    className="text-2xl font-black text-[#5D4037] mb-2"
                  >
                    {achievement.title}
                  </motion.h3>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-base text-[#8D6E63] font-medium"
                  >
                    {achievement.desc}
                  </motion.p>
                </motion.div>

                {/* 点击提示 */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.3, 0.8, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                  className="text-xs text-[#A1887F] mt-6 font-medium"
                >
                  👆 点任意位置退出
                </motion.p>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
