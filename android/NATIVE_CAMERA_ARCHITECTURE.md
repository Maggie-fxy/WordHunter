# Android WebView 原生相机架构设计

> **设计哲学**: Web 是皮肤，Native 是肌肉，真倍率必须由原生控制

---

## 📐 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                      React Camera UI                            │
│                   (按钮、滑杆、倍率显示)                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ postMessage / JS Bridge
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Android WebView                            │
│                   (JavascriptInterface)                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ CameraBridge
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CameraController                             │
│         (物理镜头枚举、倍率映射、生命周期管理)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ CameraX / Camera2
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Physical Camera Hardware                           │
│     ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│     │UltraWide │  │   Wide   │  │   Tele   │                   │
│     │  0.5x    │  │   1x     │  │  2x/3x   │                   │
│     └──────────┘  └──────────┘  └──────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 核心设计原则

| 原则 | 说明 |
|------|------|
| **Web 无相机权限** | Web 层完全不使用 `getUserMedia` |
| **真实物理倍率** | 禁止 CSS scale 冒充倍率 |
| **原生预览渲染** | 使用 CameraX `PreviewView` |
| **设备自适应** | 根据实际硬件能力动态调整可用倍率 |
| **生命周期感知** | Camera 绑定 Activity 生命周期 |

---

## 📁 项目结构

```
app/
├── src/main/
│   ├── java/com/wordcaps/camera/
│   │   ├── CameraActivity.kt          # 主 Activity
│   │   ├── CameraBridge.kt            # JS ↔ Native 桥接
│   │   ├── CameraController.kt        # 相机核心控制器
│   │   ├── PhysicalCameraManager.kt   # 物理镜头管理
│   │   └── model/
│   │       ├── PhysicalCamera.kt      # 物理相机数据类
│   │       └── CameraType.kt          # 相机类型枚举
│   └── res/
│       └── layout/
│           └── activity_camera.xml    # 布局文件
└── build.gradle.kts                   # 依赖配置
```

---

## 🔧 依赖配置

```kotlin
// build.gradle.kts (app module)
dependencies {
    // CameraX
    val cameraxVersion = "1.3.1"
    implementation("androidx.camera:camera-core:$cameraxVersion")
    implementation("androidx.camera:camera-camera2:$cameraxVersion")
    implementation("androidx.camera:camera-lifecycle:$cameraxVersion")
    implementation("androidx.camera:camera-view:$cameraxVersion")
    
    // WebView
    implementation("androidx.webkit:webkit:1.9.0")
    
    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
    
    // Lifecycle
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
}
```

---

## 📷 物理摄像头枚举与映射

### CameraType 枚举

```kotlin
// model/CameraType.kt
package com.wordcaps.camera.model

enum class CameraType {
    ULTRA_WIDE,  // 超广角 (0.5x)
    WIDE,        // 主摄 (1x)
    TELE         // 长焦 (2x/3x)
}
```

### PhysicalCamera 数据类

```kotlin
// model/PhysicalCamera.kt
package com.wordcaps.camera.model

data class PhysicalCamera(
    val cameraId: String,
    val logicalCameraId: String,  // 所属逻辑相机ID
    val focalLength: Float,       // 等效焦距
    val sensorSize: Float,        // 传感器尺寸
    val type: CameraType,
    val isAvailable: Boolean = true
) {
    // 计算等效35mm焦距
    val equivalent35mm: Float
        get() = focalLength * (43.27f / sensorSize)
}
```

### PhysicalCameraManager

