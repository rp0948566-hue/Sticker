$content = [System.IO.File]::ReadAllText('index.html', [System.Text.Encoding]::UTF8)
$pos = $content.IndexOf('stars')
Write-Host "Stars context: '$($content.Substring([Math]::Max(0,$pos-10), 60))'"
