# 开屏动画集成指南

## 📦 项目结构

```
your-game-project/
├── src/
│   └── splash/
│       ├── SplashScreen.js    # 核心类文件
│       ├── config.js          # 配置文件
│       └── splash.css         # 样式文件
├── assets/
│   └── splash/
│       ├── Monster.png        # 怪兽图片
│       └── Wordhunter.png     # Logo图片
├── index.html                 # 主页面
└── game.html                  # 游戏主界面（可选）
```

---

## 🚀 快速开始

### 1. 复制文件到项目

将以下文件复制到你的游戏项目中：

```bash
# 复制核心文件
src/splash/SplashScreen.js
src/splash/config.js
src/splash/splash.css

# 复制资源文件
Monster.png
Wordhunter.png
```

### 2. 在HTML中引入

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>Your Game</title>
    
    <!-- 引入开屏动画样式 -->
    <link rel="stylesheet" href="src/splash/splash.css">
</head>
<body>
    <!-- 开屏动画容器 -->
    <div class="splash-screen" id="splashScreen">
        <div class="background-pattern"></div>
        
        <div class="monster-container">
            <img src="assets/splash/Monster.png" alt="Monster" class="monster-image" id="monsterImage">
        </div>
        
        <div class="logo-text-container">
            <img src="assets/splash/Wordhunter.png" alt="Logo" class="logo-text-image" id="logoTextImage">
            <p class="tagline">Gotta Catch 'Em Words!</p>
        </div>
        
        <div class="button-container">
            <button class="start-hunt-btn" id="startHuntBtn">
                <span class="btn-text">START HUNTING</span>
                <svg class="camera-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                </svg>
            </button>
        </div>
        
        <div class="loading-progress">
            <div class="progress-bar">
                <div class="progress-fill" id="progressFill"></div>
            </div>
            <p class="progress-text" id="progressText">Loading... 0%</p>
        </div>
        
        <div class="skip-hint" id="skipHint">Click to skip</div>
        
        <div class="shutter-overlay" id="shutterOverlay">
            <div class="shutter-ring"></div>
        </div>
    </div>
    
    <!-- 你的游戏界面 -->
    <div id="gameContainer" style="display: none;">
        <!-- 游戏内容 -->
    </div>
    
    <script type="module" src="main.js"></script>
</body>
</html>
```

### 3. JavaScript集成代码

创建 `main.js` 文件：

```javascript
import { SplashScreen } from './src/splash/SplashScreen.js';

// 创建开屏动画实例
const splash = new SplashScreen({
    // 配置资源路径
    paths: {
        assetsPath: './assets/splash/',
        monsterImage: 'Monster.png',
        logoImage: 'Wordhunter.png'
    },
    
    // 功能开关
    features: {
        allowSkip: true,      // 允许跳过
        showProgress: true,   // 显示进度
        autoStart: false      // 手动控制启动
    },
    
    // 完成回调
    onComplete: () => {
        // 隐藏开屏动画
        document.getElementById('splashScreen').style.display = 'none';
        
        // 显示游戏界面
        document.getElementById('gameContainer').style.display = 'block';
        
        // 启动游戏
        startGame();
    },
    
    // 进度回调（可选）
    onProgress: (percent) => {
        console.log(`加载进度: ${percent}%`);
    }
});

// 初始化并启动
async function init() {
    // 初始化开屏动画
    await splash.init();
    
    // 加载游戏资源
    await loadGameAssets(splash);
    
    // 启动动画
    splash.start();
}

// 加载游戏资源
async function loadGameAssets(splash) {
    // 示例：加载游戏资源并更新进度
    const assets = [
        'game/player.png',
        'game/enemy.png',
        'game/background.png',
        // ... 更多资源
    ];
    
    for (let i = 0; i < assets.length; i++) {
        await loadAsset(assets[i]);
        const progress = ((i + 1) / assets.length) * 100;
        splash.updateProgress(progress);
    }
}

function loadAsset(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    });
}

