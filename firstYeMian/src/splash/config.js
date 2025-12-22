// 开屏动画配置文件
export const SPLASH_CONFIG = {
    // 动画持续时间（毫秒）
    durations: {
        monster: 1000,      // 怪兽淡入动画
        logo: 1000,         // Logo浮现动画
        button: 1000,       // 按钮冲击动画
        shutter: 800        // 快门转场动画
    },
    
    // 动画延迟时间（毫秒）
    delays: {
        logo: 1200,         // Logo延迟出现
        button: 2500        // 按钮延迟出现
    },
    
    // 功能开关
    features: {
        allowSkip: true,            // 允许跳过动画
        showProgress: true,         // 显示加载进度
        enableSound: false,         // 启用音效（默认关闭）
        autoStart: true             // 自动开始动画
    },
    
    // 时间控制
    timing: {
        minDisplayTime: 1000,       // 最少显示时间（毫秒）
        skipEnableDelay: 1000       // 多久后允许跳过（毫秒）
    },
    
    // 资源路径
    paths: {
        assetsPath: './',           // 资源根路径
        monsterImage: 'Monster.png',
        logoImage: 'Wordhunter.png'
    },
    
    // 重试配置
    retry: {
        maxRetries: 3,              // 最大重试次数
        retryDelay: 1000            // 重试延迟（毫秒）
    },
    
    // 文本内容
    text: {
        tagline: 'Gotta Catch \'Em Words!',
        buttonText: 'START HUNTING',
        loadingText: 'Loading...',
        skipHint: 'Click to skip'
    }
};
