'use client';

import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { GameState, GameAction, CollectedImage, UserData, WordRecord } from '@/types';
import { getRandomWord } from '@/data/wordBank';

// 本地存储键
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

// 抠图开关：0=不抠图使用原图，1=调用AI抠图
export const REMOVE_BG_FLAG: number = 1;  //REMOVE_BG_FLAG = 0 → 使用原图 REMOVE_BG_FLAG = 1 → 进行AI抠图


// 从本地存储加载用户数据
function loadUserData(): UserData {
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
    console.error('加载用户数据失败:', e);
  }
  return initialUserData;
}

// 保存用户数据到本地存储
function saveUserData(userData: UserData) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
  } catch (e) {
    console.error('保存用户数据失败:', e);
  }
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
      
      // 更新单词记录 - 使用深拷贝避免引用问题
      if (wordId) {
        const existingRecord = newUserData.wordRecords[wordId];
        const updatedRecord = existingRecord 
          ? {
              ...existingRecord,
              images: [...existingRecord.images, newImage],
            }
          : {
              wordId,
              images: [newImage],
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
      saveUserData(newUserData);
      
      return {
        ...state,
        phase: 'SUCCESS',
        isLoading: false,
        collectedImages: newImages,
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
      
      // 更新单词记录 - 使用深拷贝避免引用问题
      if (wordId) {
        const existingRecord = newUserData.wordRecords[wordId];
        const updatedRecord = existingRecord 
          ? {
              ...existingRecord,
              images: [...existingRecord.images, newImage],
            }
          : {
              wordId,
              images: [newImage],
              choiceCorrect: 0,
              spellingCorrect: 0,
              mastered: false,
            };
        newUserData.wordRecords = {
          ...newUserData.wordRecords,
          [wordId]: updatedRecord,
        };
      }
      
      saveUserData(newUserData);
      
      return {
        ...state,
        phase: 'SUCCESS',
        isLoading: false,
        collectedImages: newImages,
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
      saveUserData(newUserData);
      return { ...state, userData: newUserData };
    }

    case 'USE_HINT': {
      if (state.userData.diamonds < 1) return state;
      const newUserData = { ...state.userData, diamonds: state.userData.diamonds - 1 };
      saveUserData(newUserData);
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
            saveUserData(newUserData);
            return {
              ...state,
              userData: newUserData,
              reviewPhase: 'SPELLING',
              reviewAnswer: '',
            };
          }
        }
        saveUserData(newUserData);
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
        saveUserData(newUserData);
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
      saveUserData(newUserData);
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
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  // 加载用户数据
  useEffect(() => {
    const userData = loadUserData();
    dispatch({ type: 'LOAD_USER_DATA', payload: userData });
  }, []);

  const startNewGame = () => {
    const word = getRandomWord();
    dispatch({ type: 'SET_WORD', payload: word });
  };

  const nextWord = () => {
    const excludeIds = state.currentWord ? [state.currentWord.id] : [];
    const word = getRandomWord(excludeIds);
    dispatch({ type: 'NEXT_WORD', payload: word });
  };

  return (
    <GameContext.Provider value={{ state, dispatch, startNewGame, nextWord }}>
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
