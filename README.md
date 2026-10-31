# FindAPhD 数据爬取指南

使用 ego-browser 多空间并行爬取 findaphd.com 的 PhD 招聘信息，自动转换为 [PhDRadar](https://pingfanfan.github.io/PhDRadar/) 格式。

> 📖 **在线操作指南**：https://lu-8.github.io/findaphd-scraping-guide/

## 功能

- ✅ 多空间并行爬取（3 个 worker 同时运行）
- ✅ 自动绕过 Cloudflare 防护
- ✅ 自动转换为 PhDRadar jobs.csv 格式
- ✅ 输出 JSON + CSV 两种格式
- ✅ 支持 Windows 任务计划程序每日自动运行

## 快速开始

```powershell
# 一键爬取
.\run-scraper.ps1

# 或直接运行
ego-browser nodejs -e "await import('file:///C:/path/to/scraper.mjs')"
```

## 效果截图

![搜索页](assets/screenshots/01-search-page.png)

![项目详情页](assets/screenshots/03-project-detail.png)

## 文件说明

| 文件 | 用途 |
|------|------|
| `scraper.mjs` | 多空间并行爬虫主脚本 |
| `run-scraper.ps1` | Windows 一键启动脚本 |
| `AI-Guide.md` | 给 AI 看的技术文档 |
| `index.html` | 给人看的图文操作指南 |
| `data/sample-phdradar-jobs.csv` | 爬取样例（PhDRadar 格式） |
| `data/sample-phdradar-jobs.json` | 同上 JSON 版 |
| `assets/screenshots/` | 操作截图 |

## 测试结果

3 个 Worker × 5 条 URL = **15 条全部成功，0 错误**

## 每日自动化

详见 [在线操作指南](https://lu-8.github.io/findaphd-scraping-guide/) 第八节，使用 Windows 任务计划程序配置每天自动运行。
