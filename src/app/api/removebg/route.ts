import { NextRequest, NextResponse } from 'next/server';

// Remove.bg API 配置
const REMOVEBG_API_URL = 'https://api.remove.bg/v1.0/removebg';
const REMOVEBG_API_KEY = 'av8ogY5sXZR7JyjkJszbqpyA';

interface RemoveBgRequest {
  imageBase64: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RemoveBgRequest = await request.json();
    const { imageBase64 } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { error: '缺少图片数据' },
        { status: 400 }
      );
    }

    console.log('✂️ Remove.bg 智能抠图中...');

    // 移除 base64 前缀，获取纯数据
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    
    // 将 base64 转换为 Buffer
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // 创建 FormData
    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
    formData.append('image_file', blob, 'image.jpg');
    formData.append('size', 'preview'); // 使用免费的 preview 尺寸
    formData.append('format', 'png');

    // 调用 Remove.bg API
    const response = await fetch(REMOVEBG_API_URL, {
      method: 'POST',
      headers: {
        'X-Api-Key': REMOVEBG_API_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Remove.bg API 错误:', response.status, errorText);
      
      if (response.status === 402) {
        return NextResponse.json(
          { error: '抠图配额已用完', code: 'QUOTA_EXCEEDED' },
          { status: 402 }
        );
      }
      if (response.status === 429) {
        return NextResponse.json(
          { error: '请求过于频繁，请稍后再试', code: 'RATE_LIMITED' },
          { status: 429 }
        );
      }
      
      throw new Error(`API 调用失败: ${response.status}`);
    }

    // 获取剩余配额
    const remainingCredits = response.headers.get('X-Ratelimit-Remaining');
    
    // 获取处理后的图片
    const resultBuffer = await response.arrayBuffer();
    const resultBase64 = Buffer.from(resultBuffer).toString('base64');
    const resultDataUrl = `data:image/png;base64,${resultBase64}`;

    return NextResponse.json({
      success: true,
      imageUrl: resultDataUrl,
      remainingCredits: remainingCredits ? parseInt(remainingCredits) : null,
    });

  } catch (error) {
    console.error('抠图错误:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '抠图失败',
        success: false,
      },
      { status: 500 }
    );
  }
}
