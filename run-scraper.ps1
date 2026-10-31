# FindAPhD 爬虫启动脚本
# 用法: .\run-scraper.ps1
# 确保 ego-browser 已安装: ego-browser skill

$ErrorActionPreference = "Stop"

# 检查 ego-browser
$egoCheck = ego-browser --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "ego-browser 未安装，请先运行: ego-browser skill"
    exit 1
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$scraper = Join-Path $scriptDir "scraper.mjs"

Write-Host "=== FindAPhD 多空间并行爬虫 ===" -ForegroundColor Cyan
Write-Host "脚本: $scraper"
Write-Host ""

# 运行爬虫
ego-browser nodejs -e "await import('file:///$($scraper -replace '\\','/')')"

Write-Host ""
Write-Host "=== 爬取完成 ===" -ForegroundColor Green
Write-Host "结果文件位于 scraper.mjs 同目录下的 data/ 文件夹"
