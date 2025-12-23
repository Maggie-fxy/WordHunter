'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  forceRegister?: boolean; // 强制显示注册模式（游客收集满5张后）
  message?: string; // 自定义提示信息
}

export function AuthModal({ isOpen, onClose, forceRegister = false, message }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(forceRegister ? 'register' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (mode === 'register') {
        if (password !== confirmPassword) {
          setError('两次输入的密码不一致');
          setIsLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('密码至少需要6个字符');
          setIsLoading(false);
          return;
        }
        const { error } = await signUp(email, password);
        if (error) {
          setError(error.message || '注册失败，请重试');
        } else {
          setSuccess('注册成功！请查收邮箱验证邮件后登录');
          setMode('login');
          setPassword('');
          setConfirmPassword('');
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message || '登录失败，请检查邮箱和密码');
        } else {
          onClose();
        }
      }
    } catch (err) {
      setError('操作失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 如果是强制注册模式，不允许关闭
  const handleClose = () => {
    if (!forceRegister) {
      onClose();
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
    setSuccess('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-3xl border-4 border-[#5D4037] border-b-[14px] p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 标题 */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-black text-[#5D4037]">
                {mode === 'login' ? '🔑 登录' : '🎉 注册'}
              </h2>
              {!forceRegister && (
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              )}
            </div>

            {/* 自定义提示信息 */}
            {message && (
              <div className="mb-4 p-3 bg-[#FFF8E1] border-2 border-[#F57C00] rounded-xl">
                <p className="text-sm text-[#5D4037] font-medium">{message}</p>
              </div>
            )}

            {/* 表单 */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 邮箱 */}
              <div>
                <label className="block text-sm font-bold text-[#5D4037] mb-1">
                  邮箱
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="请输入邮箱"
                    required
                    autoFocus
                    className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#4FC3F7] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* 密码 */}
              <div>
                <label className="block text-sm font-bold text-[#5D4037] mb-1">
                  密码
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入密码"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#4FC3F7] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* 确认密码（仅注册时显示） */}
              {mode === 'register' && (
                <div>
                  <label className="block text-sm font-bold text-[#5D4037] mb-1">
                    确认密码
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="请再次输入密码"
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#4FC3F7] focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* 成功提示 */}
              {success && (
                <div className="p-3 bg-green-50 border-2 border-green-200 rounded-xl">
                  <p className="text-sm text-green-600 font-medium">{success}</p>
                </div>
              )}

              {/* 错误提示 */}
              {error && (
                <div className="p-3 bg-red-50 border-2 border-red-200 rounded-xl">
                  <p className="text-sm text-red-600 font-medium">{error}</p>
                </div>
              )}

              {/* 提交按钮 */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#4FC3F7] hover:bg-[#29B6F6] text-white font-bold rounded-xl border-4 border-[#0288D1] border-b-8 active:border-b-4 active:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {mode === 'login' ? '登录中...' : '注册中...'}
                  </>
                ) : (
                  mode === 'login' ? '登录' : '注册'
                )}
              </button>
            </form>

            {/* 切换登录/注册 */}
            <p className="mt-4 text-center text-sm text-gray-500">
              {mode === 'login' ? '还没有账号？' : '已有账号？'}
              <button
                onClick={switchMode}
                className="ml-1 text-[#4FC3F7] font-bold hover:underline"
              >
                {mode === 'login' ? '立即注册' : '立即登录'}
              </button>
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
