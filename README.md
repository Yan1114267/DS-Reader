# 🐳 小肥鱼学伴 · Whale Tutor

上传 **PDF / PPTX / DOCX / TXT / MD**，让 AI 用「英文为主 + 中文翻译」为你讲课。

- 🟢 **学术术语自动标注**：术语在正文中显示为绿色下划线，鼠标悬停弹出中文译名与中英双语释义。
- 🧭 **点击跳回定义**：同一术语在后文再次出现时，左键点击即可平滑跳转到它首次定义的位置，并有高亮闪烁提示；右下角还能「回到刚才的位置」。
- 🌏 **中英对照**：英文讲解为主体，每一段英文下方紧跟中文翻译；标题、小节标题也是双语。
- 📚 **自动术语表**：课程末尾生成术语卡片，点击也能跳转到定义。
- 🔑 **自带 API Key**：兼容 OpenAI Chat Completions 协议，直接填 Base URL / 模型 / Key 即可使用。
- 🐳 **演示模式**：没有 API Key 也能打开一节示例课，体验全部标注与跳转效果。

---

## 快速开始

1. 双击 `index.html`（推荐用 Edge 或 Chrome 打开）。
2. 在左侧填写：
   - **接口地址 Base URL**
   - **模型名称**
   - **API Key**
3. 上传一份资料，等解析完成后点「开始上课」。
4. 想先看效果？点击欢迎页的「先看一节演示课」，无需 API Key。

### 常用服务商配置

| 服务商 | Base URL | 模型示例 | 备注 |
| --- | --- | --- | --- |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` | 中国大陆访问较方便 |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` | 需可访问 OpenAI |
| 本地 Ollama | `http://localhost:11434/v1` | `qwen2.5:14b` | 先 `ollama pull` 对应模型，Key 留空 |

只要服务商兼容 OpenAI 的 `/chat/completions` 接口，都可以填进来；也可以直接填完整的 `.../chat/completions` 地址。

---

## 功能细节

- 文件解析全部在浏览器本地完成：
  - PDF 使用 pdf.js
  - DOCX 使用 mammoth.js
  - PPTX 使用 JSZip 读取幻灯片 XML
- 文档会按约 **9000 字符** 切段，逐段请求模型生成结构化 JSON（标题、小节、英文段落、中文翻译、术语定义），再合并渲染。
- 术语识别与锚点由前端完成：AI 返回术语表后，程序在正文中自动查找所有出现位置，首个出现处作为定义锚点，其余位置生成可点击的跳转链接。
- 动画、悬停提示、术语表、回到原位置等都是纯前端实现，无需后端。

---

## 常见问题

**Q：双击打开后，调用接口报「网络请求失败 / CORS」？**
浏览器直连 API 时，服务商必须允许跨域（CORS）。如果服务商不支持，可更换服务商，或使用本地 Ollama。另外也可以在项目文件夹运行：

```bash
python -m http.server 8080
```

再打开 `http://localhost:8080`。注意：本地静态服务器不能绕过服务商自身的 CORS 限制。

**Q：扫描版 PDF 上传后没有内容？**
扫描版 PDF 只有图片、没有文字层，本项目暂不支持 OCR。请先用 OCR 工具生成文字版 PDF，或上传可复制文字的版本。

**Q：支持旧版 `.doc` / `.ppt` 吗？**
不支持，请先用 Office / WPS 另存为 `.docx` / `.pptx`。

**Q：文档太长，只讲了一部分？**
默认最多处理 8 段、约 7.2 万字符。可以打开 `app.js`，修改顶部的 `CONFIG.chunkSize` 和 `CONFIG.maxChunks`。

**Q：术语太多 / 太少 / 不准？**
术语由模型根据提示词挑选。可以修改 `app.js` 顶部的 `SYSTEM_PROMPT`，调整术语数量上限和筛选标准。

**Q：API Key 安全吗？**
- 默认不会保存密钥；只有勾选「在这台电脑上记住密钥」后，才会存进浏览器 `localStorage`。
- 所有请求由浏览器直接发送到你填写的服务商；本项目没有后端，也不会把文件或密钥发往别处。
- 文件内容会作为提示词发送给你选择的 AI 服务商，请注意资料本身的保密要求。

**Q：需要联网吗？**
只有调用 AI 时需要联网。PDF / DOCX / PPTX 解析库已经随项目附带在 `vendor/` 目录，演示模式和文件解析都可以离线使用。

---

## 项目结构

```
whale-tutor/
├── index.html   # 页面结构
├── styles.css   # 界面样式
├── app.js       # 文件解析、API 调用、术语标注与跳转
├── vendor/      # 随项目附带的解析库
│   ├── pdf.min.js
│   ├── pdf.worker.min.js
│   ├── mammoth.browser.min.js
│   └── jszip.min.js
└── README.md
```

解析库许可：pdf.js（Apache-2.0）、mammoth.js（BSD-2-Clause）、JSZip（MIT / GPLv3 双许可）。

## 可自定义的地方（app.js 顶部）

```js
const CONFIG = {
  chunkSize: 9000,   // 每次送给模型的材料字符数
  maxChunks: 8,      // 单次备课最多生成几段
  maxTokens: 4096,   // 每段回答的最大 token 数
  temperature: 0.4
};
```

---

🐳 小肥鱼学伴 · 你的双语私塾
