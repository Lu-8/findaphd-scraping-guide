# FindAPhD 数据爬取指南

使用浏览器自动化从 [findaphd.com](https://www.findaphd.com/) 爬取 PhD 招聘信息的完整技术文档与操作指南。

## 项目内容

| 文件 | 说明 |
|------|------|
| `AI-Guide.md` | 给 AI 看的技术文档（简洁版），包含环境、流程、选择器、踩坑记录 |
| `操作指南.html` | 给人看的图文操作指南，含截图和代码示例 |
| `assets/screenshots/` | 操作过程截图（搜索页、项目详情页等） |
| `assets/data/sample-phd.json` | 爬取的单个 PhD 项目完整数据样例 |

## 技术栈

- **浏览器**：ego-browser（ego-lite，基于 Chromium）
- **驱动**：Trae AI Agent
- **目标站点**：https://www.findaphd.com/

## 快速开始

直接在浏览器中打开 `操作指南.html` 即可查看完整操作步骤。

## 数据样例

```json
{
  "title": "Light at the Atomic Scale: A PhD in Single-Molecule Nanophotonics",
  "university": "University of Birmingham",
  "school": "School of Physics and Astronomy",
  "supervisor": "Dr Rohit Chikkaraddy",
  "deadline": "Tuesday, January 12, 2027",
  "fundingType": "Funded PhD Project (UK Students Only)",
  "location": "Birmingham, United Kingdom",
  "subjects": ["Acoustics", "Astrophysics", "Electromagnetism", ...]
}
```