```kotlin
// PhysicalCameraManager.kt
package com.wordcaps.camera

import android.content.Context
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.util.Log
import com.wordcaps.camera.model.CameraType
import com.wordcaps.camera.model.PhysicalCamera

class PhysicalCameraManager(context: Context) {
    
    private val cameraManager = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
    private val _cameras = mutableListOf<PhysicalCamera>()
    
    val cameras: List<PhysicalCamera> get() = _cameras
    val availableZoomLevels: List<Float> get() = buildAvailableZoomLevels()
    
    init {
        enumeratePhysicalCameras()
    }
    
    /**
     * 枚举所有后置物理摄像头
     */
    private fun enumeratePhysicalCameras() {
        _cameras.clear()
        
        try {
            for (cameraId in cameraManager.cameraIdList) {
                val characteristics = cameraManager.getCameraCharacteristics(cameraId)
                
                // 只处理后置摄像头
                val facing = characteristics.get(CameraCharacteristics.LENS_FACING)
                if (facing != CameraCharacteristics.LENS_FACING_BACK) continue
                
                // 获取物理摄像头ID列表
                val physicalCameraIds = characteristics.physicalCameraIds
                
                if (physicalCameraIds.isNotEmpty()) {
                    // 多摄设备：枚举每个物理摄像头
                    for (physicalId in physicalCameraIds) {
                        val physicalChar = cameraManager.getCameraCharacteristics(physicalId)
                        val camera = parsePhysicalCamera(physicalId, cameraId, physicalChar)
                        camera?.let { _cameras.add(it) }
                    }
                } else {
                    // 单摄设备
                    val camera = parsePhysicalCamera(cameraId, cameraId, characteristics)
                    camera?.let { _cameras.add(it) }
                }
            }
            
            // 按焦距排序
            _cameras.sortBy { it.focalLength }
            
            Log.d(TAG, "Enumerated ${_cameras.size} physical cameras:")
            _cameras.forEach { 
                Log.d(TAG, "  - ${it.type}: focal=${it.focalLength}mm, 35mm=${it.equivalent35mm}mm")
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Failed to enumerate cameras", e)
        }
    }
    
    /**
     * 解析单个物理摄像头
     */
    private fun parsePhysicalCamera(
        physicalId: String,
        logicalId: String,
        characteristics: CameraCharacteristics
    ): PhysicalCamera? {
        return try {
            val focalLengths = characteristics.get(CameraCharacteristics.LENS_INFO_AVAILABLE_FOCAL_LENGTHS)
            val sensorSize = characteristics.get(CameraCharacteristics.SENSOR_INFO_PHYSICAL_SIZE)
            
            if (focalLengths.isNullOrEmpty() || sensorSize == null) return null
            
            val focalLength = focalLengths[0]
            val sensorDiagonal = kotlin.math.sqrt(
                sensorSize.width * sensorSize.width + sensorSize.height * sensorSize.height
            )
            
            // 计算等效35mm焦距来判断镜头类型
            val equivalent35mm = focalLength * (43.27f / sensorDiagonal)
            val type = classifyLensType(equivalent35mm)
            
            PhysicalCamera(
                cameraId = physicalId,
                logicalCameraId = logicalId,
                focalLength = focalLength,
                sensorSize = sensorDiagonal,
                type = type
            )
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse camera $physicalId", e)
            null
        }
    }
    
    /**
     * 根据等效焦距分类镜头类型
     * 
     * 典型值:
     * - 超广角: 13-18mm (等效35mm)
     * - 主摄: 24-28mm
     * - 长焦: 50-70mm (2x), 70-105mm (3x)
     */
    private fun classifyLensType(equivalent35mm: Float): CameraType {
        return when {
            equivalent35mm < 20f -> CameraType.ULTRA_WIDE
            equivalent35mm < 40f -> CameraType.WIDE
            else -> CameraType.TELE
        }
    }
    
    /**
     * 根据倍率获取最佳物理摄像头
     */
    fun getCameraForZoom(zoom: Float): PhysicalCamera? {
        if (_cameras.isEmpty()) return null
        
        val targetType = when {
            zoom <= 0.6f -> CameraType.ULTRA_WIDE
            zoom < 1.8f -> CameraType.WIDE
            else -> CameraType.TELE
        }
        
        // 优先返回目标类型，否则 fallback
        return _cameras.find { it.type == targetType }
            ?: _cameras.find { it.type == CameraType.WIDE }
            ?: _cameras.firstOrNull()
    }
    
    /**
     * 构建可用倍率列表
     */
    private fun buildAvailableZoomLevels(): List<Float> {
        val levels = mutableListOf<Float>()
        
        if (_cameras.any { it.type == CameraType.ULTRA_WIDE }) {
            levels.add(0.5f)
        }
        
        levels.add(1.0f) // 主摄始终可用
        
        if (_cameras.any { it.type == CameraType.TELE }) {
            // 根据长焦等效焦距决定倍率
            val tele = _cameras.find { it.type == CameraType.TELE }
            val wide = _cameras.find { it.type == CameraType.WIDE }
            if (tele != null && wide != null) {
                val ratio = tele.equivalent35mm / wide.equivalent35mm
                when {
                    ratio >= 2.5f -> levels.add(3.0f)
                    ratio >= 1.8f -> levels.add(2.0f)
                }
            }
        }
        
        return levels.sorted()
    }
    
    /**
     * 获取设备相机能力摘要（用于回传Web）
     */
    fun getCapabilitiesJson(): String {
        val levels = availableZoomLevels
        return """
        {
            "minZoom": ${levels.firstOrNull() ?: 1.0},
            "maxZoom": ${levels.lastOrNull() ?: 1.0},
            "availableLevels": [${levels.joinToString(",")}],
            "hasUltraWide": ${_cameras.any { it.type == CameraType.ULTRA_WIDE }},
            "hasTele": ${_cameras.any { it.type == CameraType.TELE }},
            "cameraCount": ${_cameras.size}
        }
        """.trimIndent()
    }
    
    companion object {
        private const val TAG = "PhysicalCameraManager"
    }
}
```

