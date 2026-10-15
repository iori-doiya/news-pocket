$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$nodeCandidate = (Get-Command node -ErrorAction SilentlyContinue).Source
$bundledNode = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
if ($nodeCandidate) { $nodeMajor = [int]((& $nodeCandidate --version).TrimStart('v').Split('.')[0]) } else { $nodeMajor = 0 }
if ($nodeMajor -lt 22 -and (Test-Path -LiteralPath $bundledNode)) { $nodeCandidate = $bundledNode; $nodeMajor = [int]((& $nodeCandidate --version).TrimStart('v').Split('.')[0]) }
if ($nodeMajor -lt 22) { throw 'Node.js 22以上（推奨24 LTS）をインストールし、PowerShellを開き直してください。' }
$env:Path = (Split-Path -Parent $nodeCandidate) + ';' + $env:Path
if (-not (Test-Path -LiteralPath 'node_modules/wrangler/bin/wrangler.js')) {
  $npmCommand = (Get-Command npm.cmd -ErrorAction Stop).Source
  $npmCli = Join-Path (Split-Path -Parent $npmCommand) 'node_modules/npm/bin/npm-cli.js'
  & $nodeCandidate $npmCli ci --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw '依存ライブラリの取得に失敗しました。ネットワークを確認してください。' }
}
$env:XDG_CONFIG_HOME = Join-Path $PSScriptRoot '.wrangler/config'
$env:WRANGLER_SEND_METRICS = 'false'
$env:CI = 'true'
& $nodeCandidate 'node_modules/wrangler/bin/wrangler.js' d1 migrations apply news-pocket-db --config wrangler.local.jsonc --local
if ($LASTEXITCODE -ne 0) { throw 'ローカルDBの初期化に失敗しました。' }
Write-Host 'ニュースポケット: http://localhost:8787 / 終了: Ctrl+C'
& $nodeCandidate 'node_modules/wrangler/bin/wrangler.js' dev --config wrangler.local.jsonc --local --port 8787
