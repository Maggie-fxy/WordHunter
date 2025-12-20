# Remove.bg 抠图API接入文档

## API密钥

```
API Key: av8ogY5sXZR7JyjkJszbqpyA
```

## 接入方法

### 1. 基本信息

- **API端点**: `https://api.remove.bg/v1.0/removebg`
- **请求方法**: POST
- **认证方式**: HTTP Header `X-Api-Key`

### 2. 请求示例

#### Python

```python
import requests

# API配置
api_key = "av8ogY5sXZR7JyjkJszbqpyA"
url = "https://api.remove.bg/v1.0/removebg"

# 发送请求
with open('图片路径.jpg', 'rb') as image_file:
    response = requests.post(
        url,
        files={'image_file': image_file},
        data={
            'size': 'auto',      # 尺寸: preview(免费50次/月), auto, full, hd
            'format': 'png',     # 格式: png, jpg
        },
        headers={'X-Api-Key': api_key}
    )

# 保存结果
if response.status_code == 200:
    with open('output.png', 'wb') as out:
        out.write(response.content)
```

#### JavaScript/Node.js

```javascript
const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

const apiKey = 'av8ogY5sXZR7JyjkJszbqpyA';
const url = 'https://api.remove.bg/v1.0/removebg';

const formData = new FormData();
formData.append('image_file', fs.createReadStream('图片路径.jpg'));
formData.append('size', 'auto');

axios.post(url, formData, {
    headers: {
        ...formData.getHeaders(),
        'X-Api-Key': apiKey
    },
    responseType: 'arraybuffer'
}).then(response => {
    fs.writeFileSync('output.png', response.data);
});
```

#### cURL

```bash
curl -X POST https://api.remove.bg/v1.0/removebg \
  -H "X-Api-Key: av8ogY5sXZR7JyjkJszbqpyA" \
  -F "image_file=@图片路径.jpg" \
  -F "size=auto" \
  -o output.png
```

### 3. 关键参数

| 参数 | 说明 | 可选值 |
|------|------|--------|
| `image_file` | 图片文件（二进制） | JPG, PNG等 |
| `size` | 输出尺寸 | `preview`(免费), `auto`, `full`, `hd` |
| `format` | 输出格式 | `png`, `jpg` |
| `type` | 识别类型（可选） | `auto`, `person`, `product`, `car` |

### 4. 响应处理

**成功（HTTP 200）**:
- 响应体为PNG图片二进制数据
- 直接保存即可

**失败**:
- `HTTP 429`: 速率限制（500张/分钟）
- `HTTP 402`: 积分不足
- `HTTP 400`: 参数错误

### 5. 配额信息

- **免费额度**: 50次/月（仅限 `size: 'preview'`，最大0.25兆像素）
- **速率限制**: 500张/分钟
- **当前剩余**: 44次

### 6. 注意事项

1. 免费额度仅限预览质量（625x400像素左右）
2. 高清质量需购买积分
3. 处理时间约4-5秒
4. 建议添加错误处理和超时设置
5. 可通过响应头查看剩余配额：`X-Ratelimit-Remaining`

## 完整示例代码

参考项目中的 `test_api.py` 文件，包含完整的错误处理和配额检查。
