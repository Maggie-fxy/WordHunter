# WordHunter 技术栈文档

## 项目概述
WordHunter 是一款结合现实互动的英语单词"寻宝" Web App，通过拍摄现实中的物体来学习英语单词。

---

## 🛠 核心技术栈

### 前端框架
| 技术 | 版本 | 用途 |
|------|------|------|
| **Next.js** | 14.2.5 | React 全栈框架，使用 App Router |
| **React** | 18.3.1 | UI 组件库 |
| **TypeScript** | 5.5.4 | 类型安全 |

### 样式与动画
| 技术 | 版本 | 用途 |
|------|------|------|
| **Tailwind CSS** | 3.4.7 | 原子化 CSS 框架 |
| **Framer Motion** | 11.3.8 | 动画库（页面过渡、交互动画） |
| **PostCSS** | 8.4.40 | CSS 处理器 |
| **Autoprefixer** | 10.4.19 | CSS 兼容性前缀 |

### UI 组件
| 技术 | 版本 | 用途 |
|------|------|------|
| **Lucide React** | 0.424.0 | 图标库 |
| **Canvas Confetti** | 1.9.3 | 撒花/庆祝特效 |

### 后端与数据库
| 技术 | 版本 | 用途 |
|------|------|------|
| **Supabase** | 2.89.0 | 后端即服务（BaaS） |
| **@supabase/ssr** | 0.8.0 | Supabase SSR 支持 |
| **Firebase** | 10.12.4 | 备用认证/数据服务 |

---

## 🤖 AI 服务集成

### 物体识别 API
| 提供商 | 模型 | 状态 |
|--------|------|------|
| **OpenRouter（Gemini）** | `google/gemini-2.5-flash-lite` | ✅ 当前使用 |
| 豆包（Doubao） | `doubao-seed-1-6-lite` | 备选 |

### 抠图/贴纸生成 API
| 提供商 | 模型 | 状态 |
|--------|------|------|
| **OpenRouter（Gemini）** | `google/gemini-2.5-flash-image` | ✅ 当前使用 |
| PhotoRoom | segment API | 备选 |
| Remove.bg | removebg API | 备选 |

### API 配置开关
```typescript
// src/config/flags.ts
RECOGNIZE_API_FLAG = 1  // 0=豆包, 1=Gemini(OpenRouter)
REMOVE_BG_FLAG = 0      // 0=Gemini, 1=PhotoRoom, 2=不抠图
```

---

## 📁 项目结构

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   │   ├── recognize/     # AI 物体识别
│   │   ├── removebg/      # Remove.bg 抠图
│   │   ├── removebg-gemini/ # Gemini 贴纸生成
│   │   └── segment/       # PhotoRoom 抠图
│   ├── globals.css        # 全局样式
│   ├── layout.tsx         # 根布局
│   └── page.tsx           # 主页面（狩猎模式）
├── components/            # React 组件
│   ├── ActionArea.tsx     # 底部交互区
│   ├── AchievementToast.tsx # 成就提示
│   ├── AuthModal.tsx      # 登录/注册弹窗
│   ├── BgmHost.tsx        # 背景音乐控制
│   ├── BottomNav.tsx      # 底部导航栏
│   ├── CameraView.tsx     # 相机视图
│   ├── CollectionGrid.tsx # 收集网格
│   ├── ProfilePage.tsx    # 个人主页
│   ├── ReviewMode.tsx     # 复习模式
│   ├── SplashScreen.tsx   # 启动画面
│   ├── VictoryModal.tsx   # 胜利弹窗
│   ├── WordBook.tsx       # 单词本/收集册
│   └── WordCard.tsx       # 单词卡片
├── config/                # 配置文件
│   └── flags.ts           # 功能开关
├── context/               # React Context
│   └── GameContext.tsx    # 游戏状态管理
├── data/
│   └── wordBank.ts        # 词库数据（200+ 单词）
├── hooks/                 # 自定义 Hooks
│   ├── useBgm.ts          # 背景音乐
│   ├── useSound.ts        # 音效
│   └── useTTS.ts          # 语音合成
├── lib/                   # 工具库
│   ├── imageUtils.ts      # 图片处理
│   └── supabase/          # Supabase 客户端
├── styles/                # 样式文件
└── types/                 # TypeScript 类型定义
    └── index.ts
```

---

## 🎮 功能模块

### 1. 狩猎模式 (Hunter Mode)
- 显示目标单词
- 调用设备相机拍照
- AI 识别物体是否匹配
- 匹配成功后生成贴纸收藏

### 2. 复习模式 (Review Mode)
- 选择题：四选一识图
- 默写题：根据图片拼写单词
- 提示系统：首字母/末字母提示

### 3. 收集册 (WordBook)
- 按稀有度分类展示
- 单词详情弹窗
- 收集进度统计

### 4. 个人中心 (Profile)
- 用户登录/注册
- 数据云端同步
- 成就系统

---

## 🔐 环境变量

```env
# AI API Keys
OPENROUTER_API_KEY=      # OpenRouter API（Gemini 中转）
DOUBAO_API_KEY=          # 豆包 API（备用）
PHOTOROOM_API_KEY=       # PhotoRoom 抠图（备用）

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

---

## 📊 词库统计

| 难度 | 数量 | 钻石奖励 |
|------|------|----------|
| ⭐ 简单 (Common) | 80+ | 1 |
| ⭐⭐ 中等 (Medium) | 70+ | 2 |
| ⭐⭐⭐ 困难 (Rare) | 50+ | 5 |

**分类**: 食物、日用品、学习用品、家具、衣物、电子产品、动物、自然、玩具、厨房用品、工具

---

## 🚀 部署

- **平台**: Vercel（推荐）
- **域名**: https://wordshunter.online
- **构建命令**: `npm run build`
- **输出目录**: `.next`

---

## 📱 设备支持

- 移动端优先设计
- 支持 PWA 安装
- 相机 API 需要 HTTPS
- 推荐使用手机浏览器访问
