import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 卡通田园风格配色系统 - 羊了个羊风格
        // Background 背景体系
        bg: {
          DEFAULT: '#C1F080',    // 草地主色 - 浅嫩绿
          secondary: '#FFFFFF',  // 卡片/牌面 - 纯白
          tertiary: '#A8E063',   // 深一点的草地
          wood: '#8D5524',       // 木质纹理
          glass: 'rgba(27, 94, 32, 0.2)', // 玻璃磨砂
        },
        // Text 文字体系
        text: {
          DEFAULT: '#5D4037',    // 主文本 - 深褐色（土壤色）
          secondary: '#1B5E20',  // 次级文本 - 深绿色
          muted: '#6D4C41',      // 弱文本 - 浅褐色
          onPrimary: '#FFFFFF',  // 主色上的文字
        },
        // Primary 主交互色 - 糖果红
        primary: {
          DEFAULT: '#FF5252',    // 主要操作 - 糖果红
          hover: '#FF1744',      // 悬停
          border: '#B71C1C',     // 深色边框
          soft: '#FFCDD2',       // 轻主色背景
        },
        // Secondary 辅助强调 - 天空蓝
        secondary: {
          DEFAULT: '#4FC3F7',    // 次级强调 - 天空蓝
          border: '#0288D1',     // 深色边框
          soft: '#B3E5FC',       // 轻高亮
        },
        // Accent 强调/提示 - 暖橙色
        accent: {
          DEFAULT: '#FFB74D',    // 暖橙色
          border: '#F57C00',     // 深色边框
        },
        // 保留一些实用色
        success: '#66BB6A',      // 成功状态 - 草绿
        warning: '#FFB74D',      // 警告状态 - 暖橙
        error: '#FF5252',        // 错误状态 - 糖果红
        wood: '#8D5524',         // 木质色
        soil: '#5D4037',         // 土壤色
        forest: '#1B5E20',       // 森林绿
        grass: '#33691E',        // 草地边框色
      },
      fontFamily: {
        sans: ['Nunito', 'system-ui', 'sans-serif'],
        display: ['Fredoka One', 'Nunito', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      borderWidth: {
        '3': '3px',
        '4': '4px',
        '6': '6px',
        '8': '8px',
        '10': '10px',
        '14': '14px',
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.06)',
        'soft-md': '0 4px 12px rgba(0, 0, 0, 0.08)',
        'soft-lg': '0 8px 24px rgba(0, 0, 0, 0.1)',
        'card': '0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.06)',
        'none': 'none',
      },
      translate: {
        'squish': '6px',
      },
      animation: {
        'bounce-slow': 'bounce 2s infinite',
        'pulse-soft': 'pulse 3s infinite',
        'wiggle': 'wiggle 0.5s ease-in-out',
        'pop': 'pop 0.3s ease-out',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        pop: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '50%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
