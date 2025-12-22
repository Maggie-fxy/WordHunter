import { SPLASH_CONFIG } from './config.js';

/**
 * 开屏动画类 - 模块化封装
 * 可轻松集成到任何游戏项目中
 */
export class SplashScreen {
    constructor(options = {}) {
        // 合并配置
        this.config = this._mergeConfig(SPLASH_CONFIG, options);
        
        // 状态管理
        this.state = {
            isStarted: false,
            isCompleted: false,
            canSkip: false,
            loadingProgress: 0
        };
        
        // 回调函数
        this.callbacks = {
            onComplete: options.onComplete || null,
            onProgress: options.onProgress || null,
            onSkip: options.onSkip || null,
            onError: options.onError || null
        };
        
        // DOM元素引用
        this.elements = {};
        
        // 定时器引用
        this.timers = [];
        
        // 事件监听器引用（用于清理）
        this.eventListeners = [];
    }
    
    /**
     * 初始化
     */
    async init() {
        try {
            // 获取DOM元素
            this._getElements();
            
            // 预加载图片资源
            await this._preloadImages();
            
            // 设置事件监听器
            this._setupEventListeners();
            
            // 如果配置了自动开始，则启动动画
            if (this.config.features.autoStart) {
                this.start();
            }
            
            return true;
        } catch (error) {
            console.error('SplashScreen初始化失败:', error);
            if (this.callbacks.onError) {
                this.callbacks.onError(error);
            }
            return false;
        }
    }
    