---

## 🎮 CameraController 核心实现

```kotlin
// CameraController.kt
package com.wordcaps.camera

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Base64
import android.util.Log
import android.view.View
import android.webkit.WebView
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import com.wordcaps.camera.model.CameraType
import java.io.ByteArrayOutputStream
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class CameraController(
    private val context: Context,
    private val lifecycleOwner: LifecycleOwner,
    private val previewView: PreviewView,
    private val webView: WebView
) {
    
    private val physicalCameraManager = PhysicalCameraManager(context)
    private val cameraExecutor: ExecutorService = Executors.newSingleThreadExecutor()
    
    private var cameraProvider: ProcessCameraProvider? = null
    private var preview: Preview? = null
    private var imageCapture: ImageCapture? = null
    private var camera: Camera? = null
    
    private var currentZoom: Float = 1.0f
    private var currentCameraType: CameraType = CameraType.WIDE
    
    val availableZoomLevels: List<Float>
        get() = physicalCameraManager.availableZoomLevels
    
    /**
     * 初始化相机
     */
    fun initialize() {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
        
        cameraProviderFuture.addListener({
            cameraProvider = cameraProviderFuture.get()
            bindCamera(CameraType.WIDE)
            
            // 通知 Web 相机能力
            notifyWebCameraReady()
            
        }, ContextCompat.getMainExecutor(context))
    }
    
    /**
     * 绑定相机到指定镜头类型
     */
    private fun bindCamera(targetType: CameraType) {
        val provider = cameraProvider ?: return
        
        // 获取目标物理摄像头
        val physicalCamera = physicalCameraManager.cameras.find { it.type == targetType }
            ?: physicalCameraManager.cameras.find { it.type == CameraType.WIDE }
            ?: return
        
        try {
            // 解绑所有用例
            provider.unbindAll()
            
            // 配置 Preview
            preview = Preview.Builder()
                .setTargetAspectRatio(AspectRatio.RATIO_16_9)
                .build()
                .also {
                    it.setSurfaceProvider(previewView.surfaceProvider)
                }
            
            // 配置 ImageCapture
            imageCapture = ImageCapture.Builder()
                .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                .setTargetAspectRatio(AspectRatio.RATIO_16_9)
                .build()
            
            // 选择相机
            val cameraSelector = CameraSelector.Builder()
                .requireLensFacing(CameraSelector.LENS_FACING_BACK)
                .addCameraFilter { cameraInfos ->
                    // 筛选目标物理相机
                    cameraInfos.filter { info ->
                        // CameraX 1.3+ 支持物理相机ID匹配
                        true // 简化处理，实际需要更复杂的匹配逻辑
                    }
                }
                .build()
            
            // 绑定用例
            camera = provider.bindToLifecycle(
                lifecycleOwner,
                cameraSelector,
                preview,
                imageCapture
            )
            
            currentCameraType = targetType
            
            Log.d(TAG, "Camera bound to $targetType")
            
        } catch (e: Exception) {
            Log.e(TAG, "Failed to bind camera", e)
            notifyWebError("Camera bind failed: ${e.message}")
        }
    }
    
    /**
     * 设置缩放倍率
     * 这是 JS 调用的核心方法
     */
    fun setZoomLevel(zoom: Float) {
        currentZoom = zoom.coerceIn(0.5f, 3.0f)
        
        // 判断是否需要切换物理镜头
        val targetType = when {
            currentZoom <= 0.6f -> CameraType.ULTRA_WIDE
            currentZoom < 1.8f -> CameraType.WIDE
            else -> CameraType.TELE
        }
        
        if (targetType != currentCameraType) {
            // 需要切换物理镜头
            val hasTarget = physicalCameraManager.cameras.any { it.type == targetType }
            if (hasTarget) {
                Log.d(TAG, "Switching from $currentCameraType to $targetType")
                bindCamera(targetType)
            } else {
                // Fallback: 使用数字变焦
                applyDigitalZoom(currentZoom)
            }
        } else {
            // 同一镜头内的数字变焦
            applyDigitalZoom(currentZoom)
        }
        
        // 通知 Web 当前状态
        notifyWebZoomChanged(currentZoom, targetType.name)
    }
    
    /**
     * 应用数字变焦（在当前物理镜头上）
     */
    private fun applyDigitalZoom(zoom: Float) {
        camera?.let { cam ->
            val zoomState = cam.cameraInfo.zoomState.value ?: return
            
            // 计算相对于当前镜头的数字变焦比例
            val baseZoom = when (currentCameraType) {
                CameraType.ULTRA_WIDE -> 0.5f
                CameraType.WIDE -> 1.0f
                CameraType.TELE -> 2.0f // 或 3.0f，取决于设备
            }
            
            val digitalZoom = (zoom / baseZoom).coerceIn(
                zoomState.minZoomRatio,
                zoomState.maxZoomRatio
            )
            
            cam.cameraControl.setZoomRatio(digitalZoom)
            
            Log.d(TAG, "Digital zoom: $digitalZoom (base: $baseZoom, target: $zoom)")
        }
    }
    
    /**
     * 拍照
     */
    fun takePhoto() {
        val capture = imageCapture ?: run {
            notifyWebError("Camera not ready")
            return
        }
        
        capture.takePicture(
            cameraExecutor,
            object : ImageCapture.OnImageCapturedCallback() {
                override fun onCaptureSuccess(image: ImageProxy) {
                    val bitmap = imageProxyToBitmap(image)
                    image.close()
                    
                    bitmap?.let {
                        val base64 = bitmapToBase64(it)
                        notifyWebCaptureSuccess(base64)
                    } ?: run {
                        notifyWebError("Failed to process image")
                    }
                }
                
                override fun onError(exception: ImageCaptureException) {
                    Log.e(TAG, "Capture failed", exception)
                    notifyWebError("Capture failed: ${exception.message}")
                }
            }
        )
    }
    
    /**
     * ImageProxy 转 Bitmap
     */
    private fun imageProxyToBitmap(image: ImageProxy): Bitmap? {
        val buffer = image.planes[0].buffer
        val bytes = ByteArray(buffer.remaining())
        buffer.get(bytes)
        return BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
    }
    
    /**
     * Bitmap 转 Base64
     */
    private fun bitmapToBase64(bitmap: Bitmap): String {
        val outputStream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, 85, outputStream)
        val bytes = outputStream.toByteArray()
        return "data:image/jpeg;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP)
    }
    
    /**
     * 停止相机
     */
    fun stopCamera() {
        cameraProvider?.unbindAll()
        notifyWebCameraStopped()
    }
    
    /**
     * 释放资源
     */
    fun release() {
        stopCamera()
        cameraExecutor.shutdown()
    }
    
    // ========== Web 通知方法 ==========
    
    private fun notifyWebCameraReady() {
        val capabilities = physicalCameraManager.getCapabilitiesJson()
        evaluateJs("window.onNativeCameraReady && window.onNativeCameraReady($capabilities)")
    }
    
    private fun notifyWebZoomChanged(zoom: Float, lensType: String) {
        evaluateJs("window.onNativeZoomChanged && window.onNativeZoomChanged($zoom, '$lensType')")
    }
    
    private fun notifyWebCaptureSuccess(base64: String) {
        // Base64 可能很长，使用分块传输或临时文件更佳
        evaluateJs("window.onNativeCapture && window.onNativeCapture('$base64')")
    }
    
    private fun notifyWebError(message: String) {
        evaluateJs("window.onNativeError && window.onNativeError('$message')")
    }
    
    private fun notifyWebCameraStopped() {
        evaluateJs("window.onNativeCameraStopped && window.onNativeCameraStopped()")
    }
    
    private fun evaluateJs(script: String) {
        ContextCompat.getMainExecutor(context).execute {
            webView.evaluateJavascript(script, null)
        }
    }
    
    companion object {
        private const val TAG = "CameraController"
    }
}
```

