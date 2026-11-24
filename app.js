/* =========================================================
   小肥鱼学伴 · Whale Tutor — app.js
   纯前端应用：文件只在浏览器本地解析，API Key 只存在浏览器里
   ========================================================= */
(() => {
  'use strict';

  /* ---------------- 可调参数 ---------------- */

  const CONFIG = {
    chunkSize: 9000,           // 每次送给模型的材料字符数
    maxChunks: 8,              // 单次备课最多生成几段
    maxTokens: 4096,           // 每段回答的最大 token 数
    temperature: 0.4,
    requestTimeoutMs: 180000,
    chatMaxTokens: 2048,       // 答疑回答的最大 token 数
    chatTimeoutMs: 180000
  };

  const PRESETS = {
    deepseek: { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
    openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
    ollama: { baseUrl: 'http://localhost:11434/v1', model: 'qwen2.5:14b' }
  };

  const STORE_KEY = 'whale-tutor-settings-v1';
  const CHAT_LANG_KEY = 'whale-tutor-chat-lang-v1';
  const FORMAT_KEY = 'whale-tutor-format-v1';
  const PDF_WORKER_URL = 'vendor/pdf.worker.min.js';

  const FORMAT_PRESETS = [
    { label: '分点讲解', text: '用清晰的小标题和项目符号分点讲解，每个概念配一个简单例子。' },
    { label: '表格对比', text: '遇到容易混淆的概念时，用 Markdown 表格对比相同点和不同点，并在表格后用几句话总结。' },
    { label: '考试重点', text: '标出本课重点和易错点，并在最后给出 3 道自测题（含答案）。' },
    { label: '逐句双语', text: '把讲解拆成较短的段落，让英文和中文尽量逐句对应，方便对照阅读。' },
    { label: '先总后分', text: '先用 3 句话总结全篇，再分节展开；最后用一张要点清单收尾。' }
  ];

  const SYSTEM_PROMPT = `你是一位温柔、耐心又严谨的双语讲师，负责根据学生上传的课件、论文或讲义片段，写出一节循序渐进的微型课程。

【输出格式】必须输出一个 JSON 对象，不要输出 JSON 以外的任何文字，不要使用 markdown 代码块。结构如下：
{
  "title": {"en": "课程标题（英文）", "zh": "课程标题（中文）"},
  "sections": [
    {
      "heading": {"en": "小节标题（英文）", "zh": "小节标题（中文）"},
      "paragraphs": [
        {"en": "英文讲解段落", "zh": "对应的中文翻译"}
      ]
    }
  ],
  "terms": [
    {"term": "Entropy", "zh": "熵", "definition_en": "A measure of the number of microscopic configurations of a system.", "definition_zh": "衡量系统微观状态数目的物理量。"}
  ]
}

【写作要求】
1. 英文是主体：像老师面对面讲课一样，解释材料中的核心概念、逻辑与例子；由浅入深，英文自然流畅，适合大学生阅读。每个英文段落 60–140 词，每个英文段落后面都必须有准确、通顺的中文翻译。
2. 每次生成的部分，英文教学总量控制在 400–700 词，选取最重要的内容，不要逐字照抄原文。
3. 如果材料包含公式、数据或实验步骤，用文字解释它们的含义；不要编造材料中没有的事实。
4. terms 只收录材料中真实出现的学术专有名词或首次定义的新概念，最多 12 个。term 必须是英文材料中按原样出现的形式（大小写一致，不要改写成复数或别的拼写），不要收录 the、data 这类普通词。
5. zh 是该术语在材料语境下最标准的中文译名；definition_zh 是一句面向学生的中文解释；definition_en 是一句简洁的英文定义。
6. 不要在 JSON 之外输出任何文字、道歉或说明。
7. 讲解段落内部可以使用轻量 Markdown 排版：**加粗**、*斜体*、反引号包裹的行内代码、- 项目符号、1. 编号列表、Markdown 表格（表头下一行用 | --- |）。前端会渲染这些格式；表格请放在 "en" 字段中，并在 "zh" 字段给出中文表格或对应翻译。
8. 材料可能被分成多段发送，每次只是整篇的一部分。结尾性的总结、练习题只在最后一部分出现；每段不要重复课程标题或上一段的内容。`;

  /* ---------------- 演示课程 ---------------- */

  const DEMO_LESSON = {
    title: {
      en: 'Photosynthesis: Turning Sunlight into Life',
      zh: '光合作用：把阳光变成生命'
    },
    sections: [
      {
        heading: { en: 'The Big Picture', zh: '先看整体图景' },
        paragraphs: [
          {
            en: 'Every bite of food and every breath you take can be traced back to photosynthesis. In this lesson, we will follow energy from a sunbeam into a sugar molecule, and meet the structures that make this transformation possible. Think of photosynthesis as a tiny solar factory: light comes in, carbon dioxide and water are the raw materials, and sugar plus oxygen come out.',
            zh: '你吃下的每一口食物、吸进的每一口空气，都可以追溯到光合作用。这节课里，我们会跟随能量从一束阳光走进一个糖分子，并认识让这种转变成为可能的结构。可以把光合作用想象成一座微型太阳能工厂：光能输入，二氧化碳和水是原料，糖和氧气是产物。'
          },
          {
            en: 'The factory sits inside the chloroplast, a green organelle found in plant cells. A chloroplast is packed with stacks of flattened sacs, and each thylakoid in those stacks is studded with the pigment chlorophyll. Chlorophyll is the molecule that actually absorbs light. Leaves look green because chlorophyll reflects green wavelengths and captures red and blue light for photosynthesis.',
            zh: '这座工厂位于叶绿体（chloroplast）之中——叶绿体是植物细胞里的一种绿色细胞器。叶绿体里堆叠着许多扁平的囊状结构，每一个类囊体（thylakoid）上都镶嵌着色素叶绿素（chlorophyll）。叶绿素才是真正吸收光的分子。叶子之所以呈绿色，是因为叶绿素反射绿光，而用红光和蓝光进行光合作用。'
          }
        ]
      },
      {
        heading: { en: 'Two Connected Stages', zh: '两个相连的阶段' },
        paragraphs: [
          {
            en: 'Photosynthesis happens in two connected stages. The first stage, the light-dependent reactions, takes place in the thylakoid membranes. There, chlorophyll absorbs light and uses the energy to split water, releasing oxygen and producing energy-carrier molecules. The second stage, the Calvin cycle, occurs in the stroma, the fluid surrounding the thylakoids. The Calvin cycle uses those energy carriers to fix carbon dioxide into sugar.',
            zh: '光合作用分为两个彼此相连的阶段。第一阶段是光反应（light-dependent reactions），发生在类囊体膜上：叶绿素吸收光能，并利用这些能量分解水，释放氧气，同时产生携带能量的分子。第二阶段是卡尔文循环（Calvin cycle），发生在类囊体周围的基质（stroma）中；卡尔文循环利用这些能量载体，把二氧化碳固定成糖。'
          },
          {
            en: 'Neither stage can make sugar alone: the light-dependent reactions supply the power, while the Calvin cycle builds the product. This division of labour is efficient. It allows the plant to separate the dangerous business of splitting water from the delicate work of assembling carbon chains, and it lets each stage be tuned independently when light or temperature changes.',
            zh: '任何一个阶段都无法单独制造糖：光反应负责供能，卡尔文循环负责搭建产物。这种分工十分高效。它让植物能把分解水这种“危险工作”与组装碳链这种“精细工作”分开，也让每个阶段都能在光照或温度变化时被独立调节。'
          }
        ]
      },
      {
        heading: { en: 'Why This Matters', zh: '为什么它重要' },
        paragraphs: [
          {
            en: 'The sugar made by the Calvin cycle becomes food for the plant and, indirectly, for almost every animal on Earth. The oxygen released during the light-dependent reactions fills the atmosphere and powers aerobic respiration. In other words, photosynthesis links sunlight to the entire food web. When you study a chloroplast, remember that every thylakoid and every chlorophyll molecule exists to make that link possible.',
            zh: '卡尔文循环制造出的糖，成为植物自己的食物，也间接成为地球上几乎所有动物的食物。光反应释放的氧气充满大气，并驱动有氧呼吸。换句话说，光合作用把阳光与整个食物网连接起来。当你研究叶绿体时，请记住：每一个类囊体、每一个叶绿素分子，都是为了让这种连接成为可能而存在的。'
          }
        ]
      }
    ],
    terms: [
      {
        term: 'Photosynthesis',
        zh: '光合作用',
        definition_en: 'The process by which plants, algae and some bacteria use light energy to convert carbon dioxide and water into sugar and oxygen.',
        definition_zh: '植物、藻类和部分细菌利用光能，把二氧化碳和水转化为糖和氧气的过程。'
      },
      {
        term: 'Chloroplast',
        zh: '叶绿体',
        definition_en: 'The green organelle in plant cells where photosynthesis takes place.',
        definition_zh: '植物细胞中进行光合作用的绿色细胞器。'
      },
      {
        term: 'Chlorophyll',
        zh: '叶绿素',
        definition_en: 'The light-absorbing pigment that gives leaves their green colour.',
        definition_zh: '吸收光能、让叶子呈现绿色的色素。'
      },
      {
        term: 'Thylakoid',
        zh: '类囊体',
        definition_en: 'A flattened sac inside a chloroplast where the light-dependent reactions occur.',
        definition_zh: '叶绿体内部扁平的囊状结构，光反应就在这里进行。'
      },
      {
        term: 'Light-dependent reactions',
        zh: '光反应',
        definition_en: 'The first stage of photosynthesis, in which light energy splits water and produces oxygen and energy carriers.',
        definition_zh: '光合作用的第一阶段：利用光能分解水，释放氧气并产生能量载体。'
      },
      {
        term: 'Calvin cycle',
        zh: '卡尔文循环',
        definition_en: 'The stage of photosynthesis that uses energy carriers to fix carbon dioxide into sugar.',
        definition_zh: '光合作用的第二阶段：利用能量载体把二氧化碳固定成糖。'
      },
      {
        term: 'Stroma',
        zh: '基质',
        definition_en: 'The fluid inside a chloroplast that surrounds the thylakoids.',
        definition_zh: '叶绿体内部包围类囊体的液体基质。'
      }
    ]
  };

  /* ---------------- DOM ---------------- */

  const $ = (id) => document.getElementById(id);

  const els = {
    baseUrl: $('baseUrl'),
    model: $('model'),
    apiKey: $('apiKey'),
    rememberKey: $('rememberKey'),
    dropZone: $('dropZone'),
    fileInput: $('fileInput'),
    fileInfo: $('fileInfo'),
    fileBadge: $('fileBadge'),
    fileName: $('fileName'),
    fileMeta: $('fileMeta'),
    startBtn: $('startBtn'),
    status: $('status'),
    statusSpinner: $('statusSpinner'),
    statusText: $('statusText'),
    reader: $('reader'),
    welcome: $('welcome'),
    lesson: $('lesson'),
    demoBtn: $('demoBtn'),
    formatPrompt: $('formatPrompt'),
    formatPresets: $('formatPresets'),
    clearFormat: $('clearFormat'),
    formatCount: $('formatCount'),
    tooltip: $('tooltip'),
    backBtn: $('backBtn'),
    toast: $('toast'),
    chatToggle: $('chatToggle'),
    chatPanel: $('chatPanel'),
    chatClose: $('chatClose'),
    chatMessages: $('chatMessages'),
    chatEmpty: $('chatEmpty'),
    chatSuggestions: $('chatSuggestions'),
    chatForm: $('chatForm'),
    chatInput: $('chatInput'),
    chatSend: $('chatSend')
  };

  /* ---------------- 状态 ---------------- */

  const state = {
    file: null,
    text: '',
    sourceLabel: '',
    lesson: null,
    lessonRequirements: '',
    busy: false,
    registry: new Map(),
    lastScroll: null,
    backTimer: 0,
    chatHistory: [],
    chatLang: 'zh',
    chatStreaming: false,
    chatAbort: null,
    chatRunId: 0
  };

  let activeTermEl = null;
  let toastTimer = 0;
  let pdfWorkerPromise = null;

  /* ---------------- 初始化 ---------------- */

  function init() {
    loadSettings();
    loadChatLanguage();
    bindEvents();
    resetChat();
    setStatus('先填好 API 设置，再上传一份资料吧～', false);
    if (location.hash === '#demo') loadDemo();
  }

  function bindEvents() {
    [els.baseUrl, els.model, els.apiKey].forEach((input) => {
      input.addEventListener('input', persistSettings);
    });
    els.rememberKey.addEventListener('change', persistSettings);

    document.querySelectorAll('[data-preset]').forEach((button) => {
      button.addEventListener('click', () => {
        const preset = PRESETS[button.dataset.preset];
        if (!preset) return;
        els.baseUrl.value = preset.baseUrl;
        els.model.value = preset.model;
        persistSettings();
        toast('已填入 ' + button.textContent.trim() + ' 预设，补上 API Key 就能用了～');
      });
    });

    els.dropZone.addEventListener('click', () => els.fileInput.click());
    els.dropZone.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        els.fileInput.click();
      }
    });
    els.fileInput.addEventListener('change', () => {
      const file = els.fileInput.files && els.fileInput.files[0];
      if (file) handleFile(file);
    });

    ['dragenter', 'dragover'].forEach((type) => {
      els.dropZone.addEventListener(type, (event) => {
        event.preventDefault();
        if (!state.busy) els.dropZone.classList.add('dragover');
      });
    });
    ['dragleave', 'drop'].forEach((type) => {
      els.dropZone.addEventListener(type, (event) => {
        event.preventDefault();
        els.dropZone.classList.remove('dragover');
      });
    });
    els.dropZone.addEventListener('drop', (event) => {
      const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
      if (file) handleFile(file);
    });
    window.addEventListener('dragover', (event) => event.preventDefault());
    window.addEventListener('drop', (event) => event.preventDefault());

    els.startBtn.addEventListener('click', startLesson);
    els.demoBtn.addEventListener('click', loadDemo);
    els.backBtn.addEventListener('click', () => {
      els.backBtn.hidden = true;
      if (typeof state.lastScroll === 'number') scrollToY(state.lastScroll);
    });

    bindTooltip();
    bindChat();
    bindFormatComposer();
  }

  /* ---------------- 设置持久化 ---------------- */

  function loadSettings() {
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {};
    } catch (err) {
      saved = {};
    }
    els.baseUrl.value = saved.baseUrl || PRESETS.deepseek.baseUrl;
    els.model.value = saved.model || PRESETS.deepseek.model;
    els.rememberKey.checked = Boolean(saved.remember);
    els.apiKey.value = saved.remember ? (saved.apiKey || '') : '';
  }

  function persistSettings() {
    const remember = els.rememberKey.checked;
    const data = {
      baseUrl: els.baseUrl.value.trim(),
      model: els.model.value.trim(),
      remember
    };
    if (remember) data.apiKey = els.apiKey.value.trim();
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(data));
    } catch (err) {
      /* 隐私模式下写不进去就算了 */
    }
  }

  function readSettings() {
    return {
      baseUrl: els.baseUrl.value.trim(),
      model: els.model.value.trim(),
      apiKey: els.apiKey.value.trim()
    };
  }

  function validateSettings(settings) {
    if (!settings.baseUrl) {
      els.baseUrl.focus();
      return '请填写 API 接口地址。';
    }
    if (!/^https?:\/\//i.test(settings.baseUrl)) {
      els.baseUrl.focus();
      return '接口地址要以 http:// 或 https:// 开头。';
    }
    if (!settings.model) {
      els.model.focus();
      return '请填写模型名称。';
    }
    const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?/i.test(settings.baseUrl);
    if (!settings.apiKey && !isLocal) {
      els.apiKey.focus();
      return '请填写 API Key（本地模型可以留空）。';
    }
    return '';
  }

  /* ---------------- 课程格式要求 ---------------- */

  function bindFormatComposer() {
    FORMAT_PRESETS.forEach((preset) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'format-chip';
      button.textContent = preset.label;
      button.title = preset.text;
      button.dataset.formatText = preset.text;
      button.addEventListener('click', () => appendFormatPreset(preset));
      els.formatPresets.appendChild(button);
    });

    els.formatPrompt.addEventListener('input', () => {
      persistFormatPrompt();
      updateFormatUI();
      autoGrowFormatPrompt();
    });

    els.clearFormat.addEventListener('click', () => {
      els.formatPrompt.value = '';
      persistFormatPrompt();
      updateFormatUI();
      autoGrowFormatPrompt();
      els.formatPrompt.focus();
    });

    loadFormatPrompt();
  }

  function loadFormatPrompt() {
    let saved = '';
    try {
      saved = localStorage.getItem(FORMAT_KEY) || '';
    } catch (err) {
      saved = '';
    }
    els.formatPrompt.value = String(saved).slice(0, 1200);
    updateFormatUI();
    autoGrowFormatPrompt();
  }

  function persistFormatPrompt() {
    try {
      localStorage.setItem(FORMAT_KEY, els.formatPrompt.value);
    } catch (err) {
      /* 隐私模式下写不进去就算了 */
    }
  }

  function updateFormatUI() {
    const value = els.formatPrompt.value;
    els.formatCount.textContent = value.length + ' / 1200';
    els.clearFormat.disabled = !value.trim();
    els.formatPresets.querySelectorAll('.format-chip').forEach((button) => {
      button.classList.toggle('active', value.indexOf(button.dataset.formatText) !== -1);
    });
  }

  function autoGrowFormatPrompt() {
    const input = els.formatPrompt;
    input.style.height = 'auto';
    input.style.height = Math.min(Math.max(input.scrollHeight, 60), 120) + 'px';
  }

  function appendFormatPreset(preset) {
    const current = els.formatPrompt.value.trim();
    if (current.indexOf(preset.text) !== -1) {
      toast('这个要求已经加进去啦～');
      return;
    }
    const next = current ? current.replace(/\s+$/, '') + '\n' + preset.text : preset.text;
    if (next.length > 1200) {
      toast('课程要求最多 1200 字哦。', 4200);
      return;
    }
    els.formatPrompt.value = next;
    persistFormatPrompt();
    updateFormatUI();
    autoGrowFormatPrompt();
    els.formatPrompt.focus();
  }

  function readFormatPrompt() {
    return els.formatPrompt.value.trim();
  }

  /* ---------------- 通用小工具 ---------------- */

  function setStatus(text, busy, isError) {
    els.statusText.textContent = text;
    els.statusSpinner.hidden = !busy;
    els.status.classList.toggle('error', Boolean(isError));
    els.status.classList.toggle('busy', Boolean(busy));
  }

  function toast(message, duration) {
    els.toast.textContent = message;
    els.toast.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      els.toast.hidden = true;
    }, duration || 3600);
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes)) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function humanError(err) {
    if (err instanceof TypeError) {
      return '网络请求失败：可能是接口地址填写有误，或该服务不允许浏览器直接连接（CORS）。可以更换服务商，或改用本地 Ollama 试试。';
    }
    return (err && err.message) || '出现了未知错误，请重试。';
  }

  /* ---------------- 文件处理 ---------------- */

  async function handleFile(file) {
    if (state.busy) {
      toast('请等当前备课完成哦～');
      return;
    }
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const supported = ['pdf', 'pptx', 'docx', 'txt', 'md', 'markdown'];
    if (!supported.includes(ext)) {
      toast('暂不支持 .' + ext + ' 文件，请上传 PDF / PPTX / DOCX / TXT / MD。', 5200);
      return;
    }

    state.file = file;
    state.text = '';
    state.sourceLabel = file.name;
    els.startBtn.disabled = true;
    showFileCard(file, '正在解析…');

    try {
      setStatus('正在解析 ' + ext.toUpperCase() + '…', true);
      const raw = await extractText(file, ext);
      const cleaned = cleanText(raw);
      if (!cleaned || cleaned.length < 20) {
        throw new Error('没有提取到可阅读的文字。如果是扫描版 PDF，需要先做 OCR 哦。');
      }
      state.text = cleaned;

      const allChunks = chunkText(cleaned, CONFIG.chunkSize);
      const chunkCount = Math.min(allChunks.length, CONFIG.maxChunks);
      let meta = formatBytes(file.size) + ' · 约 ' + cleaned.length.toLocaleString() + ' 字符 · ' + chunkCount + ' 段备课';
      if (allChunks.length > CONFIG.maxChunks) {
        meta += '（文档较长，本次只讲解前 ' + CONFIG.maxChunks + ' 段）';
      }
      showFileCard(file, meta);
      els.startBtn.disabled = false;
      setStatus('资料已就绪：可填写课程要求，或直接开始上课 🐳', false);
    } catch (err) {
      console.error(err);
      state.file = null;
      state.text = '';
      showFileCard(file, '解析失败');
      setStatus(err.message || '解析失败，请换一个文件试试。', false, true);
      toast('文件解析失败：' + (err.message || '未知错误'), 6000);
    } finally {
      els.fileInput.value = '';
    }
  }

  function showFileCard(file, meta) {
    const ext = (file.name.split('.').pop() || '').toUpperCase();
    els.fileBadge.textContent = ext;
    els.fileName.textContent = file.name;
    els.fileMeta.textContent = meta;
    els.fileInfo.hidden = false;
  }

  function cleanText(text) {
    return String(text || '')
      .replace(/\u0000/g, ' ')
      .replace(/\r\n?/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
  }

  async function extractText(file, ext) {
    switch (ext) {
      case 'pdf':
        return extractPdf(file);
      case 'pptx':
        return extractPptx(file);
      case 'docx':
        return extractDocx(file);
      case 'txt':
      case 'md':
      case 'markdown':
        return file.text();
      default:
        throw new Error('不支持的文件类型。');
    }
  }

  /* ---------------- PDF ---------------- */

  function ensurePdfWorker() {
    if (!pdfWorkerPromise) {
      pdfWorkerPromise = (async () => {
        if (!window.pdfjsLib) return;
        try {
          // file:// 下不能直接跨域加载 Worker，先取回脚本再转成 blob URL
          const response = await fetch(PDF_WORKER_URL);
          if (!response.ok) throw new Error('worker fetch failed');
          const code = await response.text();
          pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(
            new Blob([code], { type: 'text/javascript' })
          );
        } catch (err) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
        }
      })();
    }
    return pdfWorkerPromise;
  }

  async function extractPdf(file) {
    await ensurePdfWorker();
    if (!window.pdfjsLib) {
      throw new Error('PDF 解析库没有加载成功，请检查网络后刷新页面。');
    }
    const data = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    const pages = [];

    for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
      setStatus('正在读取 PDF 第 ' + pageNo + '/' + pdf.numPages + ' 页…', true);
      const page = await pdf.getPage(pageNo);
      const content = await page.getTextContent();
      let text = '';
      for (const item of content.items) {
        if (typeof item.str !== 'string') continue;
        text += item.str;
        text += item.hasEOL ? '\n' : ' ';
      }
      pages.push(text.trim());
      if (pageNo % 10 === 0) {
        await new Promise((resolve) => window.setTimeout(resolve, 0));
      }
    }
    return pages.join('\n\n');
  }

  /* ---------------- PPTX ---------------- */

  function slideIndex(name) {
    const match = name.match(/slide(\d+)\.xml$/i);
    return match ? Number(match[1]) : 0;
  }

  async function extractPptx(file) {
    if (!window.JSZip) {
      throw new Error('PPTX 解析库没有加载成功，请检查网络后刷新页面。');
    }
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const names = Object.keys(zip.files)
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
      .sort((a, b) => slideIndex(a) - slideIndex(b));
    if (!names.length) {
      throw new Error('这个 PPTX 里没有找到幻灯片文字。');
    }

    const ns = 'http://schemas.openxmlformats.org/drawingml/2006/main';
    const parts = [];

    for (let i = 0; i < names.length; i += 1) {
      setStatus('正在读取第 ' + (i + 1) + '/' + names.length + ' 张幻灯片…', true);
      const xml = await zip.file(names[i]).async('string');
      const doc = new DOMParser().parseFromString(xml, 'application/xml');
      const paragraphNodes = doc.getElementsByTagNameNS(ns, 'p');
      const lines = [];

      for (const paragraph of paragraphNodes) {
        const runs = paragraph.getElementsByTagNameNS(ns, 't');
        let line = '';
        for (const run of runs) line += run.textContent;
        if (line.trim()) lines.push(line.trim());
      }
      if (!lines.length) {
        const allText = doc.getElementsByTagNameNS(ns, 't');
        for (const node of allText) {
          if (node.textContent.trim()) lines.push(node.textContent.trim());
        }
      }
      if (lines.length) parts.push('[Slide ' + (i + 1) + ']\n' + lines.join('\n'));
    }
    return parts.join('\n\n');
  }

  /* ---------------- DOCX ---------------- */

  async function extractDocx(file) {
    if (!window.mammoth) {
      throw new Error('DOCX 解析库没有加载成功，请检查网络后刷新页面。');
    }
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return result.value || '';
  }

  /* ---------------- 文本切段 ---------------- */

  function chunkText(text, maxLen) {
    const src = String(text || '').replace(/\r\n?/g, '\n').trim();
    if (!src) return [];
    const pieces = src.split(/\n+/).map((item) => item.trim()).filter(Boolean);
    const chunks = [];
    let current = '';

    const flush = () => {
      if (current.trim()) chunks.push(current.trim());
      current = '';
    };

    for (const piece of pieces) {
      if (piece.length > maxLen) {
        flush();
        let rest = piece;
        while (rest.length > maxLen) {
          let cut = rest.lastIndexOf('. ', maxLen);
          if (cut < maxLen * 0.5) cut = rest.lastIndexOf(' ', maxLen);
          if (cut < maxLen * 0.5) cut = maxLen - 1;
          chunks.push(rest.slice(0, cut + 1).trim());
          rest = rest.slice(cut + 1).trim();
        }
        if (rest) current = rest;
        continue;
      }
      const candidate = current ? current + '\n' + piece : piece;
      if (candidate.length > maxLen) {
        flush();
        current = piece;
      } else {
        current = candidate;
      }
    }
    flush();
    return chunks;
  }

  /* ---------------- 调用模型 ---------------- */

  function buildEndpoint(baseUrl) {
    let url = String(baseUrl || '').trim().replace(/\/+$/, '');
    if (/\/chat\/completions$/i.test(url)) return url;
    if (/\/v\d+[a-z]*$/i.test(url) || /\/openai$/i.test(url)) {
      return url + '/chat/completions';
    }
    return url + '/v1/chat/completions';
  }

  async function apiError(response) {
    let raw = '';
    try {
      raw = await response.text();
    } catch (err) {
      raw = '';
    }
    let detail = '';
    try {
      const parsed = JSON.parse(raw);
      detail = (parsed && parsed.error && parsed.error.message) || (parsed && parsed.message) || '';
    } catch (err) {
      detail = raw.slice(0, 240);
    }
    const table = {
      400: '请求被拒绝（HTTP 400）',
      401: 'API Key 无效或已过期（HTTP 401）',
      403: '没有访问该模型的权限（HTTP 403）',
      404: '接口地址或模型名称不正确（HTTP 404）',
      413: '材料太大，服务拒绝处理（HTTP 413）',
      429: '请求太频繁或额度不足（HTTP 429）',
      500: '服务端出错了（HTTP 500）',
      502: '网关错误（HTTP 502）',
      503: '服务暂时不可用（HTTP 503）'
    };
    const base = table[response.status] || ('请求失败（HTTP ' + response.status + '）');
    const error = new Error(detail ? base + '：' + detail : base);
    error.status = response.status;
    return error;
  }

  function extractMessageContent(message) {
    const content = message && message.content;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content
        .map((part) => {
          if (typeof part === 'string') return part;
          if (part && typeof part.text === 'string') return part.text;
          return '';
        })
        .join('');
    }
    return '';
  }

  async function callChat(settings, systemPrompt, userContent) {
    const url = buildEndpoint(settings.baseUrl);
    const headers = { 'Content-Type': 'application/json' };
    if (settings.apiKey) headers.Authorization = 'Bearer ' + settings.apiKey;

    const body = {
      model: settings.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      temperature: CONFIG.temperature,
      max_tokens: CONFIG.maxTokens
    };

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), CONFIG.requestTimeoutMs);

    try {
      let response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(Object.assign({}, body, { response_format: { type: 'json_object' } })),
        signal: controller.signal
      });

      if (response.status === 400) {
        // 有些服务商不支持 response_format，去掉后重试一次
        response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: controller.signal
        });
      }

      if (!response.ok) throw await apiError(response);

      const data = await response.json();
      const content = extractMessageContent(data && data.choices && data.choices[0] && data.choices[0].message);
      if (!content) {
        throw new Error('接口返回内容为空。请确认模型名称有效，且该服务兼容 OpenAI Chat Completions 协议。');
      }
      return content;
    } catch (err) {
      if (err && err.name === 'AbortError') {
        throw new Error('请求超时（3 分钟）。可以把文档分小一点，或换一个更快的模型。');
      }
      throw err;
    } finally {
      window.clearTimeout(timer);
    }
  }

  function buildLessonSystemPrompt(requirements) {
    const custom = String(requirements || '').trim();
    if (!custom) return SYSTEM_PROMPT;
    return [
      SYSTEM_PROMPT,
      '',
      '【学生这次指定的课程要求】',
      '学生希望这节课按下面的要求呈现。请在不改变 JSON 输出结构、英文主体 + 中文翻译、术语规则的前提下尽量满足；这些要求可以覆盖上面的篇幅、分节和风格建议。',
      '<<< 学生要求开始 >>>',
      custom.slice(0, 2000),
      '<<< 学生要求结束 >>>'
    ].join('\n');
  }

  function buildUserPrompt(chunk, index, total, sourceName) {
    return [
      '材料名称：' + (sourceName || '未命名资料'),
      '这是材料的第 ' + (index + 1) + ' / ' + total + ' 部分。请只根据这一部分撰写教学内容，不要与其他部分重复。',
      '',
      '<<< 材料开始 >>>',
      chunk,
      '<<< 材料结束 >>>'
    ].join('\n');
  }

  /* ---------------- 解析模型返回的 JSON ---------------- */

  function extractBalancedObject(source) {
    const text = String(source || '');
    const start = text.indexOf('{');
    if (start === -1) return null;

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < text.length; i += 1) {
      const ch = text[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === '\\') escaped = true;
        else if (ch === '"') inString = false;
      } else if (ch === '"') {
        inString = true;
      } else if (ch === '{') {
        depth += 1;
      } else if (ch === '}') {
        depth -= 1;
        if (depth === 0) return text.slice(start, i + 1);
      }
    }
    return null;
  }

  function parseLessonJson(raw) {
    let text = String(raw || '').trim();
    text = text.replace(/^```[a-zA-Z]*\s*/, '').replace(/```\s*$/, '').trim();
    const jsonText = extractBalancedObject(text);
    if (!jsonText) return null;

    const attempts = [jsonText, jsonText.replace(/,\s*([}\]])/g, '$1')];
    for (const attempt of attempts) {
      try {
        const data = JSON.parse(attempt);
        if (data && typeof data === 'object' && !Array.isArray(data)) return data;
      } catch (err) {
        /* 尝试下一个修复版本 */
      }
    }
    return null;
  }

  function normalizeLesson(data) {
    const safeText = (value) => {
      if (typeof value === 'string') return value.trim();
      if (typeof value === 'number') return String(value);
      return '';
    };

    const rawTitle = data && data.title;
    const title = {
      en: rawTitle && typeof rawTitle === 'object' ? safeText(rawTitle.en) : safeText(rawTitle),
      zh: rawTitle && typeof rawTitle === 'object' ? safeText(rawTitle.zh) : ''
    };

    const sections = [];
    const rawSections = Array.isArray(data && data.sections) ? data.sections : [];
    for (const rawSection of rawSections) {
      if (!rawSection || typeof rawSection !== 'object') continue;
      const rawHeading = rawSection.heading;
      const heading = {
        en: rawHeading && typeof rawHeading === 'object' ? safeText(rawHeading.en) : safeText(rawHeading),
        zh: rawHeading && typeof rawHeading === 'object' ? safeText(rawHeading.zh) : ''
      };

      const paragraphs = [];
      const rawParagraphs = Array.isArray(rawSection.paragraphs) ? rawSection.paragraphs : [];
      for (const rawParagraph of rawParagraphs) {
        if (!rawParagraph) continue;
        if (typeof rawParagraph === 'string') {
          const en = rawParagraph.trim();
          if (en) paragraphs.push({ en, zh: '' });
          continue;
        }
        if (typeof rawParagraph !== 'object') continue;
        const en = safeText(rawParagraph.en);
        const zh = safeText(rawParagraph.zh);
        if (en) paragraphs.push({ en, zh });
      }
      if (heading.en || heading.zh || paragraphs.length) {
        sections.push({ heading, paragraphs });
      }
    }

    const terms = [];
    const seen = new Set();
    const rawTerms = Array.isArray(data && data.terms) ? data.terms : [];
    for (const rawTerm of rawTerms) {
      if (!rawTerm || typeof rawTerm !== 'object') continue;
      const term = safeText(rawTerm.term)
        .replace(/^[*_`"'“”‘’\s]+/, '')
        .replace(/[*_`"'“”‘’\s]+$/, '');
      if (term.length < 2 || !/[A-Za-z]/.test(term)) continue;
      const key = term.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      terms.push({
        term,
        zh: safeText(rawTerm.zh),
        definition_en: safeText(rawTerm.definition_en),
        definition_zh: safeText(rawTerm.definition_zh)
      });
    }

    return { title, sections, terms };
  }

  function mergeLessonData(target, data) {
    if (!target.title && data && data.title) {
      const rawTitle = data.title;
      const en = typeof rawTitle === 'string' ? rawTitle : (rawTitle && rawTitle.en);
      const zh = rawTitle && typeof rawTitle === 'object' ? rawTitle.zh : '';
      if (en || zh) target.title = { en: safeString(en), zh: safeString(zh) };
    }
    if (data && Array.isArray(data.sections)) target.sections.push(...data.sections);
    if (data && Array.isArray(data.terms)) target.terms.push(...data.terms);
  }

  function safeString(value) {
    return typeof value === 'string' ? value : '';
  }

  /* ---------------- 备课主流程 ---------------- */

  async function startLesson() {
    if (state.busy) return;

    const settings = readSettings();
    const problem = validateSettings(settings);
    if (problem) {
      setStatus(problem, false, true);
      toast(problem, 4600);
      return;
    }
    if (!state.text) {
      toast('请先上传一份学习资料～');
      return;
    }

    const requirements = readFormatPrompt();
    state.lessonRequirements = requirements;
    const lessonSystemPrompt = buildLessonSystemPrompt(requirements);

    if (state.chatStreaming) abortChat();
    closeChat();

    state.busy = true;
    setBusy(true);
    hideTooltip();
    state.registry = new Map();
    els.welcome.hidden = true;
    els.lesson.hidden = false;
    els.startBtn.textContent = '备课中…';
    showLoadingCard('正在整理材料…', 4);

    try {
      let chunks = chunkText(state.text, CONFIG.chunkSize);
      const totalChunks = chunks.length;
      chunks = chunks.slice(0, CONFIG.maxChunks);

      const merged = { title: null, sections: [], terms: [] };

      for (let i = 0; i < chunks.length; i += 1) {
        setStatus('🐳 小肥鱼正在备第 ' + (i + 1) + '/' + chunks.length + ' 段课…', true);
        setLoadingProgress(
          Math.round(6 + (i / chunks.length) * 86),
          '第 ' + (i + 1) + ' / ' + chunks.length + ' 段 · 英文讲解 + 中文翻译'
        );
        const raw = await callChat(
          settings,
          lessonSystemPrompt,
          buildUserPrompt(chunks[i], i, chunks.length, state.sourceLabel)
        );
        const data = parseLessonJson(raw);
        if (!data) {
          throw new Error('第 ' + (i + 1) + ' 段返回的内容不是有效 JSON。可能是模型不支持 JSON 输出，请换一个模型再试。');
        }
        mergeLessonData(merged, data);
      }

      const lesson = normalizeLesson(merged);
      if (!lesson.sections.length) {
        throw new Error('模型没有返回教学内容，请检查文件内容或更换模型。');
      }

      state.lesson = lesson;
      renderLesson(lesson);
      resetChat();
      setStatus('✨ 备课完成，祝学习愉快～', false);

      if (totalChunks > CONFIG.maxChunks) {
        toast(
          '文档较长，本次只讲解了前 ' + CONFIG.maxChunks + ' 段（约 ' +
          Math.round((CONFIG.maxChunks * CONFIG.chunkSize) / 1000) + ' 千字符）。',
          7000
        );
      }
    } catch (err) {
      console.error(err);
      showErrorCard(err);
      setStatus(humanError(err), false, true);
    } finally {
      state.busy = false;
      setBusy(false);
      els.startBtn.textContent = state.lesson ? '重新备课' : '开始上课';
      els.startBtn.disabled = !state.text;
    }
  }

  function setBusy(busy) {
    state.busy = busy;
    els.startBtn.disabled = busy || !state.text;
    els.fileInput.disabled = busy;
    els.demoBtn.disabled = busy;
    els.dropZone.classList.toggle('disabled', busy);
    if (busy) els.backBtn.hidden = true;
  }

  /* ---------------- 备课中的界面 ---------------- */

  function showLoadingCard(label, progress) {
    els.welcome.hidden = true;
    els.lesson.hidden = false;
    els.lesson.innerHTML =
      '<div class="loading-card">' +
        '<div class="loading-whale">🐳</div>' +
        '<h3>小肥鱼正在备课…</h3>' +
        '<p class="loading-detail" id="loadingDetail"></p>' +
        '<div class="progress-track"><div class="progress-fill" id="progressFill"></div></div>' +
        '<p class="loading-hint">英文讲解 + 中文翻译 · 术语自动标注</p>' +
      '</div>';
    const detail = document.getElementById('loadingDetail');
    if (detail) detail.textContent = label;
    setLoadingProgress(progress || 4);
  }

  function setLoadingProgress(percent, label) {
    const fill = document.getElementById('progressFill');
    const detail = document.getElementById('loadingDetail');
    if (fill) fill.style.width = Math.max(2, Math.min(100, percent)) + '%';
    if (detail && label) detail.textContent = label;
  }

  function showErrorCard(err) {
    const message = humanError(err);
    els.welcome.hidden = true;
    els.lesson.hidden = false;
    els.lesson.textContent = '';

    const card = document.createElement('div');
    card.className = 'error-card';

    const icon = document.createElement('div');
    icon.className = 'error-icon';
    icon.textContent = '🥺';

    const heading = document.createElement('h3');
    heading.textContent = '备课遇到了一点小问题';

    const detail = document.createElement('p');
    detail.className = 'error-message';
    detail.textContent = message;

    const actions = document.createElement('div');
    actions.className = 'error-actions';
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'primary-btn';
    retry.textContent = '再试一次';
    retry.addEventListener('click', startLesson);
    actions.appendChild(retry);

    card.append(icon, heading, detail, actions);
    els.lesson.appendChild(card);
    scrollReaderToTop();
  }

  /* ---------------- 渲染课程 ---------------- */

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function buildTermRegex(registry) {
    const terms = [...registry.values()]
      .map((item) => item.term)
      .sort((a, b) => b.length - a.length);
    if (!terms.length) return null;

    const alternation = terms.map(escapeRegExp).join('|');
    try {
      return new RegExp('(?<![A-Za-z0-9])(?:' + alternation + ')(?![A-Za-z0-9])', 'gi');
    } catch (err) {
      return new RegExp('(?:' + alternation + ')', 'gi');
    }
  }

  function appendWithTerms(parent, text, registry, regex) {
    if (!regex) {
      parent.appendChild(document.createTextNode(text));
      return;
    }
    regex.lastIndex = 0;
    let lastIndex = 0;

    for (const match of text.matchAll(regex)) {
      const start = match.index;
      const end = start + match[0].length;
      if (start > lastIndex) {
        parent.appendChild(document.createTextNode(text.slice(lastIndex, start)));
      }

      const key = match[0].toLowerCase();
      const info = registry.get(key);
      if (!info) {
        parent.appendChild(document.createTextNode(match[0]));
        lastIndex = end;
        continue;
      }

      const span = document.createElement('span');
      span.className = 'term';
      span.dataset.key = key;
      span.textContent = match[0];

      if (!info.anchored) {
        info.anchored = true;
        span.classList.add('term-def');
        span.id = 'def-' + info.id;
        span.dataset.role = 'definition';
      } else {
        span.classList.add('term-ref');
        span.dataset.role = 'reference';
        span.setAttribute('role', 'button');
        span.tabIndex = 0;
        span.addEventListener('click', () => jumpToDefinition(info.id));
        span.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            jumpToDefinition(info.id);
          }
        });
      }

      parent.appendChild(span);
      lastIndex = end;
    }

    if (lastIndex < text.length) {
      parent.appendChild(document.createTextNode(text.slice(lastIndex)));
    }
  }

  function appendRichWithTerms(parent, text, registry, regex) {
    const source = String(text || '');
    const pattern = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*\n]+\*)/g;
    let lastIndex = 0;

    for (const match of source.matchAll(pattern)) {
      if (match.index > lastIndex) {
        appendWithTerms(parent, source.slice(lastIndex, match.index), registry, regex);
      }
      const token = match[0];
      if (token.startsWith('**') || token.startsWith('__')) {
        const strong = document.createElement('strong');
        appendRichWithTerms(strong, token.slice(2, -2), registry, regex);
        parent.appendChild(strong);
      } else if (token.startsWith('`')) {
        const code = document.createElement('code');
        code.textContent = token.slice(1, -1);
        parent.appendChild(code);
      } else {
        const em = document.createElement('em');
        appendRichWithTerms(em, token.slice(1, -1), registry, regex);
        parent.appendChild(em);
      }
      lastIndex = match.index + token.length;
    }

    if (lastIndex < source.length) {
      appendWithTerms(parent, source.slice(lastIndex), registry, regex);
    }
  }

  function splitTableRow(line) {
    let value = String(line || '').trim();
    if (value.startsWith('|')) value = value.slice(1);
    if (value.endsWith('|')) value = value.slice(0, -1);
    return value.split('|').map((cell) => cell.trim());
  }

  function isTableSeparator(line) {
    const value = String(line || '').trim();
    if (!value || value.indexOf('-') === -1) return false;
    const cells = splitTableRow(value);
    return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
  }

  function buildRichTable(headerCells, rows, registry, regex) {
    const wrap = document.createElement('div');
    wrap.className = 'rich-table-wrap';

    const table = document.createElement('table');
    table.className = 'rich-table';

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    headerCells.forEach((cellText) => {
      const th = document.createElement('th');
      appendRichWithTerms(th, cellText, registry, regex);
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    if (rows.length) {
      const tbody = document.createElement('tbody');
      rows.forEach((cells) => {
        const tr = document.createElement('tr');
        for (let i = 0; i < headerCells.length; i += 1) {
          const td = document.createElement('td');
          appendRichWithTerms(td, cells[i] || '', registry, regex);
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
    }

    wrap.appendChild(table);
    return wrap;
  }

  function renderLessonRichText(container, text, registry, regex) {
    container.textContent = '';
    const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
    let paragraph = [];
    let listType = '';
    let listEl = null;
    let codeLines = [];
    let inCode = false;

    const flushParagraph = () => {
      if (!paragraph.length) return;
      const p = document.createElement('p');
      appendRichWithTerms(p, paragraph.join(' '), registry, regex);
      container.appendChild(p);
      paragraph = [];
    };

    const closeList = () => {
      listType = '';
      listEl = null;
    };

    const flushCode = () => {
      if (!codeLines.length) return;
      const pre = document.createElement('pre');
      const code = document.createElement('code');
      code.textContent = codeLines.join('\n');
      pre.appendChild(code);
      container.appendChild(pre);
      codeLines = [];
    };

    for (let i = 0; i < lines.length; i += 1) {
      const rawLine = lines[i];
      const line = rawLine.replace(/\s+$/, '');
      const trimmed = line.trim();

      if (trimmed.startsWith('```')) {
        flushParagraph();
        closeList();
        if (inCode) {
          flushCode();
          inCode = false;
        } else {
          inCode = true;
        }
        continue;
      }

      if (inCode) {
        codeLines.push(rawLine);
        continue;
      }

      if (!trimmed) {
        flushParagraph();
        closeList();
        continue;
      }

      if (line.indexOf('|') !== -1 && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
        const headerCells = splitTableRow(line);
        if (headerCells.length) {
          flushParagraph();
          closeList();
          i += 1;
          const rows = [];
          while (i + 1 < lines.length) {
            const next = lines[i + 1];
            if (!next.trim() || next.trim().indexOf('|') === -1) break;
            if (next.trim().startsWith('```') || isTableSeparator(next)) break;
            i += 1;
            rows.push(splitTableRow(next));
          }
          container.appendChild(buildRichTable(headerCells, rows, registry, regex));
          continue;
        }
      }

      const heading = line.match(/^(#{1,4})\s+(.*)$/);
      if (heading) {
        flushParagraph();
        closeList();
        const h = document.createElement(heading[1].length <= 2 ? 'h4' : 'h5');
        appendRichWithTerms(h, heading[2], registry, regex);
        container.appendChild(h);
        continue;
      }

      if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
        flushParagraph();
        closeList();
        container.appendChild(document.createElement('hr'));
        continue;
      }

      const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
      if (bullet) {
        flushParagraph();
        if (listType !== 'ul') {
          closeList();
          listEl = document.createElement('ul');
          listType = 'ul';
          container.appendChild(listEl);
        }
        const li = document.createElement('li');
        appendRichWithTerms(li, bullet[1], registry, regex);
        listEl.appendChild(li);
        continue;
      }

      const numbered = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
      if (numbered) {
        flushParagraph();
        if (listType !== 'ol') {
          closeList();
          listEl = document.createElement('ol');
          listType = 'ol';
          container.appendChild(listEl);
        }
        const li = document.createElement('li');
        appendRichWithTerms(li, numbered[2], registry, regex);
        listEl.appendChild(li);
        continue;
      }

      if (/^>\s?/.test(line)) {
        flushParagraph();
        closeList();
        const quote = document.createElement('blockquote');
        appendRichWithTerms(quote, line.replace(/^>\s?/, ''), registry, regex);
        container.appendChild(quote);
        continue;
      }

      paragraph.push(trimmed);
    }

    flushParagraph();
    closeList();
    if (inCode) flushCode();
  }

  function renderLesson(lesson) {
    const root = els.lesson;
    root.textContent = '';
    state.registry = new Map();
    state.lastScroll = null;
    els.backBtn.hidden = true;

    const paragraphText = lesson.sections
      .flatMap((section) => section.paragraphs.map((paragraph) => paragraph.en))
      .join('\n');
    const lowerParagraphText = paragraphText.toLowerCase();

    for (const term of lesson.terms) {
      const key = term.term.toLowerCase();
      if (state.registry.has(key)) continue;
      if (!lowerParagraphText.includes(key)) continue;
      state.registry.set(key, {
        term: term.term,
        zh: term.zh,
        definition_en: term.definition_en,
        definition_zh: term.definition_zh,
        id: state.registry.size + 1,
        anchored: false
      });
    }

    const regex = buildTermRegex(state.registry);

    const header = document.createElement('header');
    header.className = 'lesson-head';

    const title = document.createElement('h1');
    title.textContent = lesson.title.en || 'Study Notes';
    header.appendChild(title);

    const titleZh = lesson.title.zh || (lesson.title.en ? '' : '学习讲义');
    if (titleZh) {
      const sub = document.createElement('p');
      sub.className = 'lesson-title-zh';
      sub.textContent = titleZh;
      header.appendChild(sub);
    }

    const meta = document.createElement('div');
    meta.className = 'lesson-meta';
    const metaParts = [];
    if (state.sourceLabel) metaParts.push(state.sourceLabel);
    metaParts.push(lesson.sections.length + ' 个小节');
    metaParts.push(state.registry.size + ' 个术语');
    if (state.lessonRequirements) metaParts.push('自定义格式');
    meta.textContent = metaParts.join(' · ');
    header.appendChild(meta);

    const legend = document.createElement('div');
    legend.className = 'lesson-legend';
    legend.innerHTML =
      '<span class="legend-term">绿色术语</span> 悬停看中文注释 · ' +
      '后文点击跳回定义 · 英文为主，中文翻译在每段下方';
    header.appendChild(legend);

    if (state.lessonRequirements) {
      const requirements = document.createElement('details');
      requirements.className = 'lesson-requirements';
      const summary = document.createElement('summary');
      summary.textContent = '📝 本次课程要求';
      const body = document.createElement('p');
      body.textContent = state.lessonRequirements;
      requirements.append(summary, body);
      header.appendChild(requirements);
    }
    root.appendChild(header);

    for (const section of lesson.sections) {
      const sectionEl = document.createElement('section');
      sectionEl.className = 'lesson-section';

      if (section.heading.en) {
        const heading = document.createElement('h2');
        heading.textContent = section.heading.en;
        sectionEl.appendChild(heading);
        if (section.heading.zh) {
          const headingZh = document.createElement('p');
          headingZh.className = 'heading-zh';
          headingZh.textContent = section.heading.zh;
          sectionEl.appendChild(headingZh);
        }
      }

      for (const paragraph of section.paragraphs) {
        const block = document.createElement('div');
        block.className = 'para-block';

        const en = document.createElement('div');
        en.className = 'para-en';
        renderLessonRichText(en, paragraph.en, state.registry, regex);
        block.appendChild(en);

        if (paragraph.zh) {
          const zh = document.createElement('div');
          zh.className = 'para-zh';
          renderLessonRichText(zh, paragraph.zh, null, null);
          block.appendChild(zh);
        }
        sectionEl.appendChild(block);
      }

      root.appendChild(sectionEl);
    }

    renderGlossary(root);
    hideTooltip();
    scrollReaderToTop();
  }

  function renderGlossary(root) {
    const entries = [...state.registry.values()].filter((item) => item.anchored);
    if (!entries.length) return;

    const details = document.createElement('details');
    details.className = 'glossary';

    const summary = document.createElement('summary');
    summary.textContent = '📚 本课术语表 · Glossary（' + entries.length + '）';
    details.appendChild(summary);

    const grid = document.createElement('div');
    grid.className = 'glossary-grid';
    entries.sort((a, b) => a.term.localeCompare(b.term));

    for (const entry of entries) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'gloss-item';

      const head = document.createElement('span');
      head.className = 'gloss-head';

      const term = document.createElement('b');
      term.textContent = entry.term;
      head.appendChild(term);

      if (entry.zh) {
        const zh = document.createElement('span');
        zh.className = 'gloss-zh';
        zh.textContent = entry.zh;
        head.appendChild(zh);
      }
      item.appendChild(head);

      const definition = document.createElement('span');
      definition.className = 'gloss-def';
      definition.textContent = entry.definition_zh || entry.definition_en || '';
      item.appendChild(definition);

      item.addEventListener('click', () => jumpToDefinition(entry.id));
      grid.appendChild(item);
    }

    details.appendChild(grid);
    root.appendChild(details);
  }

  /* ---------------- 跳转与滚动 ---------------- */

  function readerIsScrollable() {
    return els.reader.scrollHeight > els.reader.clientHeight + 8;
  }

  function getScrollTop() {
    return readerIsScrollable() ? els.reader.scrollTop : window.scrollY;
  }

  function scrollToY(y) {
    if (readerIsScrollable()) {
      els.reader.scrollTo({ top: y, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }

  function scrollReaderToTop() {
    if (readerIsScrollable()) {
      els.reader.scrollTo({ top: 0, behavior: 'auto' });
    } else {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }

  function jumpToDefinition(id) {
    const target = document.getElementById('def-' + id);
    if (!target) return;

    state.lastScroll = getScrollTop();
    hideTooltip();
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.remove('flash');
    void target.offsetWidth;
    target.classList.add('flash');
    window.setTimeout(() => target.classList.remove('flash'), 2400);

    els.backBtn.hidden = false;
    window.clearTimeout(state.backTimer);
    state.backTimer = window.setTimeout(() => {
      els.backBtn.hidden = true;
    }, 9000);
  }

  /* ---------------- 术语悬停注释 ---------------- */

  function hideTooltip() {
    activeTermEl = null;
    els.tooltip.hidden = true;
  }

  function buildTooltipContent(info, isDefinition) {
    const tip = els.tooltip;
    tip.textContent = '';

    const head = document.createElement('div');
    head.className = 'tip-head';

    const name = document.createElement('span');
    name.className = 'tip-term';
    name.textContent = info.term;
    head.appendChild(name);

    if (info.zh) {
      const zh = document.createElement('span');
      zh.className = 'tip-zh';
      zh.textContent = info.zh;
      head.appendChild(zh);
    }
    if (isDefinition) {
      const badge = document.createElement('span');
      badge.className = 'tip-badge';
      badge.textContent = '定义位置';
      head.appendChild(badge);
    }
    tip.appendChild(head);

    if (info.definition_zh) {
      const definitionZh = document.createElement('p');
      definitionZh.className = 'tip-def';
      definitionZh.textContent = info.definition_zh;
      tip.appendChild(definitionZh);
    }
    if (info.definition_en) {
      const definitionEn = document.createElement('p');
      definitionEn.className = 'tip-en';
      definitionEn.textContent = info.definition_en;
      tip.appendChild(definitionEn);
    }

    const hint = document.createElement('p');
    hint.className = 'tip-hint';
    hint.textContent = isDefinition
      ? '📍 这里是该术语在本文中的定义位置'
      : '🖱️ 左键点击，跳转到定义位置';
    tip.appendChild(hint);
  }

  function positionTooltip(x, y) {
    const tip = els.tooltip;
    const pad = 14;
    const offset = 16;
    const width = tip.offsetWidth;
    const height = tip.offsetHeight;
    let left = x + offset;
    let top = y + offset;

    if (left + width > window.innerWidth - pad) left = x - width - offset;
    if (top + height > window.innerHeight - pad) top = y - height - offset;

    left = Math.max(pad, Math.min(left, window.innerWidth - width - pad));
    top = Math.max(pad, Math.min(top, window.innerHeight - height - pad));

    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  }

  function showTooltipFor(el, x, y) {
    const info = state.registry.get(el.dataset.key);
    if (!info) return;
    activeTermEl = el;
    buildTooltipContent(info, el.dataset.role === 'definition');
    els.tooltip.hidden = false;
    positionTooltip(x, y);
  }

  function bindTooltip() {
    document.addEventListener('mouseover', (event) => {
      const target = event.target instanceof Element ? event.target.closest('.term') : null;
      if (!target || target === activeTermEl) return;
      showTooltipFor(target, event.clientX, event.clientY);
    });

    document.addEventListener('mousemove', (event) => {
      if (!activeTermEl) return;
      const target = event.target instanceof Element ? event.target.closest('.term') : null;
      if (!target) {
        hideTooltip();
        return;
      }
      positionTooltip(event.clientX, event.clientY);
    });

    document.addEventListener('mouseout', (event) => {
      const target = event.target instanceof Element ? event.target.closest('.term') : null;
      if (!target || target !== activeTermEl) return;
      const next = event.relatedTarget;
      if (next instanceof Element && next.closest('.term') === target) return;
      hideTooltip();
    });

    document.addEventListener('scroll', hideTooltip, true);
    window.addEventListener('blur', hideTooltip);
  }

  /* ---------------- 随时答疑 ---------------- */

  function bindChat() {
    els.chatToggle.addEventListener('click', openChat);
    els.chatClose.addEventListener('click', closeChat);

    els.chatForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (state.chatStreaming) {
        abortChat();
        return;
      }
      sendChat(els.chatInput.value);
    });

    els.chatInput.addEventListener('input', autoGrowChatInput);
    els.chatInput.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' || event.shiftKey) return;
      if (event.isComposing || event.keyCode === 229) return;
      event.preventDefault();
      if (state.chatStreaming) return;
      if (els.chatInput.value.trim()) els.chatForm.requestSubmit();
    });

    document.querySelectorAll('[data-chat-lang]').forEach((button) => {
      button.addEventListener('click', () => setChatLanguage(button.dataset.chatLang));
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !els.chatPanel.hidden) closeChat();
    });
  }

  function loadChatLanguage() {
    let saved = '';
    try {
      saved = localStorage.getItem(CHAT_LANG_KEY) || '';
    } catch (err) {
      saved = '';
    }
    state.chatLang = saved === 'bilingual' ? 'bilingual' : 'zh';
    applyChatLanguageUI();
  }

  function applyChatLanguageUI() {
    document.querySelectorAll('[data-chat-lang]').forEach((button) => {
      const active = button.dataset.chatLang === state.chatLang;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function setChatLanguage(lang) {
    if (lang !== 'zh' && lang !== 'bilingual') return;
    if (state.chatLang === lang) return;
    state.chatLang = lang;
    applyChatLanguageUI();
    try {
      localStorage.setItem(CHAT_LANG_KEY, lang);
    } catch (err) {
      /* 隐私模式下写不进去就算了 */
    }
  }

  function openChat() {
    hideTooltip();
    els.chatPanel.hidden = false;
    els.chatToggle.hidden = true;
    els.chatToggle.setAttribute('aria-expanded', 'true');
    els.chatToggle.classList.remove('has-update');
    els.backBtn.hidden = true;
    if (!hasChatMessages()) refreshChatSuggestions();
    window.setTimeout(() => {
      if (!state.chatStreaming) els.chatInput.focus();
      scrollChatToBottom(false);
    }, 40);
  }

  function closeChat() {
    els.chatPanel.hidden = true;
    els.chatToggle.hidden = false;
    els.chatToggle.setAttribute('aria-expanded', 'false');
  }

  function markChatUnread() {
    if (els.chatPanel.hidden) els.chatToggle.classList.add('has-update');
  }

  function updateChatControls() {
    if (!els.chatSend) return;
    const streaming = state.chatStreaming;
    els.chatSend.textContent = streaming ? '停止' : '发送';
    els.chatSend.classList.toggle('is-stop', streaming);
    els.chatInput.disabled = streaming;
    els.chatInput.placeholder = streaming
      ? '小肥鱼正在回答…'
      : '不懂就问，比如：这一节的重点是什么？';
    if (!streaming) autoGrowChatInput();
  }

  function autoGrowChatInput() {
    const input = els.chatInput;
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  }

  function refreshChatSuggestions() {
    if (!els.chatSuggestions) return;
    els.chatSuggestions.textContent = '';

    const suggestions = [];
    if (state.lesson && state.registry.size) {
      const firstTerm = state.registry.values().next().value;
      suggestions.push('用更简单的话解释这一课');
      suggestions.push('这一课最重要的概念是什么？');
      suggestions.push('“' + firstTerm.term + '”这个词怎么理解？');
    } else if (state.lesson) {
      suggestions.push('用更简单的话解释这一课');
      suggestions.push('这一课最重要的概念是什么？');
      suggestions.push('给我一个生活中的例子');
    } else if (state.text) {
      suggestions.push('这份资料主要讲了什么？');
      suggestions.push('帮我梳理核心概念');
      suggestions.push('这些内容可以怎么记？');
    } else {
      suggestions.push('帮我制定一个学习计划');
      suggestions.push('怎样高效读懂一篇论文？');
      suggestions.push('用简单的话解释费曼学习法');
    }

    suggestions.forEach((text) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'chat-suggestion';
      button.textContent = text;
      button.addEventListener('click', () => {
        if (state.chatStreaming) return;
        sendChat(text);
      });
      els.chatSuggestions.appendChild(button);
    });
  }

  function hasChatMessages() {
    return Boolean(els.chatMessages.querySelector('.chat-msg, .chat-note'));
  }

  function resetChat() {
    state.chatRunId += 1;
    if (state.chatAbort) {
      try {
        state.chatAbort.abort();
      } catch (err) {
        /* ignore */
      }
    }
    state.chatStreaming = false;
    state.chatAbort = null;
    state.chatHistory = [];

    if (els.chatMessages) {
      [...els.chatMessages.querySelectorAll('.chat-msg, .chat-note')].forEach((node) => node.remove());
      els.chatEmpty.hidden = false;
    }
    if (els.chatInput) {
      els.chatInput.value = '';
      els.chatInput.style.height = '';
    }
    els.chatToggle.classList.remove('has-update');
    refreshChatSuggestions();
    updateChatControls();
  }

  function appendUserChatMessage(text) {
    els.chatEmpty.hidden = true;
    const row = document.createElement('div');
    row.className = 'chat-msg chat-msg-user';
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.textContent = text;
    row.appendChild(bubble);
    els.chatMessages.appendChild(row);
  }

  function appendAssistantMessage() {
    els.chatEmpty.hidden = true;
    const row = document.createElement('div');
    row.className = 'chat-msg chat-msg-ai';

    const avatar = document.createElement('div');
    avatar.className = 'chat-msg-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = '🐳';

    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';

    const textEl = document.createElement('div');
    textEl.className = 'chat-text';
    renderTypingIndicator(textEl);
    bubble.appendChild(textEl);
    row.append(avatar, bubble);
    els.chatMessages.appendChild(row);

    return { el: row, textEl, content: '', queued: false, done: false };
  }

  function renderTypingIndicator(container) {
    container.textContent = '';
    const wrap = document.createElement('span');
    wrap.className = 'chat-typing';
    wrap.setAttribute('aria-label', '正在思考');
    for (let i = 0; i < 3; i += 1) {
      wrap.appendChild(document.createElement('i'));
    }
    container.appendChild(wrap);
  }

  function scheduleChatMessageRender(message) {
    if (message.queued) return;
    message.queued = true;
    window.requestAnimationFrame(() => {
      message.queued = false;
      renderChatMessage(message, !message.done);
    });
  }

  function renderChatMessage(message, streaming) {
    if (!streaming) message.done = true;
    const container = message.textEl;
    container.textContent = '';

    if (!message.content) {
      renderTypingIndicator(container);
    } else {
      renderChatMarkdown(container, message.content);
      if (streaming) {
        const cursor = document.createElement('span');
        cursor.className = 'chat-cursor';
        cursor.setAttribute('aria-hidden', 'true');
        container.appendChild(cursor);
      }
    }

    if (isChatNearBottom()) scrollChatToBottom(false);
  }

  function renderChatMarkdown(container, text) {
    container.textContent = '';
    const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
    let paragraph = [];
    let listType = '';
    let listEl = null;
    let codeLines = [];
    let inCode = false;

    const flushParagraph = () => {
      if (!paragraph.length) return;
      const p = document.createElement('p');
      appendInlineMarkdown(p, paragraph.join(' '));
      container.appendChild(p);
      paragraph = [];
    };

    const closeList = () => {
      listType = '';
      listEl = null;
    };

    const flushCode = () => {
      if (!codeLines.length) return;
      const pre = document.createElement('pre');
      const code = document.createElement('code');
      code.textContent = codeLines.join('\n');
      pre.appendChild(code);
      container.appendChild(pre);
      codeLines = [];
    };

    for (const rawLine of lines) {
      const line = rawLine.replace(/\s+$/, '');

      if (line.trim().startsWith('```')) {
        flushParagraph();
        closeList();
        if (inCode) {
          flushCode();
          inCode = false;
        } else {
          inCode = true;
        }
        continue;
      }

      if (inCode) {
        codeLines.push(rawLine);
        continue;
      }

      if (!line.trim()) {
        flushParagraph();
        closeList();
        continue;
      }

      const heading = line.match(/^(#{1,4})\s+(.*)$/);
      if (heading) {
        flushParagraph();
        closeList();
        const h = document.createElement('h4');
        appendInlineMarkdown(h, heading[2]);
        container.appendChild(h);
        continue;
      }

      if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
        flushParagraph();
        closeList();
        container.appendChild(document.createElement('hr'));
        continue;
      }

      const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
      if (bullet) {
        flushParagraph();
        if (listType !== 'ul') {
          closeList();
          listEl = document.createElement('ul');
          listType = 'ul';
          container.appendChild(listEl);
        }
        const li = document.createElement('li');
        appendInlineMarkdown(li, bullet[1]);
        listEl.appendChild(li);
        continue;
      }

      const numbered = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
      if (numbered) {
        flushParagraph();
        if (listType !== 'ol') {
          closeList();
          listEl = document.createElement('ol');
          listType = 'ol';
          container.appendChild(listEl);
        }
        const li = document.createElement('li');
        appendInlineMarkdown(li, numbered[2]);
        listEl.appendChild(li);
        continue;
      }

      if (/^>\s?/.test(line)) {
        flushParagraph();
        closeList();
        const quote = document.createElement('blockquote');
        appendInlineMarkdown(quote, line.replace(/^>\s?/, ''));
        container.appendChild(quote);
        continue;
      }

      paragraph.push(line.trim());
    }

    flushParagraph();
    closeList();
    if (inCode) flushCode();
  }

  function appendInlineMarkdown(parent, text) {
    const pattern = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*\n]+\*)/g;
    let lastIndex = 0;

    for (const match of text.matchAll(pattern)) {
      if (match.index > lastIndex) {
        parent.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      }
      const token = match[0];
      if (token.startsWith('**') || token.startsWith('__')) {
        const strong = document.createElement('strong');
        strong.textContent = token.slice(2, -2);
        parent.appendChild(strong);
      } else if (token.startsWith('`')) {
        const code = document.createElement('code');
        code.textContent = token.slice(1, -1);
        parent.appendChild(code);
      } else {
        const em = document.createElement('em');
        em.textContent = token.slice(1, -1);
        parent.appendChild(em);
      }
      lastIndex = match.index + token.length;
    }

    if (lastIndex < text.length) {
      parent.appendChild(document.createTextNode(text.slice(lastIndex)));
    }
  }

  function appendChatNote(text) {
    els.chatEmpty.hidden = true;
    const note = document.createElement('div');
    note.className = 'chat-note';
    note.textContent = text;
    els.chatMessages.appendChild(note);
    scrollChatToBottom(true);
  }

  function appendChatError(message) {
    els.chatEmpty.hidden = true;
    const row = document.createElement('div');
    row.className = 'chat-msg chat-msg-ai';

    const avatar = document.createElement('div');
    avatar.className = 'chat-msg-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = '🥺';

    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble chat-error';
    bubble.textContent = message;

    row.append(avatar, bubble);
    els.chatMessages.appendChild(row);
    scrollChatToBottom(true);
  }

  function scrollChatToBottom(smooth) {
    els.chatMessages.scrollTo({
      top: els.chatMessages.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto'
    });
  }

  function isChatNearBottom() {
    const el = els.chatMessages;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 90;
  }

  function abortChat() {
    if (!state.chatAbort) return;
    try {
      state.chatAbort.abort();
    } catch (err) {
      /* ignore */
    }
  }

  async function sendChat(question) {
    if (state.chatStreaming) {
      abortChat();
      return;
    }

    const text = String(question || '').trim();
    if (!text) return;

    if (state.busy) {
      openChat();
      appendChatNote('小肥鱼还在备课，等课程生成完再问哦～');
      return;
    }

    const settings = readSettings();
    const problem = validateSettings(settings);
    if (problem) {
      openChat();
      appendChatNote('先在左侧填好 API 设置，小肥鱼才能回答哦。');
      setStatus(problem, false, true);
      toast(problem, 4200);
      return;
    }

    openChat();
    els.chatEmpty.hidden = true;
    els.chatInput.value = '';
    autoGrowChatInput();
    appendUserChatMessage(text);
    const assistant = appendAssistantMessage();
    scrollChatToBottom(true);

    const runId = state.chatRunId + 1;
    state.chatRunId = runId;
    const controller = new AbortController();
    state.chatAbort = controller;
    state.chatStreaming = true;
    updateChatControls();

    const requestMessages = buildChatRequestMessages(text);
    state.chatHistory.push({ role: 'user', content: text });
    trimChatHistory();

    let timedOut = false;
    const timeoutTimer = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, CONFIG.chatTimeoutMs);

    try {
      const answer = await streamChatCompletion(
        settings,
        requestMessages,
        (piece, fullText) => {
          if (runId !== state.chatRunId) return;
          assistant.content = fullText;
          scheduleChatMessageRender(assistant);
        },
        controller.signal
      );

      if (runId !== state.chatRunId) return;
      assistant.content = answer;
      renderChatMessage(assistant, false);
      state.chatHistory.push({ role: 'assistant', content: answer });
      trimChatHistory();
    } catch (err) {
      if (runId !== state.chatRunId) return;

      if (err && err.name === 'AbortError') {
        if (timedOut) {
          if (assistant.content.trim()) {
            renderChatMessage(assistant, false);
          } else {
            assistant.el.remove();
          }
          appendChatError('请求超时了，可能是网络太慢或服务商没有响应。可以再问一次试试。');
        } else {
          if (assistant.content.trim()) {
            renderChatMessage(assistant, false);
            state.chatHistory.push({ role: 'assistant', content: assistant.content });
            trimChatHistory();
          } else {
            assistant.el.remove();
          }
          appendChatNote('已停止回答');
        }
      } else if (assistant.content.trim()) {
        renderChatMessage(assistant, false);
        appendChatError(humanError(err));
      } else {
        assistant.el.remove();
        appendChatError(humanError(err));
      }
    } finally {
      window.clearTimeout(timeoutTimer);
      if (runId === state.chatRunId) {
        state.chatStreaming = false;
        state.chatAbort = null;
        updateChatControls();
        if (isChatNearBottom()) scrollChatToBottom(true);
        if (!els.chatPanel.hidden) els.chatInput.focus();
        if (els.chatPanel.hidden) markChatUnread();
      }
    }
  }

  function trimChatHistory() {
    if (state.chatHistory.length > 16) {
      state.chatHistory = state.chatHistory.slice(-16);
    }
  }

  function buildChatRequestMessages(question) {
    const selected = [];
    let budget = 6000;
    for (let i = state.chatHistory.length - 1; i >= 0 && selected.length < 12; i -= 1) {
      const item = state.chatHistory[i];
      if (item.content.length > budget) break;
      selected.unshift({ role: item.role, content: item.content });
      budget -= item.content.length;
    }
    return [
      { role: 'system', content: buildChatSystemPrompt() },
      ...selected,
      { role: 'user', content: question }
    ];
  }

  function buildChatSystemPrompt() {
    const languageRule = state.chatLang === 'bilingual'
      ? '用英文作为主体回答，每个英文段落后附上对应的中文翻译；关键术语保持中英对照。'
      : '用简体中文回答；学术术语第一次出现时保留英文原词，并在括号中给出中文解释。';

    return [
      '你是“小肥鱼”，一位温柔、耐心、严谨的双语学习助教，正在陪学生阅读下面的学习资料，并随时回答学生的问题。',
      '',
      '【回答语言】' + languageRule,
      '【回答方式】',
      '1. 像面对面辅导：先给结论，再用短段落或项目符号解释，必要时举一个例子。',
      '2. 使用轻量 Markdown：短段落、项目符号、**加粗关键词**；不要使用表格、LaTeX 公式或代码块。',
      '3. 一般回答 150–400 字（双语模式约 100–250 个英文词）；除非学生明确要求展开。',
      '4. 优先依据资料回答；如果资料里没有直接讲到，先说明“资料里没有直接讲到”，再用通用知识补充。',
      '5. 不要编造资料中的页码、数据或引用；不确定时就说不确定。',
      '6. 与资料无关的问题也可以正常回答。',
      '',
      '【当前资料】',
      buildTutorContext()
    ].join('\n');
  }

  function buildTutorContext() {
    const parts = [];
    if (state.sourceLabel) parts.push('资料名称：' + state.sourceLabel);
    if (state.lessonRequirements) {
      parts.push('【学生的课程格式偏好】\n' + truncateText(state.lessonRequirements, 1200));
    }

    if (state.lesson) {
      const titleParts = [];
      if (state.lesson.title.en) titleParts.push(state.lesson.title.en);
      if (state.lesson.title.zh) titleParts.push(state.lesson.title.zh);
      parts.push('【课程标题】' + (titleParts.join(' / ') || '未命名课程'));

      const lessonLines = [];
      for (const section of state.lesson.sections) {
        if (section.heading.en) {
          lessonLines.push(
            '## ' + section.heading.en +
            (section.heading.zh ? '（' + section.heading.zh + '）' : '')
          );
        }
        for (const paragraph of section.paragraphs) {
          if (paragraph.en) lessonLines.push(paragraph.en);
        }
      }
      const lessonText = truncateText(lessonLines.join('\n\n'), 12000);
      if (lessonText) parts.push('【课程讲义（英文主体）】\n' + lessonText);
    }

    const terms = [...state.registry.values()];
    if (terms.length) {
      const termLines = terms.slice(0, 60).map((item) => {
        const definition = item.definition_zh || item.definition_en || '';
        return '- ' + item.term +
          (item.zh ? '（' + item.zh + '）' : '') +
          (definition ? '：' + definition : '');
      });
      parts.push('【术语表】\n' + termLines.join('\n'));
    }

    if (state.text) {
      const sourceExcerpt = truncateText(state.text, 6000);
      parts.push(
        '【原始资料节选】\n' + sourceExcerpt +
        (state.text.length > 6000 ? '\n……（节选结束）' : '')
      );
    }

    if (!parts.length) parts.push('学生还没有上传学习资料。');
    return parts.join('\n\n');
  }

  function truncateText(text, limit) {
    const value = String(text || '');
    if (value.length <= limit) return value;
    return value.slice(0, limit).trimEnd() + '…';
  }

  async function streamChatCompletion(settings, messages, onDelta, signal) {
    const url = buildEndpoint(settings.baseUrl);
    const headers = { 'Content-Type': 'application/json' };
    if (settings.apiKey) headers.Authorization = 'Bearer ' + settings.apiKey;

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: settings.model,
        messages,
        temperature: 0.35,
        max_tokens: CONFIG.chatMaxTokens,
        stream: true
      }),
      signal
    });

    if (!response.ok) throw await apiError(response);

    const contentType = (response.headers.get('content-type') || '').toLowerCase();

    if (!contentType.includes('text/event-stream')) {
      const raw = await response.text();
      let data = null;
      try {
        data = JSON.parse(raw);
      } catch (err) {
        data = null;
      }
      const content = extractMessageContent(
        data && data.choices && data.choices[0] && data.choices[0].message
      );
      if (!content) {
        throw new Error('接口返回了无法识别的格式。请确认该服务兼容 OpenAI Chat Completions 协议，并支持流式输出。');
      }
      onDelta(content, content);
      return content;
    }

    if (!response.body) {
      throw new Error('浏览器无法读取流式响应，请更换浏览器后再试。');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';
    let finished = false;

    const handleDataLine = (rawLine) => {
      const line = rawLine.trim();
      if (!line || line.startsWith(':') || !line.startsWith('data:')) return;
      const payloadText = line.slice(5).trim();
      if (!payloadText) return;
      if (payloadText === '[DONE]') {
        finished = true;
        return;
      }

      let payload = null;
      try {
        payload = JSON.parse(payloadText);
      } catch (err) {
        return;
      }

      const choice = payload && payload.choices && payload.choices[0];
      if (!choice) return;
      const delta = choice.delta || choice.message || {};
      let piece = '';

      if (typeof delta.content === 'string') {
        piece = delta.content;
      } else if (Array.isArray(delta.content)) {
        piece = delta.content.map((part) => {
          if (typeof part === 'string') return part;
          if (part && typeof part.text === 'string') return part.text;
          return '';
        }).join('');
      }

      if (piece) {
        fullText += piece;
        onDelta(piece, fullText);
      }
    };

    try {
      while (!finished) {
        const result = await reader.read();
        if (result.done) break;
        buffer += decoder.decode(result.value, { stream: true });

        let newlineIndex = buffer.indexOf('\n');
        while (newlineIndex !== -1) {
          const rawLine = buffer.slice(0, newlineIndex).replace(/\r$/, '');
          buffer = buffer.slice(newlineIndex + 1);
          handleDataLine(rawLine);
          if (finished) break;
          newlineIndex = buffer.indexOf('\n');
        }
      }
      buffer += decoder.decode();
      if (buffer.trim() && !finished) handleDataLine(buffer);
    } finally {
      try {
        await reader.cancel();
      } catch (err) {
        /* ignore */
      }
    }

    if (!fullText.trim()) {
      throw new Error('模型没有返回任何内容。请确认模型支持流式输出，或换一个模型再试。');
    }
    return fullText;
  }

  /* ---------------- 演示 ---------------- */

  function loadDemo() {
    if (state.busy) return;
    const lesson = normalizeLesson(DEMO_LESSON);
    state.lesson = lesson;
    state.lessonRequirements = '';
    state.sourceLabel = '演示课程 · Whale Tutor';
    els.welcome.hidden = true;
    els.lesson.hidden = false;
    renderLesson(lesson);
    resetChat();
    setStatus('演示课程已载入：悬停绿色词、点击后文术语试试看～', false);
  }

  /* ---------------- 启动 ---------------- */

  init();
})();