    /**
     * 开始动画
     */
    start() {
        if (this.state.isStarted) return;
        
        this.state.isStarted = true;
        const startTime = Date.now();
        
        // 显示容器
        if (this.elements.container) {
            this.elements.container.style.display = 'flex';
        }
        
        // 延迟后允许跳过
        if (this.config.features.allowSkip) {
            const skipTimer = setTimeout(() => {
                this.state.canSkip = true;
                this._showSkipHint();
            }, this.config.timing.skipEnableDelay);
            this.timers.push(skipTimer);
        }
        
        // 计算总动画时间
        const totalDuration = this.config.delays.button + this.config.durations.button;
        
        // 确保最少显示时间
        const minTimer = setTimeout(() => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, this.config.timing.minDisplayTime - elapsed);
            
            setTimeout(() => {
                // 动画完成后自动触发转场（如果没有手动触发）
                if (!this.state.isCompleted && this.config.features.autoStart) {
                    this._complete();
                }
            }, remaining);
        }, totalDuration);
        this.timers.push(minTimer);
    }
    
    /**
     * 跳过动画
     */
    skip() {
        if (!this.state.canSkip || this.state.isCompleted) return;
        
        // 触发跳过回调
        if (this.callbacks.onSkip) {
            this.callbacks.onSkip();
        }
        
        // 立即完成所有动画
        this._skipAllAnimations();
        
        // 触发完成
        this._complete();
    }
    
    /**
     * 更新加载进度
     * @param {number} percent - 进度百分比 (0-100)
     */
    updateProgress(percent) {
        this.state.loadingProgress = Math.min(100, Math.max(0, percent));
        
        if (this.elements.progressFill) {
            this.elements.progressFill.style.width = `${this.state.loadingProgress}%`;
        }
        
        if (this.elements.progressText) {
            this.elements.progressText.textContent = 
                `${this.config.text.loadingText} ${Math.round(this.state.loadingProgress)}%`;
        }
        
        // 触发进度回调
        if (this.callbacks.onProgress) {
            this.callbacks.onProgress(this.state.loadingProgress);
        }
    }
    
    /**
     * 销毁实例，清理资源
     */
    destroy() {
        // 清除所有定时器
        this.timers.forEach(timer => clearTimeout(timer));
        this.timers = [];
        
        // 移除所有事件监听器
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventListeners = [];
        
        // 隐藏容器
        if (this.elements.container) {
            this.elements.container.style.display = 'none';
        }
        
        // 清空引用
        this.elements = {};
        this.state.isCompleted = true;
    }
    
    /**
     * 获取DOM元素引用
     * @private
     */
    _getElements() {
        this.elements = {
            container: document.querySelector('.splash-screen'),
            monsterImage: document.getElementById('monsterImage'),
            logoTextImage: document.getElementById('logoTextImage'),
            startHuntBtn: document.getElementById('startHuntBtn'),
            shutterOverlay: document.getElementById('shutterOverlay'),
            progressFill: document.getElementById('progressFill'),
            progressText: document.getElementById('progressText'),
            skipHint: document.getElementById('skipHint'),
            monsterContainer: document.querySelector('.monster-container'),
            logoContainer: document.querySelector('.logo-text-container'),
            buttonContainer: document.querySelector('.button-container')
        };
    }
    
    /**
     * 预加载图片资源
     * @private
     */
    async _preloadImages() {
        const { assetsPath, monsterImage, logoImage } = this.config.paths;
        const images = [
            `${assetsPath}${monsterImage}`,
            `${assetsPath}${logoImage}`
        ];
        
        const loadPromises = images.map(src => 
            this._loadImageWithRetry(src, this.config.retry.maxRetries)
        );
        
        try {
            await Promise.all(loadPromises);
            this.updateProgress(100);
        } catch (error) {
            console.warn('部分图片加载失败，使用备用显示', error);
            // 继续执行，使用备用显示
        }
    }
    
    /**
     * 加载图片（带重试机制）
     * @private
     */
    _loadImageWithRetry(src, retries) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => resolve(img);
            
            img.onerror = () => {
                if (retries > 0) {
                    setTimeout(() => {
                        this._loadImageWithRetry(src, retries - 1)
                            .then(resolve)
                            .catch(reject);
                    }, this.config.retry.retryDelay);
                } else {
                    reject(new Error(`Failed to load ${src}`));
                }
            };
            
            img.src = src;
        });
    }
    
    /**
     * 设置事件监听器
     * @private
     */
    _setupEventListeners() {
        // 按钮点击事件
        if (this.elements.startHuntBtn) {
            const btnClickHandler = () => this._complete();
            this.elements.startHuntBtn.addEventListener('click', btnClickHandler);
            this._addEventListenerRef(this.elements.startHuntBtn, 'click', btnClickHandler);
        }
        
        // 跳过功能 - 点击任意位置
        if (this.config.features.allowSkip) {
            const skipClickHandler = (e) => {
                // 不在按钮上点击时才跳过
                if (this.state.canSkip && !this.elements.startHuntBtn.contains(e.target)) {
                    this.skip();
                }
            };
            document.addEventListener('click', skipClickHandler);
            this._addEventListenerRef(document, 'click', skipClickHandler);
            
            // 键盘ESC跳过
            const skipKeyHandler = (e) => {
                if (e.key === 'Escape' && this.state.canSkip) {
                    this.skip();
                }
            };
            document.addEventListener('keydown', skipKeyHandler);
            this._addEventListenerRef(document, 'keydown', skipKeyHandler);
        }
        
        // 移动端触摸优化
        this._setupTouchOptimization();
        
        // 图片加载错误处理
        this._setupImageErrorHandlers();
    }
    
    /**
     * 设置触摸优化
     * @private
     */
    _setupTouchOptimization() {
        if (!this.elements.startHuntBtn) return;
        
        let touchStartTime = 0;
        let touchStartY = 0;
        
        const touchStartHandler = (e) => {
            touchStartTime = Date.now();
            touchStartY = e.touches[0].clientY;
            this.elements.startHuntBtn.style.transform = 'translate(6px, 6px)';
            this.elements.startHuntBtn.style.boxShadow = '0px 0px 0px 0px rgba(0, 0, 0, 1)';
            e.preventDefault();
        };
        
        const touchEndHandler = (e) => {
            const touchDuration = Date.now() - touchStartTime;
            const touchMoveY = Math.abs(e.changedTouches[0].clientY - touchStartY);
            
            if (touchDuration < 50 || touchMoveY > 10) {
                this.elements.startHuntBtn.style.transform = '';
                this.elements.startHuntBtn.style.boxShadow = '6px 6px 0px 0px rgba(0, 0, 0, 1)';
                return;
            }
            
            setTimeout(() => {
                this.elements.startHuntBtn.style.transform = '';
                this.elements.startHuntBtn.style.boxShadow = '6px 6px 0px 0px rgba(0, 0, 0, 1)';
            }, 100);
            
            e.preventDefault();
        };
        
        this.elements.startHuntBtn.addEventListener('touchstart', touchStartHandler, { passive: false });
        this.elements.startHuntBtn.addEventListener('touchend', touchEndHandler, { passive: false });
        
        this._addEventListenerRef(this.elements.startHuntBtn, 'touchstart', touchStartHandler);
        this._addEventListenerRef(this.elements.startHuntBtn, 'touchend', touchEndHandler);
        
        // 防止双击缩放
        let lastTouchEnd = 0;
        const preventZoomHandler = (event) => {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                event.preventDefault();
            }
            lastTouchEnd = now;
        };
        document.addEventListener('touchend', preventZoomHandler, false);
        this._addEventListenerRef(document, 'touchend', preventZoomHandler);
    }
    
    /**
     * 设置图片错误处理
     * @private
     */
    _setupImageErrorHandlers() {
        if (this.elements.monsterImage) {
            const monsterErrorHandler = () => {
                console.warn('Monster.png 加载失败，使用备用显示');
                this.elements.monsterImage.style.display = 'none';
                const fallback = document.createElement('div');
                fallback.className = 'monster-fallback';
                fallback.textContent = '🦖';
                fallback.style.fontSize = '8rem';
                this.elements.monsterImage.parentElement.appendChild(fallback);
            };
            this.elements.monsterImage.addEventListener('error', monsterErrorHandler);
            this._addEventListenerRef(this.elements.monsterImage, 'error', monsterErrorHandler);
        }
        
        if (this.elements.logoTextImage) {
            const logoErrorHandler = () => {
                console.warn('Wordhunter.png 加载失败，使用备用显示');
                this.elements.logoTextImage.style.display = 'none';
                const fallback = document.createElement('h1');
                fallback.className = 'logo-text-fallback';
                fallback.textContent = 'WORD\nHUNTER';
                fallback.style.fontSize = '2.5rem';
                fallback.style.fontWeight = '900';
                fallback.style.color = '#2D2D2D';
                fallback.style.textShadow = '3px 3px 0px #E57373';
                fallback.style.lineHeight = '1.2';
                this.elements.logoTextImage.parentElement.insertBefore(fallback, this.elements.logoTextImage);
            };
            this.elements.logoTextImage.addEventListener('error', logoErrorHandler);
            this._addEventListenerRef(this.elements.logoTextImage, 'error', logoErrorHandler);
        }
    }
    
    /**
     * 显示跳过提示
     * @private
     */
    _showSkipHint() {
        if (this.elements.skipHint) {
            this.elements.skipHint.classList.add('visible');
        }
    }
    
    /**
     * 跳过所有动画
     * @private
     */
    _skipAllAnimations() {
        const containers = [
            this.elements.monsterContainer,
            this.elements.logoContainer,
            this.elements.buttonContainer
        ];
        
        containers.forEach(el => {
            if (el) {
                el.style.animation = 'none';
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }
        });
        
        // 隐藏进度条
        if (this.elements.progressFill && this.elements.progressText) {
            this.elements.progressFill.parentElement.style.display = 'none';
        }
    }
    
    /**
     * 完成动画，触发转场
     * @private
     */
    _complete() {
        if (this.state.isCompleted) return;
        
        this.state.isCompleted = true;
        
        // 触发快门转场
        if (this.elements.shutterOverlay) {
            this.elements.shutterOverlay.classList.add('active');
        }
        
        // 等待快门动画完成
        const completeTimer = setTimeout(() => {
            // 触发完成回调
            if (this.callbacks.onComplete) {
                this.callbacks.onComplete();
            }
            
            // 清理资源
            this.destroy();
        }, this.config.durations.shutter);
        
        this.timers.push(completeTimer);
    }
    
    /**
     * 添加事件监听器引用（用于清理）
     * @private
     */
    _addEventListenerRef(element, event, handler) {
        this.eventListeners.push({ element, event, handler });
    }
    
    /**
     * 合并配置
     * @private
     */
    _mergeConfig(defaultConfig, userConfig) {
        const merged = JSON.parse(JSON.stringify(defaultConfig));
        
        // 深度合并
        const deepMerge = (target, source) => {
            for (const key in source) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    target[key] = target[key] || {};
                    deepMerge(target[key], source[key]);
                } else {
                    target[key] = source[key];
                }
            }
            return target;
        };
        
        return deepMerge(merged, userConfig);
    }
}

// 默认导出
export default SplashScreen;