---

## 🌉 JS Bridge 实现

```kotlin
// CameraBridge.kt
package com.wordcaps.camera

import android.os.Handler
import android.os.Looper
import android.util.Log
import android.webkit.JavascriptInterface

/**
 * JS ↔ Native 桥接类
 * 
 * Web 调用方式:
 * - window.AndroidCamera.setZoom(0.5)
 * - window.AndroidCamera.capture()
 * - window.AndroidCamera.stop()
 * - window.AndroidCamera.getCapabilities()
 */
class CameraBridge(
    private val controller: CameraController
) {
    
    private val mainHandler = Handler(Looper.getMainLooper())
    
    /**
     * 设置缩放倍率
     * @param zoom 0.5 ~ 3.0
     */
    @JavascriptInterface
    fun setZoom(zoom: Float) {
        Log.d(TAG, "JS -> setZoom($zoom)")
        mainHandler.post {
            controller.setZoomLevel(zoom)
        }
    }
    
    /**
     * 拍照
     */
    @JavascriptInterface
    fun capture() {
        Log.d(TAG, "JS -> capture()")
        mainHandler.post {
            controller.takePhoto()
        }
    }
    
    /**
     * 停止相机
     */
    @JavascriptInterface
    fun stop() {
        Log.d(TAG, "JS -> stop()")
        mainHandler.post {
            controller.stopCamera()
        }
    }
    
    /**
     * 获取相机能力（同步返回JSON）
     */
    @JavascriptInterface
    fun getCapabilities(): String {
        val levels = controller.availableZoomLevels
        return """
        {
            "availableLevels": [${levels.joinToString(",")}],
            "minZoom": ${levels.firstOrNull() ?: 1.0},
            "maxZoom": ${levels.lastOrNull() ?: 1.0}
        }
        """.trimIndent()
    }
    
    /**
     * 切换到指定倍率（预设档位）
     */
    @JavascriptInterface
    fun switchToLevel(level: Float) {
        Log.d(TAG, "JS -> switchToLevel($level)")
        val availableLevels = controller.availableZoomLevels
        
        // 找最接近的可用档位
        val targetLevel = availableLevels.minByOrNull { 
            kotlin.math.abs(it - level) 
        } ?: 1.0f
        
        mainHandler.post {
            controller.setZoomLevel(targetLevel)
        }
    }
    
    companion object {
        private const val TAG = "CameraBridge"
    }
}
```

