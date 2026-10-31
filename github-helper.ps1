# GitHub Helper — 一键获取 GitHub 凭据供 gh CLI / git 使用
# 适用场景：AI Agent 需要操作 GitHub 但 gh 未登录时
# 用法：在 PowerShell 中 dot-source 加载：. $env:USERPROFILE\.github-helper.ps1
#       或直接运行获取 token：& $env:USERPROFILE\.github-helper.ps1

function Get-GitHubToken {
    <#
    .SYNOPSIS
    从 Windows 凭据管理器 / git credential store 提取 GitHub token。
    .OUTPUTS
    成功返回 token 字符串；失败返回 $null 并输出错误信息。
    #>
    $input = "protocol=https`nhost=github.com`n"
    $result = $input | git credential fill 2>&1
    $passwordLine = ($result -split "`n") | Where-Object { $_ -match "^password=" }
    if ($passwordLine) {
        $token = ($passwordLine -replace "^password=", "").Trim()
        return $token
    }
    Write-Error "[GitHub Helper] 未在 git credential store 中找到 github.com 的凭据。请先执行 git push 并保存凭据。"
    return $null
}

function Set-GitHubAuth {
    <#
    .SYNOPSIS
    获取 token 并设置 GH_TOKEN 环境变量，然后验证 gh auth 状态。
    .OUTPUTS
    成功返回 $true，失败返回 $false。
    #>
    $token = Get-GitHubToken
    if (-not $token) { return $false }
    $env:GH_TOKEN = $token
    $status = gh auth status 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[GitHub Helper] gh 已登录：" -ForegroundColor Green
        Write-Host $status -ForegroundColor Gray
        return $true
    } else {
        Write-Error "[GitHub Helper] gh auth 验证失败：$status"
        return $false
    }
}

function Invoke-GitHub-WithAuth {
    <#
    .SYNOPSIS
    在设置好 GH_TOKEN 后执行任意 gh 命令。
    .PARAMETER Command
    要执行的 gh 命令及参数（不含 gh 前缀）。
    .EXAMPLE
    Invoke-GitHub-WithAuth "repo create my-repo --public"
    #>
    param([Parameter(Mandatory=$true)][string]$Command)
    if (-not $env:GH_TOKEN) {
        if (-not (Set-GitHubAuth)) { return }
    }
    Invoke-Expression "gh $Command"
}

# 如果直接运行此脚本（非 dot-source），则执行验证
if ($MyInvocation.InvocationName -ne '.') {
    Set-GitHubAuth
}
