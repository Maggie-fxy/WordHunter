'use client';

import React, { createContext, useContext, useReducer, ReactNode, useEffect, useCallback } from 'react';
import { GameState, GameAction, CollectedImage, UserData, WordRecord } from '@/types';
import { DEMO_WORD_LIST, getRandomWord, getRandomWordFromWordList } from '@/data/wordBank';
import { useAuth } from './AuthContext';
import { 
  getUserLearningData, 
  handleCollectionSuccess, 
  updateUserStats,
  upsertWordRecord 
} from '@/lib/supabase/dataService';

// 本地存储键（用于未登录用户的本地缓存）
const STORAGE_KEY = 'wordcaps_user_data';

// 初始用户数据
const initialUserData: UserData = {
  diamonds: 0,
  wordRecords: {},
  totalCollected: 0,
};

// 初始游戏状态
const initialState: GameState = {
  mode: 'HUNTER',
  phase: 'IDLE',
  currentWord: null,
  collectedImages: [],
  isLoading: false,
  error: null,
  lastResult: null,
  capturedImageUrl: null,
  userData: initialUserData,
  reviewPhase: 'CHOICE',
  reviewWord: null,
  reviewOptions: [],
  reviewAnswer: '',
  showHint: false,
};

// 清除数据开关：1=清除旧数据，0=正常加载
const CLEAR_DATA_FLAG: number = 0;        //CLEAR_DATA_FLAG = 1 → 清除所有旧数据 CLEAR_DATA_FLAG = 0 → 正常加载数据（当前状态）

// 抠图模式：0=使用Gemini抠图，1=使用PHOTOROOM抠图，2=不抠图使用原图
export const REMOVE_BG_FLAG: number = 0;  //REMOVE_BG_FLAG = 0 → Gemini抠图(通过OpenRouter) REMOVE_BG_FLAG = 1 → PHOTOROOM抠图 REMOVE_BG_FLAG = 2 → 不抠图使用原图

// 每个单词最多保存的图片数量
const MAX_IMAGES_PER_WORD = 6;

// 游客模式下最多收集的图片总数（超过后强制登录）
export const MAX_GUEST_IMAGES = 5;

// Demo 抽词计数：前30次必出 Demo 词池
const DEMO_PICK_COUNT_KEY = 'wordcaps_demo_pick_count';
const DEMO_PICK_LIMIT = 30;

// 演示模式开关（localStorage）
const DEMO_MODE_KEY = 'wordcaps_demo_mode_enabled';
const DEMO_SEQUENCE_INDEX_KEY = 'wordcaps_demo_sequence_index';

// 演示模式：前5个单词顺序固定
const DEMO_FIXED_SEQUENCE: string[] = [
  'CUP',
  'ID CARD',
  'CHAOTIC',
  'HEADPHONE',
  'COCONUT WATER',
];


// 从本地存储加载用户数据（未登录时使用）
function loadLocalUserData(): UserData {
  if (typeof window === 'undefined') return initialUserData;
  
  // 根据标志位决定是否清除数据
  if (CLEAR_DATA_FLAG === 1) {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('wordcaps_shown_achievements');
    console.log('已清除旧数据');
    return initialUserData;
  }
  
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('加载本地用户数据失败:', e);
  }
  return initialUserData;
}

// 保存用户数据到本地存储（未登录时使用）
function saveLocalUserData(userData: UserData) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
  } catch (e) {
    console.error('保存本地用户数据失败:', e);
  }
}

function loadDemoPickCount(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(DEMO_PICK_COUNT_KEY);
    const n = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

function loadDemoModeEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(DEMO_MODE_KEY) === '1';
  } catch {
    return false;
  }
}

function saveDemoModeEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DEMO_MODE_KEY, enabled ? '1' : '0');
  } catch {
    // ignore
  }
}

function loadDemoSequenceIndex(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(DEMO_SEQUENCE_INDEX_KEY);
    const n = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

function saveDemoSequenceIndex(index: number) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DEMO_SEQUENCE_INDEX_KEY, String(index));
  } catch {
    // ignore
  }
}

function saveDemoPickCount(count: number) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DEMO_PICK_COUNT_KEY, String(count));
  } catch {
    // ignore
  }
}