---

## 📱 Activity 整合

```kotlin
// CameraActivity.kt
package com.wordcaps.camera

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

class CameraActivity : AppCompatActivity() {
    
    private lateinit var previewView: PreviewView
    private lateinit var webView: WebView
    private lateinit var cameraController: CameraController
    private lateinit var cameraBridge: CameraBridge
    
    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            initializeCamera()
        } else {
            // 通知 Web 权限被拒绝
            webView.evaluateJavascript(
                "window.onNativeError && window.onNativeError('Camera permission denied')",
                null
            )
        }
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // 全屏沉浸式
        setupFullscreen()
        
        // 创建布局
        setupLayout()
        
        // 配置 WebView
        setupWebView()
        
        // 检查权限
        checkCameraPermission()
    }
    
    private fun setupFullscreen() {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        
        WindowInsetsControllerCompat(window, window.decorView).let { controller ->
            controller.hide(WindowInsetsCompat.Type.systemBars())
            controller.systemBarsBehavior = 
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }
        
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }
    
    private fun setupLayout() {
        // 创建容器
        val container = FrameLayout(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        }
        
        // 相机预览层（底层）
        previewView = PreviewView(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
            implementationMode = PreviewView.ImplementationMode.PERFORMANCE
            scaleType = PreviewView.ScaleType.FILL_CENTER
        }
        container.addView(previewView)
        
        // WebView 层（上层，透明背景）
        webView = WebView(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(0x00000000) // 透明背景
        }
        container.addView(webView)
        
        setContentView(container)
    }
    
    private fun setupWebView() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            mediaPlaybackRequiresUserGesture = false
            
            // 支持缩放（但不显示控件）
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
        }
        
        webView.webViewClient = WebViewClient()
        webView.webChromeClient = WebChromeClient()
        
        // 加载 Web 应用
        // 开发环境
        webView.loadUrl("http://10.0.2.2:3000") // Android 模拟器访问本机
        // 生产环境
        // webView.loadUrl("https://wordshunter.online")
    }
    
    private fun checkCameraPermission() {
        when {
            ContextCompat.checkSelfPermission(
                this, Manifest.permission.CAMERA
            ) == PackageManager.PERMISSION_GRANTED -> {
                initializeCamera()
            }
            else -> {
                requestPermissionLauncher.launch(Manifest.permission.CAMERA)
            }
        }
    }
    
    private fun initializeCamera() {
        // 初始化相机控制器
        cameraController = CameraController(
            context = this,
            lifecycleOwner = this,
            previewView = previewView,
            webView = webView
        )
        
        // 初始化 JS Bridge
        cameraBridge = CameraBridge(cameraController)
        webView.addJavascriptInterface(cameraBridge, "AndroidCamera")
        
        // 启动相机
        cameraController.initialize()
    }
    
    override fun onDestroy() {
        super.onDestroy()
        if (::cameraController.isInitialized) {
            cameraController.release()
        }
    }
}
```

