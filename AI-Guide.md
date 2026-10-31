# FindAPhD 数据爬取 — AI 技术指南

> 本文档面向 AI Agent，记录使用浏览器自动化从 findaphd.com 爬取 PhD 招聘数据的完整技术方案、关键选择器与踩坑记录。

---

## 1. 环境与工具

| 项 | 说明 |
|----|------|
| **浏览器** | ego-browser (ego-lite)，基于 Chromium，由 Trae 提供的浏览器自动化工具 |
| **运行模型** | Trae 专有模型（通过 ego-browser Skill 驱动） |
| **目标站点** | https://www.findaphd.com/ |
| **核心 API** | `taskSpace()` → `page.goto()` → `page.evaluate()` → `page.snapshot()` / `page.screenshot()` |

### ego-browser 关键特性

- 每个回合是独立的 Node.js 进程，**变量不持久化**，需用 `taskSpace(spaceId)` 恢复空间
- Windows PowerShell 下**不能内联多行脚本**，必须写入 `.mjs` 文件后用 `await import('file:///...')` 加载
- 非 ASCII 内容（中文）必须放在 `.mjs` 文件内，不能放进 `-e` 参数
- API 不是 Playwright，只用文档列出的 `TaskSpace` / `Page` 方法；DOM 操作走 `page.evaluate()`

---

## 2. 执行流程（11 个回合）

### Round 1 — 打开首页并快照
```js
const task = await taskSpace("findaphd-scrape-20261101");
const page = task.page("p1");
await page.goto("https://www.findaphd.com/");
await page.waitForLoadState();
console.log(await page.snapshot({ scope: "full_page" }));
```
**目的**：拿到 spaceId（=2），观察首页结构，发现 "Latest PhDs" 区域有具体项目链接。

### Round 2 — 进入 /phds/ 列表页
`page.goto("https://www.findaphd.com/phds/")` → 快照显示搜索筛选区，但**结果区为空**。

### Round 3–6 — 排查列表页空结果
- `page.evaluate` 查询 `a[href*="/phds/project/"]` → **0 条**
- `results-content` 容器 innerHTML 为空
- 多次滚动、等待均无效
- **结论**：列表页结果由客户端 JS 动态渲染，直接抓 `/phds/` 不可行。改走「首页 Latest PhDs → 项目详情页」路线。

### Round 7 — 访问单个项目详情页
```js
await page.goto("https://www.findaphd.com/phds/project/light-at-the-atomic-scale-a-phd-in-single-molecule-nanophotonics/?p201508");
```
成功拿到标题、大学、导师、日期、资助、地点、学科、项目描述等完整数据。

### Round 8–10 — 迭代优化提取逻辑
- Round 8：粗提取，university/school 串联、subjects 混入导航链接、location 为空
- Round 9：dump 精确 HTML，定位关键选择器
- Round 10：用精确选择器重写，得到干净 JSON

### Round 11 — 收尾
`await task.finish({ keep: [] })` 关闭任务空间。

---

## 3. 核心提取逻辑（最终版）

在 `page.evaluate(() => { ... })` 内执行：

```js
// 标题
const title = document.querySelector('h1.phd-header__phd-title')?.textContent
  .replace(/\s+/g, ' ').trim()
  .replace(/^(Add|Remove) to shortlist\s*/i, '');

// 大学 & 学院
const university = document.querySelector('a.phd-header__institution')?.textContent.trim();
const school     = document.querySelector('a.phd-header__department')?.textContent.trim();

// 关键信息（导师/截止日期/资助类型）
const keyInfo = [...document.querySelectorAll('.key-info__content')]
  .map(el => el.textContent.replace(/\s+/g, ' ').trim());
const supervisor = keyInfo.find(t => /^(Dr|Prof|Mr|Mrs|Ms)\.?\s/.test(t));
const deadline   = keyInfo.find(t => /(Monday|...|Sunday),/.test(t));
const funding    = keyInfo.find(t => /funded|studentship|stipend|self.funded/i.test(t));

// 地点 & 学科（phd-data 徽章）
const badges = [...document.querySelectorAll('a.phd-data')].map(a => a.textContent.trim());
const city    = badges.find(t => t && t !== 'United Kingdom' && !t.includes(' '));
const country = badges.find(t => t === 'United Kingdom');
const subjects = badges.filter(t => t !== city && t !== country);

// 项目描述：找 "About the Project" 标题，收集其后同级段落直到下一个 heading
```

### 关键 CSS 选择器速查

| 字段 | 选择器 |
|------|--------|
| 标题 | `h1.phd-header__phd-title` |
| 大学 | `a.phd-header__institution` |
| 学院 | `a.phd-header__department` |
| 导师/日期/资助 | `.key-info__content`（文本模式匹配） |
| 城市/国家/学科 | `a.phd-data` |

---

## 4. 输出数据结构

```json
{
  "title": "Light at the Atomic Scale: A PhD in Single-Molecule Nanophotonics",
  "university": "University of Birmingham",
  "school": "School of Physics and Astronomy",
  "supervisor": "Dr Rohit Chikkaraddy",
  "deadline": "Tuesday, January 12, 2027",
  "fundingType": "Funded PhD Project (UK Students Only)",
  "location": "Birmingham, United Kingdom",
  "subjects": ["Acoustics", "Astrophysics", "Electromagnetism", "Experimental Physics", "Optical Physics", "Engineering", "Materials Science", "Quantum Mechanics"],
  "aboutTheProject": "...",
  "url": "https://www.findaphd.com/phds/project/.../"
}
```

---

## 5. 踩坑记录

1. **列表页 `/phds/` 结果为空**：客户端渲染，直接 evaluate 拿不到。绕过方法：从首页 "Latest PhDs" 或学科分类页获取项目链接，逐个访问详情页。
2. **`aboutTheProject` 混入 JS 代码**：`nextElementSibling` 遍历时抓到了 `<script>`。修复：遍历时跳过 `tagName === 'SCRIPT'`，或限定只收集 `p`/`div` 的长文本。
3. **弹窗遮挡**：首页有 Postgrad LIVE 弹窗，需先 `evaluate` 点击 close 按钮。
4. **PowerShell 脚本编码**：含中文的脚本必须写 `.mjs` 文件，不能用 `-e` 内联。

---

## 6. 批量爬取扩展方案

1. 从首页快照拿到 "Latest PhDs" 的项目链接（`ref=81,82,83`）
2. 或访问 `/phds/latest/` 拿到最新列表
3. 逐个 `page.goto(projectUrl)`，复用 Round 10 的提取函数
4. 汇总写入 JSON/CSV，每爬 10 条保存一次避免丢失

---

## 7. 截图清单

| 文件 | 内容 |
|------|------|
| `assets/screenshots/01-search-page.png` | /phds/ 搜索页（含弹窗） |
| `assets/screenshots/02-search-page-clean.png` | 关闭弹窗后的搜索页 |
| `assets/screenshots/03-project-detail.png` | PhD 项目详情页 |

数据样例见 `assets/data/sample-phd.json`。
