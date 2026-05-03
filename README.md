# 📊 CSV 数据仪表盘

基于 Next.js + React + ECharts + 智谱 AI 的全功能 CSV 数据分析与可视化工具。支持多文件上传、动态表格、四种图表（柱状/折线/饼图/散点图）、AI 智能数据分析报告，并具有本地存储、大数据虚拟滚动等性能优化。

## ✨ 功能特性

- ✅ **多 CSV 文件管理**：同时上传多个 CSV 文件，标签页切换，支持删除与清空。
- ✅ **动态表格渲染**：自动识别首行为列名，支持超过 200 行时启用虚拟滚动（`react-window`），保证海量数据流畅滚动。
- ✅ **自由图表配置**：选择任意列为 X 轴 / Y 轴，支持柱状图、折线图、饼图、散点图，实时生成 ECharts 图表。
- ✅ **AI 智能图表生成**（自然语言）：输入“按城市展示销售额的饼图”，后端调用智谱 GLM-4-Flash 模型自动返回 ECharts 配置（可选扩展）。
- ✅ **AI 数据分析报告**：基于全量数据的统计特征（总和、均值、中位数、最大/最小值等），调用大模型生成专业的数据分析报告，而非简单抽样。
- ✅ **本地存储持久化**：页面刷新后自动恢复已上传的文件、X/Y 轴选择、图表类型、图表配置和 AI 报告。
- ✅ **一键导出图表为 PNG**：利用 ECharts 的画布导出功能，保存图表为高清图片。
- ✅ **响应式 & 美观 UI**：Tailwind CSS + shadcn/ui 组件，明亮渐变背景，支持暗色主题（通过 CSS 变量）。

## 🛠️ 技术栈

| 类别         | 技术                                                                 |
| ------------ | -------------------------------------------------------------------- |
| 前端框架     | Next.js 14 (App Router) + React 18                                   |
| 语言         | TypeScript                                                           |
| 样式         | Tailwind CSS + shadcn/ui (Table 组件)                                |
| 图表库       | ECharts + echarts-for-react                                          |
| CSV 解析     | PapaParse                                                            |
| 虚拟滚动     | react-window                                                         |
| 防抖         | lodash.debounce                                                      |
| AI 模型      | 智谱 GLM-4-Flash (通过 Next.js API Route 代理)                       |
| 状态持久化   | localStorage                                                         |

## 🚀 快速开始

### 1. 克隆项目并安装依赖

```bash
git clone https://github.com/your-username/csv-dashboard.git
cd csv-dashboard
npm install
```

### 2. 配置环境变量

在项目根目录创建 `.env.local` 文件，填入你的智谱 API 密钥：

```
ZHIPU_API_KEY=your_zhipu_api_key_here
```