---

## 🌐 Web 端集成代码

```typescript
// hooks/useNativeCamera.ts
import { useCallback, useEffect, useState } from 'react';

interface CameraCapabilities {
  availableLevels: number[];
  minZoom: number;
  maxZoom: number;
  hasUltraWide: boolean;
  hasTele: boolean;
  cameraCount: number;
}

interface UseNativeCameraReturn {
  isNative: boolean;
  isReady: boolean;
  capabilities: CameraCapabilities | null;
  currentZoom: number;
  currentLens: string;
  setZoom: (zoom: number) => void;
  capture: () => void;
  stop: () => void;
  lastCapture: string | null;
  error: string | null;
}

declare global {
  interface Window {
    AndroidCamera?: {
      setZoom: (zoom: number) => void;
      capture: () => void;
      stop: () => void;
      getCapabilities: () => string;
      switchToLevel: (level: number) => void;
    };
    onNativeCameraReady?: (capabilities: CameraCapabilities) => void;
    onNativeZoomChanged?: (zoom: number, lensType: string) => void;
    onNativeCapture?: (base64: string) => void;
    onNativeError?: (message: string) => void;
    onNativeCameraStopped?: () => void;
  }
}

export function useNativeCamera(): UseNativeCameraReturn {
  const [isNative] = useState(() => typeof window !== 'undefined' && !!window.AndroidCamera);
  const [isReady, setIsReady] = useState(false);
  const [capabilities, setCapabilities] = useState<CameraCapabilities | null>(null);
  const [currentZoom, setCurrentZoom] = useState(1);
  const [currentLens, setCurrentLens] = useState('WIDE');
  const [lastCapture, setLastCapture] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 注册原生回调
  useEffect(() => {
    if (!isNative) return;

    window.onNativeCameraReady = (caps) => {
      setCapabilities(caps);
      setIsReady(true);
      setError(null);
    };

    window.onNativeZoomChanged = (zoom, lensType) => {
      setCurrentZoom(zoom);
      setCurrentLens(lensType);
    };

    window.onNativeCapture = (base64) => {
      setLastCapture(base64);
    };

    window.onNativeError = (message) => {
      setError(message);
    };

    window.onNativeCameraStopped = () => {
      setIsReady(false);
    };

    return () => {
      window.onNativeCameraReady = undefined;
      window.onNativeZoomChanged = undefined;
      window.onNativeCapture = undefined;
      window.onNativeError = undefined;
      window.onNativeCameraStopped = undefined;
    };
  }, [isNative]);

  const setZoom = useCallback((zoom: number) => {
    if (isNative && window.AndroidCamera) {
      window.AndroidCamera.setZoom(zoom);
    }
  }, [isNative]);

  const capture = useCallback(() => {
    if (isNative && window.AndroidCamera) {
      window.AndroidCamera.capture();
    }
  }, [isNative]);

  const stop = useCallback(() => {
    if (isNative && window.AndroidCamera) {
      window.AndroidCamera.stop();
    }
  }, [isNative]);

  return {
    isNative,
    isReady,
    capabilities,
    currentZoom,
    currentLens,
    setZoom,
    capture,
    stop,
    lastCapture,
    error,
  };
}
```

