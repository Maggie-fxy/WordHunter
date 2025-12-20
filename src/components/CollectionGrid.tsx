'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { CollectedImage } from '@/types';

interface CollectionGridProps {
  images: CollectedImage[];
  maxSlots?: number;
  highlightLast?: boolean;
}

// 每个卡槽的随机旋转角度（固定值，避免重新渲染时变化）
const slotRotations = [-5, 3, -4, 5, -3, 4];

// 可爱的加号组件
function CutePlus() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="drop-shadow-sm">
      {/* 横线 - 圆角胶囊形状 */}
      <rect x="4" y="10" width="16" height="4" rx="2" fill="#FFB74D" />
      {/* 竖线 - 圆角胶囊形状 */}
      <rect x="10" y="4" width="4" height="16" rx="2" fill="#FFB74D" />
      {/* 中心小圆点装饰 */}
      <circle cx="12" cy="12" r="2" fill="#F57C00" />
    </svg>
  );
}

export function CollectionGrid({ images, maxSlots = 6, highlightLast = false }: CollectionGridProps) {
  const slots = Array.from({ length: maxSlots }, (_, i) => images[i] || null);
  const lastFilledIndex = images.length - 1;

  return (
    <div className="grid grid-cols-6 gap-3">
      <AnimatePresence>
        {slots.map((image, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.8, rotate: slotRotations[index] }}
            animate={{ opacity: 1, scale: 1, rotate: slotRotations[index] }}
            whileHover={{ scale: 1.1, rotate: 0, zIndex: 10 }}
            transition={{ 
              delay: index * 0.05,
              type: 'spring',
              stiffness: 400,
              damping: 25
            }}
            className={`
              aspect-square rounded-2xl overflow-hidden relative cursor-pointer
              ${image 
                ? 'bg-white border-4 border-[#5D4037] border-b-8' 
                : 'border-4 border-dashed border-[#5D4037]/40 bg-white/60'
              }
              ${highlightLast && index === lastFilledIndex ? 'ring-4 ring-[#66BB6A] ring-offset-2' : ''}
            `}
          >
            {image ? (
              <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="w-full h-full relative bg-white"
              >
                <img
                  src={image.url}
                  alt={image.detectedObject}
                  className="w-full h-full object-contain p-0.5"
                  style={{
                    filter: 'drop-shadow(1px 2px 3px rgba(0,0,0,0.15))',
                  }}
                />
                {/* 成功标记 */}
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 15, delay: 0.2 }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-[#66BB6A] rounded-full border-2 border-[#2E7D32] flex items-center justify-center"
                >
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </motion.div>
              </motion.div>
            ) : (
              /* 空卡槽 - 可爱加号 + 悬停效果 */
              <motion.div 
                animate={{ 
                  y: [0, -2, 0],
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  ease: 'easeInOut',
                  delay: index * 0.2 
                }}
                className="w-full h-full flex items-center justify-center"
              >
                <CutePlus />
              </motion.div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
