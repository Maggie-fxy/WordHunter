import { NextRequest, NextResponse } from 'next/server';

// OpenRouter API 配置
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

interface RemoveBgGeminiRequest {
  imageBase64: string;
  targetWord?: string;
  targetWordCn?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RemoveBgGeminiRequest = await request.json();
    const { imageBase64, targetWord, targetWordCn } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { error: '缺少图片数据' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      console.log('⚠️ 未配置 OPENROUTER_API_KEY，返回原图');
      return NextResponse.json({
        success: true,
        imageUrl: imageBase64,
        isSimulated: true,
      });
    }

    console.log('✂️ 正在定制您的专属贴纸...');

    // 移除 base64 前缀，获取纯数据和类型
    const base64Match = imageBase64.match(/^data:image\/(\w+);base64,(.+)$/);
    let mimeType = 'image/jpeg';
    let base64Data = imageBase64;
    
    if (base64Match) {
      mimeType = `image/${base64Match[1]}`;
      base64Data = base64Match[2];
    } else {
      base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    }

    // 设置60秒超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://wordcaps.app',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-image',
          modalities: ['image', 'text'],
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Remove background, keep only the ${targetWord ?? 'object'}${targetWordCn ? ` (${targetWordCn})` : ''}, add white outline, output as sticker PNG.`,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${base64Data}`,
                  },
                },
              ],
            },
          ],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ OpenRouter API 错误:', response.status, errorText);
        // 失败时返回原图
        return NextResponse.json({
          success: true,
          imageUrl: imageBase64,
          isSimulated: true,
          error: `API调用失败: ${response.status}`,
        });
      }

      const result = await response.json();
      
      // 检查响应中的 images 字段（OpenRouter 图像生成的标准格式）
      const message = result.choices?.[0]?.message;
      const images = message?.images;
      
      if (images && images.length > 0) {
        const imageUrl = images[0]?.image_url?.url;
        if (imageUrl) {
          console.log('✅ 贴纸已生成！');
          return NextResponse.json({
            success: true,
            imageUrl: imageUrl,
            isSimulated: false,
          });
        }
      }
      
      // 备用：检查 content 中是否有 base64 图片
      const content = message?.content;
      if (content && typeof content === 'string') {
        const base64ImageMatch = content.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
        if (base64ImageMatch) {
          console.log('✅ 贴纸已生成（从content提取）！');
          return NextResponse.json({
            success: true,
            imageUrl: base64ImageMatch[0],
            isSimulated: false,
          });
        }
      }

      // 如果没有找到图片，返回原图
      console.log('⚠️ Gemini 未返回有效图片，使用原图');
      console.log('📦 响应结构:', JSON.stringify(result, null, 2).substring(0, 300));
      return NextResponse.json({
        success: true,
        imageUrl: imageBase64,
        isSimulated: true,
      });

    } catch (fetchError: unknown) {
      clearTimeout(timeoutId);
      const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
      
      if (errorMessage.includes('aborted') || errorMessage.includes('timeout')) {
        console.error('❌ Gemini 抠图超时');
      } else {
        console.error('❌ Gemini 抠图请求失败:', errorMessage);
      }
      
      // 失败时返回原图
      return NextResponse.json({
        success: true,
        imageUrl: imageBase64,
        isSimulated: true,
      });
    }

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
