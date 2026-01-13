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

---

## 📷 相机缩放功能调试记录 (2026-01-13)

### 问题背景
在移动端 H5 中实现相机缩放功能时，遇到以下挑战：
1. `MediaStreamTrack.applyConstraints({ zoom })` 在很多移动端浏览器（Android WebView / 华为浏览器 / 微信 WebView）中不报错但无效果
2. `getCapabilities().zoom` 在部分设备上不存在或返回 min=max=1
3. 双指捏合手势被浏览器页面缩放劫持
4. 前置摄像头不支持硬件 zoom

### 最终方案：硬件优先 + 软件兜底

#### 缩放策略架构
```
┌─────────────────────────────────────────────────────────────┐
│                    UI Zoom: 0.5x ~ 3x                       │
├─────────────────────────────────────────────────────────────┤
│  zoom < 1 (0.5x ~ 1x)                                       │
│  ├── 禁用硬件 zoom（重置到 1x）                              │
│  └── 使用软件缩放（CSS transform + Canvas 缩小）            │
├─────────────────────────────────────────────────────────────┤
│  zoom >= 1 (1x ~ 3x)                                        │
│  ├── 优先尝试硬件 zoom (applyConstraints)                   │
│  │   ├── 成功 → 使用硬件 zoom                               │
│  │   └── 失败 → fallback 到软件 zoom                        │
│  └── 前置摄像头 → 始终使用软件 zoom                         │
└─────────────────────────────────────────────────────────────┘
```

#### 核心状态设计
```typescript
// useCamera.ts
const [zoom, setZoomState] = useState(1);           // UI zoom (0.5 ~ 3)
const [minZoom] = useState(0.5);                    // UI 最小值
const [maxZoom, setMaxZoom] = useState(3);          // UI 最大值
const [hardwareZoomAvailable, setHardwareZoomAvailable] = useState(false);
const [softwareZoomActive, setSoftwareZoomActive] = useState(false);
const [hardwareZoomMax, setHardwareZoomMax] = useState(1);
```

#### setZoom 核心逻辑
```typescript
const setZoom = useCallback((newZoom: number) => {
  const clampedZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));
  setZoomState(clampedZoom);
  
  // 前置摄像头：始终软件 zoom
  if (isFrontCamera) {
    setSoftwareZoomActive(true);
    return;
  }
  
  // zoom < 1：禁用硬件，使用软件缩放
  if (clampedZoom < 1) {
    if (trackRef.current && hardwareZoomAvailable) {
      applyZoomToTrack(trackRef.current, 1); // 重置硬件到 1x
    }
    setSoftwareZoomActive(true);
    return;
  }
  
  // zoom >= 1：尝试硬件 zoom
  if (hardwareZoomAvailable && trackRef.current) {
    const hwZoom = Math.min(clampedZoom, hardwareZoomMax);
    applyZoomToTrack(trackRef.current, hwZoom).then(success => {
      setSoftwareZoomActive(!success || clampedZoom > hardwareZoomMax);
    });
  } else {
    setSoftwareZoomActive(true);
  }
}, [minZoom, maxZoom, isFrontCamera, hardwareZoomAvailable, hardwareZoomMax]);
```

#### 视频预览处理
```tsx
// CameraView.tsx
<video
  style={{ 
    transform: `${isFrontCamera ? 'scaleX(-1)' : ''} ${softwareZoomActive && zoom !== 1 ? `scale(${zoom})` : ''}`,
    transformOrigin: 'center center',
    transition: 'transform 0.1s ease-out'  // 丝滑过渡
  }}
/>
```

#### captureImage 处理
```typescript
if (softwareZoomActive && zoom !== 1) {
  if (zoom < 1) {
    // 缩小：绘制整个视频到缩小的中心区域
    const scale = zoom;
    const outputWidth = videoWidth * scale;
    const outputHeight = videoHeight * scale;
    const offsetX = (videoWidth - outputWidth) / 2;
    const offsetY = (videoHeight - outputHeight) / 2;
    context.drawImage(video, 0, 0, videoWidth, videoHeight, 
                      offsetX, offsetY, outputWidth, outputHeight);
  } else {
    // 放大：裁剪中心区域并放大
    const cropWidth = videoWidth / zoom;
    const cropHeight = videoHeight / zoom;
    const cropX = (videoWidth - cropWidth) / 2;
    const cropY = (videoHeight - cropHeight) / 2;
    context.drawImage(video, cropX, cropY, cropWidth, cropHeight,
                      0, 0, videoWidth, videoHeight);
  }
}
```

