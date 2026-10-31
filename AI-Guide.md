# FindAPhD 数据爬取 — AI 技术指南

> 面向 AI Agent：使用 ego-browser 多空间并行爬取 findaphd.com 的 PhD 招聘信息，并转换为 PhDRadar 格式。

---

## 1. 环境与工具

| 项 | 说明 |
|----|------|
| **浏览器** | ego-browser (ego-lite)，Chromium，Trae 提供 |
| **目标站点** | https://www.findaphd.com/ |
| **输出格式** | PhDRadar jobs.csv: `level,eligibility,funding,title,institution,country,city,deadline,posted,source,url,flags,fetched_at` |
| **核心 API** | `taskSpace()` → `page.goto()` → `page.evaluate()` |

---

## 2. 关键技巧（必读）

### Cloudflare 绕过
findaphd.com 有 Cloudflare 防护。**直接访问内页会触发 "Just a moment..." 挑战且无法自动通过**。
**解决方案**：每个 task space 先访问首页 `https://www.findaphd.com/`，等待标题不含 "稍候/Just a moment/Checking"，再导航到目标页。首页挑战会自动通过。

```js
async function passCloudflare(page) {
  await page.goto("https://www.findaphd.com/");
  await page.waitForLoadState();
  for (let i = 0; i < 30; i++) {
    const t = await page.title();
    if (!t.includes('稍候') && !t.includes('Just a moment') && !t.includes('Checking')) return;
    await page.waitForTimeout(2000);
  }
}
```

### 列表页数据获取
- 列表页 URL: `https://www.findaphd.com/phds/latest/`（约15条/页）
- 选择器: `a[href*="/phds/project/"]`
- 列表页结果由 JS 渲染，必须先过 Cloudflare

### 多空间并行
- 每个 `taskSpace(name)` 是独立浏览器上下文
- 用 `Promise.all` 同时跑多个 worker，每个 worker 处理一批 URL
- 实测 3 worker × 5 URL = 15 条，全部成功

---

## 3. 核心提取选择器

| 字段 | 选择器 |
|------|--------|
| 标题 | `h1.phd-header__phd-title`（去掉 shortlist 前缀） |
| 大学 | `a.phd-header__institution` |
| 学院 | `a.phd-header__department` |
| 导师/截止/资助 | `.key-info__content`（文本模式匹配） |
| 城市/国家/学科 | `a.phd-data`（徽章链接） |
| 项目描述 | 找 "About the Project" 标题，收集后续段落（跳过 SCRIPT/STYLE） |

---

## 4. 字段映射到 PhDRadar 格式

| findaphd 字段 | PhDRadar 字段 | 转换逻辑 |
|--------------|--------------|---------|
| - | level | 固定 `phd` |
| fundingType | eligibility | UK Students Only→`UK only`，Worldwide→`International`，否则 `check` |
| fundingType | funding | 原文 |
| title | title | 原文 |
| university | institution | 原文 |
| country | country | 原文 |
| city | city | 原文 |
| deadline | deadline | `Tuesday, January 12, 2027` → `2027-01-12` |
| - | posted | 当天日期 `YYYY-MM-DD` |
| - | source | 固定 `findaphd` |
| url | url | 原文 |
| subjects | flags | 用 `; ` 连接 |
| - | fetched_at | ISO 时间戳 |

---

## 5. 运行方式

```powershell
# 方式1: 直接运行脚本
ego-browser nodejs -e "await import('file:///C:/path/to/scraper.mjs')"

# 方式2: 用启动脚本
.\run-scraper.ps1
```

输出文件：
- `raw-results.json` — 原始爬取数据
- `phdradar-jobs.json` — PhDRadar 格式 JSON
- `phdradar-jobs.csv` — PhDRadar 格式 CSV

---

## 6. 踩坑记录

1. **Cloudflare 挑战不通过**：直接访问内页失败，必须先访问首页建立会话。
2. **task space 被占用**：用数字 ID（如 `taskSpace(3)`）可能因用户接管而失效，用字符串 name（如 `taskSpace("worker-01")`）更安全。
3. **`page.on` 不存在**：ego-browser Page API 不支持事件监听，不要用 `page.on('request', ...)`。
4. **中文脚本编码**：含中文必须写 `.mjs` 文件，不能内联到 `-e`。

---

## 7. 每日自动化方案

推荐用 **Windows 任务计划程序**：
1. 打开「任务计划程序」→ 创建基本任务
2. 触发器：每天（如 09:00）
3. 操作：启动程序 `powershell.exe`，参数 `-ExecutionPolicy Bypass -File "C:\path\to\run-scraper.ps1"`
4. 爬取结果自动保存，可配合 GitHub Actions 推送到仓库

或用 **GitHub Actions** cron：但 findaphd 需真实浏览器过 Cloudflare，建议本地运行。

---

## 8. 文件清单

| 文件 | 用途 |
|------|------|
| `scraper.mjs` | 多空间并行爬虫主脚本 |
| `run-scraper.ps1` | Windows 启动脚本 |
| `data/sample-phdradar-jobs.csv` | 爬取样例（15条，PhDRadar 格式） |
| `data/sample-phdradar-jobs.json` | 同上 JSON 版 |
| `assets/screenshots/` | 操作截图 |
