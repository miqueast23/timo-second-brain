Set-Location 'D:\Programas de Proyecto Claude\timo-second-brain'
'PKG_NAME=' + ((Get-Content package.json | ConvertFrom-Json).name)
'TIMO_CMD=' + (Test-Path .claude\commands\timo.md)
'--- recent files (last 20 min) ---'
Get-ChildItem -Recurse -File | Where-Object { $_.FullName -notmatch 'node_modules' -and $_.LastWriteTime -gt (Get-Date).AddMinutes(-20) } | Select-Object LastWriteTime,@{n='f';e={$_.FullName.Substring(48)}} | Sort-Object LastWriteTime | Format-Table -AutoSize
'--- claude processes ---'
Get-CimInstance Win32_Process -Filter "Name='claude.exe' or Name='node.exe'" | Where-Object { $_.CommandLine -match 'claude' -and $_.CommandLine -notmatch 'mcp' } | Select-Object ProcessId,@{n='cmd';e={$_.CommandLine.Substring(0,[Math]::Min(160,$_.CommandLine.Length))}} | Format-Table -Wrap
$x=((Get-Content .env | Where-Object { $_ -match '^XAI_API_KEY=' }) -replace '^XAI_API_KEY=','')
'XAI_LEN=' + $x.Length
if($x.Length -ge 4){ 'XAI_PREFIX=' + $x.Substring(0,4) }