function startGame() {
    console.log('游戏启动！');
    // 你的游戏启动逻辑
}

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', init);
```

---

## ⚙️ 配置选项

### 完整配置对象

```javascript
const splash = new SplashScreen({
    // 动画持续时间（毫秒）
    durations: {
        monster: 1000,      // 怪兽动画
        logo: 1000,         // Logo动画
        button: 1000,       // 按钮动画
        shutter: 800        // 快门转场
    },
    
    // 动画延迟（毫秒）
    delays: {
        logo: 1200,         // Logo延迟
        button: 2500        // 按钮延迟
    },
    
    // 功能开关
    features: {
        allowSkip: true,            // 允许跳过
        showProgress: true,         // 显示进度
        enableSound: false,         // 启用音效
        autoStart: true             // 自动开始
    },
    
    // 时间控制
    timing: {
        minDisplayTime: 1000,       // 最少显示时间
        skipEnableDelay: 1000       // 跳过启用延迟
    },
    
    // 资源路径
    paths: {
        assetsPath: './assets/splash/',
        monsterImage: 'Monster.png',
        logoImage: 'Wordhunter.png'
    },
    
    // 重试配置
    retry: {
        maxRetries: 3,              // 最大重试次数
        retryDelay: 1000            // 重试延迟
    },
    
    // 文本内容
    text: {
        tagline: 'Gotta Catch \'Em Words!',
        buttonText: 'START HUNTING',
        loadingText: 'Loading...',
        skipHint: 'Click to skip'
    },
    
    // 回调函数
    onComplete: () => {},           // 完成回调
    onProgress: (percent) => {},    // 进度回调
    onSkip: () => {},               // 跳过回调
    onError: (error) => {}          // 错误回调
});
```

---

## 📚 API 文档

### 类方法

#### `init()`
初始化开屏动画，预加载资源。

```javascript
await splash.init();
```

#### `start()`
启动动画序列。

```javascript
splash.start();
```

#### `skip()`
跳过动画（需要 `allowSkip: true`）。

```javascript
splash.skip();
```

#### `updateProgress(percent)`
更新加载进度。

```javascript
splash.updateProgress(50); // 50%
```

#### `destroy()`
销毁实例，清理资源。

```javascript
splash.destroy();
```

### 回调函数

#### `onComplete`
动画完成时触发。

```javascript
onComplete: () => {
    console.log('动画完成');
    startGame();
}
```

#### `onProgress`
进度更新时触发。

```javascript
onProgress: (percent) => {
    console.log(`进度: ${percent}%`);
}
```

#### `onSkip`
用户跳过动画时触发。

```javascript
onSkip: () => {
    console.log('用户跳过了动画');
}
```

#### `onError`
发生错误时触发。

```javascript
onError: (error) => {
    console.error('错误:', error);
    // 降级处理
    startGame();
}
```

---

## 🎨 自定义样式

### 修改颜色主题

编辑 `splash.css`：

```css
.splash-screen {
    background-color: #YOUR_COLOR; /* 背景色 */
}

.splash-screen .start-hunt-btn {
    background-color: #YOUR_COLOR; /* 按钮颜色 */
}
```

### 修改动画时长

编辑 `config.js` 或在初始化时传入：

```javascript
const splash = new SplashScreen({
    durations: {
        monster: 500,   // 更快的动画
        logo: 500,
        button: 500
    }
});
```

---

## 🔧 常见问题

### Q: 如何禁用跳过功能？

```javascript
const splash = new SplashScreen({
    features: {
        allowSkip: false
    }
});
```

### Q: 如何隐藏进度条？

```javascript
const splash = new SplashScreen({
    features: {
        showProgress: false
    }
});
```

或在CSS中：

```css
.splash-screen .loading-progress {
    display: none !important;
}
```

### Q: 如何更改图片路径？

```javascript
const splash = new SplashScreen({
    paths: {
        assetsPath: './your/custom/path/',
        monsterImage: 'your-monster.png',
        logoImage: 'your-logo.png'
    }
});
```

### Q: 如何在动画完成后跳转页面？

```javascript
const splash = new SplashScreen({
    onComplete: () => {
        window.location.href = 'game.html';
    }
});
```

### Q: 如何处理资源加载失败？

```javascript
const splash = new SplashScreen({
    onError: (error) => {
        console.error('加载失败:', error);
        // 降级处理：直接启动游戏
        startGame();
    }
});
```

---

## 📱 移动端优化

### 禁用缩放

已在HTML中配置：

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
```

### 刘海屏适配

已自动处理安全区域：

```css
padding: calc(1.5rem + env(safe-area-inset-top)) 
         calc(1.25rem + env(safe-area-inset-right)) 
         calc(1.5rem + env(safe-area-inset-bottom)) 
         calc(1.25rem + env(safe-area-inset-left));
```

### PWA支持

添加到 `<head>`：

```html
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="apple-touch-icon" href="icon.png">
```

---

## 🎯 最佳实践

### 1. 预加载游戏资源

在开屏动画期间加载游戏资源：

```javascript
async function loadGameAssets(splash) {
    const assets = ['player.png', 'enemy.png', 'bg.png'];
    
    for (let i = 0; i < assets.length; i++) {
        await loadAsset(assets[i]);
        splash.updateProgress((i + 1) / assets.length * 100);
    }
}
```

### 2. 错误处理

始终提供错误回调：

```javascript
onError: (error) => {
    console.error('开屏动画错误:', error);
    // 即使出错也要启动游戏
    startGame();
}
```

### 3. 性能优化

- 压缩图片资源（使用 WebP 格式）
- 启用浏览器缓存
- 使用 CDN 加速资源加载

### 4. 用户体验

- 设置合理的 `minDisplayTime`（不要太短）
- 提供跳过选项（`allowSkip: true`）
- 显示加载进度（`showProgress: true`）

---

## 📊 性能指标

| 指标 | 推荐值 |
|------|--------|
| 首次加载时间 | < 2秒 |
| 动画总时长 | 3-5秒 |
| 图片总大小 | < 500KB |
| CSS文件大小 | < 50KB |
| JS文件大小 | < 30KB |

---

## 🔄 版本更新

### v2.0.0 (模块化版本)
- ✅ 完全模块化封装
- ✅ 添加进度显示
- ✅ 添加跳过功能
- ✅ 资源加载重试机制
- ✅ 完整的回调系统
- ✅ CSS命名空间隔离
- ✅ 移动端优化

### v1.0.0 (原始版本)
- 基础开屏动画
- 三阶段动画序列
- 快门转场效果

---

## 📞 技术支持

如有问题，请参考：
- `example-integration.html` - 完整集成示例
- `index-modular.html` - 基础使用示例
- `开屏动画设计文档.md` - 设计思路文档

---

## 📄 许可证

MIT License - 可自由用于商业和个人项目。