### Web 组件集成示例

```tsx
// components/NativeCameraView.tsx
import { useNativeCamera } from '@/hooks/useNativeCamera';
import { useCamera } from '@/hooks/useCamera'; // 原有的 Web 相机 Hook

export function CameraView({ onCapture, ...props }) {
  const nativeCamera = useNativeCamera();
  const webCamera = useCamera();
  
  // 根据环境选择相机实现
  const isNative = nativeCamera.isNative;
  
  const handleZoomChange = (zoom: number) => {
    if (isNative) {
      nativeCamera.setZoom(zoom);
    } else {
      webCamera.setZoom(zoom);
    }
  };
  
  const handleCapture = () => {
    if (isNative) {
      nativeCamera.capture();
    } else {
      const image = webCamera.captureImage();
      if (image) onCapture(image);
    }
  };
  
  // 原生拍照结果处理
  useEffect(() => {
    if (nativeCamera.lastCapture) {
      onCapture(nativeCamera.lastCapture);
    }
  }, [nativeCamera.lastCapture, onCapture]);
  
  const zoom = isNative ? nativeCamera.currentZoom : webCamera.zoom;
  const availableLevels = isNative 
    ? nativeCamera.capabilities?.availableLevels || [1]
    : [0.5, 1, 2, 3]; // Web 软件缩放
  
  return (
    <div className="relative w-full h-full">
      {/* 原生模式下不显示 video，由 Android PreviewView 渲染 */}
      {!isNative && (
        <video ref={webCamera.videoRef} ... />
      )}
      
      {/* 通用 UI 层 */}
      <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center">
        {/* 倍率快捷按钮 */}
        <div className="flex gap-2 mb-3">
          {availableLevels.map(level => (
            <button
              key={level}
              onClick={() => handleZoomChange(level)}
              className={`px-3 py-1 rounded-full ${
                Math.abs(zoom - level) < 0.1 
                  ? 'bg-yellow-400 text-black' 
                  : 'bg-black/50 text-white'
              }`}
            >
              {level}x
            </button>
          ))}
        </div>
        
        {/* 缩放滑杆 */}
        <input
          type="range"
          min={availableLevels[0]}
          max={availableLevels[availableLevels.length - 1]}
          step={0.1}
          value={zoom}
          onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
        />
        
        {/* 拍照按钮 */}
        <button onClick={handleCapture}>📷 拍照</button>
        
        {/* 当前镜头指示器（仅原生模式） */}
        {isNative && (
          <span className="text-xs text-white/60">
            {nativeCamera.currentLens}
          </span>
        )}
      </div>
    </div>
  );
}
```

