# GitHub 连接指南（供所有 AI Agent 使用）

> 本文件记录了在本设备（Windows，用户 Lu-8）上连接 GitHub 的可靠方法。
> 任何 AI Agent 需要操作 GitHub 时，请先阅读本文件。

## 快速连接（一键）

本设备已安装 `gh` CLI（v2.89.0），且 GitHub 凭据已存储在 Windows 凭据管理器中。
**不需要用户手动输入账号密码**，直接运行以下命令即可获得 GitHub 访问权限：

```powershell
# 方法 1：使用辅助脚本（推荐）
. $env:USERPROFILE\.github-helper.ps1
Set-GitHubAuth

# 方法 2：直接提取 token
$token = ((("protocol=https`nhost=github.com`n") | git credential fill) -split "`n" | Where-Object { $_ -match "^password=" }) -replace "^password=", ""
$env:GH_TOKEN = $token.Trim()
```

成功后 `gh auth status` 会显示已登录 `Lu-8` 账号。

## 账号信息

- **GitHub 用户名**：Lu-8
- **Token 权限**：`gist`, `repo`, `workflow`（可创建仓库、推送代码、操作 issue/PR）
- **协议**：HTTPS

## 常用操作

### 创建公开仓库并推送本地项目

```powershell
. $env:USERPROFILE\.github-helper.ps1
Set-GitHubAuth
cd "C:\path\to\project"
git init; git add -A; git commit -m "init"
gh repo create <repo-name> --public --source . --push
```

### 推送现有仓库

```powershell
git remote add origin https://github.com/Lu-8/<repo>.git
git push -u origin main
```

### 用 gh 执行任意命令

```powershell
. $env:USERPROFILE\.github-helper.ps1
Invoke-GitHub-WithAuth "repo view Lu-8/findaphd-scraping-guide"
```

## 注意事项

1. **不要打印完整 token**：调试时只输出 token 长度或前缀，避免泄露。
2. **中文文件名**：`git config core.quotepath false` 防止中文转义。
3. **PowerShell 多行脚本**：含中文的脚本必须写入 `.mjs`/`.ps1` 文件，不能内联到 `-e` 参数。
4. **Token 过期**：若 `git credential fill` 返回空，让用户在浏览器中重新登录 GitHub 或执行一次 `git push` 保存凭据。

## 参考案例

已成功上传的公开仓库：
- https://github.com/Lu-8/findaphd-scraping-guide （FindAPhD 爬取指南）