function pickWordWithDemoPriority(excludeIds: string[] = []) {
  const pickCount = loadDemoPickCount();
  const demoEnabled = loadDemoModeEnabled();

  if (demoEnabled) {
    const seqIndex = loadDemoSequenceIndex();
    if (seqIndex < DEMO_FIXED_SEQUENCE.length) {
      const target = DEMO_FIXED_SEQUENCE[seqIndex];
      const word = getRandomWordFromWordList([target], excludeIds);
      saveDemoSequenceIndex(seqIndex + 1);
      saveDemoPickCount(pickCount + 1);
      return word;
    }
  }

  if (pickCount < DEMO_PICK_LIMIT) {
    const word = getRandomWordFromWordList(DEMO_WORD_LIST, excludeIds);
    saveDemoPickCount(pickCount + 1);
    return word;
  }
  return getRandomWord(excludeIds);
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_MODE':
      return {
        ...state,
        mode: action.payload,
        phase: 'IDLE',
        showHint: false,
      };

    case 'SET_WORD': {
      // 从 userData.wordRecords 中加载该单词已收集的图片
      const wordRecord = state.userData.wordRecords[action.payload.id];
      const existingImages = wordRecord?.images || [];
      return {
        ...state,
        currentWord: action.payload,
        collectedImages: existingImages,
        phase: 'IDLE',
        lastResult: null,
        capturedImageUrl: null,
        showHint: false,
      };
    }

    case 'START_CAMERA':
      return {
        ...state,
        phase: 'CAMERA',
        error: null,
        lastResult: null,
      };

    case 'STOP_CAMERA':
      return {
        ...state,
        phase: 'IDLE',
        capturedImageUrl: null,
      };

    case 'CAPTURE_IMAGE':
      return {
        ...state,
        capturedImageUrl: action.payload,
      };

    case 'START_ANALYZING':
      return {
        ...state,
        phase: 'ANALYZING',
        isLoading: true,
      };

    case 'ANALYSIS_SUCCESS': {
      // 防止重复处理：如果已经是SUCCESS状态，不再处理
      if (state.phase === 'SUCCESS') {
        return state;
      }
      
      const wordId = state.currentWord?.id || '';
      const newImage: CollectedImage = {
        url: action.payload.imageUrl,
        capturedAt: new Date(),
        detectedObject: action.payload.result.detected_object_en,
        wordId,
      };
      const newImages = [...state.collectedImages, newImage];
      
      // 更新用户数据：钻石+1，更新单词记录
      const newUserData = { ...state.userData };
      newUserData.diamonds += 1;
      newUserData.totalCollected += 1;
      
      // 更新单词记录 - 使用深拷贝避免引用问题，并限制最多6张图片
      if (wordId) {
        const existingRecord = newUserData.wordRecords[wordId];
        let updatedImages = existingRecord ? [...existingRecord.images, newImage] : [newImage];
        
        // 如果超过6张，删除最旧的
        if (updatedImages.length > MAX_IMAGES_PER_WORD) {
          updatedImages = updatedImages.slice(-MAX_IMAGES_PER_WORD);
        }
        
        const updatedRecord = existingRecord 
          ? {
              ...existingRecord,
              images: updatedImages,
            }
          : {
              wordId,
              images: updatedImages,
              choiceCorrect: 0,
              spellingCorrect: 0,
              mastered: false,
            };
        newUserData.wordRecords = {
          ...newUserData.wordRecords,
          [wordId]: updatedRecord,
        };
      }
      
      // 保存到本地存储
      saveLocalUserData(newUserData);
      
      // 同样限制 collectedImages 最多6张
      const limitedNewImages = newImages.length > MAX_IMAGES_PER_WORD 
        ? newImages.slice(-MAX_IMAGES_PER_WORD) 
        : newImages;
      
      return {
        ...state,
        phase: 'SUCCESS',
        isLoading: false,
        collectedImages: limitedNewImages,
        lastResult: action.payload.result,
        capturedImageUrl: null,
        userData: newUserData,
      };
    }

    case 'ANALYSIS_FAILED':
      return {
        ...state,
        phase: 'FAILED',
        isLoading: false,
        lastResult: action.payload,
      };

    case 'FORCE_SUCCESS': {
      // 防止重复处理：如果已经是SUCCESS状态，不再处理
      if (state.phase === 'SUCCESS') {
        return state;
      }
      
      const wordId = state.currentWord?.id || '';
      const newImage: CollectedImage = {
        url: action.payload,
        capturedAt: new Date(),
        detectedObject: state.currentWord?.word || 'Manual Pass',
        wordId,
      };
      const newImages = [...state.collectedImages, newImage];
      
      // 更新用户数据
      const newUserData = { ...state.userData };
      newUserData.diamonds += 1;
      newUserData.totalCollected += 1;
      
      // 更新单词记录 - 使用深拷贝避免引用问题，并限制最多6张图片
      if (wordId) {
        const existingRecord = newUserData.wordRecords[wordId];
        let updatedImages = existingRecord ? [...existingRecord.images, newImage] : [newImage];
        
        // 如果超过6张，删除最旧的
        if (updatedImages.length > MAX_IMAGES_PER_WORD) {
          updatedImages = updatedImages.slice(-MAX_IMAGES_PER_WORD);
        }
        
        const updatedRecord = existingRecord 
          ? {
              ...existingRecord,
              images: updatedImages,
            }
          : {
              wordId,
              images: updatedImages,
              choiceCorrect: 0,
              spellingCorrect: 0,
              mastered: false,
            };
        newUserData.wordRecords = {
          ...newUserData.wordRecords,
          [wordId]: updatedRecord,
        };
      }
      
      saveLocalUserData(newUserData);
      
      // 同样限制 collectedImages 最多6张
      const limitedNewImages = newImages.length > MAX_IMAGES_PER_WORD 
        ? newImages.slice(-MAX_IMAGES_PER_WORD) 
        : newImages;
      
      return {
        ...state,
        phase: 'SUCCESS',
        isLoading: false,
        collectedImages: limitedNewImages,
        lastResult: null,
        capturedImageUrl: null,
        userData: newUserData,
      };
    }

    case 'RETRY':
      return {
        ...state,
        phase: 'CAMERA',
        lastResult: null,
        capturedImageUrl: null,
        error: null,
      };

    case 'NEXT_WORD': {
      // 从 userData.wordRecords 中加载该单词已收集的图片
      const wordRecord = state.userData.wordRecords[action.payload.id];
      const existingImages = wordRecord?.images || [];
      return {
        ...state,
        currentWord: action.payload,
        collectedImages: existingImages,
        phase: 'IDLE',
        lastResult: null,
        capturedImageUrl: null,
        showHint: false,
      };
    }

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };

    case 'ADD_DIAMOND': {
      const newUserData = { ...state.userData, diamonds: state.userData.diamonds + 1 };
      saveLocalUserData(newUserData);
      return { ...state, userData: newUserData };
    }

    case 'USE_HINT': {
      if (state.userData.diamonds < 1) return state;
      const newUserData = { ...state.userData, diamonds: state.userData.diamonds - 1 };
      saveLocalUserData(newUserData);
      return { ...state, userData: newUserData, showHint: true };
    }

    case 'TOGGLE_HINT':
      return { ...state, showHint: !state.showHint };

    // 复习模式
    case 'START_REVIEW':
      return {
        ...state,
        reviewWord: action.payload.word,
        reviewOptions: action.payload.options,
        reviewPhase: 'CHOICE',
        reviewAnswer: '',
      };

    case 'SKIP_TO_SPELLING':
      // 跳过选择题直接进入默写阶段，不增加choiceCorrect计数
      return {
        ...state,
        reviewPhase: 'SPELLING',
        reviewAnswer: '',
      };

    case 'ANSWER_CHOICE': {
      const isCorrect = action.payload === state.reviewWord?.word;
      const wordId = state.reviewWord?.id || '';
      
      if (isCorrect && wordId) {
        const newUserData = { ...state.userData };
        const record = newUserData.wordRecords[wordId];
        if (record) {
          record.choiceCorrect += 1;
          record.lastReviewAt = new Date();
          // 选择题答对后进入默写模式
          if (record.choiceCorrect >= 1) {
            saveLocalUserData(newUserData);
            return {
              ...state,
              userData: newUserData,
              reviewPhase: 'SPELLING',
              reviewAnswer: '',
            };
          }
        }
        saveLocalUserData(newUserData);
        return { ...state, userData: newUserData, reviewPhase: 'RESULT' };
      }
      
      return { ...state, reviewPhase: 'RESULT' };
    }

    case 'ANSWER_SPELLING': {
      const isCorrect = action.payload.toLowerCase() === state.reviewWord?.word.toLowerCase();
      const wordId = state.reviewWord?.id || '';
      
      if (isCorrect && wordId) {
        const newUserData = { ...state.userData };
        const record = newUserData.wordRecords[wordId];
        if (record) {
          record.spellingCorrect += 1;
          record.lastReviewAt = new Date();
          // 默写正确，标记为已掌握
          if (record.spellingCorrect >= 1) {
            record.mastered = true;
          }
        }
        saveLocalUserData(newUserData);
        return { ...state, userData: newUserData, reviewPhase: 'RESULT' };
      }
      
      return { ...state, reviewPhase: 'RESULT' };
    }

    case 'NEXT_REVIEW':
      return {
        ...state,
        reviewPhase: 'CHOICE',
        reviewWord: null,
        reviewOptions: [],
        reviewAnswer: '',
      };

    case 'LOAD_USER_DATA':
      return { ...state, userData: action.payload };

    case 'SAVE_WORD_RECORD': {
      const newUserData = { ...state.userData };
      newUserData.wordRecords[action.payload.wordId] = action.payload;
      saveLocalUserData(newUserData);
      return { ...state, userData: newUserData };
    }

    default:
      return state;
  }
}

interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  startNewGame: () => void;
  nextWord: () => void;
  demoModeEnabled: boolean;
  toggleDemoMode: () => void;
  syncToCloud: (userData: UserData) => Promise<void>;
  syncReviewProgress: (wordId: string, choiceCorrect: number, spellingCorrect: number, mastered: boolean) => Promise<void>;
  handleCollectionSuccessAction: (wordId: string, imageUrl: string, detectedObject: string) => Promise<boolean>;
  isLoggedIn: boolean;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const { user } = useAuth();
  const [demoModeEnabled, setDemoModeEnabled] = React.useState(false);

  useEffect(() => {
    setDemoModeEnabled(loadDemoModeEnabled());
  }, []);

  // 加载用户数据 - 登录用户从 Supabase 加载，未登录用户从本地存储加载
  useEffect(() => {
    const loadData = async () => {
      if (user) {
        // 已登录：从 Supabase 加载
        try {
          const cloudData = await getUserLearningData(user.id);
          dispatch({ type: 'LOAD_USER_DATA', payload: cloudData });
          console.log('已从云端加载用户数据');
        } catch (e) {
          console.error('从云端加载数据失败，使用本地数据:', e);
          const localData = loadLocalUserData();
          dispatch({ type: 'LOAD_USER_DATA', payload: localData });
        }
      } else {
        // 未登录：从本地存储加载
        const localData = loadLocalUserData();
        dispatch({ type: 'LOAD_USER_DATA', payload: localData });
      }
    };
    
    loadData();
  }, [user]);

  // 同步数据到 Supabase（登录用户）
  const syncToCloud = useCallback(async (userData: UserData) => {
    if (!user) return;
    
    try {
      await updateUserStats(user.id, {
        diamonds: userData.diamonds,
        total_collected: userData.totalCollected,
      });
    } catch (e) {
      console.error('同步数据到云端失败:', e);
    }
  }, [user]);

  // 同步复习进度到云端（登录用户）
  const syncReviewProgress = useCallback(async (
    wordId: string,
    choiceCorrect: number,
    spellingCorrect: number,
    mastered: boolean
  ) => {
    if (!user) return;
    
    try {
      await upsertWordRecord(user.id, wordId, {
        choice_correct: choiceCorrect,
        spelling_correct: spellingCorrect,
        mastered: mastered,
        last_review_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error('同步复习进度到云端失败:', e);
    }
  }, [user]);

  const startNewGame = () => {
    const word = pickWordWithDemoPriority();
    dispatch({ type: 'SET_WORD', payload: word });
  };

  const nextWord = () => {
    const excludeIds = state.currentWord ? [state.currentWord.id] : [];
    const word = pickWordWithDemoPriority(excludeIds);
    dispatch({ type: 'NEXT_WORD', payload: word });
  };

  const toggleDemoMode = () => {
    const next = !loadDemoModeEnabled();
    saveDemoModeEnabled(next);
    // 为了保证“前5个固定顺序”每次都可重复，开启/关闭时都重置计数
    saveDemoPickCount(0);
    saveDemoSequenceIndex(0);
    setDemoModeEnabled(next);
  };

  // 收集成功处理（支持云端同步）
  const handleCollectionSuccessAction = useCallback(async (
    wordId: string,
    imageUrl: string,
    detectedObject: string
  ) => {
    if (user) {
      // 已登录：同步到 Supabase
      const result = await handleCollectionSuccess(user.id, wordId, imageUrl, detectedObject);
      if (result.success) {
        // 重新加载云端数据
        const cloudData = await getUserLearningData(user.id);
        dispatch({ type: 'LOAD_USER_DATA', payload: cloudData });
      }
      return result.success;
    }
    return true; // 未登录时由 reducer 处理本地存储
  }, [user]);

  return (
    <GameContext.Provider value={{ 
      state, 
      dispatch, 
      startNewGame, 
      nextWord,
      demoModeEnabled,
      toggleDemoMode,
      syncToCloud,
      syncReviewProgress,
      handleCollectionSuccessAction,
      isLoggedIn: !!user,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