#### 防止浏览器 Pinch 劫持
```tsx
<div 
  style={{ touchAction: 'none' }}  // CSS 级阻止
  onTouchStart={(e) => {
    if (e.touches.length === 2) {
      e.preventDefault();  // JS 级阻止
    }
  }}
  onTouchMove={(e) => {
    if (isPinching) e.preventDefault();
  }}
/>
```

#### 硬件 zoom 兼容性处理
```typescript
// 兼容 Android WebView / 华为浏览器
const applyZoomToTrack = async (track, zoomValue) => {
  // 方法1: advanced constraints (标准)
  try {
    await track.applyConstraints({ advanced: [{ zoom: zoomValue }] });
    return true;
  } catch {}
  
  // 方法2: 直接设置 (某些 WebView)
  try {
    await track.applyConstraints({ zoom: zoomValue });
    return true;
  } catch {}
  
  return false;
};
```

### 关键文件
- `src/hooks/useCamera.ts` - 相机 Hook，zoom 状态管理
- `src/components/CameraView.tsx` - 相机视图，UI 交互

### 测试要点
1. 后置摄像头：0.5x ~ 3x 全范围测试
2. 前置摄像头：确认始终使用软件 zoom
3. 截图一致性：UI 显示与 captureImage 输出一致
4. 双指捏合：确认不被浏览器劫持
5. 滑杆控制：确认与捏合使用同一状态源

---

## 📱 Android 原生相机架构 (进阶方案)

> **设计哲学**: Web 是皮肤，Native 是肌肉，真倍率必须由原生控制

### 为什么需要原生相机？

Web `getUserMedia` 的局限性：
- ❌ 无法访问物理多摄像头（超广角/长焦）
- ❌ `applyConstraints({ zoom })` 在很多 WebView 中无效
- ❌ 无法实现真实 0.5x / 2x / 3x 物理倍率

### 架构概览

```
React Camera UI (按钮/滑杆/倍率显示)
        │
        │ JS Bridge (window.AndroidCamera)
        ▼
Android WebView + JavascriptInterface
        │
        │ CameraBridge
        ▼
CameraController (CameraX)
        │
        ▼
Physical Camera Hardware
┌──────────┬──────────┬──────────┐
│UltraWide │   Wide   │   Tele   │
│  0.5x    │   1x     │  2x/3x   │
└──────────┴──────────┴──────────┘
```

### 倍率 → 镜头映射规则

| UI 倍率 | 目标镜头 | Fallback |
|---------|----------|----------|
| ≤ 0.6x | ULTRA_WIDE | WIDE + 数字缩放 |
| 0.6x ~ 1.8x | WIDE | - |
| ≥ 1.8x | TELE | WIDE + 数字变焦 |

### JS Bridge 接口

```javascript
// Web 调用方式
window.AndroidCamera.setZoom(0.5)    // 设置倍率
window.AndroidCamera.capture()       // 拍照
window.AndroidCamera.stop()          // 停止相机
window.AndroidCamera.getCapabilities() // 获取设备能力
```

### Native 回调

```javascript
// 相机就绪
window.onNativeCameraReady = (capabilities) => { ... }

// 倍率变化
window.onNativeZoomChanged = (zoom, lensType) => { ... }

// 拍照完成
window.onNativeCapture = (base64) => { ... }

// 错误处理
window.onNativeError = (message) => { ... }
```

### 设备兼容性

| 设备类型 | 可用倍率 |
|----------|----------|
| 单摄 | 1x |
| 双摄 (广角+主摄) | 0.5x, 1x |
| 双摄 (主摄+长焦) | 1x, 2x |
| 三摄 | 0.5x, 1x, 2x/3x |

### 详细文档

完整架构设计和代码实现见：
- `android/NATIVE_CAMERA_ARCHITECTURE.md`
