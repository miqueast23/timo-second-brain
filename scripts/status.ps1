Set-Location 'D:\Programas de Proyecto Claude\timo-second-brain'
'--- GIT ---'; git log --oneline | Select-Object -First 8
'PKG_NAME=' + ((Get-Content package.json | ConvertFrom-Json).name)
'TIMO_CMD=' + (Test-Path .claude\commands\timo.md)
'AI_DIR=' + (Test-Path 'D:\Segundo Cerebro\_AI')
if(Test-Path 'D:\Segundo Cerebro\_AI'){ Get-ChildItem 'D:\Segundo Cerebro\_AI' -Recurse | ForEach-Object { $_.FullName.Substring(19) } }
'FIX_LOG_BYTES=' + (Get-Item data\logs\fix.log -ErrorAction SilentlyContinue).Length
$x=((Get-Content .env | Where-Object { $_ -match '^XAI_API_KEY=' }) -replace '^XAI_API_KEY=','')
'XAI_LEN=' + $x.Length; if($x.Length -ge 4){ 'XAI_PREFIX=' + $x.Substring(0,4) }
'--- last modified (10) ---'
Get-ChildItem -Recurse -File | Where-Object { $_.FullName -notmatch 'node_modules|\\dist\\|\\cache\\' } | Sort-Object LastWriteTime -Descending | Select-Object -First 10 | ForEach-Object { $_.LastWriteTime.ToString('HH:mm:ss') + '  ' + $_.FullName.Substring(48) }
'PROMPTS=' + (Get-ChildItem prompts -Recurse -File | Measure-Object).Count
'CLAUDE_P_RUNNING=' + ((Get-CimInstance Win32_Process -Filter "Name='node.exe' or Name='claude.exe'" | Where-Object { $_.CommandLine -match '\-p' -and $_.CommandLine -match 'claude' }).Count)
