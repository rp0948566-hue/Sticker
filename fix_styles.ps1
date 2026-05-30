$content = Get-Content 'index.html' -Raw
$pattern = ' style="display: block; margin-bottom: 20px; width: 100%; max-width: 600px; margin-left: auto; margin-right: auto;"'
$content = $content.Replace($pattern, '')
Set-Content 'index.html' $content -Encoding UTF8
Write-Host "Done. Replacements complete."
