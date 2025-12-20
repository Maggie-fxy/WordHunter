'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Star, X, Diamond, Lock, Sparkles } from 'lucide-react';
import { useGame } from '@/context/GameContext';
import { getWordById, WORD_BANK } from '@/data/wordBank';
import { Word, WordRecord } from '@/types';

interface WordBookProps {
  onBack: () => void;
}

// 根据难度获取钻石数量
function getDiamondsByDifficulty(difficulty: 1 | 2 | 3): number {
  switch (difficulty) {
    case 1: return 1; // 普通
    case 2: return 2; // 中等
    case 3: return 5; // 稀有
  }
}

// 根据难度获取稀有度标签
function getRarityLabel(difficulty: 1 | 2 | 3): { label: string; color: string; bgColor: string; borderColor: string } {
  switch (difficulty) {
    case 1: return { label: 'Common', color: 'text-gray-600', bgColor: 'bg-gray-100', borderColor: 'border-gray-300' };
    case 2: return { label: 'Medium', color: 'text-[#4FC3F7]', bgColor: 'bg-[#4FC3F7]/20', borderColor: 'border-[#0288D1]' };
    case 3: return { label: 'Rare', color: 'text-[#FFB74D]', bgColor: 'bg-[#FFB74D]/20', borderColor: 'border-[#F57C00]' };
  }
}

// 可爱的加号组件
function CutePlus() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="drop-shadow-sm">
      <rect x="4" y="10" width="16" height="4" rx="2" fill="#FFB74D" />
      <rect x="10" y="4" width="4" height="16" rx="2" fill="#FFB74D" />
      <circle cx="12" cy="12" r="2" fill="#F57C00" />
    </svg>
  );
}

