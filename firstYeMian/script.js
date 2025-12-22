// 相机快门转场动画
const startHuntBtn = document.getElementById('startHuntBtn');
const shutterOverlay = document.getElementById('shutterOverlay');

// 按钮点击事件
startHuntBtn.addEventListener('click', () => {
    triggerShutterTransition();
});

function triggerShutterTransition() {
    // 播放快门音效（可选）
    // playShutterSound();
    
    // 激活遮罩层
    shutterOverlay.classList.add('active');
    
    // 等待动画完成后跳转（实际项目中跳转到相机界面）
    setTimeout(() => {
        console.log('进入 Hunter Mode - 相机界面');
        // TODO: 实际项目中这里应该跳转到相机界面
        // 例如：window.location.href = 'hunter.html';
        // 或者：openCamera();
        
        // MVP阶段：显示提示并重置动画
        alert('即将进入 Hunter Mode（相机模式）\n\n在实际项目中，这里会打开相机取景框，让用户拍摄目标物体。');
        
        // 重置动画（用于演示）
        setTimeout(() => {
            shutterOverlay.classList.remove('active');
        }, 100);
    }, 800); // 等待快门动画完成（0.8秒）
}

// 播放快门音效（可选功能）
function playShutterSound() {
    // 创建音频上下文
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // 快门音效：短促的"咔擦"声
    oscillator.frequency.value = 800;
    oscillator.type = 'square';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
}

// 页面加载完成后的初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('单词宝可梦 - Word Hunter 启动页加载完成');
    
    // 预加载图片资源
    preloadImages();
    
    // 可以在这里添加其他初始化逻辑
    // 例如：检查权限、加载用户数据等
});

// 预加载图片资源
function preloadImages() {
    const images = ['Monster.png', 'Wordhunter.png'];
    images.forEach(src => {
        const img = new Image();
        img.src = src;
    });
}

// 防止双击缩放（移动端优化）
let lastTouchEnd = 0;
document.addEventListener('touchend', (event) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
        event.preventDefault();
    }
    lastTouchEnd = now;
}, false);

// 移动端触摸反馈优化
let touchStartTime = 0;
let touchStartY = 0;

startHuntBtn.addEventListener('touchstart', (e) => {
    touchStartTime = Date.now();
    touchStartY = e.touches[0].clientY;
    startHuntBtn.style.transform = 'translate(6px, 6px)';
    startHuntBtn.style.boxShadow = '0px 0px 0px 0px rgba(0, 0, 0, 1)';
    e.preventDefault();
}, { passive: false });

startHuntBtn.addEventListener('touchend', (e) => {
    const touchDuration = Date.now() - touchStartTime;
    const touchMoveY = Math.abs(e.changedTouches[0].clientY - touchStartY);
    
    // 如果触摸时间很短或移动距离很小（可能是误触），不触发动画
    if (touchDuration < 50 || touchMoveY > 10) {
        startHuntBtn.style.transform = '';
        startHuntBtn.style.boxShadow = '6px 6px 0px 0px rgba(0, 0, 0, 1)';
        return;
    }
    
    // 恢复按钮样式
    setTimeout(() => {
        startHuntBtn.style.transform = '';
        startHuntBtn.style.boxShadow = '6px 6px 0px 0px rgba(0, 0, 0, 1)';
    }, 100);
    
    e.preventDefault();
}, { passive: false });

// 防止触摸时页面滚动
document.addEventListener('touchmove', (e) => {
    // 如果触摸点在按钮上，阻止默认滚动
    const target = e.target;
    if (target === startHuntBtn || startHuntBtn.contains(target)) {
        e.preventDefault();
    }
}, { passive: false });

// 图片加载错误处理
const monsterImage = document.getElementById('monsterImage');
const logoTextImage = document.getElementById('logoTextImage');

monsterImage.addEventListener('error', () => {
    console.warn('Monster.png 加载失败，使用备用显示');
    monsterImage.style.display = 'none';
    const fallback = document.createElement('div');
    fallback.className = 'monster-fallback';
    fallback.textContent = '🦖';
    fallback.style.fontSize = '8rem';
    monsterImage.parentElement.appendChild(fallback);
});

logoTextImage.addEventListener('error', () => {
    console.warn('Wordhunter.png 加载失败，使用备用显示');
    logoTextImage.style.display = 'none';
    const fallback = document.createElement('h1');
    fallback.className = 'logo-text-fallback';
    fallback.textContent = 'WORD\nHUNTER';
    fallback.style.fontSize = '2.5rem';
    fallback.style.fontWeight = '900';
    fallback.style.color = '#2D2D2D';
    fallback.style.textShadow = '3px 3px 0px #E57373';
    fallback.style.lineHeight = '1.2';
    logoTextImage.parentElement.insertBefore(fallback, logoTextImage);
});
