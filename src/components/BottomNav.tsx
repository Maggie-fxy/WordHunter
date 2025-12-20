'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Target, BookOpen, GraduationCap, User } from 'lucide-react';
import { GameMode } from '@/types';

interface BottomNavProps {
  currentMode: GameMode;
  onModeChange: (mode: GameMode) => void;
}

export function BottomNav({ currentMode, onModeChange }: BottomNavProps) {
  const navItems = [
    { mode: 'HUNTER' as GameMode, icon: Target, label: '狩猎' },
    { mode: 'COLLECTION' as GameMode, icon: BookOpen, label: '收集册' },
    { mode: 'REVIEW' as GameMode, icon: GraduationCap, label: '复习' },
    { mode: 'WORDBOOK' as GameMode, icon: User, label: '我的' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 wood-bg border-t-4 border-[#5D4037] px-4 py-3 z-50">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = currentMode === item.mode;
          const Icon = item.icon;
          
          return (
            <motion.button
              key={item.mode}
              whileTap={{ scale: 0.95, y: 2 }}
              whileHover={{ scale: 1.05 }}
              onClick={() => onModeChange(item.mode)}
              className={`relative flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all ${
                isActive 
                  ? 'bg-white border-4 border-[#5D4037] border-b-8' 
                  : 'text-white/70 hover:text-white'
              }`}
            >
              {/* 图标 */}
              <Icon 
                className={`w-6 h-6 relative z-10 ${
                  isActive ? 'text-[#5D4037]' : 'text-white drop-shadow-md'
                }`} 
                strokeWidth={2.5}
              />
              
              <span className={`text-xs font-black relative z-10 ${
                isActive ? 'text-[#5D4037]' : 'text-white drop-shadow-md'
              }`}>
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
