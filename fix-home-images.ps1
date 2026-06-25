$base = 'public\STICKER\FRAME'
$lapBase = 'public\STICKER\laptop stickers file\laptopp stickers'
$folders = @{
  'MOV'='Movie (MOV)';'ANM'='anime (ANM)';'CAR'='cars  (CAR)';
  'SPO'='sports (SPO)';'MAR'='marvels';'AST'='aesthetic (AST)';
  'QOU'='qoutes (QOU)';'ART'='Artist (ART)';'VVG'='van vogh (vvg)';
  'SONM'='songs mini (sonm)';'DEV'='devotional (DEV)';'VSN'='vision board (VSN)';
  'GIR'='pink lavender mini (GIR)';'SHCN'='shinchan mini (SHCN)';
  'SC'='8x8 song cover';'A3'='a3 size';'SPL'='split posters(SPL)';
  'SPLA'='split srt design';'ANM3'='new anime';'ANM2'='anime mini'
}

$allImages = @()
foreach ($cc in $folders.Keys) {
  $path = Join-Path $base $folders[$cc]
  $files = Get-ChildItem $path -File | Where-Object {$_.Extension -match '\.(jpg|jpeg|png|webp)'} | Select-Object -First 8
  foreach ($f in $files) {
    $folder = $folders[$cc] -replace '"','%22'
    $fname  = $f.Name -replace '"','%22'
    $allImages += '/STICKER/FRAME/' + $folder + '/' + $fname
  }
}
$lapFiles = Get-ChildItem $lapBase -File | Where-Object {$_.Extension -match '\.(jpg|jpeg|png|webp)' -and $_.Name -notlike '*.png.png'} | Select-Object -First 10
foreach ($f in $lapFiles) {
  $allImages += '/STICKER/laptop stickers file/laptopp stickers/' + $f.Name
}
Write-Output "Image pool size: $($allImages.Count)"

$html = Get-Content 'home.html' -Raw -Encoding utf8

# Fix 6 specific BEST SELLERS paths
$html = $html -replace 'src="/limited-edition-v2-sticker\.jpg"',  ('src="' + $allImages[0]  + '"')
$html = $html -replace 'src="/wasted-sticker\.jpg"',              ('src="' + $allImages[1]  + '"')
$html = $html -replace 'src="/stay-focused-sticker\.jpg"',        ('src="' + $allImages[2]  + '"')
$html = $html -replace 'src="/to-be-continued-sticker\.jpg"',     ('src="' + $allImages[3]  + '"')
$html = $html -replace 'src="/dont-touch-sticker\.jpg"',          ('src="' + $allImages[4]  + '"')
$html = $html -replace 'src="/transformers-sticker\.jpg"',        ('src="' + $allImages[5]  + '"')
$html = $html -replace 'src="/IMAGE/top\.png"',                   ('src="' + $allImages[10] + '"')
$html = $html -replace 'src="/avatar-krithik\.png"',              'src="/STICKER/FRAME/aesthetic (AST)/aesthetic (1).png"'

# Replace every /IMAGE/1.png with a rotating actual image
$idx = 6
$pattern = [regex]'src="/IMAGE/1\.png"'
$result = $pattern.Replace($html, {
  param($m)
  $url = $allImages[$script:idx % $allImages.Count]
  $script:idx++
  'src="' + $url + '"'
})

Set-Content -Path 'home.html' -Value $result -Encoding utf8
Write-Output "Done. Replaced $($script:idx - 6) /IMAGE/1.png references"