> 你可以从 [智谱开放平台](https://open.bigmodel.cn/) 申请免费额度。

### 3. 运行开发服务器

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 即可使用。

### 4. 构建生产版本

```bash
npm run build
npm start
```

## 📖 使用说明

1. **上传 CSV 文件**：点击“上传 CSV（多选）”按钮，选择本地一个或多个 CSV 文件（单个文件 ≤ 5MB）。
2. **切换文件**：点击文件标签切换不同的数据集。
3. **配置图表**：
   - 在下拉框中选择 **X 轴列**（分类列，如“城市”）和 **Y 轴列**（数值列，如“销售额”）。
   - 点击图表类型按钮（柱状图/折线图/饼图/散点图）切换样式。
   - 点击 **“生成图表”** 按钮，右侧将显示 ECharts 图表。
4. **生成 AI 报告**：在表格下方点击 **“生成 AI 报告（全量数据）”**，等待几秒后，系统会基于全量数据的统计信息生成一段文字分析报告。
5. **导出图表**：点击 **“导出图表为 PNG”** 将当前图表保存为图片。
6. **清空数据**：点击 **“清空所有”** 重置全部状态。
7. **数据持久化**：所有操作都会自动保存到浏览器的 `localStorage`，刷新页面后恢复。

## 📁 项目结构

```
csv-dashboard/
├── app/
│   ├── api/
│   │   └── ai-report/
│   │       └── route.ts          # AI 报告 API（调用智谱模型）
│   ├── globals.css               # 全局样式 + 自定义工具类
│   ├── layout.tsx                # 根布局
│   └── page.tsx                  # 主页面（表格、图表、交互逻辑）
├── components/                   # 可复用的 UI 组件（可选，当前未拆分）
├── public/                       # 静态资源
├── .env.local                    # 环境变量（需自行创建）
├── package.json
├── tsconfig.json
└── README.md
```

> 注：为了快速开发，所有核心逻辑集中在 `app/page.tsx` 中。但内部使用了 `useState`、`useEffect`、`useMemo`、`useCallback`、`useRef` 等 React Hooks，并实现了防抖、虚拟滚动、localStorage 持久化等工程实践。

## 🧩 核心代码逻辑说明

### CSV 解析与文件管理

- 使用 `PapaParse` 在浏览器端解析 CSV，设置 `header: true` 自动将首行作为列名。
- 解析后生成 `CSVFile` 对象（包含 `id`、`name`、`headers`、`rows`），存入 `files` 状态。
- 文件切换、删除、清空对应修改状态，并自动触发图表清空和报告清空。

### 图表生成

- 根据当前选中的 `xKey` 和 `yKey` 遍历 `rows`，提取 `xAxisData`（分类数组）和 `seriesData`（数值数组）。
- 依据 `chartType` 构造不同的 ECharts `option`：
  - 柱状图/折线图：使用普通笛卡尔坐标系。
  - 饼图：将数据转换为 `{ name, value }` 格式。
  - 散点图：将索引作为 X 坐标，数值作为 Y 坐标。
- 使用 `lodash.debounce` 对生成图表操作防抖（300ms），避免频繁重绘。

### AI 报告全量分析

- 前端计算 Y 轴数列的统计值：行数、总和、均值、中位数、最大值、最小值。
- 将这些统计信息与表头、文件名称、X/Y 轴信息、图表类型一起发送到 `/api/ai-report`。
- 后端构造提示词，调用智谱 GLM-4-Flash 模型，返回一段自然语言分析报告。
- 前端展示报告，且不发送原始数据行（token 节省 99% 以上）。

### 本地存储

- 监听 `files`、`selectedFileId`、`xKey`、`yKey`、`chartType`、`chartOption`、`aiReport` 的变化，自动写入 `localStorage`。
- 组件初始化时读取 `localStorage` 并恢复所有状态。

### 性能优化

- **虚拟滚动**：当表格行数超过 200 时，使用 `react-window` 的 `FixedSizeList` 渲染表格体，只渲染可视区域。
- **防抖**：图表生成操作防抖，避免快速点击多次生成。
- **数据缓存**：使用 `useMemo` 缓存统计数据，避免每次渲染重复计算。

## 📄 API 接口

### POST `/api/ai-report`

**请求体**

```json
{
  "fileName": "sales.csv",
  "headers": ["城市", "销售额"],
  "xKey": "城市",
  "yKey": "销售额",
  "chartType": "bar",
  "stats": {
    "行数": 1024,
    "总和": "98765.43",
    "平均值": "96.45",
    "中位数": "85.00",
    "最大值": 999,
    "最小值": 12
  },
  "sampleRows": [
    { "城市": "北京", "销售额": 230 },
    { "城市": "上海", "销售额": 310 }
  ]
}
```

**响应**

```json
{
  "report": "根据数据统计，销售额平均值为96.45，最高值为999（对应北京），最低值为12..."
}
```

## 👨‍💻 开发心得与亮点

- **全栈 AI 集成**：利用 Next.js API Routes 安全调用大模型，前端仅传输统计特征，成本低、响应快。
- **工程化细节**：虚拟滚动、防抖、localStorage 持久化、TypeScript 类型约束。
- **用户体验**：多文件标签页、无感知状态保存、图表导出、错误提示友好。
- **可扩展性**：预留了自然语言生成图表的接口（可轻松加上 AI 自动配置图表）。

## 📝 待改进 / 未来计划

- [ ] 增加图表配置保存为 JSON 并导入/导出。
- [ ] 支持更多图表类型（雷达图、热力图等）。
- [ ] 支持自定义主题色。
- [ ] 优化移动端触摸交互。
- [ ] 开放用户自定义统计指标（方差、分位数等）。


## 🙏 致谢

- [Vercel](https://vercel.com/) for Next.js
- [智谱 AI](https://open.bigmodel.cn/) for GLM-4-Flash API
- [ECharts](https://echarts.apache.org/) for powerful charting
- [shadcn/ui](https://ui.shadcn.com/) for beautiful Table components