// 单词详情弹窗
function WordDetailModal({ word, record, onClose }: { word: Word; record?: WordRecord; onClose: () => void }) {
  const diamonds = getDiamondsByDifficulty(word.difficulty);
  const rarity = getRarityLabel(word.difficulty);
  
  // 模拟含义数据（实际应该从word.meanings获取）
  const meanings = word.meanings || [
    {
      pos: 'n.',
      definition: `A ${word.word.toLowerCase()}`,
      definitionCn: word.cn,
      example: `I have a ${word.word.toLowerCase()}.`,
      exampleCn: `我有一个${word.cn}。`
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 50 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl border-4 border-[#5D4037] border-b-[14px] p-5 max-w-sm w-full max-h-[80vh] overflow-y-auto"
      >
        {/* 关闭按钮 */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 bg-[#FF5252] border-2 border-[#B71C1C] rounded-full flex items-center justify-center"
        >
          <X className="w-4 h-4 text-white" strokeWidth={3} />
        </motion.button>

        {/* 单词标题 */}
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-2 mb-1">
            <h2 className="text-3xl font-black text-[#5D4037]">{word.word}</h2>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${rarity.bgColor} ${rarity.color} border ${rarity.borderColor}`}>
              {rarity.label}
            </span>
          </div>
          <p className="text-lg text-[#1B5E20] font-bold">{word.cn}</p>
          {word.pronunciation && (
            <p className="text-sm text-gray-500 mt-1">{word.pronunciation}</p>
          )}
          {/* 钻石价值 */}
          <div className="flex items-center justify-center gap-1 mt-2">
            {Array.from({ length: diamonds }).map((_, i) => (
              <Diamond key={i} className="w-5 h-5 text-[#4FC3F7] fill-[#4FC3F7]/50" strokeWidth={2} />
            ))}
            <span className="text-sm font-bold text-[#5D4037] ml-1">+{diamonds}</span>
          </div>
        </div>

        {/* 含义列表 */}
        <div className="space-y-3">
          {meanings.map((meaning, idx) => (
            <div key={idx} className="bg-[#C1F080]/30 rounded-xl p-3 border-2 border-[#5D4037]/20">
              <div className="flex items-start gap-2">
                <span className="px-2 py-0.5 bg-[#FFB74D] text-white text-xs font-bold rounded-full">
                  {meaning.pos}
                </span>
                <div className="flex-1">
                  <p className="text-sm text-[#5D4037] font-bold">{meaning.definitionCn}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{meaning.definition}</p>
                </div>
              </div>
              {meaning.example && (
                <div className="mt-2 pl-2 border-l-2 border-[#5D4037]/30">
                  <p className="text-xs text-[#5D4037] italic">{meaning.example}</p>
                  <p className="text-xs text-gray-500">{meaning.exampleCn}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 收集的图片 */}
        {record && record.images.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-bold text-[#5D4037] mb-2">📸 我的收集</h3>
            <div className="grid grid-cols-3 gap-2">
              {record.images.map((img, idx) => (
                <div key={idx} className="aspect-square rounded-xl overflow-hidden border-2 border-[#5D4037]">
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// 未收集单词的神秘卡片
function MysteryCard({ word, index }: { word: Word; index: number }) {
  const rarity = getRarityLabel(word.difficulty);
  const diamonds = getDiamondsByDifficulty(word.difficulty);
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.02 }}
      whileHover={{ scale: 1.05 }}
      className="aspect-square rounded-2xl bg-gradient-to-br from-gray-700 to-gray-900 border-4 border-gray-600 border-b-8 flex flex-col items-center justify-center cursor-not-allowed relative overflow-hidden"
    >
      {/* 神秘光效 */}
      <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/5 to-white/10" />
      
      {/* 锁图标 */}
      <Lock className="w-6 h-6 text-gray-500 mb-1" strokeWidth={2.5} />
      <span className="text-[10px] text-gray-500 font-bold">???</span>
      
      {/* 稀有度指示 */}
      {word.difficulty > 1 && (
        <div className="absolute top-1 right-1">
          {word.difficulty === 3 ? (
            <Sparkles className="w-4 h-4 text-[#FFB74D]/50" />
          ) : (
            <Diamond className="w-3 h-3 text-[#4FC3F7]/50" />
          )}
        </div>
      )}
      
      {/* 钻石价值提示 */}
      <div className="absolute bottom-1 flex items-center gap-0.5">
        {Array.from({ length: Math.min(diamonds, 3) }).map((_, i) => (
          <Diamond key={i} className="w-3 h-3 text-gray-600" strokeWidth={2} />
        ))}
        {diamonds > 3 && <span className="text-[8px] text-gray-600">+</span>}
      </div>
    </motion.div>
  );
}

// 已收集单词卡片
function CollectedCard({ word, record, index, onClick }: { word: Word; record: WordRecord; index: number; onClick: () => void }) {
  const rarity = getRarityLabel(word.difficulty);
  const diamonds = getDiamondsByDifficulty(word.difficulty);
  
  // 获取第一张收集的图片作为封面
  const coverImage = record.images[0]?.url;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.02 }}
      whileHover={{ scale: 1.08, rotate: 2 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`aspect-square rounded-2xl border-4 border-b-8 flex flex-col items-center justify-center cursor-pointer relative overflow-hidden
        ${word.difficulty === 3 ? 'bg-gradient-to-br from-[#FFB74D]/20 to-[#FF8A65]/20 border-[#F57C00]' : 
          word.difficulty === 2 ? 'bg-gradient-to-br from-[#4FC3F7]/20 to-[#81D4FA]/20 border-[#0288D1]' : 
          'bg-white border-[#5D4037]'}`}
    >
      {/* 封面图片 */}
      {coverImage && (
        <div className="absolute inset-1 rounded-xl overflow-hidden">
          <img src={coverImage} alt="" className="w-full h-full object-cover opacity-30" />
        </div>
      )}
      
      {/* 单词 */}
      <div className="relative z-10 text-center px-1">
        <p className="text-xs font-black text-[#5D4037] leading-tight truncate">{word.word}</p>
        <p className="text-[10px] text-[#1B5E20] font-bold truncate">{word.cn}</p>
      </div>
      
      {/* 钻石价值 */}
      <div className="absolute bottom-1 flex items-center gap-0.5">
        {Array.from({ length: diamonds }).map((_, i) => (
          <Diamond key={i} className="w-3 h-3 text-[#4FC3F7] fill-[#4FC3F7]/50" strokeWidth={2} />
        ))}
      </div>
      
      {/* 掌握标记 */}
      {record.mastered && (
        <div className="absolute top-1 right-1 w-4 h-4 bg-[#66BB6A] rounded-full border border-[#2E7D32] flex items-center justify-center">
          <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
        </div>
      )}
      
      {/* 稀有度光效 */}
      {word.difficulty === 3 && (
        <Sparkles className="absolute top-1 left-1 w-4 h-4 text-[#FFB74D]" />
      )}
    </motion.div>
  );
}

export function WordBook({ onBack }: WordBookProps) {
  const { state } = useGame();
  const { userData } = state;
  const [selectedWord, setSelectedWord] = useState<{ word: Word; record?: WordRecord } | null>(null);

  // 获取所有单词，区分已收集和未收集
  const allWords = WORD_BANK.map(word => {
    const record = userData.wordRecords[word.id];
    const isCollected = record && record.images.length > 0;
    return { word, record, isCollected };
  });

  // 已收集的单词
  const collectedWords = allWords.filter(item => item.isCollected);
  // 未收集的单词
  const uncollectedWords = allWords.filter(item => !item.isCollected);

  // 统计
  const totalDiamonds = collectedWords.reduce((sum, item) => sum + getDiamondsByDifficulty(item.word.difficulty), 0);

  return (
    <div className="h-screen grass-bg flex flex-col overflow-hidden pb-20">
      {/* 顶部导航 - 去掉返回按钮 */}
      <header className="flex items-center justify-center px-4 py-3 wood-bg border-b-4 border-[#5D4037]">
        <h1 className="text-xl font-black text-white drop-shadow-md">📚 收集册</h1>
      </header>

      {/* 统计信息 */}
      <div className="px-4 py-3 bg-white/80 backdrop-blur-sm border-b-4 border-[#5D4037]">
        <div className="flex justify-around text-center">
          <div>
            <p className="text-2xl font-black text-[#5D4037]">{collectedWords.length}</p>
            <p className="text-xs text-[#1B5E20] font-bold">已收集</p>
          </div>
          <div>
            <p className="text-2xl font-black text-gray-400">{uncollectedWords.length}</p>
            <p className="text-xs text-[#1B5E20] font-bold">待发现</p>
          </div>
          <div>
            <p className="text-2xl font-black text-[#FF5252]">
              {collectedWords.filter(w => w.record?.mastered).length}
            </p>
            <p className="text-xs text-[#1B5E20] font-bold">已掌握</p>
          </div>
        </div>
      </div>

      {/* 单词网格 */}
      <div className="flex-1 overflow-y-auto p-3">
        {collectedWords.length === 0 && uncollectedWords.length > 0 ? (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-white rounded-full border-4 border-[#5D4037] border-b-8 flex items-center justify-center mb-4 mx-auto">
              <Star className="w-10 h-10 text-[#FFB74D]" strokeWidth={2.5} />
            </div>
            <p className="text-[#5D4037] font-black">还没有收集任何单词</p>
            <p className="text-[#1B5E20] text-sm mt-1 font-bold mb-4">去狩猎模式开始收集吧！</p>
            
            {/* 显示神秘单词预览 */}
            <p className="text-xs text-gray-500 mb-3">🔮 等待发现的宝藏...</p>
            <div className="grid grid-cols-5 gap-2 px-2">
              {uncollectedWords.slice(0, 10).map((item, index) => (
                <MysteryCard key={item.word.id} word={item.word} index={index} />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 已收集区域 */}
            {collectedWords.length > 0 && (
              <div>
                <h2 className="text-sm font-black text-[#5D4037] mb-2 flex items-center gap-2">
                  ✨ 已收集 ({collectedWords.length})
                </h2>
                <div className="grid grid-cols-5 gap-2">
                  {collectedWords.map((item, index) => (
                    <CollectedCard
                      key={item.word.id}
                      word={item.word}
                      record={item.record!}
                      index={index}
                      onClick={() => setSelectedWord({ word: item.word, record: item.record })}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 未收集区域 */}
            {uncollectedWords.length > 0 && (
              <div>
                <h2 className="text-sm font-black text-gray-500 mb-2 flex items-center gap-2">
                  🔒 待发现 ({uncollectedWords.length})
                </h2>
                <div className="grid grid-cols-5 gap-2">
                  {uncollectedWords.map((item, index) => (
                    <MysteryCard key={item.word.id} word={item.word} index={index} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 单词详情弹窗 */}
      <AnimatePresence>
        {selectedWord && (
          <WordDetailModal
            word={selectedWord.word}
            record={selectedWord.record}
            onClose={() => setSelectedWord(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