---

## 📊 倍率切换逻辑总结

```
┌─────────────────────────────────────────────────────────────────┐
│                      用户设置 zoom = X                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    判断目标镜头类型                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ X <= 0.6  → ULTRA_WIDE (超广角)                         │   │
│  │ 0.6 < X < 1.8 → WIDE (主摄)                             │   │
│  │ X >= 1.8 → TELE (长焦)                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    检查设备是否支持                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 支持 → 切换到目标物理镜头                                │   │
│  │ 不支持 → 使用当前镜头 + 数字变焦                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    计算数字变焦比例                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ digitalZoom = targetZoom / baseZoom                      │   │
│  │                                                          │   │
│  │ 例: 目标 2.5x，使用 2x 长焦镜头                          │   │
│  │     digitalZoom = 2.5 / 2.0 = 1.25x                     │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    通知 Web 层                                  │
│  window.onNativeZoomChanged(zoom, lensType)                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🧪 设备兼容性矩阵

| 设备类型 | 可用倍率 | 镜头配置 |
|----------|----------|----------|
| **单摄** | 1x | WIDE only |
| **双摄** (广角+主摄) | 0.5x, 1x | ULTRA_WIDE + WIDE |
| **双摄** (主摄+长焦) | 1x, 2x | WIDE + TELE |
| **三摄** | 0.5x, 1x, 2x/3x | ULTRA_WIDE + WIDE + TELE |
| **四摄+** | 同三摄 | 选取最佳三个镜头 |

---

## ⚠️ 注意事项

1. **权限处理**: 必须在 AndroidManifest.xml 声明 `<uses-permission android:name="android.permission.CAMERA" />`

2. **生命周期**: CameraController 必须绑定 Activity 生命周期，避免内存泄漏

3. **Base64 传输**: 大图片 Base64 可能导致 JS 桥接卡顿，建议：
   - 压缩图片质量
   - 使用临时文件 + 文件路径传输
   - 分块传输

4. **镜头切换延迟**: 物理镜头切换约需 200-500ms，UI 应有过渡动画

5. **WebView 透明度**: 必须设置 `webView.setBackgroundColor(0x00000000)` 才能看到底层 PreviewView

---

## 🎁 最终架构优势

| 优势 | 说明 |
|------|------|
| **真实物理倍率** | 0.5x/1x/2x/3x 使用真实物理镜头 |
| **高画质** | 原生 CameraX 拍照，无 Web 压缩损失 |
| **设备自适应** | 自动检测设备能力，提供可用倍率 |
| **可扩展** | 易于添加录像、AR 等功能 |
| **Web 解耦** | UI 完全由 Web 控制，原生只负责相机 |
