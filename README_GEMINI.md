# Gemini API 配置说明

## 环境变量设置

本项目支持使用 Google Gemini API 进行图像识别。需要在环境变量中配置 API Key。

### 本地开发

1. 复制 `.env.local.example` 为 `.env.local`
2. 将 `GEMINI_API_KEY` 替换为你的实际 API Key：

```bash
GEMINI_API_KEY=AIzaSyBN7Gr-iAzRp1dCjGvnmTIEhnwlhHRWZcw
```

### Vercel 部署

在 Vercel 项目设置中添加环境变量：

1. 进入项目 Settings → Environment Variables
2. 添加变量：
   - Name: `GEMINI_API_KEY`
   - Value: `AIzaSyBN7Gr-iAzRp1dCjGvnmTIEhnwlhHRWZcw`
3. 选择环境：Production, Preview, Development
4. 保存后重新部署

## API 切换

在 `src/app/api/recognize/route.ts` 中修改 `API_PROVIDER`：

- `const API_PROVIDER = 0;` - 使用豆包 API
- `const API_PROVIDER = 1;` - 使用 Gemini API

## 注意事项

- `.env.local` 文件已在 `.gitignore` 中，不会被提交到 Git
- 请勿在代码中硬编码 API Key
- Gemini API 在中国大陆无法直接访问，需要在海外服务器使用
